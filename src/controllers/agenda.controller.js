const prisma = require('../config/database');
const logger = require('../utils/logger');
const { criarNotificacao } = require('../services/notificacaoService');

const TIPOS_REUNIAO = ['reuniao_sdr_instagram', 'reuniao_sdr_inbound', 'reuniao_manual'];

function isAdminGestor(usuario) {
  return usuario.perfil === 'admin' || usuario.perfil === 'gestor';
}

async function listar(req, res, next) {
  try {
    const { data_inicio, data_fim, vendedor_id } = req.query;

    const where = { deletedAt: null };

    if (data_inicio) where.inicio = { ...where.inicio, gte: new Date(data_inicio) };
    if (data_fim) where.fim = { ...where.fim, lte: new Date(data_fim) };
    if (vendedor_id) where.vendedorId = Number(vendedor_id);

    const eventos = await prisma.eventoAgenda.findMany({
      where,
      include: {
        vendedor: { select: { id: true, nomeExibicao: true } },
      },
      orderBy: { inicio: 'asc' },
    });

    res.json({ eventos });
  } catch (err) {
    next(err);
  }
}

async function criar(req, res, next) {
  try {
    const {
      tipo,
      titulo,
      descricao,
      inicio,
      fim,
      vendedorId: vendedorIdBody,
      leadId,
      leadSdrId,
      leadSdrInboundId,
      contatoNome,
      contatoTelefone,
      cor,
      confirmar_override,
    } = req.body;

    // Determinar vendedorId do evento
    let vendedorId;
    if (isAdminGestor(req.usuario) && vendedorIdBody) {
      vendedorId = vendedorIdBody;
    } else if (req.usuario.vendedorId) {
      vendedorId = req.usuario.vendedorId;
    } else if (vendedorIdBody) {
      // SDR criando reunião pra closer
      vendedorId = vendedorIdBody;
    } else {
      return res.status(400).json({ error: 'vendedorId é obrigatório' });
    }

    // Blocos ON/OFF: só o próprio closer ou admin/gestor
    if ((tipo === 'bloco_on' || tipo === 'bloco_off') && !isAdminGestor(req.usuario)) {
      if (req.usuario.vendedorId !== vendedorId) {
        return res.status(403).json({ error: 'Só o próprio closer pode criar blocos ON/OFF' });
      }
    }

    const eventoInicio = new Date(inicio);
    const eventoFim = new Date(fim);

    // Validação de override pra reuniões
    let marcadoEmHorarioOff = false;
    if (tipo.startsWith('reuniao_')) {
      const blocoOff = await prisma.eventoAgenda.findFirst({
        where: {
          vendedorId,
          tipo: 'bloco_off',
          deletedAt: null,
          inicio: { lt: eventoFim },
          fim: { gt: eventoInicio },
        },
      });

      if (blocoOff) {
        if (!confirmar_override) {
          return res.status(409).json({
            error: 'horario_off',
            message: 'Vendedor em horário OFF neste período',
            bloco: { inicio: blocoOff.inicio, fim: blocoOff.fim },
          });
        }
        marcadoEmHorarioOff = true;
      }
    }

    const evento = await prisma.eventoAgenda.create({
      data: {
        tipo,
        titulo,
        descricao: descricao || null,
        inicio: eventoInicio,
        fim: eventoFim,
        vendedorId,
        criadoPorId: req.usuario.id,
        leadId: leadId || null,
        leadSdrId: leadSdrId || null,
        leadSdrInboundId: leadSdrInboundId || null,
        contatoNome: contatoNome || null,
        contatoTelefone: contatoTelefone || null,
        cor: cor || null,
        marcadoEmHorarioOff,
      },
      include: {
        vendedor: { select: { id: true, nomeExibicao: true } },
      },
    });

    // Notificação + WhatsApp especial se override
    if (marcadoEmHorarioOff) {
      const vendedor = await prisma.vendedor.findUnique({
        where: { id: vendedorId },
        select: { usuarioId: true, telefoneWhatsapp: true, nomeExibicao: true },
      });

      if (vendedor?.usuarioId) {
        setImmediate(async () => {
          try {
            await criarNotificacao({
              usuarioId: vendedor.usuarioId,
              tipo: 'reuniao_agendada',
              titulo: `⚠️ Reunião em horário OFF: ${titulo}`,
              mensagem: `Alguém marcou uma reunião no seu horário OFF`,
              dados: { eventoId: evento.id, marcadoEmHorarioOff: true },
            });
          } catch (e) { logger.warn(`Notificação override falhou: ${e.message}`); }
        });
      }

      if (vendedor?.telefoneWhatsapp) {
        const { enviarMensagem } = require('../services/whatsappService');
        const dataFormatada = eventoInicio.toLocaleDateString('pt-BR', {
          day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
        });
        setImmediate(async () => {
          try {
            await enviarMensagem(
              vendedor.telefoneWhatsapp,
              `⚠️ Reunião marcada no seu horário OFF\n${titulo}\nData: ${dataFormatada}\nVerifique no CRM.`
            );
          } catch (e) { logger.error(`WhatsApp override falhou: ${e.message}`); }
        });
      }
    }

    // Notificação pra reuniões normais (sem override)
    if (tipo.startsWith('reuniao_') && !marcadoEmHorarioOff && req.usuario.vendedorId !== vendedorId) {
      const vendedor = await prisma.vendedor.findUnique({
        where: { id: vendedorId },
        select: { usuarioId: true },
      });
      if (vendedor?.usuarioId) {
        setImmediate(async () => {
          try {
            await criarNotificacao({
              usuarioId: vendedor.usuarioId,
              tipo: 'reuniao_agendada',
              titulo: `Reunião agendada: ${titulo}`,
              mensagem: `Nova reunião no seu calendário`,
              dados: { eventoId: evento.id },
            });
          } catch (e) { logger.warn(`Notificação reunião falhou: ${e.message}`); }
        });
      }
    }

    // Socket
    const io = req.app.get('io');
    if (io && tipo.startsWith('reuniao_')) {
      io.emit('reuniao_agendada', {
        eventoId: evento.id,
        vendedorId,
        titulo,
        inicio: eventoInicio,
        marcadoEmHorarioOff,
      });
    }

    logger.info(`EventoAgenda #${evento.id} criado: ${tipo} para vendedor #${vendedorId}`);
    res.status(201).json({ evento });
  } catch (err) {
    next(err);
  }
}

