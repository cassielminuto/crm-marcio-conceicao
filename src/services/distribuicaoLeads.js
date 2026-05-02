const logger = require('../utils/logger');

// Distribuicao 1:1 — Gabriel, Lucas
const DISTRIBUICAO = [
  6, // Gabriel
  1, // Lucas
];

async function obterProximoVendedor() {
  try {
    const redis = require('../config/redis');
    const contador = await redis.incr('lead_distribution_counter');
    const indice = (contador - 1) % DISTRIBUICAO.length;
    const vendedorId = DISTRIBUICAO[indice];
    logger.info(`Lead distribuido para vendedor ID ${vendedorId} (contador: ${contador})`);
    return vendedorId;
  } catch (e) {
    logger.warn('Redis indisponivel para distribuicao, fallback para vendedorId=6 (Gabriel)');
    return 6;
  }
}

module.exports = { obterProximoVendedor };
