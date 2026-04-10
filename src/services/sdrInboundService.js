const prisma = require('../config/database');
const logger = require('../utils/logger');

const ETAPAS_INBOUND = [
  'novo_lead',
  'tentativa_contato',
  'contato_feito',
  'reuniao_marcada',
  'passado_closer',
  'nao_qualificado',
];

function validarMovimentacao(lead, etapaDestino) {
  if (!ETAPAS_INBOUND.includes(etapaDestino)) {
    return { valido: false, erro: `Etapa "${etapaDestino}" não é válida. Etapas: ${ETAPAS_INBOUND.join(', ')}` };
  }

  // Mover pra nao_qualificado é permitido de qualquer etapa
  if (etapaDestino === 'nao_qualificado') {
    return { valido: true };
  }

  // Voltar de nao_qualificado só pra novo_lead
  if (lead.etapa === 'nao_qualificado' && etapaDestino !== 'novo_lead') {
    return { valido: false, erro: 'Lead não qualificado só pode voltar para novo_lead' };
  }

  // passado_closer só via handoff (não via mover direto)
  if (etapaDestino === 'passado_closer') {
    return { valido: false, erro: 'Use o endpoint de handoff para passar lead ao closer' };
  }

  // reuniao_marcada requer dataReuniao e closerDestinoId
  if (etapaDestino === 'reuniao_marcada') {
    const camposFaltando = [];
    if (!lead.dataReuniao) camposFaltando.push('dataReuniao');
    if (!lead.closerDestinoId) camposFaltando.push('closerDestinoId');
    if (camposFaltando.length > 0) {
      return { valido: false, camposFaltando, erro: 'Preencha dataReuniao e closerDestinoId antes de mover para reuniao_marcada' };
    }
  }

  return { valido: true };
}

async function executarHandoff(leadInbound) {
  const novoLead = await prisma.lead.create({
    data: {
      nome: leadInbound.nome,
      telefone: leadInbound.telefone,
      email: leadInbound.email || null,
      canal: 'anuncio',
      formularioTitulo: leadInbound.formularioOrigem,
      pontuacao: 0,
      classe: leadInbound.classe || 'B',
      etapaFunil: 'qualificado',
      status: 'em_abordagem',
      vendedorId: leadInbound.closerDestinoId,
      dadosRespondi: leadInbound.dadosRespondi,
      dorPrincipal: leadInbound.dorPrincipal,
      dataPreenchimento: leadInbound.createdAt,
      dataAtribuicao: new Date(),
    },
  });

  // Criar interação com briefing
  const obsTexto = leadInbound.observacoes
    ? `[Vindo do SDR Inbound - Thomaz] ${leadInbound.observacoes}`
    : '[Vindo do SDR Inbound - Thomaz] Sem observações adicionais';

  await prisma.interacao.create({
    data: {
      leadId: novoLead.id,
      vendedorId: leadInbound.closerDestinoId,
      tipo: 'nota',
      conteudo: `## Briefing SDR Inbound\n**Dor principal:** ${leadInbound.dorPrincipal || 'Não informada'}\n**Observações:** ${obsTexto}\n**Próximo passo:** ${leadInbound.proximoPasso || 'Não definido'}`,
    },
  });

  // Atualizar LeadSDRInbound
  await prisma.leadSDRInbound.update({
    where: { id: leadInbound.id },
    data: {
      etapa: 'passado_closer',
      leadCloserId: novoLead.id,
    },
  });

  // Histórico do funil
  await prisma.funilHistorico.create({
    data: {
      leadId: novoLead.id,
      etapaNova: 'qualificado',
      vendedorId: leadInbound.closerDestinoId,
      motivo: `Handoff SDR Inbound — Lead #${leadInbound.id}`,
    },
  });

  // Incrementar leads ativos do closer
  await prisma.vendedor.update({
    where: { id: leadInbound.closerDestinoId },
    data: { leadsAtivos: { increment: 1 } },
  });

  logger.info(`Handoff SDR Inbound: LeadInbound #${leadInbound.id} → Lead Closer #${novoLead.id}`);

  return novoLead;
}

module.exports = {
  ETAPAS_INBOUND,
  validarMovimentacao,
  executarHandoff,
};
