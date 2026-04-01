const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const prisma = require('../config/database');
const env = require('../config/env');
const logger = require('../utils/logger');

const openai = new OpenAI({ apiKey: env.openaiApiKey });

const PROMPT_ANALISE = `Voce e um analista especializado em vendas do Programa Compativeis (programa de transformacao de relacionamentos para casais do Marcio Conceicao). Analise a transcricao da call de vendas abaixo e extraia as informacoes em formato JSON.

Campos obrigatorios:
- dor_principal: string — qual a principal dor/problema do lead no relacionamento
- traco_carater: enum — classificar em: "esquizoide", "oral", "masoquista", "rigido" ou "nao_identificado"
- objecao_principal: string — qual a principal objecao do lead (se houver)
- resultado_call: enum — "fechou", "nao_fechou" ou "reagendar"
- resumo: string — resumo de 3-5 frases da call, destacando pontos chave

Campos opcionais (preencha se identificar na conversa):
- tempo_na_situacao: string — ha quanto tempo o lead esta na situacao de crise
- parceiro_sabe: boolean — se o parceiro sabe que buscou ajuda
- impacto_outras_areas: string — como a situacao afeta outras areas da vida

Retorne APENAS JSON valido, sem markdown, sem explicacoes.

Transcricao:
`;

const MAX_WHISPER_SIZE = 24 * 1024 * 1024; // 24MB (margem pro limite de 25MB)

async function transcreverDireto(caminhoAudio) {
  const transcription = await openai.audio.transcriptions.create({
    file: fs.createReadStream(caminhoAudio),
    model: 'whisper-1',
    language: 'pt',
    response_format: 'text',
  });
  return transcription;
}

async function transcreverAudio(caminhoAudio) {
  logger.info(`Transcrevendo audio: ${caminhoAudio}`);

  const stats = fs.statSync(caminhoAudio);

  if (stats.size <= MAX_WHISPER_SIZE) {
    const text = await transcreverDireto(caminhoAudio);
    logger.info(`Transcricao concluida: ${text.length} caracteres`);
    return text;
  }

  // Arquivo grande — dividir em chunks com ffmpeg
  logger.info(`Audio grande (${(stats.size / 1024 / 1024).toFixed(1)}MB), dividindo em chunks...`);

  const chunksDir = path.join(path.dirname(caminhoAudio), `chunks-${Date.now()}`);
  fs.mkdirSync(chunksDir, { recursive: true });

  const ext = path.extname(caminhoAudio) || '.webm';
  const chunkPattern = path.join(chunksDir, `part-%03d${ext}`);

  try {
    execSync(
      `ffmpeg -i "${caminhoAudio}" -f segment -segment_time 600 -c copy "${chunkPattern}" -y`,
      { stdio: 'pipe', timeout: 120000 }
    );
  } catch (err) {
    // Limpar e retornar erro amigavel
    try { fs.rmSync(chunksDir, { recursive: true }); } catch (e) {}
    logger.error(`Erro ao dividir audio: ${err.message}`);
    throw new Error('Audio muito longo para transcricao automatica. Tente uma gravacao mais curta ou envie em partes.');
  }

  const chunks = fs.readdirSync(chunksDir)
    .filter(f => f.startsWith('part-'))
    .sort()
    .map(f => path.join(chunksDir, f));

  if (chunks.length === 0) {
    try { fs.rmSync(chunksDir, { recursive: true }); } catch (e) {}
    throw new Error('Falha ao dividir audio em partes.');
  }

  logger.info(`Audio dividido em ${chunks.length} partes`);

  let fullText = '';
  for (let i = 0; i < chunks.length; i++) {
    logger.info(`Transcrevendo parte ${i + 1}/${chunks.length}...`);
    const text = await transcreverDireto(chunks[i]);
    fullText += text + ' ';
    try { fs.unlinkSync(chunks[i]); } catch (e) {}
  }

  try { fs.rmSync(chunksDir, { recursive: true }); } catch (e) {}

  const result = fullText.trim();
  logger.info(`Transcricao completa: ${result.length} caracteres (${chunks.length} partes)`);
  return result;
}

async function analisarTranscricao(transcricao) {
  logger.info('Analisando transcricao com GPT-4...');

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'Voce retorna apenas JSON valido. Sem markdown, sem codigo, sem explicacoes.',
      },
      {
        role: 'user',
        content: PROMPT_ANALISE + transcricao,
      },
    ],
    temperature: 0.3,
    max_tokens: 1000,
  });

  const conteudo = completion.choices[0]?.message?.content?.trim();

  // Tentar limpar caso venha com markdown
  let jsonStr = conteudo;
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  const dados = JSON.parse(jsonStr);
  logger.info('Analise concluida:', JSON.stringify(dados).slice(0, 200));
  return dados;
}

