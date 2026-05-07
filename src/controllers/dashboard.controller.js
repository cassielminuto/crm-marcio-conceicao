const prisma = require('../config/database');
const logger = require('../utils/logger');

// ─── Fonte de leitura de venda (Fase 2B do plano) ───
// READ_FROM_VENDA = true  -> le da tabela Venda (TODAS vendas + dataPagamento)
// READ_FROM_VENDA = false -> le do Lead.vendaRealizada/valorVenda/dataConversao (legado)
//
// Default seguro: env nao setada -> false -> comportamento atual intocado.
// Pra ativar leitura de Venda em producao, setar READ_VENDA_FROM_LEAD=false.
// Contrato de saida do endpoint /dashboard/metricas NAO MUDA com a flag.
const READ_FROM_VENDA = process.env.READ_VENDA_FROM_LEAD === 'false';

// ─── Cache simples em memória (30s TTL) ───
const cache = new Map();
const CACHE_TTL = 30000;

function getCacheKey(params) {
  return JSON.stringify(params);
}

function getFromCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
  // Limpar entradas velhas periodicamente
  if (cache.size > 50) {
    const agora = Date.now();
    for (const [k, v] of cache) {
      if (agora - v.timestamp > CACHE_TTL) cache.delete(k);
    }
  }
}

// ─── Helpers de data ───
// whereLeads: filtra por createdAt (quando lead entrou no sistema)
// whereVendas: filtra por dataConversao em Lead.vendaRealizada=true (legado)
// whereVendaT: filtra prisma.venda por dataPagamento (TODAS vendas, incluindo
//   recorrencias — bate com o faturamento total da Hubla). Consumidores que
//   precisam só da primeira venda (ex: tempo medio) aplicam recorrencia: false
//   localmente.
//   (vendedorId/canal sao aplicados na relation lead pra preservar semantica
//   do filtro existente — filtra por dono do lead na hora da venda)
//   campanhaId/criativoId sao aplicados direto na Venda quando READ_FROM_VENDA;
//   nas wheres legadas (Lead) sao aplicados em Lead.campanhaId/criativoId.
function buildWheres(dataInicio, dataFim, vendedorId, canal, campanhaId, criativoId) {
  const base = {};
  if (vendedorId) base.vendedorId = Number(vendedorId);
  if (canal) base.canal = canal;
  if (campanhaId) base.campanhaId = Number(campanhaId);
  if (criativoId) base.criativoId = Number(criativoId);

  const whereLeads = { ...base };
  if (dataInicio) whereLeads.createdAt = { ...whereLeads.createdAt, gte: new Date(dataInicio) };
  if (dataFim) whereLeads.createdAt = { ...whereLeads.createdAt, lte: new Date(dataFim) };

  const whereVendas = { ...base, vendaRealizada: true };
  if (dataInicio) whereVendas.dataConversao = { ...whereVendas.dataConversao, gte: new Date(dataInicio) };
  if (dataFim) whereVendas.dataConversao = { ...whereVendas.dataConversao, lte: new Date(dataFim) };

  const whereVendaT = {};
  const leadFilter = {};
  if (vendedorId) leadFilter.vendedorId = Number(vendedorId);
  if (canal) leadFilter.canal = canal;
  if (Object.keys(leadFilter).length > 0) whereVendaT.lead = leadFilter;
  // campanhaId/criativoId vivem direto em Venda — filtra na propria tabela
  if (campanhaId) whereVendaT.campanhaId = Number(campanhaId);
  if (criativoId) whereVendaT.criativoId = Number(criativoId);
  if (dataInicio) whereVendaT.dataPagamento = { ...whereVendaT.dataPagamento, gte: new Date(dataInicio) };
  if (dataFim) whereVendaT.dataPagamento = { ...whereVendaT.dataPagamento, lte: new Date(dataFim) };

  return { whereLeads, whereVendas, whereVendaT };
}

function periodoAnterior(dataInicio, dataFim) {
  const inicio = new Date(dataInicio);
  const fim = new Date(dataFim);
  const duracao = fim.getTime() - inicio.getTime();
  const anteriorFim = new Date(inicio.getTime() - 1);
  const anteriorInicio = new Date(anteriorFim.getTime() - duracao);
  return { dataInicio: anteriorInicio.toISOString(), dataFim: anteriorFim.toISOString() };
}

