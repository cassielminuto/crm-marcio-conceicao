const prisma = require('../config/database');
const logger = require('../utils/logger');

const ETAPAS_SDR = [
  'f1_abertura',
  'f2_conexao',
  'f3_qualificacao',
  'f4_convite',
  'reuniao_marcada',
  'lixeira',
];

const camposObrigatoriosPorTransicao = {
  'f1_abertura->f2_conexao': ['respostaLead', 'temperaturaInicial'],
  'f2_conexao->f3_qualificacao': ['tentouSolucaoAnterior', 'temperaturaFinal', 'decisaoRota'],
  'f3_qualificacao->f4_convite': ['aceitouDiagnostico'],
  'f4_convite->reuniao_marcada': ['whatsapp', 'dataReuniao', 'closerDestinoId', 'resumoSituacao', 'tomEmocional', 'oqueFuncionou'],
};

function validarMovimentacao(lead, etapaDestino) {
  if (etapaDestino === 'lixeira') {
    return { valido: true, camposFaltando: [] };
  }

  if (lead.etapa === 'lixeira' && etapaDestino === 'f1_abertura') {
    return { valido: true, camposFaltando: [] };
  }

  const idxAtual = ETAPAS_SDR.indexOf(lead.etapa);
  const idxDestino = ETAPAS_SDR.indexOf(etapaDestino);

  if (idxDestino === -1) {
    return { valido: false, camposFaltando: [], erro: `Etapa "${etapaDestino}" nao existe` };
  }

  if (idxDestino !== idxAtual + 1) {
    return { valido: false, camposFaltando: [], erro: `Transicao de "${lead.etapa}" para "${etapaDestino}" nao permitida. Avance uma fase por vez.` };
  }

  const chave = `${lead.etapa}->${etapaDestino}`;
  const camposExigidos = camposObrigatoriosPorTransicao[chave] || [];
  const camposFaltando = camposExigidos.filter((campo) => {
    const valor = lead[campo];
    return valor === null || valor === undefined || valor === '';
  });

  if (camposFaltando.length > 0) {
    return { valido: false, camposFaltando };
  }

  return { valido: true, camposFaltando: [] };
}

async function executarHandoff(leadSdr) {
  const novoLead = await prisma.lead.create({
    data: {
      nome: leadSdr.nome,
      telefone: leadSdr.whatsapp,
      canal: 'bio',
      classe: 'A',
      etapaFunil: 'qualificado',
      vendedorId: leadSdr.closerDestinoId,
      status: 'em_abordagem',
      dorPrincipal: [leadSdr.dorAparente, leadSdr.detalheSituacao].filter(Boolean).join(' — '),
      resumoConversa: [leadSdr.resumoSituacao, leadSdr.resumoIa].filter(Boolean).join('\n\n'),
      proximaAcao: 'Call de diagnostico',
      proximaAcaoData: leadSdr.dataReuniao,
      dataAtribuicao: new Date(),
      pontuacao: 85,
    },
  });

  const briefingParts = [
    `## Briefing SDR — Lead Instagram`,
    `**Tom emocional:** ${leadSdr.tomEmocional}`,
    `**O que funcionou:** ${leadSdr.oqueFuncionou}`,
    leadSdr.oqueEvitar ? `**O que evitar:** ${leadSdr.oqueEvitar}` : null,
    leadSdr.fraseChaveLead ? `**Frase-chave:** "${leadSdr.fraseChaveLead}"` : null,
    leadSdr.resumoIa ? `\n**Resumo IA:**\n${leadSdr.resumoIa}` : null,
  ].filter(Boolean).join('\n');

  await prisma.interacao.create({
    data: {
      leadId: novoLead.id,
      vendedorId: leadSdr.closerDestinoId,
      tipo: 'nota',
      conteudo: briefingParts,
    },
  });

  await prisma.leadSDR.update({
    where: { id: leadSdr.id },
    data: {
      leadCloserId: novoLead.id,
      handoffRealizadoEm: new Date(),
    },
  });

  await prisma.vendedor.update({
    where: { id: leadSdr.closerDestinoId },
    data: { leadsAtivos: { increment: 1 } },
  });

  await prisma.funilHistorico.create({
    data: {
      leadId: novoLead.id,
      etapaAnterior: null,
      etapaNova: 'qualificado',
      vendedorId: leadSdr.closerDestinoId,
      motivo: `Handoff SDR Instagram — @${leadSdr.instagram}`,
    },
  });

  logger.info(`Handoff SDR: LeadSDR #${leadSdr.id} (@${leadSdr.instagram}) -> Lead #${novoLead.id} para closer #${leadSdr.closerDestinoId}`);

  return novoLead;
}

module.exports = {
  ETAPAS_SDR,
  camposObrigatoriosPorTransicao,
  validarMovimentacao,
  executarHandoff,
};
