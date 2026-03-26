const prisma = require('../config/database');

function buildDateFilter(req) {
  const { data_inicio, data_fim } = req.query;
  if (!data_inicio && !data_fim) return {};
  const filter = {};
  if (data_inicio) filter.gte = new Date(data_inicio);
  if (data_fim) filter.lte = new Date(data_fim + (data_fim.length === 10 ? 'T23:59:59.999Z' : ''));
  return { createdAt: filter };
}

async function somarFaturamento(where) {
  const result = await prisma.lead.aggregate({
    where: { ...where, vendaRealizada: true },
    _sum: { valorVenda: true },
  });
  return Number(result._sum.valorVenda || 0);
}

async function geral(req, res, next) {
  try {
    const dateWhere = buildDateFilter(req);
    const [totalLeads, convertidos, perdidos, porCanal, porClasse, porEtapa] = await Promise.all([
      prisma.lead.count({ where: dateWhere }),
      prisma.lead.count({ where: { ...dateWhere, vendaRealizada: true } }),
      prisma.lead.count({ where: { ...dateWhere, status: 'perdido' } }),
      prisma.lead.groupBy({ by: ['canal'], where: dateWhere, _count: true }),
      prisma.lead.groupBy({ by: ['classe'], where: dateWhere, _count: true }),
      prisma.lead.groupBy({ by: ['etapaFunil'], where: dateWhere, _count: true }),
    ]);

    const taxaConversao = totalLeads > 0 ? Math.round((convertidos / totalLeads) * 10000) / 100 : 0;
    const faturamento = await somarFaturamento(dateWhere);
    const ticketMedio = convertidos > 0 ? Math.round(faturamento / convertidos) : 0;

    res.json({
      totalLeads,
      convertidos,
      perdidos,
      taxaConversao,
      faturamento,
      ticketMedio,
      porCanal: porCanal.map((g) => ({ canal: g.canal, total: g._count })),
      porClasse: porClasse.map((g) => ({ classe: g.classe, total: g._count })),
      porEtapa: porEtapa.map((g) => ({ etapa: g.etapaFunil, total: g._count })),
    });
  } catch (err) {
    next(err);
  }
}

async function porCanal(req, res, next) {
  try {
    const dateWhere = buildDateFilter(req);
    const canais = ['bio', 'anuncio', 'evento'];
    const resultado = [];

    for (const canal of canais) {
      const [total, convertidos] = await Promise.all([
        prisma.lead.count({ where: { ...dateWhere, canal } }),
        prisma.lead.count({ where: { ...dateWhere, canal, vendaRealizada: true } }),
      ]);
      if (total === 0) continue;

      const taxa = Math.round((convertidos / total) * 10000) / 100;
      const faturamento = await somarFaturamento({ ...dateWhere, canal });
      resultado.push({
        canal,
        totalLeads: total,
        convertidos,
        taxaConversao: taxa,
        faturamento,
      });
    }

    res.json(resultado);
  } catch (err) {
    next(err);
  }
}

async function porClasse(req, res, next) {
  try {
    const dateWhere = buildDateFilter(req);
    const classes = ['A', 'B', 'C'];
    const resultado = [];

    for (const classe of classes) {
      const [total, convertidos] = await Promise.all([
        prisma.lead.count({ where: { ...dateWhere, classe } }),
        prisma.lead.count({ where: { ...dateWhere, classe, vendaRealizada: true } }),
      ]);
      if (total === 0) continue;

      const taxa = Math.round((convertidos / total) * 10000) / 100;
      const faturamento = await somarFaturamento({ ...dateWhere, classe });
      resultado.push({
        classe,
        totalLeads: total,
        convertidos,
        taxaConversao: taxa,
        faturamento,
      });
    }

    res.json(resultado);
  } catch (err) {
    next(err);
  }
}

async function porCloser(req, res, next) {
  try {
    const dateWhere = buildDateFilter(req);
    const vendedores = await prisma.vendedor.findMany({
      where: { ativo: true },
      include: { usuario: { select: { nome: true } } },
    });

    const resultado = [];

    for (const v of vendedores) {
      const [total, convertidos, leadsComAbordagem] = await Promise.all([
        prisma.lead.count({ where: { ...dateWhere, vendedorId: v.id } }),
        prisma.lead.count({ where: { ...dateWhere, vendedorId: v.id, vendaRealizada: true } }),
        prisma.lead.findMany({
          where: { ...dateWhere, vendedorId: v.id, dataAtribuicao: { not: null }, dataAbordagem: { not: null } },
          select: { dataAtribuicao: true, dataAbordagem: true },
        }),
      ]);

      let tempoMedioMin = null;
      if (leadsComAbordagem.length > 0) {
        const soma = leadsComAbordagem.reduce((s, l) => {
          return s + (l.dataAbordagem.getTime() - l.dataAtribuicao.getTime()) / 60000;
        }, 0);
        tempoMedioMin = Math.round(soma / leadsComAbordagem.length);
      }

      const taxa = total > 0 ? Math.round((convertidos / total) * 10000) / 100 : 0;

      const faturamento = await somarFaturamento({ ...dateWhere, vendedorId: v.id });
      const ticketMedio = convertidos > 0 ? Math.round(faturamento / convertidos) : 0;

      resultado.push({
        vendedorId: v.id,
        nome: v.nomeExibicao,
        papel: v.papel,
        totalLeads: total,
        convertidos,
        taxaConversao: taxa,
        faturamento,
        ticketMedio,
        tempoMedioAbordagemMin: tempoMedioMin,
      });
    }

    resultado.sort((a, b) => b.convertidos - a.convertidos);
    res.json(resultado);
  } catch (err) {
    next(err);
  }
}

async function resumoIA(req, res, next) {
  try {
    const { data_inicio, data_fim } = req.query;
    if (!data_inicio || !data_fim) {
      return res.status(400).json({ error: 'data_inicio e data_fim sao obrigatorios' });
    }
    const { gerarResumoPeriodo } = require('../services/aiService');
    const resultado = await gerarResumoPeriodo(data_inicio, data_fim);
    res.json(resultado);
  } catch (err) {
    next(err);
  }
}

module.exports = { geral, porCanal, porClasse, porCloser, resumoIA };
