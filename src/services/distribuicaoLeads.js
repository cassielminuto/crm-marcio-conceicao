const logger = require('../utils/logger');

// Distribuicao 50/50 — Lucas, Emilia
const DISTRIBUICAO = [
  1, // Lucas
  8, // Emilia
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
    logger.warn('Redis indisponivel para distribuicao, fallback para vendedorId=1 (Lucas)');
    return 1;
  }
}

module.exports = { obterProximoVendedor };
