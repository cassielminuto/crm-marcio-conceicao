const logger = require('../utils/logger');

// Configuracao de distribuicao: vendedorId => peso
const DISTRIBUICAO = [
  { vendedorId: 1, peso: 2 },  // Lucas: 2 de cada 3
  { vendedorId: 7, peso: 1 },  // Leticia: 1 de cada 3
];

// Expandir: [1, 1, 7]
const FILA = [];
for (const v of DISTRIBUICAO) {
  for (let i = 0; i < v.peso; i++) FILA.push(v.vendedorId);
}

async function obterProximoVendedor() {
  try {
    const redis = require('../config/redis');
    const contador = await redis.incr('crm:distribuicao:contador');
    const vendedorId = FILA[(contador - 1) % FILA.length];
    logger.info(`Lead distribuido para vendedor ID ${vendedorId} (contador: ${contador})`);
    return vendedorId;
  } catch (e) {
    logger.warn('Redis indisponivel para distribuicao, fallback para vendedorId=1');
    return 1;
  }
}

module.exports = { obterProximoVendedor };
