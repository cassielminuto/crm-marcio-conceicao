const { Router } = require('express');
const hublaController = require('../controllers/hubla.controller');

const router = Router();

// Autenticação pelo token da Hubla no header x-hubla-token
function autenticarHubla(req, res, next) {
  // Por enquanto aceitar qualquer request (vamos validar o token depois)
  // TODO: validar req.headers['x-hubla-token'] === process.env.HUBLA_WEBHOOK_TOKEN
  next();
}

router.post('/', autenticarHubla, hublaController.receberWebhookHubla);

module.exports = router;
