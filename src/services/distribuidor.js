/**
 * Distribuidor — Distribui leads para closers por round-robin.
 *
 * Regras:
 * - Classe A → Lucas ou Juliana (closer_lider, round-robin)
 * - Classe B → Taiana ou Trainees (closer_independente/trainee, round-robin)
 * - Classe C → Sem distribuição (nurturing automático)
 */

const prisma = require('../config/database');
const redis = require('../config/redis');
const logger = require('../utils/logger');

const REDIS_RR_KEY_PREFIX = 'round_robin:classe:';

/**
 * Busca vendedores ativos que atendem determinada classe.
 */
async function buscarVendedoresDisponiveis(classe) {
  return prisma.vendedor.findMany({
    where: {
      ativo: true,
      classesAtendidas: { has: classe },
    },
    orderBy: { id: 'asc' },
  });
}

/**
 * Round-robin via Redis: mantém o índice do último vendedor atribuído por classe.
 */
async function proximoVendedorRoundRobin(classe, vendedores) {
  if (vendedores.length === 0) return null;

  const key = `${REDIS_RR_KEY_PREFIX}${classe}`;

  let ultimoIndex;
  try {
    const valor = await redis.get(key);
    ultimoIndex = valor !== null ? parseInt(valor, 10) : -1;
  } catch {
    // Se Redis não estiver disponível, usar fallback em memória
    ultimoIndex = -1;
  }

  const proximoIndex = (ultimoIndex + 1) % vendedores.length;

  try {
    await redis.set(key, proximoIndex);
  } catch {
    logger.warn(`Redis indisponível para round-robin classe ${classe}`);
  }

  return vendedores[proximoIndex];
}

/**
 * Distribui um lead para o closer correto com base na classe.
 * Retorna o vendedor atribuído ou null (Classe C).
 */
async function distribuir(classe) {
  // Classe C não entra na fila ativa
  if (classe === 'C') {
    return null;
  }

  const vendedores = await buscarVendedoresDisponiveis(classe);

  if (vendedores.length === 0) {
    logger.warn(`Nenhum vendedor disponível para classe ${classe}`);
    return null;
  }

  // Filtrar vendedores que não atingiram o limite de leads
  const comVaga = vendedores.filter((v) => v.leadsAtivos < v.leadsMax);

  if (comVaga.length === 0) {
    logger.warn(`Todos os vendedores da classe ${classe} estão no limite de leads`);
    // Escalar: se classe B sem vaga, subir para closers líderes com menor fila
    if (classe === 'B') {
      const lideres = await prisma.vendedor.findMany({
        where: { ativo: true, papel: 'closer_lider' },
        orderBy: { leadsAtivos: 'asc' },
      });
      if (lideres.length > 0) {
        logger.info(`Escalando lead classe B para closer líder ${lideres[0].nomeExibicao}`);
        return lideres[0];
      }
    }
    return null;
  }

  const vendedor = await proximoVendedorRoundRobin(classe, comVaga);
  return vendedor;
}

/**
 * Incrementa o contador de leads ativos do vendedor.
 */
async function incrementarLeadsAtivos(vendedorId) {
  return prisma.vendedor.update({
    where: { id: vendedorId },
    data: { leadsAtivos: { increment: 1 } },
  });
}

module.exports = {
  distribuir,
  incrementarLeadsAtivos,
  buscarVendedoresDisponiveis,
  proximoVendedorRoundRobin,
};
