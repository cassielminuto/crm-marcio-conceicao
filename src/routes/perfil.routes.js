const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const autenticar = require('../middleware/auth');
const perfilController = require('../controllers/perfil.controller');

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/avatars'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `avatar-${req.usuario.id}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Formato nao suportado. Use PNG, JPG ou WEBP.'));
  },
});

router.get('/', autenticar, perfilController.getPerfil);
router.patch('/', autenticar, perfilController.atualizarPerfil);
router.post('/foto', autenticar, upload.single('foto'), perfilController.uploadFoto);
router.delete('/foto', autenticar, perfilController.removerFoto);

module.exports = router;
