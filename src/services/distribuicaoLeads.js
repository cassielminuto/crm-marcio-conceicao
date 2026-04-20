const logger = require('../utils/logger');

// Distribuicao 1:1:1 — Cassiel, Lucas, Gabriel
const DISTRIBUICAO = [
  5, // Cassiel
  1, // Lucas
  6, // Gabriel
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
    logger.warn('Redis indisponivel para distribuicao, fallback para vendedorId=5 (Cassiel)');
    return 5;
  }
}

module.exports = { obterProximoVendedor };
