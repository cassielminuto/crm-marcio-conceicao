const prisma = require('../config/database');
const logger = require('../utils/logger');

// Listar todas as etapas (ativas, ordenadas)
async function listar(req, res, next) {
  try {
    const incluirInativas = req.query.todas === 'true';
    const where = incluirInativas ? {} : { ativo: true };
    const etapas = await prisma.etapaFunil.findMany({
      where,
      orderBy: { ordem: 'asc' },
    });

    // Contar leads por etapa
    const contagemPorEtapa = await prisma.lead.groupBy({
      by: ['etapaFunil'],
      _count: { id: true },
    });

    const etapasComContagem = etapas.map(e => ({
      ...e,
      _count: contagemPorEtapa.find(c => c.etapaFunil === e.slug)?._count?.id || 0,
    }));

    res.json(etapasComContagem);
  } catch (err) {
    next(err);
  }
}

// Criar nova etapa
async function criar(req, res, next) {
  try {
    const { label, cor, tipo } = req.body;
    if (!label) return res.status(400).json({ error: 'Label é obrigatório' });

    // Gerar slug a partir do label
    const slug = label.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');

    // Verificar se slug já existe
    const existente = await prisma.etapaFunil.findUnique({ where: { slug } });
    if (existente) return res.status(409).json({ error: 'Já existe uma etapa com esse nome' });

    // Pegar a maior ordem e colocar no final
    const maxOrdem = await prisma.etapaFunil.findFirst({ orderBy: { ordem: 'desc' }, select: { ordem: true } });
    const novaOrdem = (maxOrdem?.ordem || 0) + 1;

    const etapa = await prisma.etapaFunil.create({
      data: {
        slug,
        label,
        cor: cor || '#6c5ce7',
        ordem: novaOrdem,
        tipo: tipo || 'normal',
      },
    });

    logger.info(`Etapa criada: ${etapa.label} (${etapa.slug})`);
    res.status(201).json(etapa);
  } catch (err) {
    next(err);
  }
}

// Renomear/atualizar etapa
async function atualizar(req, res, next) {
  try {
    const { id } = req.params;
    const { label, cor, tipo } = req.body;

    const etapa = await prisma.etapaFunil.findUnique({ where: { id: parseInt(id, 10) } });
    if (!etapa) return res.status(404).json({ error: 'Etapa não encontrada' });

    const dados = {};
    if (label !== undefined) dados.label = label;
    if (cor !== undefined) dados.cor = cor;
    if (tipo !== undefined) dados.tipo = tipo;

    const atualizada = await prisma.etapaFunil.update({
      where: { id: parseInt(id, 10) },
      data: dados,
    });

    logger.info(`Etapa atualizada: ${atualizada.label}`);
    res.json(atualizada);
  } catch (err) {
    next(err);
  }
}

// Reordenar etapas (recebe array de ids na nova ordem)
async function reordenar(req, res, next) {
  try {
    const { ordem } = req.body;
    if (!Array.isArray(ordem)) return res.status(400).json({ error: 'Array de IDs é obrigatório' });

    for (let i = 0; i < ordem.length; i++) {
      await prisma.etapaFunil.update({
        where: { id: ordem[i] },
        data: { ordem: i + 1 },
      });
    }

    const etapas = await prisma.etapaFunil.findMany({ where: { ativo: true }, orderBy: { ordem: 'asc' } });
    res.json(etapas);
  } catch (err) {
    next(err);
  }
}

// Excluir etapa (soft delete, move leads para outra etapa antes)
async function excluir(req, res, next) {
  try {
    const { id } = req.params;
    const { moverParaId } = req.body;

    const etapa = await prisma.etapaFunil.findUnique({ where: { id: parseInt(id, 10) } });
    if (!etapa) return res.status(404).json({ error: 'Etapa não encontrada' });

    // Não permitir excluir a última etapa de tipo ganho ou perdido
    if (etapa.tipo === 'ganho' || etapa.tipo === 'perdido') {
      const outrasDoTipo = await prisma.etapaFunil.count({
        where: { tipo: etapa.tipo, ativo: true, id: { not: parseInt(id, 10) } },
      });
      if (outrasDoTipo === 0) {
        return res.status(400).json({
          error: `Não é possível excluir a última etapa do tipo "${etapa.tipo}". Crie outra antes.`,
        });
      }
    }

    // Contar leads nessa etapa
    const leadsNaEtapa = await prisma.lead.count({ where: { etapaFunil: etapa.slug } });

    if (leadsNaEtapa > 0) {
      if (!moverParaId) {
        return res.status(400).json({
          error: `Existem ${leadsNaEtapa} leads nesta etapa. Informe moverParaId para mover os leads antes de excluir.`,
          leadsNaEtapa,
        });
      }

      const etapaDestino = await prisma.etapaFunil.findUnique({ where: { id: moverParaId } });
      if (!etapaDestino) return res.status(404).json({ error: 'Etapa destino não encontrada' });

      await prisma.lead.updateMany({
        where: { etapaFunil: etapa.slug },
        data: { etapaFunil: etapaDestino.slug },
      });

      logger.info(`${leadsNaEtapa} leads movidos de ${etapa.label} para ${etapaDestino.label}`);
    }

    // Soft delete
    await prisma.etapaFunil.update({
      where: { id: parseInt(id, 10) },
      data: { ativo: false },
    });

    logger.info(`Etapa excluída: ${etapa.label}`);
    res.json({ ok: true, mensagem: `Etapa "${etapa.label}" excluída. ${leadsNaEtapa} leads movidos.` });
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, criar, atualizar, reordenar, excluir };
