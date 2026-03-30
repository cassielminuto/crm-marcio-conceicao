const { Router } = require('express');
const controller = require('../controllers/produtos-excluidos.controller');
const autenticar = require('../middleware/auth');
const autorizar = require('../middleware/rbac');

const router = Router();

router.get('/', autenticar, controller.listar);
router.get('/todos', autenticar, controller.listarProdutos);
router.post('/', autenticar, autorizar('admin', 'gestor'), controller.adicionar);
router.delete('/:id', autenticar, autorizar('admin', 'gestor'), controller.remover);

module.exports = router;
