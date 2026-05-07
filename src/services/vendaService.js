const prisma = require('../config/database');
const logger = require('../utils/logger');

/**
 * vendaService — criacao centralizada de Venda (Fase 2 do plano).
 *
 * Existe 1 caminho automatico (webhook Hubla) e 1 caminho manual (admin).
 * Dedupe por hublaInvoiceId (unique constraint) protege contra retry do
 * webhook. D1 do plano: primeira cobranca paga por lead = recorrencia=false;
 * cobrancas subsequentes = recorrencia=true (permite separar CAC de LTV).
 */

// ============================================================================
// EXTRATORES DEFENSIVOS DO PAYLOAD HUBLA
// ============================================================================
//
// Payload Hubla v2 confirmado:
//   event.product.name
//   event.invoice.id
//   event.invoice.amount.subtotalCents
//   event.invoice.payer (nome, email, phone)
//   event.invoice.saleDate / invoice.createdAt
//   event.invoice.status
//
// Campos abaixo sao tentativas com fallback null — paths reais a confirmar
// quando tiver payload completo na mao (TODO-ajuste-paths).

function extrairMetodoPagamento(invoice) {
  return invoice?.paymentMethod || invoice?.method || null;
}

function extrairParcelas(invoice) {
  const p = invoice?.installments ?? invoice?.parcels;
  return typeof p === 'number' && p > 0 ? p : null;
}

function extrairOrderBumps(invoice) {
  if (Array.isArray(invoice?.orderBumps)) return invoice.orderBumps;
  if (Array.isArray(invoice?.bumps)) return invoice.bumps;
  return null;
}

function extrairUtmsCheckout(payload) {
  return payload?.event?.invoice?.utms || payload?.utms || null;
}

function extrairFbclidCheckout(payload) {
  const utms = extrairUtmsCheckout(payload);
  return utms?.fbclid || null;
}

// ============================================================================
// FUNCOES PURAS (exports pra teste unitario)
// ============================================================================

/**
 * Deriva origemVenda do canal do Lead.
 * Valores possiveis: "manual", "bio", "anuncio_legacy", "evento", "outro".
 */
function derivarOrigemVenda(lead) {
  if (!lead) return 'manual';
  if (lead.canal === 'anuncio') return 'anuncio_legacy';
  if (lead.canal === 'bio') return 'bio';
  if (lead.canal === 'evento') return 'evento';
  return 'outro';
}

/**
 * Calcula ciclo de venda em dias inteiros (floor).
 * Retorna null se alguma data ausente ou se dataPagamento < createdAt
 * (evita negativos que bagunçam metrica).
 */
function calcularCicloVendaDias(dataPagamento, leadCreatedAt) {
  if (!dataPagamento || !leadCreatedAt) return null;
  const diff = new Date(dataPagamento).getTime() - new Date(leadCreatedAt).getTime();
  if (Number.isNaN(diff) || diff < 0) return null;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// ============================================================================
// CRIACAO VIA WEBHOOK HUBLA
// ============================================================================

/**
 * Cria Venda a partir de payload do webhook Hubla.
 * Dedupe por hublaInvoiceId (unique constraint no schema) — tenta criar
 * direto e intercepta P2002, imune a race.
 *
 * D1: se Lead ja tem Venda com recorrencia=false, marca nova como
 * recorrencia=true. Edge case conhecido: 2 webhooks simultaneos do mesmo
 * Lead (Hubla nao emite paralelo na pratica; aceito).
 *
 * @param {object} payload - body do webhook Hubla
 * @param {number} leadId - ID do Lead ja resolvido pelo hubla.controller
 * @returns {Promise<{venda: Venda|null, criada: boolean}>}
 */
async function criarVendaDeHubla(payload, leadId) {
  const event = payload?.event || {};
  const invoice = event.invoice || {};
  const product = event.product || {};

  const hublaInvoiceId = invoice.id || null;
  const subtotalCents = invoice.amount?.subtotalCents || 0;
  const valorTotal = subtotalCents / 100;

  if (valorTotal <= 0) {
    logger.warn(`vendaService: payload Hubla sem valor > 0 (invoice ${hublaInvoiceId || 'sem_id'}), nao criando Venda`);
    return { venda: null, criada: false };
  }

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) {
    throw new Error(`vendaService: Lead #${leadId} nao encontrado`);
  }

  // D1: recorrencia = true se ja existe Venda anterior (recorrencia=false) desse lead
  const vendasAnteriores = await prisma.venda.count({
    where: { leadId, recorrencia: false },
  });
  const recorrencia = vendasAnteriores > 0;

  const dataPagamentoRaw = invoice.saleDate || invoice.createdAt || new Date();
  const dataPagamento = new Date(dataPagamentoRaw);

  const dadosVenda = {
    leadId,
    hublaInvoiceId,
    produto: product.name || null,
    valorTotal,
    // taxas/valorLiquido: nao vem no payload Hubla atual — default 0 / null
    metodoPagamento: extrairMetodoPagamento(invoice),
    parcelas: extrairParcelas(invoice),
    orderBumpsAceitos: extrairOrderBumps(invoice),
    utmsCheckout: extrairUtmsCheckout(payload),
    fbclidCheckout: extrairFbclidCheckout(payload),
    closerResponsavelId: lead.vendedorId || null,
    campanhaId: lead.campanhaId || null,
    criativoId: lead.criativoId || null,
    origemVenda: derivarOrigemVenda(lead),
    recorrencia,
    dataPagamento,
    cicloVendaDias: calcularCicloVendaDias(dataPagamento, lead.createdAt),
  };

  try {
    const venda = await prisma.venda.create({ data: dadosVenda });
    logger.info(`vendaService: Venda #${venda.id} criada (lead #${leadId}, ${recorrencia ? 'recorrente' : 'primeira'}, R$ ${valorTotal})`);
    return { venda, criada: true };
  } catch (err) {
    if (err.code === 'P2002' && err.meta?.target?.includes('hubla_invoice_id')) {
      const existente = await prisma.venda.findUnique({ where: { hublaInvoiceId } });
      logger.info(`vendaService: Venda ja existe pra hublaInvoiceId ${hublaInvoiceId} (#${existente?.id || '?'}), nao duplicando`);
      return { venda: existente, criada: false };
    }
    throw err;
  }
}

