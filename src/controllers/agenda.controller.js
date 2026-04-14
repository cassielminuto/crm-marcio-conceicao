const prisma = require('../config/database');
const logger = require('../utils/logger');
const { criarNotificacao } = require('../services/notificacaoService');
const { parseDateBrasilia } = require('../utils/dateBrasilia');

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

    const eventoInicio = parseDateBrasilia(inicio);
    const eventoFim = parseDateBrasilia(fim);

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

    // Criar evento + sincronizar lead em transaction
    const evento = await prisma.$transaction(async (tx) => {
      const ev = await tx.eventoAgenda.create({
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

      // Sincronizar: reunião manual com lead → mover pra qualificado
      if (tipo === 'reuniao_manual' && leadId) {
        const lead = await tx.lead.findUnique({ where: { id: leadId }, select: { id: true, etapaFunil: true } });
        if (lead && lead.etapaFunil !== 'qualificado') {
          await tx.lead.update({ where: { id: leadId }, data: { etapaFunil: 'qualificado' } });
          await tx.funilHistorico.create({
            data: {
              leadId,
              etapaAnterior: lead.etapaFunil,
              etapaNova: 'qualificado',
              vendedorId,
              motivo: 'Reunião marcada via Agenda',
            },
          });
          logger.info(`Lead #${leadId} movido pra qualificado (reunião manual via Agenda)`);
        }
      }

      return ev;
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

    // WhatsApp + notificação pra eventos manuais/personalizados (não auto-criação)
    if ((tipo === 'reuniao_manual' || tipo === 'evento_personalizado') && !marcadoEmHorarioOff) {
      const vendedorEvt = await prisma.vendedor.findUnique({
        where: { id: vendedorId },
        select: { usuarioId: true, telefoneWhatsapp: true, nomeExibicao: true },
      });

      const isAutoCriacao = vendedorEvt?.usuarioId === req.usuario.id;

      if (!isAutoCriacao) {
        const dataFormatadaEvt = eventoInicio.toLocaleDateString('pt-BR', {
          day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
        });

        // WhatsApp
        if (vendedorEvt?.telefoneWhatsapp) {
          const { enviarMensagem } = require('../services/whatsappService');
          let texto;
          if (tipo === 'reuniao_manual') {
            texto = `📅 Nova reunião agendada\nTítulo: ${titulo}\nQuando: ${dataFormatadaEvt}`;
            if (contatoNome) texto += `\nContato: ${contatoNome}${contatoTelefone ? ` (${contatoTelefone})` : ''}`;
            if (descricao) texto += `\nDetalhes: ${descricao}`;
            if (marcadoEmHorarioOff) texto += `\n⚠️ Marcada em horário OFF`;
          } else {
            texto = `📌 Novo evento na sua agenda\n${titulo}\nQuando: ${dataFormatadaEvt}`;
            if (descricao) texto += `\nDetalhes: ${descricao}`;
          }
          setImmediate(async () => {
            try { await enviarMensagem(vendedorEvt.telefoneWhatsapp, texto); }
            catch (e) { logger.error(`WhatsApp evento manual falhou: ${e.message}`); }
          });
        } else {
          logger.warn(`Vendedor #${vendedorId} sem telefoneWhatsapp — WhatsApp de evento manual não enviado`);
        }

        // Notificação in-app
        if (vendedorEvt?.usuarioId) {
          setImmediate(async () => {
            try {
              await criarNotificacao({
                usuarioId: vendedorEvt.usuarioId,
                tipo: 'evento_agenda',
                titulo: `Novo evento: ${titulo}`,
                mensagem: dataFormatadaEvt,
                dados: { eventoId: evento.id, tipo, inicio: eventoInicio },
              });
            } catch (e) { logger.warn(`Notificação evento manual falhou: ${e.message}`); }
          });
        }
      }
    }

    // Socket
    const io = req.app.get('io');
    if (io && (tipo.startsWith('reuniao_') || tipo === 'evento_personalizado')) {
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

    // Permissão: vendedorId dono, criadoPorId, ou admin/gestor
    if (!isAdminGestor(req.usuario) && req.usuario.vendedorId !== evento.vendedorId && req.usuario.id !== evento.criadoPorId) {
      return res.status(403).json({ error: 'Sem permissão para editar este evento' });
    }

    const data = { ...req.body };
    if (data.inicio) data.inicio = parseDateBrasilia(data.inicio);
    if (data.fim) data.fim = parseDateBrasilia(data.fim);

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

    // Permissão: vendedorId dono, criadoPorId, ou admin/gestor
    if (!isAdminGestor(req.usuario) && req.usuario.vendedorId !== evento.vendedorId && req.usuario.id !== evento.criadoPorId) {
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

    if (!isAdminGestor(req.usuario) && req.usuario.vendedorId !== evento.vendedorId && req.usuario.id !== evento.criadoPorId) {
      return res.status(403).json({ error: 'Sem permissão para atualizar status deste evento' });
    }

    // Atualizar status + sincronizar lead em transaction
    const eventoAtualizado = await prisma.$transaction(async (tx) => {
      const ev = await tx.eventoAgenda.update({
        where: { id: Number(id) },
        data: { statusReuniao: status },
        include: {
          vendedor: { select: { id: true, nomeExibicao: true, usuarioId: true } },
        },
      });

      // No-show: mover lead pra etapa 'no_show' + notificar vendedor
      if (status === 'no_show' && evento.leadId) {
        const lead = await tx.lead.findUnique({ where: { id: evento.leadId }, select: { id: true, etapaFunil: true, nome: true } });
        if (lead) {
          await tx.lead.update({ where: { id: evento.leadId }, data: { etapaFunil: 'no_show' } });
          await tx.funilHistorico.create({
            data: {
              leadId: evento.leadId,
              etapaAnterior: lead.etapaFunil,
              etapaNova: 'no_show',
              vendedorId: evento.vendedorId,
              motivo: 'No-show na reunião',
            },
          });
          logger.info(`Lead #${evento.leadId} movido pra no_show (no-show no EventoAgenda #${id})`);

          // Notificação in-app pro vendedor dono do lead
          if (ev.vendedor?.usuarioId) {
            setImmediate(async () => {
              try {
                await criarNotificacao({
                  usuarioId: ev.vendedor.usuarioId,
                  tipo: 'no_show',
                  titulo: `No-show: ${lead.nome}`,
                  mensagem: `Lead não compareceu à reunião "${evento.titulo}"`,
                  dados: { leadId: evento.leadId, eventoId: evento.id },
                });
              } catch (e) { logger.warn(`Notificação no-show falhou: ${e.message}`); }
            });
          }
        }
      }

      return ev;
    });

    logger.info(`EventoAgenda #${id} status atualizado para ${status}`);
    res.json({ evento: eventoAtualizado });
  } catch (err) {
    next(err);
  }
}

async function disponibilidade(req, res, next) {
  try {
    const { vendedor_id, data_inicio, data_fim } = req.query;

    if (!vendedor_id) return res.status(400).json({ error: 'vendedor_id é obrigatório' });

    const vendedorId = Number(vendedor_id);
    const vendedor = await prisma.vendedor.findUnique({
      where: { id: vendedorId },
      select: { id: true, nomeExibicao: true },
    });
    if (!vendedor) return res.status(404).json({ error: 'Vendedor não encontrado' });

    // Range em Brasília (UTC-3): calcular dias usando offset explícito
    // Obter data de hoje em Brasília
    const agoraBrasilia = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const hojeBrasilia = agoraBrasilia.toISOString().slice(0, 10);

    const diaInicio = data_inicio ? new Date(data_inicio).toISOString().slice(0, 10) : hojeBrasilia;
    // Range de busca: 00:00 Brasília do primeiro dia até 23:59 Brasília do último dia
    const inicioRange = new Date(`${diaInicio}T00:00:00-03:00`);

    let diaFim;
    if (data_fim) {
      diaFim = new Date(data_fim).toISOString().slice(0, 10);
    } else {
      const d = new Date(inicioRange);
      d.setDate(d.getDate() + 7);
      diaFim = d.toISOString().slice(0, 10);
    }
    const fimRange = new Date(`${diaFim}T23:59:59-03:00`);

    // Buscar todos os eventos do vendedor no range
    const eventos = await prisma.eventoAgenda.findMany({
      where: {
        vendedorId,
        deletedAt: null,
        inicio: { lt: fimRange },
        fim: { gt: inicioRange },
      },
      select: {
        id: true,
        tipo: true,
        titulo: true,
        inicio: true,
        fim: true,
      },
      orderBy: { inicio: 'asc' },
    });

    // Gerar grid de dias + slots (tudo em horário Brasília)
    const diasDisponibilidade = [];
    const cursor = new Date(inicioRange);

    while (cursor < fimRange) {
      // Dia em Brasília: converter cursor UTC pra Brasília pra pegar YYYY-MM-DD
      const cursorBrasilia = new Date(cursor.getTime() - 3 * 60 * 60 * 1000);
      const dia = cursorBrasilia.toISOString().slice(0, 10);
      const slots = [];

      for (let hora = 8; hora <= 21; hora++) {
        const horaStr = String(hora).padStart(2, '0');
        const horaFimStr = String(hora + 1).padStart(2, '0');
        // Slots em horário Brasília → convertidos pra UTC via offset
        const slotInicio = new Date(`${dia}T${horaStr}:00:00-03:00`);
        const slotFim = new Date(`${dia}T${horaFimStr}:00:00-03:00`);

        // Verificar sobreposição com eventos
        let status = 'livre';
        let eventoInfo = null;

        for (const ev of eventos) {
          const evInicio = new Date(ev.inicio);
          const evFim = new Date(ev.fim);

          if (slotInicio < evFim && slotFim > evInicio) {
            if (ev.tipo === 'bloco_off') {
              status = 'off';
              eventoInfo = { titulo: ev.titulo, id: ev.id };
            } else if (ev.tipo === 'bloco_on') {
              status = 'livre';
            } else {
              status = 'ocupado';
              eventoInfo = { titulo: ev.titulo, id: ev.id };
            }
            break;
          }
        }

        slots.push({ hora: `${horaStr}:00`, status, ...(eventoInfo ? { evento: eventoInfo } : {}) });
      }

      diasDisponibilidade.push({ data: dia, slots });
      // Avançar 24h
      cursor.setTime(cursor.getTime() + 24 * 60 * 60 * 1000);
    }

    res.json({
      vendedorId,
      vendedorNome: vendedor.nomeExibicao,
      diasDisponibilidade,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, criar, editar, excluir, atualizarStatus, disponibilidade };
