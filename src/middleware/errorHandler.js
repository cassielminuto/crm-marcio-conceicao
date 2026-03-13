const logger = require('../utils/logger');

function errorHandler(err, req, res, _next) {
  logger.error(err.stack || err.message);

  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'Registro duplicado', campo: err.meta?.target });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Registro não encontrado' });
  }

  const status = err.statusCode || 500;
  const message = status === 500 ? 'Erro interno do servidor' : err.message;

  res.status(status).json({ error: message });
}

module.exports = errorHandler;
