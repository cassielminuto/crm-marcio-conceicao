const { Router } = require('express');
const webhookController = require('../controllers/webhook.controller');

const router = Router();

router.post('/respondi', webhookController.receberLeadRespondi);

module.exports = router;
