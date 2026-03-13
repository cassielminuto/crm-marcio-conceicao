const { Router } = require('express');
const whatsappController = require('../controllers/whatsapp.controller');
const autenticar = require('../middleware/auth');
const autorizar = require('../middleware/rbac');

const router = Router();

router.get('/status', autenticar, whatsappController.status);
router.get('/qrcode', autenticar, autorizar('admin'), whatsappController.qrcode);
router.post('/send', autenticar, whatsappController.enviar);

module.exports = router;
