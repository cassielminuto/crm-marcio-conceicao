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

const criarEmpresaSchema = z.object({
  periodo: z.string().min(7).max(7, 'Formato: YYYY-MM'),
  valor_meta: z.number().positive('Valor da meta deve ser positivo'),
  leads_meta: z.number().int().optional().nullable(),
  observacao: z.string().optional().nullable(),
});

const distribuirSchema = z.object({
  periodo: z.string().min(7).max(7),
  distribuicao: z.array(z.object({
    vendedorId: z.number().int().positive(),
    valorMeta: z.number().positive(),
    leadsMeta: z.number().int().optional().nullable(),
  })).min(1, 'Distribuição deve ter pelo menos 1 vendedor'),
});

// Meta empresa (antes de /:id pra não conflitar)
router.get('/empresa', autenticar, metasController.listarEmpresa);
router.post('/empresa', autenticar, autorizar('admin', 'gestor'), validar(criarEmpresaSchema), metasController.criarEmpresa);
router.post('/distribuir', autenticar, autorizar('admin', 'gestor'), validar(distribuirSchema), metasController.distribuir);

// Metas individuais
router.get('/', autenticar, metasController.listar);
router.post('/', autenticar, autorizar('admin', 'gestor'), validar(criarMetaSchema), metasController.criar);
router.patch('/:id', autenticar, autorizar('admin', 'gestor'), validar(atualizarMetaSchema), metasController.atualizar);

module.exports = router;