// ============================================================================
// CRIACAO MANUAL (admin)
// ============================================================================

/**
 * Cria Venda manualmente. Sem dedup por hublaInvoiceId (manual nao tem
 * invoice). D1 aplica: 1a venda do lead = recorrencia=false; subsequentes
 * = true (mesmo comportamento do caminho automatico).
 *
 * campanhaId / criativoId / closerResponsavelId: se nao vierem no input,
 * fallback pros valores do Lead (atribuicao herdada).
 *
 * @param {object} input
 * @returns {Promise<Venda>}
 */
async function criarVendaManual(input) {
  const {
    leadId,
    produto,
    valorTotal,
    taxas,
    valorLiquido,
    metodoPagamento,
    parcelas,
    campanhaId,
    criativoId,
    closerResponsavelId,
    origemVenda,
    dataPagamento,
  } = input || {};

  if (!leadId) throw new Error('criarVendaManual: leadId obrigatorio');
  if (typeof valorTotal !== 'number' || valorTotal <= 0) {
    throw new Error('criarVendaManual: valorTotal > 0 obrigatorio');
  }
  if (!dataPagamento) throw new Error('criarVendaManual: dataPagamento obrigatorio');

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw new Error(`criarVendaManual: Lead #${leadId} nao encontrado`);

  const vendasAnteriores = await prisma.venda.count({
    where: { leadId, recorrencia: false },
  });
  const recorrencia = vendasAnteriores > 0;

  const dp = new Date(dataPagamento);

  const venda = await prisma.venda.create({
    data: {
      leadId,
      hublaInvoiceId: null,
      produto: produto || null,
      valorTotal,
      taxas: taxas || 0,
      valorLiquido: valorLiquido || null,
      metodoPagamento: metodoPagamento || null,
      parcelas: parcelas || null,
      orderBumpsAceitos: null,
      utmsCheckout: null,
      fbclidCheckout: null,
      closerResponsavelId: closerResponsavelId ?? lead.vendedorId ?? null,
      campanhaId: campanhaId ?? lead.campanhaId ?? null,
      criativoId: criativoId ?? lead.criativoId ?? null,
      origemVenda: origemVenda || 'manual',
      recorrencia,
      dataPagamento: dp,
      cicloVendaDias: calcularCicloVendaDias(dp, lead.createdAt),
    },
  });

  logger.info(`vendaService: Venda manual #${venda.id} criada (lead #${leadId}, R$ ${valorTotal})`);
  return venda;
}

module.exports = {
  criarVendaDeHubla,
  criarVendaManual,
  // Exports pra teste unitario
  derivarOrigemVenda,
  calcularCicloVendaDias,
  extrairMetodoPagamento,
  extrairParcelas,
  extrairOrderBumps,
  extrairUtmsCheckout,
  extrairFbclidCheckout,
};
