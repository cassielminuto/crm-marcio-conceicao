const { Router } = require('express');
const dashboardController = require('../controllers/dashboard.controller');
const autenticar = require('../middleware/auth');

const router = Router();

router.get('/metricas', autenticar, dashboardController.metricas);

module.exports = router;
