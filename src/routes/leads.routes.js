const { Router } = require('express');
const { z } = require('zod');
const leadsController = require('../controllers/leads.controller');
const autenticar = require('../middleware/auth');
const autorizar = require('../middleware/rbac');
const validar = require('../middleware/validator');

const router = Router();

// Schemas de validação
const criarLeadSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  telefone: z.string().min(8, 'Telefone inválido'),
  email: z.string().email('Email inválido').optional().nullable(),
  canal: z.enum(['bio', 'anuncio', 'evento']).optional(),
  formulario_titulo: z.string().optional().nullable(),
  dados_respondi: z.record(z.any()).optional().nullable(),
});

const atualizarLeadSchema = z.object({
  nome: z.string().min(1).optional(),
  telefone: z.string().min(8).optional(),
  email: z.string().email().optional().nullable(),
  dorPrincipal: z.string().optional().nullable(),
  dor_principal: z.string().optional().nullable(),
  tracoCarater: z.enum(['esquizoide', 'oral', 'masoquista', 'rigido', 'nao_identificado']).optional().nullable(),
  traco_carater: z.enum(['esquizoide', 'oral', 'masoquista', 'rigido', 'nao_identificado']).optional().nullable(),
  objecaoPrincipal: z.string().optional().nullable(),
  objecao_principal: z.string().optional().nullable(),
  resultadoCall: z.enum(['fechou', 'nao_fechou', 'reagendar', 'sem_call']).optional().nullable(),
  resultado_call: z.enum(['fechou', 'nao_fechou', 'reagendar', 'sem_call']).optional().nullable(),
  vendaRealizada: z.boolean().optional(),
  venda_realizada: z.boolean().optional(),
  valorVenda: z.number().optional().nullable(),
  valor_venda: z.number().optional().nullable(),
  dataAbordagem: z.string().optional().nullable(),
  data_abordagem: z.string().optional().nullable(),
  dataConversao: z.string().optional().nullable(),
  data_conversao: z.string().optional().nullable(),
  motivoPerda: z.string().optional().nullable(),
  motivo_perda: z.string().optional().nullable(),
  status: z.enum(['aguardando', 'em_abordagem', 'convertido', 'perdido', 'nurturing']).optional(),
}).strict(false);

const moverEtapaSchema = z.object({
  etapa: z.enum(['novo', 'em_abordagem', 'qualificado', 'proposta', 'fechado_ganho', 'fechado_perdido', 'nurturing']),
  motivo: z.string().optional().nullable(),
});

const redistribuirSchema = z.object({
  vendedor_id: z.number().int().positive('ID do vendedor é obrigatório'),
  motivo: z.string().optional().nullable(),
});

const criarInteracaoSchema = z.object({
  tipo: z.enum(['call', 'whatsapp_enviado', 'whatsapp_recebido', 'nota', 'email']),
  conteudo: z.string().optional().nullable(),
  duracao: z.number().int().optional().nullable(),
});

// Rotas
router.get('/por-dia', autenticar, leadsController.leadsPorDia);
router.get('/', autenticar, leadsController.listar);
router.get('/:id', autenticar, leadsController.detalhe);
router.post('/', autenticar, validar(criarLeadSchema), leadsController.criar);
router.patch('/:id', autenticar, validar(atualizarLeadSchema), leadsController.atualizar);
router.patch('/:id/etapa', autenticar, validar(moverEtapaSchema), leadsController.moverEtapa);
router.patch('/:id/vendedor', autenticar, autorizar('admin', 'gestor'), validar(redistribuirSchema), leadsController.redistribuir);
router.get('/:id/interacoes', autenticar, leadsController.interacoes);
router.post('/:id/interacoes', autenticar, validar(criarInteracaoSchema), leadsController.criarInteracao);

module.exports = router;
