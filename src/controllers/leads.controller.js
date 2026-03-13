const prisma = require('../config/database');
const { identificarCanal, calcularScore } = require('../services/scoreEngine');
const { distribuir, incrementarLeadsAtivos } = require('../services/distribuidor');

async function listar(req, res, next) {
  try {
    const {
      page = '1',
      limit = '20',
      classe,
      etapa,
      vendedor_id,
      canal,
      status,
      data_inicio,
      data_fim,
      busca,
    } = req.query;

    const pag = Math.max(1, parseInt(page, 10));
    const lim = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pag - 1) * lim;

    const where = {};

    if (classe) where.classe = classe;
    if (etapa) where.etapaFunil = etapa;
    if (vendedor_id) where.vendedorId = parseInt(vendedor_id, 10);
    if (canal) where.canal = canal;
    if (status) where.status = status;

    if (data_inicio || data_fim) {
      where.createdAt = {};
      if (data_inicio) where.createdAt.gte = new Date(data_inicio);
      if (data_fim) where.createdAt.lte = new Date(data_fim);
    }

    if (busca) {
      where.OR = [
        { nome: { contains: busca, mode: 'insensitive' } },
        { telefone: { contains: busca } },
        { email: { contains: busca, mode: 'insensitive' } },
      ];
    }

    // Vendedor só vê seus próprios leads
    if (req.usuario.perfil === 'vendedor' && req.usuario.vendedorId) {
      where.vendedorId = req.usuario.vendedorId;
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip,
        take: lim,
        orderBy: [{ pontuacao: 'desc' }, { createdAt: 'desc' }],
        include: {
          vendedor: { select: { id: true, nomeExibicao: true, papel: true } },
        },
      }),
      prisma.lead.count({ where }),
    ]);

    res.json({
      dados: leads,
      paginacao: {
        pagina: pag,
        limite: lim,
        total,
        totalPaginas: Math.ceil(total / lim),
      },
    });
  } catch (err) {
    next(err);
  }
}

