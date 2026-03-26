const { Router } = require('express');
const autenticar = require('../middleware/auth');
const autorizar = require('../middleware/rbac');
const etapasController = require('../controllers/etapas.controller');

const router = Router();

router.get('/', autenticar, etapasController.listar);
router.post('/', autenticar, autorizar('admin', 'gestor'), etapasController.criar);
router.patch('/:id', autenticar, autorizar('admin', 'gestor'), etapasController.atualizar);
router.post('/reordenar', autenticar, autorizar('admin', 'gestor'), etapasController.reordenar);
router.delete('/:id', autenticar, autorizar('admin', 'gestor'), etapasController.excluir);

module.exports = router;
