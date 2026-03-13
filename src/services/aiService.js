const OpenAI = require('openai');
const fs = require('fs');
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

async function transcreverAudio(caminhoAudio) {
  logger.info(`Transcrevendo audio: ${caminhoAudio}`);

  const transcription = await openai.audio.transcriptions.create({
    file: fs.createReadStream(caminhoAudio),
    model: 'whisper-1',
    language: 'pt',
    response_format: 'text',
  });

  logger.info(`Transcricao concluida: ${transcription.length} caracteres`);
  return transcription;
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

module.exports = { transcreverAudio, analisarTranscricao, processarCall };