async function processarCall({ leadId, vendedorId, caminhoAudio, duracao }) {
  let transcricao;

  // 1. Transcrever com Whisper
  try {
    transcricao = await transcreverAudio(caminhoAudio);
  } catch (err) {
    if (err.status === 429) {
      throw Object.assign(new Error('Cota da OpenAI excedida. Verifique seu plano e billing.'), { statusCode: 429 });
    }
    throw err;
  }

  // 2. Analisar com GPT-4
  const analise = await analisarTranscricao(transcricao);

  // 3. Salvar interação com transcrição e resumo
  const interacao = await prisma.interacao.create({
    data: {
      leadId,
      vendedorId,
      tipo: 'call',
      conteudo: `Call gravada — ${Math.round(duracao / 60)}min`,
      gravacaoUrl: caminhoAudio,
      transcricao,
      resumoIa: analise.resumo || null,
      camposIa: analise,
      duracao,
    },
    include: {
      vendedor: { select: { id: true, nomeExibicao: true } },
    },
  });

  // 4. Atualizar campos do lead com dados extraídos pela IA
  const dadosLead = {};

  if (analise.dor_principal) dadosLead.dorPrincipal = analise.dor_principal;

  if (analise.traco_carater && ['esquizoide', 'oral', 'masoquista', 'rigido', 'nao_identificado'].includes(analise.traco_carater)) {
    dadosLead.tracoCarater = analise.traco_carater;
  }

  if (analise.objecao_principal) dadosLead.objecaoPrincipal = analise.objecao_principal;

  if (analise.resultado_call && ['fechou', 'nao_fechou', 'reagendar'].includes(analise.resultado_call)) {
    dadosLead.resultadoCall = analise.resultado_call;
  }

  if (Object.keys(dadosLead).length > 0) {
    await prisma.lead.update({
      where: { id: leadId },
      data: dadosLead,
    });
    logger.info(`Lead #${leadId} atualizado com campos IA: ${Object.keys(dadosLead).join(', ')}`);
  }

  return {
    interacao,
    transcricao,
    analise,
    camposAtualizados: Object.keys(dadosLead),
  };
}

async function analisarPrintWhatsApp(imagePaths, historicoAnterior = '') {
  logger.info(`Analisando ${imagePaths.length} print(s) de WhatsApp com GPT-4 Vision...`);

  const imageContents = [];
  for (const imgPath of imagePaths) {
    const imageBuffer = fs.readFileSync(imgPath);
    const base64Image = imageBuffer.toString('base64');
    const mimeType = imgPath.endsWith('.png') ? 'image/png' : 'image/jpeg';
    imageContents.push({
      type: 'image_url',
      image_url: {
        url: `data:${mimeType};base64,${base64Image}`,
        detail: 'high',
      },
    });
  }

  const systemPrompt = `Voce e um assistente que analisa screenshots de conversas do WhatsApp para um CRM de vendas do Programa Compativeis (programa de transformacao de relacionamentos para casais do Marcio Conceicao).

Sua tarefa:
1. EXTRAIR o texto completo da conversa visivel no(s) print(s), identificando quem e o vendedor e quem e o lead
2. FORMATAR a conversa extraida como dialogo (Vendedor: ... / Lead: ...)
3. ANALISAR o conteudo e gerar um resumo de 3-5 frases com os pontos mais importantes
4. IDENTIFICAR campos relevantes para o CRM se possiveis:
   - dor_principal: qual o problema/dor do lead no relacionamento
   - objecao_principal: se o lead levantou alguma objecao
   - nivel_interesse: alto / medio / baixo / indefinido
   - proximo_passo: qual o proximo passo combinado (se houver)
   - sentimento_geral: positivo / neutro / negativo / misto

Retorne APENAS JSON valido com esta estrutura:
{
  "conversa_extraida": "Vendedor: ...\\nLead: ...\\n...",
  "resumo": "Resumo de 3-5 frases...",
  "campos": {
    "dor_principal": "..." ou null,
    "objecao_principal": "..." ou null,
    "nivel_interesse": "alto" | "medio" | "baixo" | "indefinido",
    "proximo_passo": "..." ou null,
    "sentimento_geral": "positivo" | "neutro" | "negativo" | "misto"
  }
}

Sem markdown, sem explicacoes, apenas JSON.`;

  let userText = 'Analise o(s) print(s) de conversa do WhatsApp abaixo.';
  if (historicoAnterior) {
    userText += `\n\nCONTEXTO: Ja existem conversas anteriores com esse lead. Aqui esta o historico acumulado ate agora:\n---\n${historicoAnterior}\n---\nConsidere esse contexto ao gerar o resumo atualizado. O resumo deve cobrir TODA a conversa (antiga + nova).`;
  }

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          { type: 'text', text: userText },
          ...imageContents,
        ],
      },
    ],
    temperature: 0.3,
    max_tokens: 2000,
  });

  const conteudo = completion.choices[0]?.message?.content?.trim();

  let jsonStr = conteudo;
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  const dados = JSON.parse(jsonStr);
  logger.info('Analise de print concluida:', JSON.stringify(dados).slice(0, 200));
  return dados;
}

