const { Router } = require('express');
const relatoriosController = require('../controllers/relatorios.controller');
const autenticar = require('../middleware/auth');
const autorizar = require('../middleware/rbac');

const router = Router();

router.get('/geral', autenticar, autorizar('admin', 'gestor'), relatoriosController.geral);
router.get('/por-canal', autenticar, autorizar('admin', 'gestor'), relatoriosController.porCanal);
router.get('/por-classe', autenticar, autorizar('admin', 'gestor'), relatoriosController.porClasse);
router.get('/por-closer', autenticar, autorizar('admin', 'gestor'), relatoriosController.porCloser);
router.get('/resumo-ia', autenticar, relatoriosController.resumoIA);

module.exports = router;
