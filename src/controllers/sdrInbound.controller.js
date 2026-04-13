const prisma = require('../config/database');
const { ETAPAS_INBOUND, validarMovimentacao, executarHandoff } = require('../services/sdrInboundService');
const logger = require('../utils/logger');
const { parseDateBrasilia } = require('../utils/dateBrasilia');

function verificarAcesso(req) {
  const { perfil } = req.usuario;
  if (perfil === 'admin' || perfil === 'gestor') return { permitido: true, isAdminGestor: true };

  // Vendedor com acesso SDR ou papel SDR
  if (perfil === 'vendedor' && req.usuario.vendedorId) {
    return { permitido: true, isAdminGestor: false };
  }

  return { permitido: false };
}

async function listarKanban(req, res, next) {
  try {
    const acesso = verificarAcesso(req);
    if (!acesso.permitido) return res.status(403).json({ error: 'Sem acesso ao módulo SDR Inbound' });

    const where = { deletedAt: null };
    if (!acesso.isAdminGestor) {
      where.operadorId = req.usuario.vendedorId;
    }

    const leads = await prisma.leadSDRInbound.findMany({
      where,
      orderBy: [{ ordem: 'asc' }, { createdAt: 'desc' }],
      include: {
        closerDestino: { select: { id: true, nomeExibicao: true } },
        operador: { select: { id: true, nomeExibicao: true } },
      },
    });

    const kanban = {};
    for (const etapa of ETAPAS_INBOUND) {
      kanban[etapa] = [];
    }
    for (const lead of leads) {
      if (kanban[lead.etapa] !== undefined) {
        kanban[lead.etapa].push(lead);
      } else {
        kanban['novo_lead'].push(lead);
      }
    }

    res.json({ kanban });
  } catch (err) {
    next(err);
  }
}

async function criar(req, res, next) {
  try {
    const acesso = verificarAcesso(req);
    if (!acesso.permitido) return res.status(403).json({ error: 'Sem acesso ao módulo SDR Inbound' });

    const operadorId = req.usuario.vendedorId;
    const { nome, telefone, email, dorPrincipal, observacoes } = req.body;

    const lead = await prisma.leadSDRInbound.create({
      data: {
        nome,
        telefone: telefone.replace(/\D/g, ''),
        email: email || null,
        dorPrincipal: dorPrincipal || null,
        observacoes: observacoes || null,
        operadorId,
        etapa: 'novo_lead',
      },
    });

    logger.info(`LeadSDRInbound criado: #${lead.id} (${lead.nome}) por operador #${operadorId}`);
    res.status(201).json({ lead });
  } catch (err) {
    next(err);
  }
}

async function detalhe(req, res, next) {
  try {
    const { id } = req.params;
    const lead = await prisma.leadSDRInbound.findUnique({
      where: { id: Number(id) },
      include: {
        closerDestino: { select: { id: true, nomeExibicao: true } },
        operador: { select: { id: true, nomeExibicao: true } },
      },
    });

    if (!lead) return res.status(404).json({ error: 'Lead SDR Inbound não encontrado' });
    res.json({ lead });
  } catch (err) {
    next(err);
  }
}

async function atualizar(req, res, next) {
  try {
    const { id } = req.params;
    const dados = req.body;

    const lead = await prisma.leadSDRInbound.update({
      where: { id: Number(id) },
      data: dados,
    });

    res.json({ lead });
  } catch (err) {
    next(err);
  }
}

async function mover(req, res, next) {
  try {
    const { id } = req.params;
    const { etapa, ordem } = req.body;

    const lead = await prisma.leadSDRInbound.findUnique({ where: { id: Number(id) } });
    if (!lead) return res.status(404).json({ error: 'Lead SDR Inbound não encontrado' });

    const validacao = validarMovimentacao(lead, etapa);
    if (!validacao.valido) {
      return res.status(400).json({
        error: validacao.erro || 'Movimentação inválida',
        camposFaltando: validacao.camposFaltando,
      });
    }

    const leadAtualizado = await prisma.leadSDRInbound.update({
      where: { id: Number(id) },
      data: {
        etapa,
        ...(ordem !== undefined ? { ordem } : {}),
      },
    });

    logger.info(`LeadSDRInbound #${id} movido: ${lead.etapa} -> ${etapa}`);

    const io = req.app.get('io');
    if (io) {
      io.emit('lead-sdr-inbound-movido', { leadId: Number(id), etapaAnterior: lead.etapa, etapaNova: etapa });
    }

    res.json({ lead: leadAtualizado });
  } catch (err) {
    next(err);
  }
}

