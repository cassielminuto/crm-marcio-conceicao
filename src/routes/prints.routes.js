const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const autenticar = require('../middleware/auth');
const printsController = require('../controllers/prints.controller');

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/prints'));
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `print-${timestamp}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});

const uploadMiddleware = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Formato de imagem nao suportado: ${file.mimetype}`));
    }
  },
});

router.post('/upload', autenticar, uploadMiddleware.array('prints', 10), printsController.uploadPrints);

module.exports = router;
