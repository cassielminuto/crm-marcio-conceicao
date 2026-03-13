const { Router } = require('express');
const { z } = require('zod');
const metasController = require('../controllers/metas.controller');
const autenticar = require('../middleware/auth');
const autorizar = require('../middleware/rbac');
const validar = require('../middleware/validator');

const router = Router();

const criarMetaSchema = z.object({
  vendedor_id: z.number().int().positive(),
  periodo: z.string().min(1, 'Periodo obrigatorio (ex: 2026-03)'),
  valor_meta: z.number().positive('Valor da meta deve ser positivo'),
  leads_meta: z.number().int().optional().nullable(),
});

const atualizarMetaSchema = z.object({
  valor_meta: z.number().positive().optional(),
  valor_atual: z.number().optional(),
  leads_meta: z.number().int().optional().nullable(),
  leads_atual: z.number().int().optional(),
  status: z.enum(['em_andamento', 'atingida', 'nao_atingida']).optional(),
}).strict(false);

router.get('/', autenticar, metasController.listar);
router.post('/', autenticar, autorizar('admin', 'gestor'), validar(criarMetaSchema), metasController.criar);
router.patch('/:id', autenticar, autorizar('admin', 'gestor'), validar(atualizarMetaSchema), metasController.atualizar);

module.exports = router;