async function gerarResumoEProximaAcao(leadId) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      interacoes: {
        orderBy: { createdAt: 'asc' },
        select: {
          tipo: true,
          conteudo: true,
          transcricao: true,
          resumoIa: true,
          camposIa: true,
          duracao: true,
          createdAt: true,
        },
      },
      vendedor: { select: { nomeExibicao: true } },
    },
  });

  if (!lead || lead.interacoes.length === 0) return null;

  const interacoesTexto = lead.interacoes.map((int) => {
    const data = new Date(int.createdAt).toLocaleDateString('pt-BR');
    const hora = new Date(int.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    let texto = `[${data} ${hora}] ${int.tipo.toUpperCase()}`;
    if (int.transcricao) texto += `\nTranscricao: ${int.transcricao}`;
    else if (int.conteudo) texto += `\nConteudo: ${int.conteudo}`;
    if (int.resumoIa) texto += `\nResumo IA: ${int.resumoIa}`;
    if (int.duracao) texto += ` (${Math.round(int.duracao / 60)}min)`;
    return texto;
  }).join('\n\n---\n\n');

  const dadosLead = [];
  if (lead.nome) dadosLead.push(`Nome: ${lead.nome}`);
  if (lead.classe) dadosLead.push(`Classe: ${lead.classe}`);
  if (lead.pontuacao) dadosLead.push(`Score: ${lead.pontuacao}`);
  if (lead.etapaFunil) dadosLead.push(`Etapa: ${lead.etapaFunil}`);
  if (lead.dorPrincipal) dadosLead.push(`Dor principal: ${lead.dorPrincipal}`);
  if (lead.tracoCarater) dadosLead.push(`Traco carater: ${lead.tracoCarater}`);
  if (lead.objecaoPrincipal) dadosLead.push(`Objecao: ${lead.objecaoPrincipal}`);
  if (lead.resultadoCall) dadosLead.push(`Resultado call: ${lead.resultadoCall}`);
  if (lead.vendedor?.nomeExibicao) dadosLead.push(`Vendedor: ${lead.vendedor.nomeExibicao}`);

  const prompt = `Voce e um gestor comercial experiente do Programa Compativeis (programa de transformacao de relacionamentos para casais, ticket R$1.229). Analise o historico completo de interacoes com este lead e retorne:

DADOS DO LEAD:
${dadosLead.join('\n')}

HISTORICO COMPLETO DE INTERACOES:
${interacoesTexto}

DATA E HORA ATUAL: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}

Retorne APENAS JSON valido com esta estrutura:
{
  "resumo_conversa": "Resumo completo e cronologico de toda a conversa com o lead em 5-8 frases. Inclua: como o lead chegou, principais dores identificadas, objecoes levantadas, o que foi discutido em cada interacao, e o status atual do relacionamento comercial.",
  "proxima_acao": "Sugestao concreta e especifica do proximo passo. Exemplos: 'Ligar para confirmar reagendamento e reforcar urgencia', 'Enviar proposta com condicao especial de Pix', 'Aguardar 3 dias e enviar conteudo sobre depoimento de aluno'. Sempre comece com um verbo de acao.",
  "proxima_acao_data": "Data e hora sugerida no formato ISO 8601 (YYYY-MM-DDTHH:mm:ss). Considere: se precisa ligar, sugira o proximo dia util as 10h ou 14h. Se precisa enviar mensagem, sugira dentro de 1-2h. Se e reengajamento, sugira 3-7 dias. Se nao ha data clara, retorne null.",
  "urgencia": "alta" | "media" | "baixa"
}

Sem markdown, sem explicacoes, apenas JSON.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'Voce retorna apenas JSON valido. Sem markdown, sem codigo, sem explicacoes.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.3,
    max_tokens: 1000,
  });

  const conteudo = completion.choices[0]?.message?.content?.trim();
  let jsonStr = conteudo;
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  const dados = JSON.parse(jsonStr);

  const updateData = {};
  if (dados.resumo_conversa) updateData.resumoConversa = dados.resumo_conversa;
  if (dados.proxima_acao) updateData.proximaAcao = dados.proxima_acao;
  if (dados.proxima_acao_data) {
    try {
      updateData.proximaAcaoData = new Date(dados.proxima_acao_data);
    } catch (e) {
      // Data invalida, ignorar
    }
  }

  if (Object.keys(updateData).length > 0) {
    await prisma.lead.update({
      where: { id: leadId },
      data: updateData,
    });
    logger.info(`Lead #${leadId} — resumo e proxima acao atualizados`);
  }

  return dados;
}

