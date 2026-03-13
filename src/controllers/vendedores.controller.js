const prisma = require('../config/database');

async function listar(req, res, next) {
  try {
    const vendedores = await prisma.vendedor.findMany({
      where: { ativo: true },
      orderBy: { totalConversoes: 'desc' },
      include: {
        usuario: { select: { nome: true, email: true } },
      },
    });

    // Calcular ranking
    const comRanking = vendedores.map((v, idx) => ({
      ...v,
      rankingPosicao: idx + 1,
    }));

    res.json(comRanking);
  } catch (err) {
    next(err);
  }
}

async function dashboard(req, res, next) {
  try {
    const { id } = req.params;
    const vendedorId = parseInt(id, 10);

    const vendedor = await prisma.vendedor.findUnique({
      where: { id: vendedorId },
      include: {
        usuario: { select: { nome: true, email: true } },
      },
    });

    if (!vendedor) {
      return res.status(404).json({ error: 'Vendedor não encontrado' });
    }

    // Período atual (mês corrente)
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const fimMes = new Date(inicioMes);
    fimMes.setMonth(fimMes.getMonth() + 1);

    // Buscar métricas em paralelo
    const [
      totalLeads,
      leadsConvertidos,
      leadsPerdidos,
      leadsPorClasse,
      leadsPorEtapa,
      leadsMes,
      conversoesMes,
      followUpsPendentes,
      tempoMedioAbordagem,
    ] = await Promise.all([
      // Total de leads atribuídos
      prisma.lead.count({ where: { vendedorId } }),

      // Leads convertidos (total)
      prisma.lead.count({ where: { vendedorId, vendaRealizada: true } }),

      // Leads perdidos (total)
      prisma.lead.count({ where: { vendedorId, status: 'perdido' } }),

      // Leads por classe
      prisma.lead.groupBy({
        by: ['classe'],
        where: { vendedorId },
        _count: true,
      }),

      // Leads por etapa do funil
      prisma.lead.groupBy({
        by: ['etapaFunil'],
        where: { vendedorId },
        _count: true,
      }),

      // Leads recebidos no mês
      prisma.lead.count({
        where: {
          vendedorId,
          createdAt: { gte: inicioMes, lt: fimMes },
        },
      }),

      // Conversões no mês
      prisma.lead.count({
        where: {
          vendedorId,
          vendaRealizada: true,
          dataConversao: { gte: inicioMes, lt: fimMes },
        },
      }),

      // Follow-ups pendentes
      prisma.followUp.count({
        where: { vendedorId, status: 'pendente' },
      }),

      // Tempo médio de abordagem (leads que têm data de atribuição e abordagem)
      prisma.lead.findMany({
        where: {
          vendedorId,
          dataAtribuicao: { not: null },
          dataAbordagem: { not: null },
        },
        select: { dataAtribuicao: true, dataAbordagem: true },
      }),
    ]);

    // Calcular tempo médio em minutos
    let tempoMedioMin = null;
    if (tempoMedioAbordagem.length > 0) {
      const somaMinutos = tempoMedioAbordagem.reduce((soma, l) => {
        const diff = l.dataAbordagem.getTime() - l.dataAtribuicao.getTime();
        return soma + diff / 60000;
      }, 0);
      tempoMedioMin = Math.round(somaMinutos / tempoMedioAbordagem.length);
    }

    // Taxa de conversão
    const taxaConversao = totalLeads > 0
      ? Math.round((leadsConvertidos / totalLeads) * 10000) / 100
      : 0;

    res.json({
      vendedor: {
        id: vendedor.id,
        nome: vendedor.nomeExibicao,
        papel: vendedor.papel,
        classesAtendidas: vendedor.classesAtendidas,
        leadsAtivos: vendedor.leadsAtivos,
        leadsMax: vendedor.leadsMax,
      },
      metricas: {
        totalLeads,
        leadsConvertidos,
        leadsPerdidos,
        taxaConversao,
        ticketMedio: vendedor.ticketMedio,
        tempoMedioAbordagemMin: tempoMedioMin,
        followUpsPendentes,
      },
      mes: {
        leadsRecebidos: leadsMes,
        conversoes: conversoesMes,
      },
      distribuicao: {
        porClasse: leadsPorClasse.map((g) => ({
          classe: g.classe,
          quantidade: g._count,
        })),
        porEtapa: leadsPorEtapa.map((g) => ({
          etapa: g.etapaFunil,
          quantidade: g._count,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
}

async function leadsAtivos(req, res, next) {
  try {
    const { id } = req.params;
    const vendedorId = parseInt(id, 10);

    const leads = await prisma.lead.findMany({
      where: {
        vendedorId,
        status: { in: ['aguardando', 'em_abordagem'] },
        etapaFunil: { notIn: ['fechado_ganho', 'fechado_perdido'] },
      },
      orderBy: [{ pontuacao: 'desc' }, { createdAt: 'desc' }],
      include: {
        followUps: {
          where: { status: 'pendente' },
          orderBy: { dataProgramada: 'asc' },
          take: 1,
        },
      },
    });

    res.json(leads);
  } catch (err) {
    next(err);
  }
}

async function followUpsVendedor(req, res, next) {
  try {
    const { id } = req.params;
    const vendedorId = parseInt(id, 10);

    const followUps = await prisma.followUp.findMany({
      where: { vendedorId, status: 'pendente' },
      orderBy: { dataProgramada: 'asc' },
      include: {
        lead: { select: { id: true, nome: true, telefone: true, classe: true, etapaFunil: true } },
      },
    });

    res.json(followUps);
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, dashboard, leadsAtivos, followUpsVendedor };
