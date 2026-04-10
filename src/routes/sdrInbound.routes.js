const { Router } = require('express');
const { z } = require('zod');
const sdrInboundController = require('../controllers/sdrInbound.controller');
const autenticar = require('../middleware/auth');
const validar = require('../middleware/validator');

const router = Router();

// --- Zod schemas ---
const criarLeadSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  telefone: z.string().min(10, 'Telefone é obrigatório'),
  email: z.string().email().optional().nullable(),
  dorPrincipal: z.string().optional().nullable(),
  observacoes: z.string().optional().nullable(),
});

const atualizarLeadSchema = z
  .object({
    nome: z.string().min(1).optional(),
    telefone: z.string().min(10).optional(),
    email: z.string().email().optional().nullable(),
    dorPrincipal: z.string().optional().nullable(),
    classe: z.string().optional().nullable(),
    observacoes: z.string().optional().nullable(),
    proximoPasso: z.string().optional().nullable(),
    dataReuniao: z.string().optional().nullable(),
    closerDestinoId: z.number().int().positive().optional().nullable(),
    ordem: z.number().int().optional(),
  })
  .strict(false);

const moverSchema = z.object({
  etapa: z.string().min(1, 'Etapa é obrigatória'),
  ordem: z.number().int().optional(),
});

const handoffSchema = z.object({
  dataReuniao: z.string().min(1, 'Data da reunião é obrigatória'),
  closerDestinoId: z.number().int().positive('Closer destino é obrigatório'),
  observacoes: z.string().optional().nullable(),
  proximoPasso: z.string().optional().nullable(),
});

// --- Routes ---
router.get('/kanban', autenticar, sdrInboundController.listarKanban);
router.get('/metricas', autenticar, sdrInboundController.metricas);

router.post('/leads', autenticar, validar(criarLeadSchema), sdrInboundController.criar);
router.get('/leads/:id', autenticar, sdrInboundController.detalhe);
router.put('/leads/:id', autenticar, validar(atualizarLeadSchema), sdrInboundController.atualizar);
router.post('/leads/:id/mover', autenticar, validar(moverSchema), sdrInboundController.mover);
router.post('/leads/:id/handoff', autenticar, validar(handoffSchema), sdrInboundController.handoff);
router.delete('/leads/:id', autenticar, sdrInboundController.excluir);

module.exports = router;
