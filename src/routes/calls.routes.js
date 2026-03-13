const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const autenticar = require('../middleware/auth');
const callsController = require('../controllers/calls.controller');

const router = Router();

// Configurar multer para salvar áudios em uploads/calls/
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/calls'));
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname) || '.webm';
    cb(null, `call-${timestamp}${ext}`);
  },
});

const uploadMiddleware = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max
  fileFilter: (req, file, cb) => {
    const allowed = [
      'audio/webm', 'audio/ogg', 'audio/wav', 'audio/mp3',
      'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'video/webm',
    ];
    if (allowed.includes(file.mimetype) || file.mimetype.startsWith('audio/') || file.mimetype === 'application/octet-stream') {
      cb(null, true);
    } else {
      cb(new Error(`Formato de audio nao suportado: ${file.mimetype}`));
    }
  },
});

router.post('/upload', autenticar, uploadMiddleware.single('audio'), callsController.upload);
router.post('/transcribe', autenticar, uploadMiddleware.single('audio'), callsController.transcribe);
router.get('/:interacao_id/transcricao', autenticar, callsController.getTranscricao);

module.exports = router;