// ─── 1. KPIs principais ───
async function calcularKpis(whereLeads, whereVendas, whereVendaT) {
  const totalLeads = await prisma.lead.count({ where: whereLeads });

  let vendas;
  let faturamento;
  if (READ_FROM_VENDA) {
    const [c, agg] = await Promise.all([
      prisma.venda.count({ where: whereVendaT }),
      prisma.venda.aggregate({ where: whereVendaT, _sum: { valorTotal: true } }),
    ]);
    vendas = c;
    faturamento = Number(agg._sum.valorTotal || 0);
  } else {
    const [c, agg] = await Promise.all([
      prisma.lead.count({ where: whereVendas }),
      prisma.lead.aggregate({ where: whereVendas, _sum: { valorVenda: true } }),
    ]);
    vendas = c;
    faturamento = Number(agg._sum.valorVenda || 0);
  }

  const ticketMedio = vendas > 0 ? faturamento / vendas : 0;
  const taxaConversao = totalLeads > 0 ? ((vendas / totalLeads) * 100) : 0;

  return { totalLeads, vendas, faturamento, ticketMedio, taxaConversao };
}

// ─── 2. Ranking de vendedores ───
async function calcularRanking(whereLeads, whereVendas, whereVendaT) {
  // Total de leads por vendedor (createdAt no período)
  const totalPorVendedor = await prisma.lead.groupBy({
    by: ['vendedorId'],
    where: { ...whereLeads, vendedorId: { not: null } },
    _count: { id: true },
  });

  // Vendas por vendedor (dataConversao no período + vendaRealizada)
  let vendasPorVendedor;
  if (READ_FROM_VENDA) {
    // groupBy em prisma.venda por closerResponsavelId; normaliza shape
    // pra { vendedorId, _count, _sum: { valorVenda } } e reaproveita o map abaixo.
    const grupos = await prisma.venda.groupBy({
      by: ['closerResponsavelId'],
      where: { ...whereVendaT, closerResponsavelId: { not: null } },
      _count: { id: true },
      _sum: { valorTotal: true },
    });
    vendasPorVendedor = grupos.map(g => ({
      vendedorId: g.closerResponsavelId,
      _count: g._count,
      _sum: { valorVenda: g._sum.valorTotal },
    }));
  } else {
    vendasPorVendedor = await prisma.lead.groupBy({
      by: ['vendedorId'],
      where: { ...whereVendas, vendedorId: { not: null } },
      _count: { id: true },
      _sum: { valorVenda: true },
    });
  }

  const vendedores = await prisma.vendedor.findMany({
    where: { ativo: true },
    select: { id: true, nomeExibicao: true, usuarioId: true },
  });

  const totalMap = new Map(totalPorVendedor.map(g => [g.vendedorId, g._count.id]));
  const vendasMap = new Map(vendasPorVendedor.map(v => [v.vendedorId, { count: v._count.id, faturamento: Number(v._sum.valorVenda || 0) }]));
  const vendedorMap = new Map(vendedores.map(v => [v.id, v]));

  // Unir todos os vendedores que têm leads OU vendas
  const todosIds = new Set([...totalMap.keys(), ...vendasMap.keys()]);

  return Array.from(todosIds)
    .map(vid => {
      const v = vendedorMap.get(vid);
      const totalLeads = totalMap.get(vid) || 0;
      const venda = vendasMap.get(vid) || { count: 0, faturamento: 0 };
      const ticketMedio = venda.count > 0 ? venda.faturamento / venda.count : 0;
      // Conversão: vendas / total leads do vendedor no período
      const conversao = totalLeads > 0 ? ((venda.count / totalLeads) * 100) : 0;
      return {
        vendedorId: vid,
        nomeExibicao: v?.nomeExibicao || `Vendedor #${vid}`,
        usuarioId: v?.usuarioId,
        leads: totalLeads,
        vendas: venda.count,
        faturamento: venda.faturamento,
        ticketMedio,
        conversao,
      };
    })
    .sort((a, b) => b.faturamento - a.faturamento);
}