async function handoff(req, res, next) {
  try {
    const { id } = req.params;
    const { dataReuniao, closerDestinoId, observacoes, proximoPasso } = req.body;

    const lead = await prisma.leadSDRInbound.findUnique({ where: { id: Number(id) } });
    if (!lead) return res.status(404).json({ error: 'Lead SDR Inbound não encontrado' });

    // Atualizar lead com dados do handoff
    const leadAtualizado = await prisma.leadSDRInbound.update({
      where: { id: Number(id) },
      data: {
        dataReuniao: parseDateBrasilia(dataReuniao),
        closerDestinoId,
        observacoes: observacoes || lead.observacoes,
        proximoPasso: proximoPasso || lead.proximoPasso,
        etapa: 'reuniao_marcada',
      },
      include: {
        closerDestino: { select: { id: true, nomeExibicao: true, telefoneWhatsapp: true, usuarioId: true } },
        operador: { select: { id: true, nomeExibicao: true, telefoneWhatsapp: true } },
      },
    });

    // Executar handoff — cria Lead no CRM do closer
    const novoLead = await executarHandoff(leadAtualizado);

    // Criar EventoAgenda pra reunião
    const eventoInicio = parseDateBrasilia(dataReuniao);
    const eventoFim = new Date(eventoInicio.getTime() + 60 * 60 * 1000); // +1h

    const blocoOff = await prisma.eventoAgenda.findFirst({
      where: {
        vendedorId: closerDestinoId,
        tipo: 'bloco_off',
        deletedAt: null,
        inicio: { lt: eventoFim },
        fim: { gt: eventoInicio },
      },
    });

    const evento = await prisma.eventoAgenda.create({
      data: {
        tipo: 'reuniao_sdr_inbound',
        titulo: `Reunião com ${lead.nome}`,
        inicio: eventoInicio,
        fim: eventoFim,
        vendedorId: closerDestinoId,
        criadoPorId: req.usuario.id,
        leadSdrInboundId: Number(id),
        leadId: novoLead.id,
        marcadoEmHorarioOff: !!blocoOff,
      },
    });

    // WhatsApp pro closer
    if (leadAtualizado.closerDestino?.telefoneWhatsapp) {
      const { enviarMensagem } = require('../services/whatsappService');
      const dataFormatada = eventoInicio.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      let texto = `🎯 Nova reunião agendada pelo Thomaz (SDR)\nLead: ${lead.nome}\nTel: ${lead.telefone}\nDor: ${lead.dorPrincipal || 'Não informada'}\nReunião: ${dataFormatada}\nObservações do SDR: ${leadAtualizado.observacoes || 'Nenhuma'}`;
      if (blocoOff) texto += `\n⚠️ ATENÇÃO: marcada em horário OFF`;
      setImmediate(async () => {
        try { await enviarMensagem(leadAtualizado.closerDestino.telefoneWhatsapp, texto); } catch (e) {
          logger.error(`WhatsApp handoff falhou para closer ${leadAtualizado.closerDestino.nomeExibicao}: ${e.message}`);
        }
      });
    }

    // Notificação in-app pro closer
    if (leadAtualizado.closerDestino?.usuarioId) {
      const { criarNotificacao } = require('../services/notificacaoService');
      const dataFormatadaNotif = eventoInicio.toLocaleDateString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
      });
      setImmediate(async () => {
        try {
          await criarNotificacao({
            usuarioId: leadAtualizado.closerDestino.usuarioId,
            tipo: 'reuniao_agendada',
            titulo: `Reunião agendada: ${lead.nome}`,
            mensagem: `Via SDR Inbound | ${dataFormatadaNotif}${blocoOff ? ' ⚠️ Horário OFF' : ''}`,
            dados: { leadId: novoLead.id, leadSdrInboundId: Number(id), eventoId: evento.id, dataReuniao },
          });
        } catch (e) { logger.warn(`Notificação handoff Inbound falhou: ${e.message}`); }
      });
    }

    // WebSocket
    const io = req.app.get('io');
    if (io) {
      io.emit('novo-lead-sdr-inbound', {
        leadInboundId: Number(id),
        leadCloserId: novoLead.id,
        closerDestinoId,
        nome: lead.nome,
      });
      io.emit('reuniao_agendada', {
        eventoId: evento.id,
        closerDestinoId,
        leadNome: lead.nome,
        dataReuniao,
        marcadoEmHorarioOff: !!blocoOff,
      });
    }

    // Audit log
    try {
      await prisma.auditLog.create({
        data: {
          usuarioId: req.usuario.id,
          acao: 'HANDOFF_SDR_INBOUND',
          entidade: 'LeadSDRInbound',
          entidadeId: Number(id),
          dadosNovos: {
            etapa: 'passado_closer',
            closerDestinoId,
            leadCloserId: novoLead.id,
            dataReuniao,
          },
        },
      });
    } catch (auditErr) {
      logger.warn(`Falha ao registrar audit log do handoff SDR Inbound #${id}: ${auditErr.message}`);
    }

    logger.info(`Handoff SDR Inbound concluído: LeadInbound #${id} -> Lead Closer #${novoLead.id}`);
    res.json({ lead: leadAtualizado, novoLead });
  } catch (err) {
    next(err);
  }
}