async function detalhe(req, res, next) {
  try {
    const { id } = req.params;

    const lead = await prisma.lead.findUnique({
      where: { id: parseInt(id, 10) },
      include: {
        vendedor: { select: { id: true, nomeExibicao: true, papel: true } },
        interacoes: {
          orderBy: { createdAt: 'desc' },
          include: {
            vendedor: { select: { id: true, nomeExibicao: true } },
          },
        },
        followUps: {
          orderBy: { dataProgramada: 'asc' },
          include: {
            vendedor: { select: { id: true, nomeExibicao: true } },
          },
        },
        funilHistorico: { orderBy: { createdAt: 'desc' } },
        propostas: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead não encontrado' });
    }

    res.json(lead);
  } catch (err) {
    next(err);
  }
}

async function criar(req, res, next) {
  try {
    const { nome, telefone, email, canal, formulario_titulo, dados_respondi } = req.body;

    let pontuacao = 0;
    let classe = 'C';

    if (dados_respondi && formulario_titulo) {
      const canalDetectado = identificarCanal(formulario_titulo);
      if (canalDetectado) {
        const resultado = calcularScore(canalDetectado, dados_respondi);
        pontuacao = resultado.pontuacao;
        classe = resultado.classe;
      }
    }

    const vendedor = await distribuir(classe);
    const agora = new Date();

    const lead = await prisma.lead.create({
      data: {
        nome,
        telefone,
        email: email || null,
        canal: canal || 'bio',
        formularioTitulo: formulario_titulo || null,
        pontuacao,
        classe,
        etapaFunil: classe === 'C' ? 'nurturing' : 'novo',
        status: classe === 'C' ? 'nurturing' : 'aguardando',
        vendedorId: vendedor?.id || null,
        dadosRespondi: dados_respondi || null,
        dataPreenchimento: agora,
        dataAtribuicao: vendedor ? agora : null,
      },
      include: {
        vendedor: { select: { id: true, nomeExibicao: true, papel: true } },
      },
    });

    await prisma.funilHistorico.create({
      data: {
        leadId: lead.id,
        etapaNova: lead.etapaFunil,
        vendedorId: vendedor?.id || null,
        motivo: 'Lead criado manualmente',
      },
    });

    if (vendedor) {
      await incrementarLeadsAtivos(vendedor.id);
    }

    res.status(201).json(lead);
  } catch (err) {
    next(err);
  }
}

async function atualizar(req, res, next) {
  try {
    const { id } = req.params;
    const leadId = parseInt(id, 10);

    const existente = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!existente) {
      return res.status(404).json({ error: 'Lead não encontrado' });
    }

    // Campos permitidos para atualização
    const camposPermitidos = [
      'nome', 'telefone', 'email', 'dorPrincipal', 'tracoCarater',
      'objecaoPrincipal', 'resultadoCall', 'vendaRealizada', 'valorVenda',
      'dataAbordagem', 'dataConversao', 'motivoPerda', 'status',
    ];

    const dados = {};
    for (const campo of camposPermitidos) {
      // Aceitar snake_case e camelCase do body
      const snakeKey = campo.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`);
      if (req.body[campo] !== undefined) {
        dados[campo] = req.body[campo];
      } else if (req.body[snakeKey] !== undefined) {
        dados[campo] = req.body[snakeKey];
      }
    }

    // Converter datas se vierem como string
    if (dados.dataAbordagem) dados.dataAbordagem = new Date(dados.dataAbordagem);
    if (dados.dataConversao) dados.dataConversao = new Date(dados.dataConversao);

    // Se marcou venda realizada, atualizar conversões do vendedor
    if (dados.vendaRealizada === true && !existente.vendaRealizada && existente.vendedorId) {
      await prisma.vendedor.update({
        where: { id: existente.vendedorId },
        data: { totalConversoes: { increment: 1 } },
      });
    }

    const lead = await prisma.lead.update({
      where: { id: leadId },
      data: dados,
      include: {
        vendedor: { select: { id: true, nomeExibicao: true, papel: true } },
      },
    });

    res.json(lead);
  } catch (err) {
    next(err);
  }
}

async function moverEtapa(req, res, next) {
  try {
    const { id } = req.params;
    const { etapa, motivo } = req.body;
    const leadId = parseInt(id, 10);

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      return res.status(404).json({ error: 'Lead não encontrado' });
    }

    if (lead.etapaFunil === etapa) {
      return res.status(400).json({ error: 'Lead já está nesta etapa' });
    }

    // Determinar status baseado na etapa
    let status = lead.status;
    if (etapa === 'em_abordagem') status = 'em_abordagem';
    else if (etapa === 'fechado_ganho') status = 'convertido';
    else if (etapa === 'fechado_perdido') status = 'perdido';
    else if (etapa === 'nurturing') status = 'nurturing';

    const dadosUpdate = {
      etapaFunil: etapa,
      status,
    };

    // Registrar data da primeira abordagem
    if (etapa === 'em_abordagem' && !lead.dataAbordagem) {
      dadosUpdate.dataAbordagem = new Date();
    }

    // Registrar data de conversão
    if (etapa === 'fechado_ganho' && !lead.dataConversao) {
      dadosUpdate.dataConversao = new Date();
      dadosUpdate.vendaRealizada = true;
    }

    const [leadAtualizado] = await Promise.all([
      prisma.lead.update({
        where: { id: leadId },
        data: dadosUpdate,
        include: {
          vendedor: { select: { id: true, nomeExibicao: true, papel: true } },
        },
      }),
      prisma.funilHistorico.create({
        data: {
          leadId,
          etapaAnterior: lead.etapaFunil,
          etapaNova: etapa,
          vendedorId: req.usuario.vendedorId || lead.vendedorId,
          motivo: motivo || null,
        },
      }),
    ]);

    // Se fechou venda, incrementar conversões do vendedor
    if (etapa === 'fechado_ganho' && lead.vendedorId) {
      await prisma.vendedor.update({
        where: { id: lead.vendedorId },
        data: { totalConversoes: { increment: 1 } },
      });
    }

    // Se saiu da fila ativa, decrementar leads ativos
    if (['fechado_ganho', 'fechado_perdido', 'nurturing'].includes(etapa) && lead.vendedorId) {
      await prisma.vendedor.update({
        where: { id: lead.vendedorId },
        data: { leadsAtivos: { decrement: 1 } },
      });
    }

    res.json(leadAtualizado);
  } catch (err) {
    next(err);
  }
}

async function redistribuir(req, res, next) {
  try {
    const { id } = req.params;
    const { vendedor_id, motivo } = req.body;
    const leadId = parseInt(id, 10);
    const novoVendedorId = parseInt(vendedor_id, 10);

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      return res.status(404).json({ error: 'Lead não encontrado' });
    }

    const novoVendedor = await prisma.vendedor.findUnique({ where: { id: novoVendedorId } });
    if (!novoVendedor) {
      return res.status(404).json({ error: 'Vendedor não encontrado' });
    }

    // Decrementar do vendedor anterior
    if (lead.vendedorId) {
      await prisma.vendedor.update({
        where: { id: lead.vendedorId },
        data: { leadsAtivos: { decrement: 1 } },
      });
    }

    // Atualizar lead e incrementar novo vendedor
    const [leadAtualizado] = await Promise.all([
      prisma.lead.update({
        where: { id: leadId },
        data: { vendedorId: novoVendedorId, dataAtribuicao: new Date() },
        include: {
          vendedor: { select: { id: true, nomeExibicao: true, papel: true } },
        },
      }),
      prisma.vendedor.update({
        where: { id: novoVendedorId },
        data: { leadsAtivos: { increment: 1 } },
      }),
    ]);

    // Audit log
    await prisma.auditLog.create({
      data: {
        usuarioId: req.usuario.id,
        acao: 'REDISTRIBUTE',
        entidade: 'leads',
        entidadeId: leadId,
        dadosAnteriores: { vendedorId: lead.vendedorId },
        dadosNovos: { vendedorId: novoVendedorId },
        ip: req.ip,
      },
    });

    res.json(leadAtualizado);
  } catch (err) {
    next(err);
  }
}

async function interacoes(req, res, next) {
  try {
    const { id } = req.params;

    const lista = await prisma.interacao.findMany({
      where: { leadId: parseInt(id, 10) },
      orderBy: { createdAt: 'desc' },
      include: {
        vendedor: { select: { id: true, nomeExibicao: true } },
      },
    });

    res.json(lista);
  } catch (err) {
    next(err);
  }
}

async function criarInteracao(req, res, next) {
  try {
    const { id } = req.params;
    const leadId = parseInt(id, 10);
    const { tipo, conteudo, duracao } = req.body;

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      return res.status(404).json({ error: 'Lead não encontrado' });
    }

    const vendedorId = req.usuario.vendedorId || lead.vendedorId;
    if (!vendedorId) {
      return res.status(400).json({ error: 'Nenhum vendedor associado' });
    }

    const interacao = await prisma.interacao.create({
      data: {
        leadId,
        vendedorId,
        tipo,
        conteudo: conteudo || null,
        duracao: duracao || null,
      },
      include: {
        vendedor: { select: { id: true, nomeExibicao: true } },
      },
    });

    res.status(201).json(interacao);
  } catch (err) {
    next(err);
  }
}

async function leadsPorDia(req, res, next) {
  try {
    const { dias = '30', vendedor_id } = req.query;
    const numDias = parseInt(dias, 10);
    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - numDias);
    dataInicio.setHours(0, 0, 0, 0);

    const where = { createdAt: { gte: dataInicio } };
    if (vendedor_id) where.vendedorId = parseInt(vendedor_id, 10);

    const leads = await prisma.lead.findMany({
      where,
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    // Agrupar por dia
    const porDia = {};
    for (let i = 0; i < numDias; i++) {
      const d = new Date(dataInicio);
      d.setDate(d.getDate() + i);
      porDia[d.toISOString().slice(0, 10)] = 0;
    }
    for (const lead of leads) {
      const dia = lead.createdAt.toISOString().slice(0, 10);
      if (porDia[dia] !== undefined) porDia[dia]++;
    }

    res.json(Object.entries(porDia).map(([data, total]) => ({ data, total })));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listar,
  detalhe,
  criar,
  atualizar,
  moverEtapa,
  redistribuir,
  interacoes,
  criarInteracao,
  leadsPorDia,
};
