const prisma = require('../config/database');
const logger = require('../utils/logger');

// Helper: body snake_case -> data camelCase do Prisma
function extrairDadosCampanha(body) {
  const dados = {};
  if (body.meta_campaign_id !== undefined) dados.metaCampaignId = body.meta_campaign_id || null;
  if (body.nome !== undefined) dados.nome = body.nome;
  if (body.estrategia !== undefined) dados.estrategia = body.estrategia;
  if (body.status !== undefined) dados.status = body.status;
  if (body.budget_diario !== undefined) dados.budgetDiario = body.budget_diario;
  if (body.data_inicio !== undefined) dados.dataInicio = body.data_inicio ? new Date(body.data_inicio) : null;
  if (body.data_fim !== undefined) dados.dataFim = body.data_fim ? new Date(body.data_fim) : null;
  return dados;
}

async function listar(req, res, next) {
  try {
    const { estrategia, status } = req.query;
    const where = {};
    if (estrategia) where.estrategia = estrategia;
    if (status) where.status = status;

    const campanhas = await prisma.campanha.findMany({
      where,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      include: {
        _count: { select: { criativos: true } },
      },
    });

    res.json(campanhas);
  } catch (err) {
    next(err);
  }
}

async function detalhe(req, res, next) {
  try {
    const { id } = req.params;
    const campanha = await prisma.campanha.findUnique({
      where: { id: parseInt(id, 10) },
      include: {
        criativos: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!campanha) return res.status(404).json({ error: 'Campanha nao encontrada' });
    res.json(campanha);
  } catch (err) {
    next(err);
  }
}

async function criar(req, res, next) {
  try {
    const dados = extrairDadosCampanha(req.body);
    // Campos obrigatorios ja validados pelo Zod (nome, estrategia)
    const campanha = await prisma.campanha.create({ data: dados });
    logger.info(`Campanha criada: #${campanha.id} "${campanha.nome}" (${campanha.estrategia})`);
    res.status(201).json(campanha);
  } catch (err) {
    if (err.code === 'P2002' && err.meta?.target?.includes('meta_campaign_id')) {
      return res.status(409).json({ error: 'Ja existe uma campanha com esse meta_campaign_id' });
    }
    next(err);
  }
}

async function atualizar(req, res, next) {
  try {
    const { id } = req.params;
    const existente = await prisma.campanha.findUnique({ where: { id: parseInt(id, 10) } });
    if (!existente) return res.status(404).json({ error: 'Campanha nao encontrada' });

    const dados = extrairDadosCampanha(req.body);
    const campanha = await prisma.campanha.update({
      where: { id: parseInt(id, 10) },
      data: dados,
    });
    logger.info(`Campanha atualizada: #${campanha.id}`);
    res.json(campanha);
  } catch (err) {
    if (err.code === 'P2002' && err.meta?.target?.includes('meta_campaign_id')) {
      return res.status(409).json({ error: 'Ja existe uma campanha com esse meta_campaign_id' });
    }
    next(err);
  }
}

async function excluir(req, res, next) {
  try {
    const { id } = req.params;
    const campanha = await prisma.campanha.findUnique({
      where: { id: parseInt(id, 10) },
      include: { _count: { select: { criativos: true } } },
    });
    if (!campanha) return res.status(404).json({ error: 'Campanha nao encontrada' });

    // FK RESTRICT impede delete se tiver criativos — mensagem explicita
    if (campanha._count.criativos > 0) {
      return res.status(409).json({
        error: `Campanha tem ${campanha._count.criativos} criativo(s). Exclua ou mova os criativos antes.`,
        criativos: campanha._count.criativos,
      });
    }

    await prisma.campanha.delete({ where: { id: parseInt(id, 10) } });
    logger.info(`Campanha excluida: #${campanha.id} "${campanha.nome}"`);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, detalhe, criar, atualizar, excluir };