async function excluir(req, res, next) {
  try {
    const { id } = req.params;

    const lead = await prisma.leadSDRInbound.findUnique({ where: { id: Number(id) } });
    if (!lead) return res.status(404).json({ error: 'Lead SDR Inbound não encontrado' });

    if (lead.etapa === 'nao_qualificado') {
      // Soft delete definitivo
      await prisma.leadSDRInbound.update({
        where: { id: Number(id) },
        data: { deletedAt: new Date() },
      });
      logger.info(`LeadSDRInbound #${id} excluído definitivamente por usuário #${req.usuario.id}`);
      return res.json({ removido: true, mensagem: 'Lead excluído definitivamente' });
    }

    // Mover pra nao_qualificado
    const leadAtualizado = await prisma.leadSDRInbound.update({
      where: { id: Number(id) },
      data: { etapa: 'nao_qualificado' },
    });

    logger.info(`LeadSDRInbound #${id} movido para não qualificado por usuário #${req.usuario.id}`);
    res.json({ lead: leadAtualizado, mensagem: 'Lead movido para não qualificado' });
  } catch (err) {
    next(err);
  }
}

async function metricas(req, res, next) {
  try {
    const acesso = verificarAcesso(req);
    if (!acesso.permitido) return res.status(403).json({ error: 'Sem acesso ao módulo SDR Inbound' });

    const filtroOperador = acesso.isAdminGestor ? {} : { operadorId: req.usuario.vendedorId };

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    const [
      leadsCriadosHoje,
      reunioesMarcadasHoje,
      handoffsHoje,
      leadsPorEtapa,
    ] = await Promise.all([
      prisma.leadSDRInbound.count({
        where: { ...filtroOperador, deletedAt: null, createdAt: { gte: hoje, lt: amanha } },
      }),
      prisma.leadSDRInbound.count({
        where: { ...filtroOperador, deletedAt: null, etapa: 'reuniao_marcada', updatedAt: { gte: hoje, lt: amanha } },
      }),
      prisma.leadSDRInbound.count({
        where: { ...filtroOperador, deletedAt: null, etapa: 'passado_closer', updatedAt: { gte: hoje, lt: amanha } },
      }),
      prisma.leadSDRInbound.groupBy({
        by: ['etapa'],
        where: { ...filtroOperador, deletedAt: null },
        _count: { id: true },
      }),
    ]);

    const pipeline = {};
    for (const etapa of ETAPAS_INBOUND) {
      pipeline[etapa] = 0;
    }
    for (const item of leadsPorEtapa) {
      pipeline[item.etapa] = item._count.id;
    }

    res.json({
      leadsCriadosHoje,
      reunioesMarcadasHoje,
      handoffsHoje,
      pipeline,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listarKanban,
  criar,
  detalhe,
  atualizar,
  mover,
  handoff,
  excluir,
  metricas,
};
