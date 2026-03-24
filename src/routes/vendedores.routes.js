const { Router } = require('express');
const vendedoresController = require('../controllers/vendedores.controller');
const autenticar = require('../middleware/auth');
const autorizar = require('../middleware/rbac');

const router = Router();

router.get('/', autenticar, vendedoresController.listar);
router.get('/:id/dashboard', autenticar, vendedoresController.dashboard);
router.get('/:id/leads', autenticar, vendedoresController.leadsAtivos);
router.get('/:id/followups', autenticar, vendedoresController.followUpsVendedor);
router.patch('/:id', autenticar, autorizar('admin', 'gestor'), vendedoresController.atualizar);

module.exports = router;
