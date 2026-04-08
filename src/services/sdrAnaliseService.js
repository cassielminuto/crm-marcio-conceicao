const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const prisma = require('../config/database');
const env = require('../config/env');
const logger = require('../utils/logger');

const openai = new OpenAI({ apiKey: env.openaiApiKey });

const PROMPT_ANALISE_INCREMENTAL = `Voce e um SDR experiente analisando uma conversa de Instagram DM para o Programa Compativeis do Marcio Conceicao (programa de transformacao de relacionamentos para casais).

Glossario de valores aceitos para os campos enum:
- temperaturaInicial: "frio" | "morno" | "quente"
- temperaturaFinal: "frio" | "morno" | "quente"
- tentouSolucaoAnterior: "sim" | "nao" | "parcialmente"
- decisaoRota: "convidar" | "lixeira"
- aceitouDiagnostico: "sim" | "nao" | "pendente"

Regras:
- Se nao tiver evidencia clara no print, retorne null pro campo. NUNCA invente.
- Seja conservador na temperatura — so marque "quente" se o lead demonstrar interesse explicito em resolver o problema.
- "morno" = demonstra interesse mas ainda nao tomou decisao. "frio" = apenas interagiu sem mostrar dor.

Retorne APENAS JSON valido, sem markdown, sem explicacao fora do JSON.

Campos do JSON de retorno:
{
  "respostaLead": string | null,
  "temperaturaInicial": "frio" | "morno" | "quente" | null,
  "dorAparente": string | null,
  "tentouSolucaoAnterior": "sim" | "nao" | "parcialmente" | null,
  "temperaturaFinal": "frio" | "morno" | "quente" | null,
  "decisaoRota": "convidar" | "lixeira" | null,
  "detalheSituacao": string | null,
  "aceitouDiagnostico": "sim" | "nao" | "pendente" | null,
  "confiancaAnalise": number (0-100),
  "observacoesIA": string | null
}`;

async function analisarPrintIncremental(leadSdrId, novoPrintPath) {
  const lead = await prisma.leadSDR.findUnique({
    where: { id: leadSdrId },
    select: { analiseIaCache: true, instagram: true, nome: true },
  });

  if (!lead) throw new Error('Lead SDR nao encontrado');

  const cacheAnterior = lead.analiseIaCache || null;

  // Build message content
  const content = [];

  // Text with context
  let textPrompt = PROMPT_ANALISE_INCREMENTAL;
  if (cacheAnterior) {
    textPrompt += `\n\nAnalise consolidada anterior (baseada em prints anteriores):\n${JSON.stringify(cacheAnterior, null, 2)}\n\nAgora analise o NOVO print abaixo e ATUALIZE a analise considerando toda a conversa ate aqui.`;
  } else {
    textPrompt += `\n\nEsta e a primeira analise deste lead. Analise o print abaixo.`;
  }
  content.push({ type: 'text', text: textPrompt });

  // Image
  const absolutePath = path.join(__dirname, '..', '..', novoPrintPath);
  const imageBuffer = fs.readFileSync(absolutePath);
  const base64 = imageBuffer.toString('base64');
  const ext = path.extname(novoPrintPath).toLowerCase();
  const mimeMap = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
  const mimeType = mimeMap[ext] || 'image/jpeg';
  content.push({
    type: 'image_url',
    image_url: { url: `data:${mimeType};base64,${base64}` },
  });

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content }],
    max_tokens: 1500,
    temperature: 0.3,
  });

  const raw = response.choices[0].message.content.trim();

  // Parse JSON — handle markdown code fences
  let analiseNova;
  try {
    const cleaned = raw.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '');
    analiseNova = JSON.parse(cleaned);
  } catch (parseErr) {
    logger.error(`Falha ao parsear JSON da analise IA para LeadSDR #${leadSdrId}: ${raw}`);
    throw new Error('IA retornou JSON invalido');
  }

  // Update cache on lead
  await prisma.leadSDR.update({
    where: { id: leadSdrId },
    data: { analiseIaCache: analiseNova },
  });

  logger.info(`Analise IA incremental concluida para LeadSDR #${leadSdrId} — confianca: ${analiseNova.confiancaAnalise || '?'}%`);

  return {
    analiseAtual: analiseNova,
    analiseAnterior: cacheAnterior,
  };
}

async function aplicarSugestoesIA(leadSdrId, camposAceitos) {
  // Filter to only valid SDR lead fields
  const camposValidos = ['respostaLead', 'temperaturaInicial', 'dorAparente', 'tentouSolucaoAnterior',
    'temperaturaFinal', 'decisaoRota', 'detalheSituacao', 'aceitouDiagnostico'];

  const dados = {};
  for (const [campo, valor] of Object.entries(camposAceitos)) {
    if (camposValidos.includes(campo) && valor !== null && valor !== undefined) {
      dados[campo] = valor;
    }
  }

  if (Object.keys(dados).length === 0) {
    throw new Error('Nenhum campo valido para aplicar');
  }

  const lead = await prisma.leadSDR.update({
    where: { id: leadSdrId },
    data: dados,
  });

  logger.info(`Sugestoes IA aplicadas ao LeadSDR #${leadSdrId}: ${Object.keys(dados).join(', ')}`);
  return lead;
}

module.exports = { analisarPrintIncremental, aplicarSugestoesIA };
