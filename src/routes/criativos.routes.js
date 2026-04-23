const { Router } = require('express');
const { z } = require('zod');
const criativosController = require('../controllers/criativos.controller');
const autenticar = require('../middleware/auth');
const autorizar = require('../middleware/rbac');
const validar = require('../middleware/validator');

const router = Router();

const criarCriativoSchema = z.object({
  campanha_id: z.number().int().positive('campanha_id obrigatorio'),
  meta_ad_id: z.string().max(50).optional().nullable(),
  nome: z.string().min(1, 'Nome obrigatorio').max(255),
  formato: z.string().min(1, 'Formato obrigatorio').max(30),
  angulo: z.string().max(30).optional().nullable(),
  narrativa: z.string().max(30).optional().nullable(),
  origem_producao: z.string().max(20).optional().nullable(),
});

const atualizarCriativoSchema = z.object({
  meta_ad_id: z.string().max(50).optional().nullable(),
  nome: z.string().min(1).max(255).optional(),
  formato: z.string().min(1).max(30).optional(),
  angulo: z.string().max(30).optional().nullable(),
  narrativa: z.string().max(30).optional().nullable(),
  origem_producao: z.string().max(20).optional().nullable(),
  // campanha_id nao editavel — criativo nao muda de campanha
}).strict(false);

// Leitura: qualquer usuario autenticado
router.get('/', autenticar, criativosController.listar);
router.get('/:id', autenticar, criativosController.detalhe);

// Mutacoes: admin/gestor
router.post('/', autenticar, autorizar('admin', 'gestor'), validar(criarCriativoSchema), criativosController.criar);
router.patch('/:id', autenticar, autorizar('admin', 'gestor'), validar(atualizarCriativoSchema), criativosController.atualizar);
router.delete('/:id', autenticar, autorizar('admin', 'gestor'), criativosController.excluir);

module.exports = router;
