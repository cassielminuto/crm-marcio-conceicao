const prisma = require('../config/database');
const logger = require('../utils/logger');

function extrairDadosCriativo(body) {
  const dados = {};
  if (body.meta_ad_id !== undefined) dados.metaAdId = body.meta_ad_id || null;
  if (body.nome !== undefined) dados.nome = body.nome;
  if (body.formato !== undefined) dados.formato = body.formato;
  if (body.angulo !== undefined) dados.angulo = body.angulo || null;
  if (body.narrativa !== undefined) dados.narrativa = body.narrativa || null;
  if (body.origem_producao !== undefined) dados.origemProducao = body.origem_producao || null;
  return dados;
}

async function listar(req, res, next) {
  try {
    const { campanha_id } = req.query;
    const where = {};
    if (campanha_id) where.campanhaId = parseInt(campanha_id, 10);

    const criativos = await prisma.criativo.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        campanha: { select: { id: true, nome: true, estrategia: true, status: true } },
      },
    });

    res.json(criativos);
  } catch (err) {
    next(err);
  }
}

async function detalhe(req, res, next) {
  try {
    const { id } = req.params;
    const criativo = await prisma.criativo.findUnique({
      where: { id: parseInt(id, 10) },
      include: {
        campanha: { select: { id: true, nome: true, estrategia: true, status: true } },
      },
    });
    if (!criativo) return res.status(404).json({ error: 'Criativo nao encontrado' });
    res.json(criativo);
  } catch (err) {
    next(err);
  }
}

async function criar(req, res, next) {
  try {
    const { campanha_id } = req.body;
    // Validar que a campanha existe (FK RESTRICT vai falhar com P2003, mas mensagem customizada ajuda)
    const campanha = await prisma.campanha.findUnique({ where: { id: campanha_id } });
    if (!campanha) return res.status(404).json({ error: `Campanha #${campanha_id} nao encontrada` });

    const dados = extrairDadosCriativo(req.body);
    dados.campanhaId = campanha_id;

    const criativo = await prisma.criativo.create({ data: dados });
    logger.info(`Criativo criado: #${criativo.id} "${criativo.nome}" em campanha #${campanha_id}`);
    res.status(201).json(criativo);
  } catch (err) {
    if (err.code === 'P2002' && err.meta?.target?.includes('meta_ad_id')) {
      return res.status(409).json({ error: 'Ja existe um criativo com esse meta_ad_id' });
    }
    next(err);
  }
}

async function atualizar(req, res, next) {
  try {
    const { id } = req.params;
    const existente = await prisma.criativo.findUnique({ where: { id: parseInt(id, 10) } });
    if (!existente) return res.status(404).json({ error: 'Criativo nao encontrado' });

    // campanha_id nao e editavel via PATCH — criativo nao muda de campanha
    const dados = extrairDadosCriativo(req.body);
    const criativo = await prisma.criativo.update({
      where: { id: parseInt(id, 10) },
      data: dados,
    });
    logger.info(`Criativo atualizado: #${criativo.id}`);
    res.json(criativo);
  } catch (err) {
    if (err.code === 'P2002' && err.meta?.target?.includes('meta_ad_id')) {
      return res.status(409).json({ error: 'Ja existe um criativo com esse meta_ad_id' });
    }
    next(err);
  }
}

async function excluir(req, res, next) {
  try {
    const { id } = req.params;
    const criativo = await prisma.criativo.findUnique({ where: { id: parseInt(id, 10) } });
    if (!criativo) return res.status(404).json({ error: 'Criativo nao encontrado' });

    await prisma.criativo.delete({ where: { id: parseInt(id, 10) } });
    logger.info(`Criativo excluido: #${criativo.id} "${criativo.nome}"`);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, detalhe, criar, atualizar, excluir };