// ─── 3. Funil de conversão (conta leads por etapa, usa createdAt) ───
async function calcularFunil(whereLeads) {
  const where = whereLeads;
  const etapasConfig = await prisma.etapaFunil.findMany({
    where: { ativo: true },
    orderBy: { ordem: 'asc' },
  });

  const grupos = await prisma.lead.groupBy({
    by: ['etapaFunil'],
    where,
    _count: { id: true },
  });

  const contagemMap = new Map(grupos.map(g => [g.etapaFunil, g._count.id]));

  const etapas = etapasConfig.map((et, i) => {
    const qtd = contagemMap.get(et.slug) || 0;
    return { slug: et.slug, label: et.label, cor: et.cor, tipo: et.tipo, qtd, ordem: et.ordem };
  });

  // Calcular % conversão entre etapas adjacentes (só ativas normais)
  const ativas = etapas.filter(e => e.tipo === 'normal' || e.tipo === 'ganho');
  for (let i = 1; i < ativas.length; i++) {
    const anterior = ativas[i - 1].qtd;
    ativas[i].conversaoPct = anterior > 0 ? ((ativas[i].qtd / anterior) * 100) : 0;
  }

  return etapas;
}

// ─── 4. Tempo médio de conversão ───
async function calcularTempoMedio(whereVendas, whereVendaT) {
  if (READ_FROM_VENDA) {
    // Usa cicloVendaDias ja calculado pelo vendaService — economiza compute.
    // recorrencia: false aqui porque ciclo de venda só faz sentido na primeira
    // venda (uma recorrência teria ciclo ~0 e enviesaria a média pra baixo).
    const vendas = await prisma.venda.findMany({
      where: { ...whereVendaT, recorrencia: false, cicloVendaDias: { not: null } },
      select: { cicloVendaDias: true },
    });
    if (vendas.length === 0) return { tempoMedioConversaoDias: 0, amostra: 0 };
    const totalDias = vendas.reduce((acc, v) => acc + v.cicloVendaDias, 0);
    return {
      tempoMedioConversaoDias: Math.round((totalDias / vendas.length) * 10) / 10,
      amostra: vendas.length,
    };
  }

  // whereVendas já filtra por dataConversao no range + vendaRealizada
  const convertidos = await prisma.lead.findMany({
    where: whereVendas,
    select: { createdAt: true, dataConversao: true },
  });

  if (convertidos.length === 0) return { tempoMedioConversaoDias: 0, amostra: 0 };

  const totalDias = convertidos.reduce((acc, l) => {
    const diff = new Date(l.dataConversao).getTime() - new Date(l.createdAt).getTime();
    return acc + diff / (1000 * 60 * 60 * 24);
  }, 0);

  return {
    tempoMedioConversaoDias: Math.round((totalDias / convertidos.length) * 10) / 10,
    amostra: convertidos.length,
  };
}

// ─── 5. Performance SDR ───
async function calcularPerformanceSdr(dataInicio, dataFim) {
  const whereDate = {};
  if (dataInicio) whereDate.createdAt = { ...whereDate.createdAt, gte: new Date(dataInicio) };
  if (dataFim) whereDate.createdAt = { ...whereDate.createdAt, lte: new Date(dataFim) };

  // Instagram (LeadSDR)
  const [sdrTotal, sdrHandoffs] = await Promise.all([
    prisma.leadSDR.count({ where: { ...whereDate, deletedAt: null } }),
    prisma.leadSDR.count({ where: { ...whereDate, deletedAt: null, handoffRealizadoEm: { not: null } } }),
  ]);

  // Dos handoffs, quantos fecharam?
  const filtroFechouCloser = READ_FROM_VENDA
    ? { vendas: { some: { recorrencia: false } } }
    : { vendaRealizada: true };
  const sdrFechados = await prisma.leadSDR.count({
    where: {
      ...whereDate,
      deletedAt: null,
      handoffRealizadoEm: { not: null },
      leadCloser: filtroFechouCloser,
    },
  });

  // Inbound (LeadSDRInbound)
  const [inboundTotal, inboundHandoffs] = await Promise.all([
    prisma.leadSDRInbound.count({ where: { ...whereDate, deletedAt: null } }),
    prisma.leadSDRInbound.count({ where: { ...whereDate, deletedAt: null, etapa: 'passado_closer' } }),
  ]);

  const inboundFechados = await prisma.leadSDRInbound.count({
    where: {
      ...whereDate,
      deletedAt: null,
      etapa: 'passado_closer',
      leadCloserId: { not: null },
    },
  });

  // Buscar nomes dos SDRs
  const operadores = await prisma.vendedor.findMany({
    where: { papel: 'sdr', ativo: true },
    select: { id: true, nomeExibicao: true },
  });

  return {
    instagram: {
      operadores: operadores.filter(o => o.id !== 11), // excluir Thomaz do Instagram
      total: sdrTotal,
      handoffs: sdrHandoffs,
      fechados: sdrFechados,
      taxaHandoff: sdrTotal > 0 ? ((sdrHandoffs / sdrTotal) * 100) : 0,
      taxaFechamento: sdrHandoffs > 0 ? ((sdrFechados / sdrHandoffs) * 100) : 0,
    },
    inbound: {
      operadorNome: 'Thomaz',
      total: inboundTotal,
      handoffs: inboundHandoffs,
      fechados: inboundFechados,
      taxaHandoff: inboundTotal > 0 ? ((inboundHandoffs / inboundTotal) * 100) : 0,
      taxaFechamento: inboundHandoffs > 0 ? ((inboundFechados / inboundHandoffs) * 100) : 0,
    },
  };
}

