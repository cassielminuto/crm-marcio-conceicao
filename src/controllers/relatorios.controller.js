const prisma = require('../config/database');

const TICKET_MEDIO = 1229;

async function geral(req, res, next) {
  try {
    const [totalLeads, convertidos, perdidos, porCanal, porClasse, porEtapa] = await Promise.all([
      prisma.lead.count(),
      prisma.lead.count({ where: { vendaRealizada: true } }),
      prisma.lead.count({ where: { status: 'perdido' } }),
      prisma.lead.groupBy({ by: ['canal'], _count: true }),
      prisma.lead.groupBy({ by: ['classe'], _count: true }),
      prisma.lead.groupBy({ by: ['etapaFunil'], _count: true }),
    ]);

    const taxaConversao = totalLeads > 0 ? Math.round((convertidos / totalLeads) * 10000) / 100 : 0;
    const faturamento = convertidos * TICKET_MEDIO;

    res.json({
      totalLeads,
      convertidos,
      perdidos,
      taxaConversao,
      faturamento,
      ticketMedio: TICKET_MEDIO,
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
    const canais = ['bio', 'anuncio', 'evento'];
    const resultado = [];

    for (const canal of canais) {
      const [total, convertidos] = await Promise.all([
        prisma.lead.count({ where: { canal } }),
        prisma.lead.count({ where: { canal, vendaRealizada: true } }),
      ]);
      if (total === 0) continue;

      const taxa = Math.round((convertidos / total) * 10000) / 100;
      resultado.push({
        canal,
        totalLeads: total,
        convertidos,
        taxaConversao: taxa,
        faturamento: convertidos * TICKET_MEDIO,
      });
    }

    res.json(resultado);
  } catch (err) {
    next(err);
  }
}

async function porClasse(req, res, next) {
  try {
    const classes = ['A', 'B', 'C'];
    const resultado = [];

    for (const classe of classes) {
      const [total, convertidos] = await Promise.all([
        prisma.lead.count({ where: { classe } }),
        prisma.lead.count({ where: { classe, vendaRealizada: true } }),
      ]);
      if (total === 0) continue;

      const taxa = Math.round((convertidos / total) * 10000) / 100;
      resultado.push({
        classe,
        totalLeads: total,
        convertidos,
        taxaConversao: taxa,
        faturamento: convertidos * TICKET_MEDIO,
      });
    }

    res.json(resultado);
  } catch (err) {
    next(err);
  }
}

async function porCloser(req, res, next) {
  try {
    const vendedores = await prisma.vendedor.findMany({
      where: { ativo: true },
      include: { usuario: { select: { nome: true } } },
    });

    const resultado = [];

    for (const v of vendedores) {
      const [total, convertidos, leadsComAbordagem] = await Promise.all([
        prisma.lead.count({ where: { vendedorId: v.id } }),
        prisma.lead.count({ where: { vendedorId: v.id, vendaRealizada: true } }),
        prisma.lead.findMany({
          where: { vendedorId: v.id, dataAtribuicao: { not: null }, dataAbordagem: { not: null } },
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

      resultado.push({
        vendedorId: v.id,
        nome: v.nomeExibicao,
        papel: v.papel,
        totalLeads: total,
        convertidos,
        taxaConversao: taxa,
        faturamento: convertidos * TICKET_MEDIO,
        ticketMedio: TICKET_MEDIO,
        tempoMedioAbordagemMin: tempoMedioMin,
      });
    }

    resultado.sort((a, b) => b.convertidos - a.convertidos);
    res.json(resultado);
  } catch (err) {
    next(err);
  }
}

module.exports = { geral, porCanal, porClasse, porCloser };
