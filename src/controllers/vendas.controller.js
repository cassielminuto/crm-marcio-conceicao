const prisma = require('../config/database');
const logger = require('../utils/logger');
const vendaService = require('../services/vendaService');

/**
 * Helper: converte body snake_case -> camelCase do Prisma e filtra
 * apenas campos editaveis via PATCH.
 *
 * IMPORTANTE: `recorrencia` NAO e editavel — e derivado pela logica D1
 * (vendaService detecta via count). `cicloVendaDias` NAO e recalculado
 * automaticamente quando dataPagamento muda — admin precisa ajustar
 * manualmente se quiser corrigir.
 */
function extrairDadosVendaUpdate(body) {
  const dados = {};
  if (body.valor_total !== undefined) dados.valorTotal = body.valor_total;
  if (body.taxas !== undefined) dados.taxas = body.taxas;
  if (body.valor_liquido !== undefined) dados.valorLiquido = body.valor_liquido;
  if (body.produto !== undefined) dados.produto = body.produto || null;
  if (body.metodo_pagamento !== undefined) dados.metodoPagamento = body.metodo_pagamento || null;
  if (body.parcelas !== undefined) dados.parcelas = body.parcelas;
  if (body.campanha_id !== undefined) dados.campanhaId = body.campanha_id || null;
  if (body.criativo_id !== undefined) dados.criativoId = body.criativo_id || null;
  if (body.closer_responsavel_id !== undefined) dados.closerResponsavelId = body.closer_responsavel_id || null;
  if (body.origem_venda !== undefined) dados.origemVenda = body.origem_venda || null;
  if (body.data_pagamento !== undefined) dados.dataPagamento = new Date(body.data_pagamento);
  if (body.ciclo_venda_dias !== undefined) dados.cicloVendaDias = body.ciclo_venda_dias;
  return dados;
}

const INCLUDE_PADRAO = {
  lead: { select: { id: true, nome: true, telefone: true, vendedorId: true } },
  campanha: { select: { id: true, nome: true, estrategia: true } },
  criativo: { select: { id: true, nome: true } },
  closerResponsavel: { select: { id: true, nomeExibicao: true } },
};

async function listar(req, res, next) {
  try {
    const {
      data_inicio,
      data_fim,
      campanha_id,
      criativo_id,
      closer_id,
      recorrencia,
      lead_id,
    } = req.query;

    const where = {};

    if (data_inicio || data_fim) {
      where.dataPagamento = {};
      if (data_inicio) where.dataPagamento.gte = new Date(data_inicio);
      if (data_fim) where.dataPagamento.lte = new Date(data_fim);
    }

    if (campanha_id) where.campanhaId = parseInt(campanha_id, 10);
    if (criativo_id) where.criativoId = parseInt(criativo_id, 10);
    if (closer_id) where.closerResponsavelId = parseInt(closer_id, 10);
    if (lead_id) where.leadId = parseInt(lead_id, 10);

    if (recorrencia === 'true') where.recorrencia = true;
    if (recorrencia === 'false') where.recorrencia = false;

    // Vendedor ve apenas Vendas dos seus proprios leads (consistente com leads.controller)
    if (req.usuario.perfil === 'vendedor' && req.usuario.vendedorId) {
      where.lead = { vendedorId: req.usuario.vendedorId };
    }

    const vendas = await prisma.venda.findMany({
      where,
      include: INCLUDE_PADRAO,
      orderBy: { dataPagamento: 'desc' },
    });

    const totalVendas = vendas.length;
    const faturamento = vendas.reduce((s, v) => s + Number(v.valorTotal || 0), 0);

    res.json({ vendas, totalVendas, faturamento });
  } catch (err) {
    next(err);
  }
}

async function detalhe(req, res, next) {
  try {
    const { id } = req.params;
    const venda = await prisma.venda.findUnique({
      where: { id: parseInt(id, 10) },
      include: INCLUDE_PADRAO,
    });

    if (!venda) return res.status(404).json({ error: 'Venda nao encontrada' });

    // Vendedor so pode ver Venda do lead dele
    if (req.usuario.perfil === 'vendedor' && req.usuario.vendedorId) {
      if (venda.lead?.vendedorId !== req.usuario.vendedorId) {
        return res.status(403).json({ error: 'Sem acesso a esta Venda' });
      }
    }

    res.json(venda);
  } catch (err) {
    next(err);
  }
}

async function criar(req, res, next) {
  try {
    const {
      lead_id,
      valor_total,
      data_pagamento,
      produto,
      taxas,
      valor_liquido,
      metodo_pagamento,
      parcelas,
      campanha_id,
      criativo_id,
      closer_responsavel_id,
      origem_venda,
    } = req.body;

    const venda = await vendaService.criarVendaManual({
      leadId: lead_id,
      valorTotal: valor_total,
      dataPagamento: data_pagamento,
      produto,
      taxas,
      valorLiquido: valor_liquido,
      metodoPagamento: metodo_pagamento,
      parcelas,
      campanhaId: campanha_id,
      criativoId: criativo_id,
      closerResponsavelId: closer_responsavel_id,
      origemVenda: origem_venda,
    });

    // Re-fetch com includes pra retornar shape consistente com listar/detalhe
    const completa = await prisma.venda.findUnique({
      where: { id: venda.id },
      include: INCLUDE_PADRAO,
    });

    res.status(201).json(completa);
  } catch (err) {
    // criarVendaManual lanca Error com mensagem amigavel
    if (err.message?.startsWith('criarVendaManual:')) {
      return res.status(400).json({ error: err.message.replace('criarVendaManual: ', '') });
    }
    next(err);
  }
}

async function atualizar(req, res, next) {
  try {
    const { id } = req.params;
    const existente = await prisma.venda.findUnique({ where: { id: parseInt(id, 10) } });
    if (!existente) return res.status(404).json({ error: 'Venda nao encontrada' });

    const dados = extrairDadosVendaUpdate(req.body);

    // Validacao defensiva: valorTotal precisa ser positivo se fornecido
    if (dados.valorTotal !== undefined && (typeof dados.valorTotal !== 'number' || dados.valorTotal <= 0)) {
      return res.status(400).json({ error: 'valor_total deve ser numero positivo' });
    }

    const venda = await prisma.venda.update({
      where: { id: parseInt(id, 10) },
      data: dados,
      include: INCLUDE_PADRAO,
    });

    logger.info(`Venda atualizada: #${venda.id}`);
    res.json(venda);
  } catch (err) {
    next(err);
  }
}

async function excluir(req, res, next) {
  try {
    const { id } = req.params;
    const venda = await prisma.venda.findUnique({ where: { id: parseInt(id, 10) } });
    if (!venda) return res.status(404).json({ error: 'Venda nao encontrada' });

    await prisma.venda.delete({ where: { id: parseInt(id, 10) } });
    logger.info(`Venda excluida (hard delete): #${venda.id} (lead #${venda.leadId}, R$ ${venda.valorTotal})`);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, detalhe, criar, atualizar, excluir };
