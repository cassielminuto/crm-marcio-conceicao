const { Router } = require('express');
const { z } = require('zod');
const campanhasController = require('../controllers/campanhas.controller');
const autenticar = require('../middleware/auth');
const autorizar = require('../middleware/rbac');
const validar = require('../middleware/validator');

const router = Router();

const criarCampanhaSchema = z.object({
  meta_campaign_id: z.string().max(50).optional().nullable(),
  nome: z.string().min(1, 'Nome obrigatorio').max(255),
  estrategia: z.string().min(1, 'Estrategia obrigatoria').max(50),
  status: z.enum(['ativa', 'pausada', 'encerrada']).optional(),
  budget_diario: z.number().nonnegative().optional().nullable(),
  data_inicio: z.string().optional().nullable(),
  data_fim: z.string().optional().nullable(),
});

const atualizarCampanhaSchema = z.object({
  meta_campaign_id: z.string().max(50).optional().nullable(),
  nome: z.string().min(1).max(255).optional(),
  estrategia: z.string().min(1).max(50).optional(),
  status: z.enum(['ativa', 'pausada', 'encerrada']).optional(),
  budget_diario: z.number().nonnegative().optional().nullable(),
  data_inicio: z.string().optional().nullable(),
  data_fim: z.string().optional().nullable(),
}).strict(false);

// Leitura: qualquer usuario autenticado (dashboards etc)
router.get('/', autenticar, campanhasController.listar);
router.get('/:id', autenticar, campanhasController.detalhe);

// Mutacoes: admin/gestor
router.post('/', autenticar, autorizar('admin', 'gestor'), validar(criarCampanhaSchema), campanhasController.criar);
router.patch('/:id', autenticar, autorizar('admin', 'gestor'), validar(atualizarCampanhaSchema), campanhasController.atualizar);
router.delete('/:id', autenticar, autorizar('admin', 'gestor'), campanhasController.excluir);

module.exports = router;
