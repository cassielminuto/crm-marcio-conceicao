const { Router } = require('express');
const { z } = require('zod');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sdrController = require('../controllers/sdr.controller');
const autenticar = require('../middleware/auth');
const validar = require('../middleware/validator');

const router = Router();

// --- Upload config ---
const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'sdr-prints');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    cb(null, `sdr-${timestamp}-${random}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Apenas imagens são permitidas'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// --- Zod schemas ---
const criarLeadSdrSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  instagram: z.string().min(1, 'Instagram é obrigatório'),
  tipoInteracao: z.enum(['curtiu', 'comentou', 'story', 'seguiu']).optional(),
  mensagemEnviada: z.string().optional().nullable(),
});

const atualizarLeadSdrSchema = z
  .object({
    nome: z.string().min(1).optional(),
    instagram: z.string().min(1).optional(),
    tipoInteracao: z.enum(['curtiu', 'comentou', 'story', 'seguiu']).optional(),
    mensagemEnviada: z.string().optional().nullable(),
    respostaLead: z.string().optional().nullable(),
    temperaturaInicial: z.enum(['frio', 'morno', 'quente']).optional().nullable(),
    dorAparente: z.string().optional().nullable(),
    tentouSolucaoAnterior: z.enum(['sim', 'nao', 'parcialmente']).optional().nullable(),
    temperaturaFinal: z.enum(['frio', 'morno', 'quente']).optional().nullable(),
    decisaoRota: z.enum(['convidar', 'lixeira']).optional().nullable(),
    detalheSituacao: z.string().optional().nullable(),
    aceitouDiagnostico: z.enum(['sim', 'nao', 'pendente']).optional().nullable(),
    ordem: z.number().int().optional(),
  })
  .strict(false);

const moverSchema = z.object({
  etapa: z.string().min(1, 'Etapa é obrigatória'),
  ordem: z.number().int().optional(),
});

const handoffSchema = z.object({
  whatsapp: z.string().min(1, 'WhatsApp é obrigatório'),
  dataReuniao: z.string().min(1, 'Data da reunião é obrigatória'),
  closerDestinoId: z.number().int().positive('Closer destino é obrigatório'),
  resumoSituacao: z.string().min(1, 'Resumo da situação é obrigatório'),
  tomEmocional: z.enum(['desesperado', 'racional', 'resistente', 'aberto', 'fragil'], {
    required_error: 'Tom emocional é obrigatório',
  }),
  oqueFuncionou: z.string().min(1, 'O que funcionou é obrigatório'),
  oqueEvitar: z.string().optional().nullable(),
  fraseChaveLead: z.string().optional().nullable(),
});

// --- Routes ---
// Kanban + listagem
router.get('/leads', autenticar, sdrController.listarKanban);

// Métricas (antes de /:id para não conflitar)
router.get('/metricas/diarias', autenticar, sdrController.metricasDiarias);

// CRUD de leads
router.post('/leads', autenticar, validar(criarLeadSdrSchema), sdrController.criar);
router.get('/leads/:id', autenticar, sdrController.detalhe);
router.patch('/leads/:id', autenticar, validar(atualizarLeadSdrSchema), sdrController.atualizar);
router.patch('/leads/:id/mover', autenticar, validar(moverSchema), sdrController.mover);
router.post('/leads/:id/handoff', autenticar, validar(handoffSchema), sdrController.handoff);
router.post('/leads/:id/prints', autenticar, upload.array('prints', 10), sdrController.uploadPrints);
router.post('/leads/:id/resumo-ia', autenticar, sdrController.gerarResumoIa);
router.delete('/leads/:id', autenticar, sdrController.excluir);

module.exports = router;