// ─── 6. Leads por canal ───
async function calcularPorCanal(whereLeads, whereVendas, whereVendaT) {
  const grupos = await prisma.lead.groupBy({
    by: ['canal'],
    where: whereLeads,
    _count: { id: true },
  });

  let vendasMap;
  if (READ_FROM_VENDA) {
    // Prisma nao faz groupBy via relation — busca Vendas com lead.canal e agrega em JS
    const vendas = await prisma.venda.findMany({
      where: whereVendaT,
      select: { lead: { select: { canal: true } } },
    });
    vendasMap = new Map();
    for (const v of vendas) {
      const canal = v.lead?.canal;
      if (canal) vendasMap.set(canal, (vendasMap.get(canal) || 0) + 1);
    }
  } else {
    const vendasPorCanal = await prisma.lead.groupBy({
      by: ['canal'],
      where: whereVendas,
      _count: { id: true },
    });
    vendasMap = new Map(vendasPorCanal.map(g => [g.canal, g._count.id]));
  }

  return grupos.map(g => ({
    canal: g.canal,
    leads: g._count.id,
    vendas: vendasMap.get(g.canal) || 0,
    conversao: g._count.id > 0 ? (((vendasMap.get(g.canal) || 0) / g._count.id) * 100) : 0,
  }));
}

// ─── 7. Top anúncios ───
async function calcularTopAnuncios(whereLeads, whereVendas, whereVendaT) {
  // Leads criados no período (pra contagem de leads por anúncio)
  const leadsAnuncio = await prisma.lead.findMany({
    where: { ...whereLeads, canal: 'anuncio', formularioTitulo: { not: null } },
    select: { formularioTitulo: true },
  });

  // Vendas de anúncio no período (dataConversao no range)
  let vendasAnuncio;
  if (READ_FROM_VENDA) {
    const vendas = await prisma.venda.findMany({
      where: {
        ...whereVendaT,
        lead: {
          ...(whereVendaT.lead || {}),
          canal: 'anuncio',
          formularioTitulo: { not: null },
        },
      },
      select: { lead: { select: { formularioTitulo: true } } },
    });
    vendasAnuncio = vendas.map(v => ({ formularioTitulo: v.lead?.formularioTitulo }));
  } else {
    vendasAnuncio = await prisma.lead.findMany({
      where: { ...whereVendas, canal: 'anuncio', formularioTitulo: { not: null } },
      select: { formularioTitulo: true },
    });
  }

  const porForm = {};
  for (const l of leadsAnuncio) {
    const key = l.formularioTitulo || 'Desconhecido';
    if (!porForm[key]) porForm[key] = { nome: key, leads: 0, vendas: 0 };
    porForm[key].leads++;
  }
  for (const v of vendasAnuncio) {
    const key = v.formularioTitulo || 'Desconhecido';
    if (!porForm[key]) porForm[key] = { nome: key, leads: 0, vendas: 0 };
    porForm[key].vendas++;
  }

  const lista = Object.values(porForm).map(f => ({
    ...f,
    conversao: f.leads > 0 ? ((f.vendas / f.leads) * 100) : 0,
  }));

  return {
    topPorLeads: [...lista].sort((a, b) => b.leads - a.leads).slice(0, 5),
    topPorConversao: [...lista].filter(f => f.leads >= 3).sort((a, b) => b.conversao - a.conversao).slice(0, 5),
  };
}

