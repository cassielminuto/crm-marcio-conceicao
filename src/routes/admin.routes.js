const { Router } = require('express');
const { z } = require('zod');
const adminController = require('../controllers/admin.controller');
const autenticar = require('../middleware/auth');
const autorizar = require('../middleware/rbac');
const validar = require('../middleware/validator');

const router = Router();

const atualizarSlaSchema = z.object({
  tempo_maximo_minutos: z.number().int().positive().optional(),
  alerta_amarelo_pct: z.number().int().min(0).max(100).optional(),
  alerta_vermelho_pct: z.number().int().min(0).max(100).optional(),
  redistribuir_ao_estourar: z.boolean().optional(),
}).strict(false);

router.get('/sla', autenticar, autorizar('admin'), adminController.listarSla);
router.patch('/sla/:classe', autenticar, autorizar('admin'), validar(atualizarSlaSchema), adminController.atualizarSla);

module.exports = router;
