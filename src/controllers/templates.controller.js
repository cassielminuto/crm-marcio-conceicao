const prisma = require('../config/database');

async function listar(req, res, next) {
  try {
    const templates = await prisma.templateMensagem.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(templates);
  } catch (err) {
    next(err);
  }
}

async function criar(req, res, next) {
  try {
    const { nome, conteudo, etapa_funil, classe_lead, tipo } = req.body;

    const template = await prisma.templateMensagem.create({
      data: {
        nome,
        conteudo,
        etapaFunil: etapa_funil || null,
        classeLead: classe_lead || 'todos',
        tipo: tipo || 'whatsapp',
      },
    });

    res.status(201).json(template);
  } catch (err) {
    next(err);
  }
}

async function atualizar(req, res, next) {
  try {
    const { id } = req.params;
    const { nome, conteudo, etapa_funil, classe_lead, tipo, ativo } = req.body;

    const dados = {};
    if (nome !== undefined) dados.nome = nome;
    if (conteudo !== undefined) dados.conteudo = conteudo;
    if (etapa_funil !== undefined) dados.etapaFunil = etapa_funil;
    if (classe_lead !== undefined) dados.classeLead = classe_lead;
    if (tipo !== undefined) dados.tipo = tipo;
    if (ativo !== undefined) dados.ativo = ativo;

    const template = await prisma.templateMensagem.update({
      where: { id: parseInt(id, 10) },
      data: dados,
    });

    res.json(template);
  } catch (err) {
    next(err);
  }
}

async function excluir(req, res, next) {
  try {
    const { id } = req.params;
    await prisma.templateMensagem.update({
      where: { id: parseInt(id, 10) },
      data: { ativo: false },
    });
    res.json({ excluido: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, criar, atualizar, excluir };