// ─── 8. Reuniões (Agenda) ───
async function calcularReunioes(dataInicio, dataFim) {
  const whereEvento = {
    deletedAt: null,
    tipo: { in: ['reuniao_sdr_instagram', 'reuniao_sdr_inbound', 'reuniao_manual'] },
  };
  if (dataInicio) whereEvento.inicio = { ...whereEvento.inicio, gte: new Date(dataInicio) };
  if (dataFim) whereEvento.inicio = { ...whereEvento.inicio, lte: new Date(dataFim) };

  const [total, realizadas, noShows] = await Promise.all([
    prisma.eventoAgenda.count({ where: whereEvento }),
    prisma.eventoAgenda.count({ where: { ...whereEvento, statusReuniao: 'realizada' } }),
    prisma.eventoAgenda.count({ where: { ...whereEvento, statusReuniao: 'no_show' } }),
  ]);

  const taxaNoShow = total > 0 ? ((noShows / total) * 100) : 0;

  // Próximas reuniões da semana
  const agora = new Date();
  const fimSemana = new Date(agora);
  fimSemana.setDate(fimSemana.getDate() + 7);

  const proximas = await prisma.eventoAgenda.findMany({
    where: {
      deletedAt: null,
      tipo: { in: ['reuniao_sdr_instagram', 'reuniao_sdr_inbound', 'reuniao_manual'] },
      inicio: { gte: agora, lte: fimSemana },
      statusReuniao: null,
    },
    include: { vendedor: { select: { id: true, nomeExibicao: true } } },
    orderBy: { inicio: 'asc' },
    take: 10,
  });

  return {
    agendadas: total,
    realizadas,
    noShows,
    taxaNoShow,
    proximas: proximas.map(e => ({
      id: e.id,
      titulo: e.titulo,
      inicio: e.inicio,
      tipo: e.tipo,
      vendedorNome: e.vendedor?.nomeExibicao,
    })),
  };
}

// ─── 9. Pipeline + Forecast ───
async function calcularPipeline(whereLeads) {
  const where = whereLeads;
  // Etapas ativas (não ganho/perdido)
  const etapasAtivas = await prisma.etapaFunil.findMany({
    where: { ativo: true, tipo: 'normal' },
    select: { slug: true },
  });
  const slugsAtivos = etapasAtivas.map(e => e.slug);

  const pipelineAgg = await prisma.lead.aggregate({
    where: { ...where, etapaFunil: { in: slugsAtivos } },
    _sum: { valorVenda: true },
    _count: { id: true },
  });

  const valorPipeline = Number(pipelineAgg._sum.valorVenda || 0);

  // Forecast: realizado no mês / dias passados * dias do mês
  const agora = new Date();
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0);
  const diasNoMes = fimMes.getDate();
  const diasPassados = agora.getDate();

  let realizadoValor;
  if (READ_FROM_VENDA) {
    const realizadoMes = await prisma.venda.aggregate({
      where: {
        recorrencia: false,
        dataPagamento: { gte: inicioMes, lte: agora },
      },
      _sum: { valorTotal: true },
    });
    realizadoValor = Number(realizadoMes._sum.valorTotal || 0);
  } else {
    const realizadoMes = await prisma.lead.aggregate({
      where: {
        vendaRealizada: true,
        dataConversao: { gte: inicioMes, lte: agora },
      },
      _sum: { valorVenda: true },
    });
    realizadoValor = Number(realizadoMes._sum.valorVenda || 0);
  }

  const forecast = diasPassados > 0 ? (realizadoValor / diasPassados) * diasNoMes : 0;

  return {
    valorPipeline,
    leadsPipeline: pipelineAgg._count.id,
    forecast: Math.round(forecast * 100) / 100,
    realizadoMes: realizadoValor,
    diasPassados,
    diasNoMes,
  };
}

