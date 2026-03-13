const { Router } = require('express');
const vendedoresController = require('../controllers/vendedores.controller');
const autenticar = require('../middleware/auth');

const router = Router();

router.get('/', autenticar, vendedoresController.listar);
router.get('/:id/dashboard', autenticar, vendedoresController.dashboard);
router.get('/:id/leads', autenticar, vendedoresController.leadsAtivos);
router.get('/:id/followups', autenticar, vendedoresController.followUpsVendedor);

module.exports = router;
