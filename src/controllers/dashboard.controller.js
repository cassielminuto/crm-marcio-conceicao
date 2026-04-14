const prisma = require('../config/database');
const logger = require('../utils/logger');

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
function buildWhere(dataInicio, dataFim, vendedorId, canal) {
  const where = {};
  if (dataInicio) where.createdAt = { ...where.createdAt, gte: new Date(dataInicio) };
  if (dataFim) where.createdAt = { ...where.createdAt, lte: new Date(dataFim) };
  if (vendedorId) where.vendedorId = Number(vendedorId);
  if (canal) where.canal = canal;
  return where;
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
async function calcularKpis(where) {
  const [totalLeads, vendas, faturamentoAgg] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.count({ where: { ...where, vendaRealizada: true, etapaFunil: 'fechado_ganho' } }),
    prisma.lead.aggregate({ where: { ...where, vendaRealizada: true }, _sum: { valorVenda: true } }),
  ]);

  const faturamento = Number(faturamentoAgg._sum.valorVenda || 0);
  const ticketMedio = vendas > 0 ? faturamento / vendas : 0;
  const taxaConversao = totalLeads > 0 ? ((vendas / totalLeads) * 100) : 0;

  return { totalLeads, vendas, faturamento, ticketMedio, taxaConversao };
}

// ─── 2. Ranking de vendedores ───
async function calcularRanking(where) {
  const grupos = await prisma.lead.groupBy({
    by: ['vendedorId'],
    where: { ...where, vendedorId: { not: null } },
    _count: { id: true },
    _sum: { valorVenda: true },
  });

  const vendasPorVendedor = await prisma.lead.groupBy({
    by: ['vendedorId'],
    where: { ...where, vendaRealizada: true, vendedorId: { not: null } },
    _count: { id: true },
  });

  const vendedores = await prisma.vendedor.findMany({
    where: { ativo: true },
    select: { id: true, nomeExibicao: true, usuarioId: true },
  });

  const vendasMap = new Map(vendasPorVendedor.map(v => [v.vendedorId, v._count.id]));
  const vendedorMap = new Map(vendedores.map(v => [v.id, v]));

  return grupos
    .map(g => {
      const v = vendedorMap.get(g.vendedorId);
      const vendasCount = vendasMap.get(g.vendedorId) || 0;
      const faturamento = Number(g._sum.valorVenda || 0);
      const ticketMedio = vendasCount > 0 ? faturamento / vendasCount : 0;
      const conversao = g._count.id > 0 ? ((vendasCount / g._count.id) * 100) : 0;
      return {
        vendedorId: g.vendedorId,
        nomeExibicao: v?.nomeExibicao || `Vendedor #${g.vendedorId}`,
        usuarioId: v?.usuarioId,
        leads: g._count.id,
        vendas: vendasCount,
        faturamento,
        ticketMedio,
        conversao,
      };
    })
    .sort((a, b) => b.faturamento - a.faturamento);
}

// ─── 3. Funil de conversão ───
async function calcularFunil(where) {
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
async function calcularTempoMedio(where) {
  const convertidos = await prisma.lead.findMany({
    where: { ...where, dataConversao: { not: null }, vendaRealizada: true },
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
  const sdrFechados = await prisma.leadSDR.count({
    where: {
      ...whereDate,
      deletedAt: null,
      handoffRealizadoEm: { not: null },
      leadCloser: { vendaRealizada: true },
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
async function calcularPorCanal(where) {
  const grupos = await prisma.lead.groupBy({
    by: ['canal'],
    where,
    _count: { id: true },
  });

  const vendasPorCanal = await prisma.lead.groupBy({
    by: ['canal'],
    where: { ...where, vendaRealizada: true },
    _count: { id: true },
  });

  const vendasMap = new Map(vendasPorCanal.map(g => [g.canal, g._count.id]));

  return grupos.map(g => ({
    canal: g.canal,
    leads: g._count.id,
    vendas: vendasMap.get(g.canal) || 0,
    conversao: g._count.id > 0 ? (((vendasMap.get(g.canal) || 0) / g._count.id) * 100) : 0,
  }));
}

// ─── 7. Top anúncios ───
async function calcularTopAnuncios(where) {
  const leads = await prisma.lead.findMany({
    where: { ...where, canal: 'anuncio', formularioTitulo: { not: null } },
    select: { formularioTitulo: true, vendaRealizada: true },
  });

  const porForm = {};
  for (const l of leads) {
    const key = l.formularioTitulo || 'Desconhecido';
    if (!porForm[key]) porForm[key] = { nome: key, leads: 0, vendas: 0 };
    porForm[key].leads++;
    if (l.vendaRealizada) porForm[key].vendas++;
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
async function calcularPipeline(where) {
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

  const realizadoMes = await prisma.lead.aggregate({
    where: {
      vendaRealizada: true,
      dataConversao: { gte: inicioMes, lte: agora },
    },
    _sum: { valorVenda: true },
  });

  const realizadoValor = Number(realizadoMes._sum.valorVenda || 0);
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
async function calcularHeatmap(where) {
  const leads = await prisma.lead.findMany({
    where,
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
    const { data_inicio, data_fim, vendedor_id, canal, comparar } = req.query;

    // Check cache
    const cacheKey = getCacheKey({ data_inicio, data_fim, vendedor_id, canal, comparar });
    const cached = getFromCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const where = buildWhere(data_inicio, data_fim, vendedor_id, canal);

    // Executar todas as métricas em paralelo
    const [kpis, ranking, funil, tempoMedio, sdr, porCanal, topAnuncios, reunioes, pipeline, heatmap, atividade] = await Promise.all([
      calcularKpis(where),
      calcularRanking(where),
      calcularFunil(where),
      calcularTempoMedio(where),
      calcularPerformanceSdr(data_inicio, data_fim),
      calcularPorCanal(where),
      calcularTopAnuncios(where),
      calcularReunioes(data_inicio, data_fim),
      calcularPipeline(where),
      calcularHeatmap(where),
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
      const whereAnterior = buildWhere(anterior.dataInicio, anterior.dataFim, vendedor_id, canal);
      const kpisAnterior = await calcularKpis(whereAnterior);

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
