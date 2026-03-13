const prisma = require('../config/database');

async function listar(req, res, next) {
  try {
    const { vendedor_id, data } = req.query;

    const where = { status: 'pendente' };

    // Filtrar por vendedor
    if (vendedor_id) {
      where.vendedorId = parseInt(vendedor_id, 10);
    } else if (req.usuario.perfil === 'vendedor' && req.usuario.vendedorId) {
      where.vendedorId = req.usuario.vendedorId;
    }

    // Filtrar por dia (padrão: hoje)
    const dia = data ? new Date(data) : new Date();
    const inicioDia = new Date(dia);
    inicioDia.setHours(0, 0, 0, 0);
    const fimDia = new Date(dia);
    fimDia.setHours(23, 59, 59, 999);

    where.dataProgramada = { gte: inicioDia, lte: fimDia };

    const followUps = await prisma.followUp.findMany({
      where,
      orderBy: { dataProgramada: 'asc' },
      include: {
        lead: {
          select: {
            id: true, nome: true, telefone: true, email: true,
            classe: true, etapaFunil: true, pontuacao: true,
          },
        },
        vendedor: { select: { id: true, nomeExibicao: true } },
        template: { select: { id: true, nome: true, conteudo: true } },
      },
    });

    res.json(followUps);
  } catch (err) {
    next(err);
  }
}

async function agendar(req, res, next) {
  try {
    const { lead_id, data_programada, tipo, template_id, mensagem } = req.body;
    const leadId = parseInt(lead_id, 10);

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      return res.status(404).json({ error: 'Lead não encontrado' });
    }

    const vendedorId = req.usuario.vendedorId || lead.vendedorId;
    if (!vendedorId) {
      return res.status(400).json({ error: 'Nenhum vendedor associado ao lead' });
    }

    const followUp = await prisma.followUp.create({
      data: {
        leadId,
        vendedorId,
        dataProgramada: new Date(data_programada),
        tipo,
        templateId: template_id ? parseInt(template_id, 10) : null,
        mensagemEnviada: mensagem || null,
      },
      include: {
        lead: { select: { id: true, nome: true, telefone: true, classe: true } },
        vendedor: { select: { id: true, nomeExibicao: true } },
      },
    });

    res.status(201).json(followUp);
  } catch (err) {
    next(err);
  }
}

async function atualizar(req, res, next) {
  try {
    const { id } = req.params;
    const { status, mensagem } = req.body;
    const followUpId = parseInt(id, 10);

    const existente = await prisma.followUp.findUnique({ where: { id: followUpId } });
    if (!existente) {
      return res.status(404).json({ error: 'Follow-up não encontrado' });
    }

    const dados = {};

    if (status) {
      dados.status = status;
      if (status === 'executado') {
        dados.dataExecutada = new Date();
      }
    }

    if (mensagem !== undefined) {
      dados.mensagemEnviada = mensagem;
    }

    const followUp = await prisma.followUp.update({
      where: { id: followUpId },
      data: dados,
      include: {
        lead: { select: { id: true, nome: true, telefone: true, classe: true } },
        vendedor: { select: { id: true, nomeExibicao: true } },
      },
    });

    res.json(followUp);
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, agendar, atualizar };
