const { Router } = require('express');
const { z } = require('zod');
const templatesController = require('../controllers/templates.controller');
const autenticar = require('../middleware/auth');
const autorizar = require('../middleware/rbac');
const validar = require('../middleware/validator');

const router = Router();

const criarSchema = z.object({
  nome: z.string().min(1, 'Nome e obrigatorio'),
  conteudo: z.string().min(1, 'Conteudo e obrigatorio'),
  etapa_funil: z.enum(['novo', 'em_abordagem', 'qualificado', 'proposta', 'nurturing']).optional().nullable(),
  classe_lead: z.enum(['A', 'B', 'C', 'todos']).optional(),
  tipo: z.enum(['whatsapp', 'email']).optional(),
});

const atualizarSchema = z.object({
  nome: z.string().min(1).optional(),
  conteudo: z.string().min(1).optional(),
  etapa_funil: z.enum(['novo', 'em_abordagem', 'qualificado', 'proposta', 'nurturing']).optional().nullable(),
  classe_lead: z.enum(['A', 'B', 'C', 'todos']).optional(),
  tipo: z.enum(['whatsapp', 'email']).optional(),
  ativo: z.boolean().optional(),
}).strict(false);

router.get('/', autenticar, templatesController.listar);
router.post('/', autenticar, autorizar('admin', 'gestor'), validar(criarSchema), templatesController.criar);
router.patch('/:id', autenticar, autorizar('admin', 'gestor'), validar(atualizarSchema), templatesController.atualizar);
router.delete('/:id', autenticar, autorizar('admin', 'gestor'), templatesController.excluir);

module.exports = router;
