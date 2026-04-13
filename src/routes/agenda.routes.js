const { Router } = require('express');
const { z } = require('zod');
const agendaController = require('../controllers/agenda.controller');
const autenticar = require('../middleware/auth');
const validar = require('../middleware/validator');

const router = Router();

// --- Zod schemas ---
const tiposValidos = [
  'reuniao_sdr_instagram',
  'reuniao_sdr_inbound',
  'reuniao_manual',
  'bloco_on',
  'bloco_off',
  'evento_personalizado',
];

const criarEventoSchema = z.object({
  tipo: z.enum(tiposValidos, { required_error: 'Tipo é obrigatório' }),
  titulo: z.string().min(1, 'Título é obrigatório'),
  descricao: z.string().optional().nullable(),
  inicio: z.string().min(1, 'Data de início é obrigatória'),
  fim: z.string().min(1, 'Data de fim é obrigatória'),
  vendedorId: z.number().int().positive().optional(),
  leadId: z.number().int().positive().optional().nullable(),
  leadSdrId: z.number().int().positive().optional().nullable(),
  leadSdrInboundId: z.number().int().positive().optional().nullable(),
  contatoNome: z.string().optional().nullable(),
  contatoTelefone: z.string().optional().nullable(),
  cor: z.string().optional().nullable(),
  confirmar_override: z.boolean().optional(),
});

const editarEventoSchema = z.object({
  titulo: z.string().min(1).optional(),
  descricao: z.string().optional().nullable(),
  inicio: z.string().optional(),
  fim: z.string().optional(),
  contatoNome: z.string().optional().nullable(),
  contatoTelefone: z.string().optional().nullable(),
  cor: z.string().optional().nullable(),
}).strict(false);

const statusSchema = z.object({
  status: z.enum(['realizada', 'no_show', 'remarcada'], {
    required_error: 'Status é obrigatório. Valores válidos: realizada, no_show, remarcada',
  }),
});

// --- Routes ---
router.get('/disponibilidade', autenticar, agendaController.disponibilidade);
router.get('/', autenticar, agendaController.listar);
router.post('/', autenticar, validar(criarEventoSchema), agendaController.criar);
router.patch('/:id', autenticar, validar(editarEventoSchema), agendaController.editar);
router.delete('/:id', autenticar, agendaController.excluir);
router.patch('/:id/status', autenticar, validar(statusSchema), agendaController.atualizarStatus);

module.exports = router;
