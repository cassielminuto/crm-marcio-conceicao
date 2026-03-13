const prisma = require('../config/database');

async function listar(req, res, next) {
  try {
    const { periodo } = req.query;
    const where = {};
    if (periodo) where.periodo = periodo;

    const metas = await prisma.meta.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        vendedor: { select: { id: true, nomeExibicao: true, papel: true } },
      },
    });

    res.json(metas);
  } catch (err) {
    next(err);
  }
}

async function criar(req, res, next) {
  try {
    const { vendedor_id, periodo, valor_meta, leads_meta } = req.body;

    const meta = await prisma.meta.create({
      data: {
        vendedorId: vendedor_id,
        periodo,
        valorMeta: valor_meta,
        leadsMeta: leads_meta || null,
      },
      include: {
        vendedor: { select: { id: true, nomeExibicao: true, papel: true } },
      },
    });

    res.status(201).json(meta);
  } catch (err) {
    next(err);
  }
}

async function atualizar(req, res, next) {
  try {
    const { id } = req.params;
    const { valor_meta, valor_atual, leads_meta, leads_atual, status } = req.body;

    const dados = {};
    if (valor_meta !== undefined) dados.valorMeta = valor_meta;
    if (valor_atual !== undefined) dados.valorAtual = valor_atual;
    if (leads_meta !== undefined) dados.leadsMeta = leads_meta;
    if (leads_atual !== undefined) dados.leadsAtual = leads_atual;
    if (status !== undefined) dados.status = status;

    // Recalcular percentual
    if (dados.valorAtual !== undefined || dados.valorMeta !== undefined) {
      const meta = await prisma.meta.findUnique({ where: { id: parseInt(id, 10) } });
      const novoAtual = dados.valorAtual ?? Number(meta.valorAtual);
      const novaMeta = dados.valorMeta ?? Number(meta.valorMeta);
      dados.percentual = novaMeta > 0 ? Math.round((novoAtual / novaMeta) * 10000) / 100 : 0;
    }

    const meta = await prisma.meta.update({
      where: { id: parseInt(id, 10) },
      data: dados,
      include: {
        vendedor: { select: { id: true, nomeExibicao: true, papel: true } },
      },
    });

    res.json(meta);
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, criar, atualizar };
