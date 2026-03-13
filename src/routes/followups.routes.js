const { Router } = require('express');
const { z } = require('zod');
const followupsController = require('../controllers/followups.controller');
const autenticar = require('../middleware/auth');
const validar = require('../middleware/validator');

const router = Router();

const agendarSchema = z.object({
  lead_id: z.number().int().positive('ID do lead é obrigatório'),
  data_programada: z.string().min(1, 'Data programada é obrigatória'),
  tipo: z.enum(['whatsapp', 'call', 'email']),
  template_id: z.number().int().optional().nullable(),
  mensagem: z.string().optional().nullable(),
});

const atualizarSchema = z.object({
  status: z.enum(['pendente', 'executado', 'atrasado', 'cancelado']).optional(),
  mensagem: z.string().optional().nullable(),
});

router.get('/', autenticar, followupsController.listar);
router.post('/', autenticar, validar(agendarSchema), followupsController.agendar);
router.patch('/:id', autenticar, validar(atualizarSchema), followupsController.atualizar);

module.exports = router;