async function editar(req, res, next) {
  try {
    const { id } = req.params;
    const evento = await prisma.eventoAgenda.findUnique({ where: { id: Number(id) } });

    if (!evento || evento.deletedAt) {
      return res.status(404).json({ error: 'Evento não encontrado' });
    }

    // Permissão: dono ou admin/gestor
    if (!isAdminGestor(req.usuario) && req.usuario.vendedorId !== evento.vendedorId) {
      return res.status(403).json({ error: 'Sem permissão para editar este evento' });
    }

    const data = { ...req.body };
    if (data.inicio) data.inicio = new Date(data.inicio);
    if (data.fim) data.fim = new Date(data.fim);

    const eventoAtualizado = await prisma.eventoAgenda.update({
      where: { id: Number(id) },
      data,
      include: {
        vendedor: { select: { id: true, nomeExibicao: true } },
      },
    });

    res.json({ evento: eventoAtualizado });
  } catch (err) {
    next(err);
  }
}

async function excluir(req, res, next) {
  try {
    const { id } = req.params;
    const evento = await prisma.eventoAgenda.findUnique({ where: { id: Number(id) } });

    if (!evento || evento.deletedAt) {
      return res.status(404).json({ error: 'Evento não encontrado' });
    }

    if (!isAdminGestor(req.usuario) && req.usuario.vendedorId !== evento.vendedorId) {
      return res.status(403).json({ error: 'Sem permissão para excluir este evento' });
    }

    await prisma.eventoAgenda.update({
      where: { id: Number(id) },
      data: { deletedAt: new Date() },
    });

    logger.info(`EventoAgenda #${id} soft-deleted por usuario #${req.usuario.id}`);
    res.json({ removido: true, mensagem: 'Evento excluído' });
  } catch (err) {
    next(err);
  }
}

async function atualizarStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const evento = await prisma.eventoAgenda.findUnique({ where: { id: Number(id) } });

    if (!evento || evento.deletedAt) {
      return res.status(404).json({ error: 'Evento não encontrado' });
    }

    if (!evento.tipo.startsWith('reuniao_')) {
      return res.status(400).json({ error: 'Status de reunião só pode ser atualizado em eventos tipo reunião' });
    }

    if (!isAdminGestor(req.usuario) && req.usuario.vendedorId !== evento.vendedorId) {
      return res.status(403).json({ error: 'Sem permissão para atualizar status deste evento' });
    }

    const eventoAtualizado = await prisma.eventoAgenda.update({
      where: { id: Number(id) },
      data: { statusReuniao: status },
      include: {
        vendedor: { select: { id: true, nomeExibicao: true } },
      },
    });

    logger.info(`EventoAgenda #${id} status atualizado para ${status}`);
    res.json({ evento: eventoAtualizado });
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, criar, editar, excluir, atualizarStatus };