// ─── 10. Heatmap de horário ───
async function calcularHeatmap(whereLeads) {
  const leads = await prisma.lead.findMany({
    where: whereLeads,
    select: { createdAt: true },
  });

  const horas = new Array(24).fill(0);
  for (const l of leads) {
    // Converter UTC pra Brasília (UTC-3)
    const h = new Date(l.createdAt);
    const brasilia = new Date(h.getTime() - 3 * 60 * 60 * 1000);
    horas[brasilia.getUTCHours()]++;
  }

  return horas.map((count, hora) => ({ hora: `${String(hora).padStart(2, '0')}:00`, count }));
}

// ─── 11. Atividade do time hoje ───
async function calcularAtividade() {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const amanha = new Date(hoje);
  amanha.setDate(amanha.getDate() + 1);

  const [totalInteracoes, porTipo] = await Promise.all([
    prisma.interacao.count({ where: { createdAt: { gte: hoje, lt: amanha } } }),
    prisma.interacao.groupBy({
      by: ['tipo'],
      where: { createdAt: { gte: hoje, lt: amanha } },
      _count: { id: true },
    }),
  ]);

  return {
    totalInteracoes,
    porTipo: porTipo.map(g => ({ tipo: g.tipo, count: g._count.id })),
  };
}

// ─── Handler principal ───
async function metricas(req, res, next) {
  try {
    const { data_inicio, data_fim, vendedor_id, canal, campanha_id, criativo_id, comparar } = req.query;

    // Check cache
    const cacheKey = getCacheKey({ data_inicio, data_fim, vendedor_id, canal, campanha_id, criativo_id, comparar });
    const cached = getFromCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const { whereLeads, whereVendas, whereVendaT } = buildWheres(data_inicio, data_fim, vendedor_id, canal, campanha_id, criativo_id);

    // Executar todas as métricas em paralelo
    const [kpis, ranking, funil, tempoMedio, sdr, porCanal, topAnuncios, reunioes, pipeline, heatmap, atividade] = await Promise.all([
      calcularKpis(whereLeads, whereVendas, whereVendaT),
      calcularRanking(whereLeads, whereVendas, whereVendaT),
      calcularFunil(whereLeads),
      calcularTempoMedio(whereVendas, whereVendaT),
      calcularPerformanceSdr(data_inicio, data_fim),
      calcularPorCanal(whereLeads, whereVendas, whereVendaT),
      calcularTopAnuncios(whereLeads, whereVendas, whereVendaT),
      calcularReunioes(data_inicio, data_fim),
      calcularPipeline(whereLeads),
      calcularHeatmap(whereLeads),
      calcularAtividade(),
    ]);

    const resultado = {
      kpis,
      ranking,
      funil,
      tempoMedio,
      sdr,
      porCanal,
      topAnuncios,
      reunioes,
      pipeline,
      heatmap,
      atividade,
    };

    // Comparação com período anterior
    if (comparar === 'true' && data_inicio && data_fim) {
      const anterior = periodoAnterior(data_inicio, data_fim);
      const { whereLeads: wlAnt, whereVendas: wvAnt, whereVendaT: wvtAnt } = buildWheres(anterior.dataInicio, anterior.dataFim, vendedor_id, canal, campanha_id, criativo_id);
      const kpisAnterior = await calcularKpis(wlAnt, wvAnt, wvtAnt);

      resultado.comparacao = {
        periodo: anterior,
        kpis: kpisAnterior,
        deltas: {
          totalLeads: kpis.totalLeads - kpisAnterior.totalLeads,
          vendas: kpis.vendas - kpisAnterior.vendas,
          faturamento: kpis.faturamento - kpisAnterior.faturamento,
          taxaConversao: Math.round((kpis.taxaConversao - kpisAnterior.taxaConversao) * 10) / 10,
        },
      };
    }

    // Salvar no cache
    setCache(cacheKey, resultado);

    res.json(resultado);
  } catch (err) {
    logger.error(`Erro nas métricas do dashboard: ${err.message}`);
    next(err);
  }
}

module.exports = { metricas };
