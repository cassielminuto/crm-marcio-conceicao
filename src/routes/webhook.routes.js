const { Router } = require('express');
const env = require('../config/env');
const webhookController = require('../controllers/webhook.controller');

const router = Router();

// Autenticação por API key no header
function autenticarWebhook(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization'];
  if (!apiKey || apiKey !== env.respondiApiKey) {
    return res.status(401).json({ error: 'API key inválida' });
  }
  next();
}

router.post('/respondi', autenticarWebhook, webhookController.receberLeadRespondi);

module.exports = router;
