const prisma = require('../config/database');
const logger = require('../utils/logger');

async function criarNotificacao({ usuarioId, tipo, titulo, mensagem, dados }) {
  try {
    const notificacao = await prisma.notificacao.create({
      data: {
        usuarioId,
        tipo,
        titulo,
        mensagem,
        dados: dados || null,
      },
    });
    logger.info(`Notificacao criada: ${tipo} para usuario #${usuarioId}`);
    return notificacao;
  } catch (err) {
    logger.error(`Erro ao criar notificacao: ${err.message}`);
    return null;
  }
}

async function listarNotificacoes(usuarioId, { limit = 20, apenasNaoLidas = false } = {}) {
  const where = { usuarioId };
  if (apenasNaoLidas) where.lida = false;

  return prisma.notificacao.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

async function contarNaoLidas(usuarioId) {
  return prisma.notificacao.count({
    where: { usuarioId, lida: false },
  });
}

async function marcarComoLida(notificacaoId, usuarioId) {
  return prisma.notificacao.updateMany({
    where: { id: notificacaoId, usuarioId },
    data: { lida: true },
  });
}

async function marcarTodasComoLidas(usuarioId) {
  return prisma.notificacao.updateMany({
    where: { usuarioId, lida: false },
    data: { lida: true },
  });
}

module.exports = { criarNotificacao, listarNotificacoes, contarNaoLidas, marcarComoLida, marcarTodasComoLidas };