async function gerarResumoPeriodo(dataInicio, dataFim) {
  const inicio = new Date(dataInicio);
  const fim = new Date(dataFim);

  const [
    totalLeads, leadsA, leadsB, leadsC,
    vendasGanhas, vendasPerdidas,
    leadsBio, leadsAnuncio,
    vendedoresStats,
  ] = await Promise.all([
    prisma.lead.count({ where: { createdAt: { gte: inicio, lte: fim } } }),
    prisma.lead.count({ where: { createdAt: { gte: inicio, lte: fim }, classe: 'A' } }),
    prisma.lead.count({ where: { createdAt: { gte: inicio, lte: fim }, classe: 'B' } }),
    prisma.lead.count({ where: { createdAt: { gte: inicio, lte: fim }, classe: 'C' } }),
    prisma.lead.count({ where: { createdAt: { gte: inicio, lte: fim }, etapaFunil: 'fechado_ganho' } }),
    prisma.lead.count({ where: { createdAt: { gte: inicio, lte: fim }, etapaFunil: 'fechado_perdido' } }),
    prisma.lead.count({ where: { createdAt: { gte: inicio, lte: fim }, canal: 'bio' } }),
    prisma.lead.count({ where: { createdAt: { gte: inicio, lte: fim }, canal: 'anuncio' } }),
    prisma.vendedor.findMany({
      where: { ativo: true },
      select: {
        nomeExibicao: true,
        leads: {
          where: { createdAt: { gte: inicio, lte: fim } },
          select: { etapaFunil: true, vendaRealizada: true, valorVenda: true },
        },
      },
    }),
  ]);

  const vendedoresResumo = vendedoresStats.map(v => {
    const totalVendedor = v.leads.length;
    const vendas = v.leads.filter(l => l.vendaRealizada).length;
    const receita = v.leads.filter(l => l.valorVenda).reduce((sum, l) => sum + Number(l.valorVenda), 0);
    const taxaConversao = totalVendedor > 0 ? ((vendas / totalVendedor) * 100).toFixed(1) : '0';
    return { nome: v.nomeExibicao, leads: totalVendedor, vendas, receita, taxaConversao: `${taxaConversao}%` };
  }).filter(v => v.leads > 0);

  const receitaTotal = vendedoresResumo.reduce((sum, v) => sum + v.receita, 0);
  const taxaConversaoGeral = totalLeads > 0 ? ((vendasGanhas / totalLeads) * 100).toFixed(1) : '0';

  const dadosParaIA = {
    periodo: `${inicio.toLocaleDateString('pt-BR')} a ${fim.toLocaleDateString('pt-BR')}`,
    totalLeads,
    distribuicaoClasse: { A: leadsA, B: leadsB, C: leadsC },
    distribuicaoCanal: { bio: leadsBio, anuncio: leadsAnuncio },
    vendasGanhas,
    vendasPerdidas,
    taxaConversaoGeral: `${taxaConversaoGeral}%`,
    receitaTotal,
    vendedores: vendedoresResumo,
  };

  const prompt = `Voce e um analista comercial do programa Compativeis (programa de transformacao de relacionamentos, ticket medio R$1.229). Analise as metricas do periodo e gere um resumo executivo em 4-6 frases.

METRICAS DO PERIODO:
${JSON.stringify(dadosParaIA, null, 2)}

Inclua no resumo:
- Volume de leads e tendencia (bom, ruim, estavel)
- Performance de conversao (comparar com benchmark de 5-10% para leads frios, 15-25% para leads quentes)
- Destaque positivo (melhor vendedor, melhor canal, etc)
- Ponto de atencao ou alerta (se houver)
- Sugestao pratica de 1 acao para melhorar resultado

Seja direto, use numeros, nao seja generico. Escreva em portugues do Brasil.
Retorne APENAS o texto do resumo, sem JSON, sem markdown.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'Voce e um analista comercial objetivo e direto. Responde em texto corrido, sem bullets, sem markdown.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.4,
    max_tokens: 500,
  });

  const resumo = completion.choices[0]?.message?.content?.trim();
  return { metricas: dadosParaIA, resumoIA: resumo };
}

module.exports = { transcreverAudio, analisarTranscricao, processarCall, analisarPrintWhatsApp, gerarResumoEProximaAcao, gerarResumoPeriodo };
