import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import FiltroUnificado from '../components/FiltroUnificado';
import { extrairProdutosUnicos, isProdutoExcluido } from '../utils/produtos';
import AIResumoPeriodo from '../components/AIResumoPeriodo';
import AvatarVendedor from '../components/AvatarVendedor';
import { useNavigate } from 'react-router-dom';
import { Users, TrendingUp, DollarSign, Target, Clock, Phone, MessageSquare, AlertTriangle, Trophy, ArrowUp, ArrowDown, Building2, Plus } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

/* ─── Accent color config per metric ─── */
const accentMap = {
  violet: { line: '#7C3AED', bg: 'rgba(124,58,237,0.12)', text: 'text-[#A78BFA]' },
  emerald: { line: '#10B981', bg: 'rgba(16,185,129,0.12)', text: 'text-[#10B981]' },
  amber:   { line: '#F59E0B', bg: 'rgba(245,158,11,0.12)', text: 'text-[#F59E0B]' },
  blue:    { line: '#3B82F6', bg: 'rgba(59,130,246,0.12)', text: 'text-[#3B82F6]' },
};

function MetricCard({ titulo, valor, icone: Icon, accent, subtitulo, mudanca, index = 0 }) {
  const a = accentMap[accent] || accentMap.blue;

  return (
    <div
      className="relative bg-bg-card border border-border-default rounded-[14px] p-5 transition-all duration-300 hover:border-border-hover hover:-translate-y-[2px] overflow-hidden group"
      style={{
        boxShadow: 'var(--t-shadow-card)',
        animationDelay: `${index * 80}ms`,
      }}
    >
      {/* Top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] opacity-70 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: a.line }}
      />

      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[1.5px] text-text-muted font-medium">{titulo}</p>
          <p className="font-display text-[32px] font-bold text-text-primary tracking-tight mt-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {valor}
          </p>
          <div className="flex items-center gap-2 mt-1">
            {subtitulo && <p className="text-[12px] text-text-muted">{subtitulo}</p>}
            {mudanca && (
              <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${
                mudanca.tipo === 'up' ? 'text-[#10B981]' : 'text-[#EF4444]'
              }`}>
                {mudanca.tipo === 'up' ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
                {mudanca.valor}
              </span>
            )}
          </div>
        </div>
        <div
          className="w-10 h-10 rounded-[10px] flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
          style={{ background: a.bg }}
        >
          <Icon size={20} className={a.text} />
        </div>
      </div>
    </div>
  );
}

function classificarUrgencia(dataProgramada) {
  const agora = new Date();
  const data = new Date(dataProgramada);
  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const dataLimpa = new Date(data.getFullYear(), data.getMonth(), data.getDate());

  if (dataLimpa < hoje) return 'atrasado';
  if (dataLimpa.getTime() === hoje.getTime()) return 'hoje';
  return 'futuro';
}

const coresUrgencia = {
  atrasado: { bg: 'bg-[rgba(225,112,85,0.08)]', border: 'border-[rgba(225,112,85,0.15)]', text: 'text-accent-danger', badge: 'bg-[rgba(225,112,85,0.12)] text-accent-danger', leftBorder: '#EF4444' },
  hoje: { bg: 'bg-[rgba(253,203,110,0.08)]', border: 'border-[rgba(253,203,110,0.15)]', text: 'text-accent-amber', badge: 'bg-[rgba(253,203,110,0.12)] text-accent-amber', leftBorder: '#F59E0B' },
  futuro: { bg: 'bg-[rgba(0,184,148,0.08)]', border: 'border-[rgba(0,184,148,0.15)]', text: 'text-accent-emerald', badge: 'bg-[rgba(0,184,148,0.12)] text-accent-emerald', leftBorder: '#10B981' },
};

const labelUrgencia = { atrasado: 'Atrasado', hoje: 'Hoje', futuro: 'Futuro' };
const tipoIcone = { whatsapp: MessageSquare, call: Phone, email: MessageSquare };

/* ─── Period selector tabs for chart ─── */
function PeriodTabs({ active, onChange }) {
  const tabs = ['7d', '30d', '90d'];

  return (
    <div className="flex items-center gap-1 bg-bg-elevated rounded-[8px] p-[3px]">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`px-3 py-1 rounded-[6px] text-[11px] font-medium transition-all duration-200 ${
            active === tab
              ? 'bg-[rgba(124,58,237,0.2)] text-[#A78BFA]'
              : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

/* ─── Medal component for top 3 ─── */
function MedalBadge({ position }) {
  const medals = {
    1: { bg: 'bg-[rgba(253,203,110,0.15)]', text: 'text-[#fdcb6e]', label: '1' },
    2: { bg: 'bg-[rgba(160,160,190,0.15)]', text: 'text-[#a0a0be]', label: '2' },
    3: { bg: 'bg-[rgba(225,112,85,0.15)]', text: 'text-[#e17055]', label: '3' },
  };
  const m = medals[position];
  if (!m) return <span className="text-[13px] font-extrabold w-6 text-center text-text-faint">{position}</span>;

  return (
    <div className={`w-6 h-6 rounded-full ${m.bg} flex items-center justify-center`}>
      {position <= 3 ? (
        <Trophy size={13} className={m.text} />
      ) : (
        <span className={`text-[11px] font-extrabold ${m.text}`}>{m.label}</span>
      )}
    </div>
  );
}

/* ─── Section header ─── */
function SectionHeader({ children, right }) {
  return (
    <div className="flex items-center justify-between mb-4 pb-3 border-b border-border-subtle">
      <h2 className="font-display text-[16px] font-medium text-text-primary">{children}</h2>
      {right}
    </div>
  );
}

/* ─── Glass tooltip for chart ─── */
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const d = new Date(label + 'T12:00:00');
  return (
    <div
      className="rounded-[10px] px-3.5 py-2.5 border border-[rgba(255,255,255,0.1)]"
      style={{
        background: 'rgba(17, 17, 24, 0.75)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      }}
    >
      <p className="text-[11px] text-[#e2e2ef] font-medium">{d.toLocaleDateString('pt-BR')}</p>
      <p className="text-[13px] font-semibold text-white mt-0.5" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {payload[0].value} <span className="text-[11px] font-normal text-text-secondary">Leads</span>
      </p>
    </div>
  );
};

export default function Dashboard() {
  const { usuario } = useAuth();
  const [followUps, setFollowUps] = useState([]);
  const [ranking, setRanking] = useState([]);
  const [graficoDados, setGraficoDados] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [vendedorInfo, setVendedorInfo] = useState(null);
  const [rawLeads, setRawLeads] = useState([]);
  const [rawVendas, setRawVendas] = useState([]);
  const [rawVendasData, setRawVendasData] = useState(null);
  const [metricasAnuncio, setMetricasAnuncio] = useState(null);
  const [metaEmpresaData, setMetaEmpresaData] = useState(null);

  const [dataInicio, setDataInicio] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [dataFim, setDataFim] = useState(() => new Date());
  const [filtroVendedor, setFiltroVendedor] = useState('');
  const [filtroCanal, setFiltroCanal] = useState('');
  const [produtosExcluidos, setProdutosExcluidos] = useState(new Set());
  const [chartPeriod, setChartPeriod] = useState('30d');
  const [todosVendedores, setTodosVendedores] = useState([]);

  const navigate = useNavigate();
  const vendedorId = usuario?.vendedorId;
  const isAdmin = usuario?.perfil === 'admin' || usuario?.perfil === 'gestor';

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    try {
      // BRT (UTC-3): inicio = 03:00Z mesmo dia, fim = 02:59:59Z dia seguinte
      const inicioStr = dataInicio instanceof Date ? dataInicio.toISOString().slice(0, 10) : dataInicio;
      const fimStr = dataFim instanceof Date ? dataFim.toISOString().slice(0, 10) : dataFim;
      const inicioISO = inicioStr + 'T03:00:00.000Z';
      const fimDate = new Date(fimStr + 'T12:00:00.000Z');
      fimDate.setUTCDate(fimDate.getUTCDate() + 1);
      const fimISO = fimDate.toISOString().slice(0, 10) + 'T02:59:59.999Z';

      const dp = `data_inicio=${inicioISO}&data_fim=${fimISO}`;
      const promises = [
        api.get(`/vendedores?${dp}`),
        api.get(`/leads/por-dia?${dp}`),
        api.get(`/leads/funil?${dp}`),
        api.get(`/leads/vendas?${dp}`),
        api.get(`/leads/metricas-anuncio?${dp}`),
      ];

      if (vendedorId) {
        promises.push(api.get(`/vendedores/${vendedorId}/followups`));
      }

      const resultados = await Promise.all(promises);
      const vendedoresData = resultados[0].data;
      setRanking(vendedoresData);
      setTodosVendedores(Array.isArray(vendedoresData) ? vendedoresData : []);
      setGraficoDados(resultados[1].data);

      const funilData = resultados[2].data;
      const leads = [];
      if (funilData?.etapas) {
        for (const etapaData of Object.values(funilData.etapas)) {
          if (etapaData.leads) leads.push(...etapaData.leads);
        }
      }
      setRawLeads(leads);

      const vendasData = resultados[3].data;
      setRawVendasData(vendasData);
      setRawVendas(vendasData?.vendas || []);

      setMetricasAnuncio(resultados[4]?.data || null);

      // Meta empresa (período atual, independente do filtro)
      try {
        const periodoMes = new Date().toISOString().slice(0, 7);
        const metaEmpRes = await api.get(`/metas/empresa?periodo=${periodoMes}`);
        setMetaEmpresaData(metaEmpRes.data);
      } catch { setMetaEmpresaData(null); }

      if (vendedorId) {
        const vInfo = vendedoresData.find(v => v.id === vendedorId);
        setVendedorInfo(vInfo);
        setFollowUps(resultados[5]?.data || []);
      } else if (isAdmin) {
        setVendedorInfo(null);
        setFollowUps([]);
      }
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
    } finally {
      setCarregando(false);
    }
  }, [vendedorId, isAdmin, dataInicio, dataFim]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const produtosDisponiveis = useMemo(() => extrairProdutosUnicos(rawVendas), [rawVendas]);

  const metricas = useMemo(() => {
    const filterLead = (l) => {
      if (filtroVendedor && l.vendedorId !== parseInt(filtroVendedor)) return false;
      if (filtroCanal && l.canal !== filtroCanal) return false;
      if (isProdutoExcluido(l, produtosExcluidos)) return false;
      return true;
    };

    const leads = rawLeads.filter(filterLead);
    const vendasList = rawVendas.filter(filterLead);

    let myLeads = leads;
    let myVendas = vendasList;
    if (vendedorId) {
      myLeads = leads.filter(l => l.vendedorId === vendedorId);
      myVendas = vendasList.filter(v => v.vendedorId === vendedorId);
    }

    const totalLeads = myLeads.length;
    const leadsConvertidos = myVendas.length;
    const leadsAtivos = myLeads.filter(l => !['fechado_ganho', 'fechado_perdido', 'nurturing'].includes(l.etapaFunil)).length;
    const taxaConversao = totalLeads > 0 ? Math.round((leadsConvertidos / totalLeads) * 10000) / 100 : 0;
    const faturamento = myVendas.reduce((sum, v) => sum + (v.valorVenda ? Number(v.valorVenda) : 0), 0);

    return { totalLeads, leadsConvertidos, leadsAtivos, taxaConversao, faturamento };
  }, [rawLeads, rawVendas, vendedorId, filtroVendedor, filtroCanal, produtosExcluidos]);

  // Filter chart data by chartPeriod (7d/30d/90d)
  const graficoDadosFiltrados = useMemo(() => {
    if (!graficoDados.length) return [];
    const dias = parseInt(chartPeriod) || 30;
    const corte = new Date();
    corte.setDate(corte.getDate() - dias);
    return graficoDados.filter(item => {
      if (!item.data) return false;
      return new Date(item.data) >= corte;
    });
  }, [graficoDados, chartPeriod]);

  // Compute max conversions for ranking progress bars
  const maxConversoes = useMemo(() => {
    if (!ranking.length) return 1;
    return Math.max(...ranking.map(v => v.conversoesNoPeriodo ?? v.totalConversoes ?? 0), 1);
  }, [ranking]);

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-violet" />
      </div>
    );
  }

  const posicaoRanking = vendedorId
    ? ranking.find((v) => v.id === vendedorId)?.rankingPosicao || '-'
    : '-';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-[24px] font-semibold text-text-primary">Dashboard</h1>
          <p className="text-text-secondary text-[13px] mt-1">
            {isAdmin ? 'Visao geral do time' : `Bem-vindo, ${usuario?.nome}`}
          </p>
        </div>
        <FiltroUnificado
          dataInicio={dataInicio} setDataInicio={setDataInicio}
          dataFim={dataFim} setDataFim={setDataFim}
          vendedorId={filtroVendedor} setVendedorId={setFiltroVendedor}
          canal={filtroCanal} setCanal={setFiltroCanal}
          produtosExcluidos={produtosExcluidos} setProdutosExcluidos={setProdutosExcluidos}
          vendedores={todosVendedores}
          produtosDisponiveis={produtosDisponiveis}
          onLimpar={() => { setFiltroVendedor(''); setFiltroCanal(''); setProdutosExcluidos(new Set()); }}
        />
      </div>

      {/* Cards de metricas — staggered entrance */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[14px]">
        <div className="animate-card-enter" style={{ animationDelay: '0ms' }}>
          <MetricCard
            titulo="Leads no Periodo"
            valor={metricas?.totalLeads ?? 0}
            icone={Users}
            accent="blue"
            subtitulo={vendedorId ? `${metricas?.leadsAtivos ?? 0} ativos` : `${metricas?.leadsAtivos ?? 0} em negociacao`}
            mudanca={{ tipo: 'up', valor: '12%' }}
            index={0}
          />
        </div>
        <div className="animate-card-enter" style={{ animationDelay: '80ms' }}>
          <MetricCard
            titulo="Taxa de Conversao"
            valor={`${metricas?.taxaConversao ?? 0}%`}
            icone={TrendingUp}
            accent="emerald"
            subtitulo={`${metricas?.leadsConvertidos ?? 0} de ${metricas?.totalLeads ?? 0}`}
            mudanca={{ tipo: 'up', valor: '3.2%' }}
            index={1}
          />
        </div>
        <div className="animate-card-enter" style={{ animationDelay: '160ms' }}>
          <MetricCard
            titulo="Faturamento"
            valor={`R$ ${(metricas?.faturamento ?? 0).toLocaleString('pt-BR')}`}
            icone={DollarSign}
            accent="amber"
            subtitulo={`${metricas?.leadsConvertidos ?? 0} vendas no periodo`}
            mudanca={{ tipo: 'up', valor: '8%' }}
            index={2}
          />
        </div>
        <div className="animate-card-enter" style={{ animationDelay: '240ms' }}>
          <MetricCard
            titulo="Conversoes"
            valor={metricas?.leadsConvertidos ?? 0}
            icone={Target}
            accent="violet"
            subtitulo={`de ${metricas?.totalLeads ?? 0} leads`}
            mudanca={{ tipo: 'down', valor: '5%' }}
            index={3}
          />
        </div>
      </div>

      {/* Card Meta Empresa */}
      {metaEmpresaData?.metaEmpresa ? (() => {
        const me = metaEmpresaData;
        const pct = me.percentualEmpresa || 0;
        const falta = Math.max(0, Number(me.metaEmpresa.valorMeta) - me.realizadoEmpresa);
        const status = pct >= 100 ? 'atingida' : 'em_andamento';
        const gradients = { em_andamento: 'linear-gradient(90deg, #6c5ce7, #00cec9)', atingida: 'linear-gradient(90deg, #00b894, #55efc4)' };
        return (
          <div className="bg-bg-card border border-border-default rounded-[14px] p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-accent-violet-light" />
                <span className="text-[11px] uppercase tracking-[1.5px] text-text-muted font-semibold">Meta da Empresa — {me.metaEmpresa.periodo}</span>
              </div>
              <span className="text-[12px] font-bold text-text-primary tabular-nums">{pct.toFixed(1)}%</span>
            </div>
            <div className="w-full h-[10px] bg-bg-elevated rounded-full overflow-hidden mb-4">
              <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${Math.min(pct, 100)}%`, background: gradients[status] }} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-[11px] uppercase tracking-[1.5px] text-text-muted font-medium">Meta</p>
                <p className="font-display text-[24px] font-bold text-text-secondary mt-1 tabular-nums">R$ {Number(me.metaEmpresa.valorMeta).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
              </div>
              <div className="text-center">
                <p className="text-[11px] uppercase tracking-[1.5px] text-text-muted font-medium">Realizado</p>
                <p className="font-display text-[24px] font-bold text-text-primary mt-1 tabular-nums">R$ {Number(me.realizadoEmpresa).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
              </div>
              <div className="text-center">
                <p className="text-[11px] uppercase tracking-[1.5px] text-text-muted font-medium">Falta</p>
                <p className="font-display text-[24px] font-bold text-accent-amber mt-1 tabular-nums">R$ {falta.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
              </div>
              <div className="text-center">
                <p className="text-[11px] uppercase tracking-[1.5px] text-text-muted font-medium">Distribuído</p>
                <p className="font-display text-[24px] font-bold text-text-secondary mt-1 tabular-nums">R$ {Number(me.somaDistribuida).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
              </div>
            </div>
          </div>
        );
      })() : (
        <div className="bg-bg-card border border-border-default rounded-[14px] p-6 text-center">
          <Building2 size={20} className="text-text-muted mx-auto mb-2" />
          <p className="text-[13px] text-text-muted">
            {isAdmin ? 'Meta do mês ainda não definida' : 'Meta do mês ainda não definida'}
          </p>
          {isAdmin && (
            <button onClick={() => navigate('/metas')} className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold bg-accent-violet text-white hover:bg-accent-violet/90 transition-colors">
              <Plus size={13} />
              Definir Meta do Mês
            </button>
          )}
        </div>
      )}

      {/* Card Metricas Anuncio */}
      {metricasAnuncio && (
        <div className="bg-bg-card border border-border-default rounded-[14px] p-6">
          <SectionHeader>Metricas — Anuncio</SectionHeader>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-[11px] uppercase tracking-[1.5px] text-text-muted font-medium">Reunioes Agendadas</p>
              <p className="font-display text-[28px] font-bold text-text-primary mt-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {metricasAnuncio.reunioes_agendadas ?? 0}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[11px] uppercase tracking-[1.5px] text-text-muted font-medium">Vendas Fechadas</p>
              <p className="font-display text-[28px] font-bold text-[#10B981] mt-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {metricasAnuncio.vendas_fechadas ?? 0}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[11px] uppercase tracking-[1.5px] text-text-muted font-medium">Receita</p>
              <p className="font-display text-[28px] font-bold text-[#F59E0B] mt-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
                R$ {(metricasAnuncio.receita ?? 0).toLocaleString('pt-BR')}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[11px] uppercase tracking-[1.5px] text-text-muted font-medium">Taxa Conversao</p>
              <p className="font-display text-[28px] font-bold text-[#A78BFA] mt-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {metricasAnuncio.taxa_conversao ?? 0}%
              </p>
            </div>
          </div>
        </div>
      )}

      {isAdmin && <AIResumoPeriodo dataInicio={dataInicio} dataFim={dataFim} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Grafico */}
        <div className="lg:col-span-2 bg-bg-card border border-border-default rounded-[14px] p-6">
          <SectionHeader right={<PeriodTabs active={chartPeriod} onChange={setChartPeriod} />}>
            Leads por dia
          </SectionHeader>
          {graficoDadosFiltrados.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={graficoDadosFiltrados}>
                <defs>
                  <linearGradient id="gradViolet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#7C3AED" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="rgba(255,255,255,0.03)"
                  strokeDasharray="4 6"
                  vertical={false}
                />
                <XAxis
                  dataKey="data"
                  tick={{ fontSize: 10, fill: '#5C5C6F' }}
                  stroke="rgba(255,255,255,0.04)"
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                  tickFormatter={(v) => {
                    const d = new Date(v + 'T12:00:00');
                    return `${d.getDate()}/${d.getMonth() + 1}`;
                  }}
                  interval={4}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#5C5C6F' }}
                  stroke="rgba(255,255,255,0.04)"
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#7C3AED"
                  fill="url(#gradViolet)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-text-muted text-center py-12">Sem dados no periodo</p>
          )}
        </div>

        {/* Ranking */}
        <div className="bg-bg-card border border-border-default rounded-[14px] p-6">
          <SectionHeader>Ranking do Time</SectionHeader>
          {vendedorId && (
            <div className="mb-4 bg-[rgba(124,58,237,0.12)] rounded-[10px] p-3 text-center">
              <p className="text-[10px] text-[#A78BFA]">Sua posicao</p>
              <p className="text-[28px] font-extrabold text-text-primary" style={{ fontVariantNumeric: 'tabular-nums' }}>#{posicaoRanking}</p>
            </div>
          )}
          <ul className="space-y-1">
            {ranking.map((v, i) => {
              const conv = v.conversoesNoPeriodo ?? v.totalConversoes ?? 0;
              const convRate = maxConversoes > 0 ? (conv / maxConversoes) * 100 : 0;
              return (
                <li
                  key={v.id}
                  className={`flex items-center gap-3 p-[10px_12px] rounded-[10px] text-[12px] transition-colors duration-200 ${
                    v.id === vendedorId ? 'bg-[rgba(124,58,237,0.1)]' : 'hover:bg-bg-card-hover'
                  }`}
                >
                  <MedalBadge position={v.rankingPosicao} />
                  <AvatarVendedor nome={v.nomeExibicao} fotoUrl={v.usuario?.fotoUrl} id={v.id} tamanho={32} />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-text-primary block truncate">{v.nomeExibicao}</span>
                    {/* Conversion progress bar */}
                    <div className="mt-1 h-[3px] w-full bg-border-subtle rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                          width: `${convRate}%`,
                          background: i === 0 ? '#fdcb6e' : i === 1 ? '#a0a0be' : i === 2 ? '#e17055' : '#7C3AED',
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-[12px] font-bold text-text-primary whitespace-nowrap" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {v.conversoesNoPeriodo ?? v.totalConversoes} conv.
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Follow-ups pendentes */}
      <div className="bg-bg-card border border-border-default rounded-[14px] p-6">
        <SectionHeader right={
          <span className="text-[12px] text-text-muted">{followUps.length} pendentes</span>
        }>
          Follow-ups Pendentes
        </SectionHeader>

        {followUps.length === 0 ? (
          <p className="text-text-muted text-center py-6">Nenhum follow-up pendente</p>
        ) : (
          <div className="space-y-2">
            {followUps.map((fu, idx) => {
              const urgencia = classificarUrgencia(fu.dataProgramada);
              const cores = coresUrgencia[urgencia];
              const IconeTipo = tipoIcone[fu.tipo] || MessageSquare;

              return (
                <div
                  key={fu.id}
                  className={`flex items-center justify-between p-3 rounded-[10px] border ${cores.bg} ${cores.border} transition-all duration-200 hover:scale-[1.005] animate-row-enter`}
                  style={{
                    borderLeft: `3px solid ${cores.leftBorder}`,
                    animationDelay: `${idx * 40}ms`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <IconeTipo size={16} className={cores.text} />
                    <div>
                      <p className={`text-[12px] font-medium ${cores.text}`}>
                        {fu.lead?.nome}
                      </p>
                      <p className="text-[11px] text-text-muted">
                        {fu.lead?.telefone} — Classe {fu.lead?.classe}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-[11px] text-text-secondary" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {new Date(fu.dataProgramada).toLocaleDateString('pt-BR')}
                      </p>
                      <p className="text-[10px] text-text-muted" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {new Date(fu.dataProgramada).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${cores.badge}`}>
                      {urgencia === 'atrasado' && <AlertTriangle size={10} className="inline mr-1" />}
                      {labelUrgencia[urgencia]}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
