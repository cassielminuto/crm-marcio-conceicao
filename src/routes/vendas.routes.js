const { Router } = require('express');
const { z } = require('zod');
const vendasController = require('../controllers/vendas.controller');
const autenticar = require('../middleware/auth');
const autorizar = require('../middleware/rbac');
const validar = require('../middleware/validator');

const router = Router();

const criarVendaSchema = z.object({
  lead_id: z.number().int().positive('lead_id obrigatorio'),
  valor_total: z.number().positive('valor_total > 0 obrigatorio'),
  data_pagamento: z.string().min(1, 'data_pagamento obrigatorio (ISO string)'),
  produto: z.string().max(255).optional().nullable(),
  taxas: z.number().nonnegative().optional(),
  valor_liquido: z.number().nonnegative().optional().nullable(),
  metodo_pagamento: z.string().max(30).optional().nullable(),
  parcelas: z.number().int().positive().optional().nullable(),
  campanha_id: z.number().int().positive().optional().nullable(),
  criativo_id: z.number().int().positive().optional().nullable(),
  closer_responsavel_id: z.number().int().positive().optional().nullable(),
  origem_venda: z.string().max(50).optional().nullable(),
});

// recorrencia NAO listado — e derivado pela logica D1, nao editavel via PATCH.
// lead_id NAO listado — Venda nao pode mudar de Lead apos criada.
const atualizarVendaSchema = z.object({
  valor_total: z.number().positive().optional(),
  taxas: z.number().nonnegative().optional(),
  valor_liquido: z.number().nonnegative().optional().nullable(),
  produto: z.string().max(255).optional().nullable(),
  metodo_pagamento: z.string().max(30).optional().nullable(),
  parcelas: z.number().int().positive().optional().nullable(),
  campanha_id: z.number().int().positive().optional().nullable(),
  criativo_id: z.number().int().positive().optional().nullable(),
  closer_responsavel_id: z.number().int().positive().optional().nullable(),
  origem_venda: z.string().max(50).optional().nullable(),
  data_pagamento: z.string().min(1).optional(),
  ciclo_venda_dias: z.number().int().nonnegative().optional().nullable(),
}).strict(false);

// Leitura: qualquer autenticado (vendedor ve so suas; admin/gestor ve tudo — filtro no controller)
router.get('/', autenticar, vendasController.listar);
router.get('/:id', autenticar, vendasController.detalhe);

// Mutacoes: admin/gestor only
router.post('/', autenticar, autorizar('admin', 'gestor'), validar(criarVendaSchema), vendasController.criar);
router.patch('/:id', autenticar, autorizar('admin', 'gestor'), validar(atualizarVendaSchema), vendasController.atualizar);
router.delete('/:id', autenticar, autorizar('admin', 'gestor'), vendasController.excluir);

module.exports = router;
