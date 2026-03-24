import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import DateRangeFilter from '../components/DateRangeFilter';
import AIResumoPeriodo from '../components/AIResumoPeriodo';
import { Users, TrendingUp, DollarSign, Target, Clock, Phone, MessageSquare, AlertTriangle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function MetricCard({ titulo, valor, icone: Icon, cor, subtitulo }) {
  const corMap = {
    blue: { bg: 'rgba(116,185,255,0.1)', text: 'text-accent-info' },
    green: { bg: 'rgba(0,184,148,0.1)', text: 'text-accent-emerald' },
    yellow: { bg: 'rgba(253,203,110,0.1)', text: 'text-accent-amber' },
    purple: { bg: 'rgba(108,92,231,0.1)', text: 'text-accent-violet-light' },
  };
  const c = corMap[cor] || corMap.blue;

  return (
    <div className="bg-bg-card border border-border-subtle rounded-[14px] p-[22px] hover:border-border-hover transition-all duration-300">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] text-text-muted font-medium">{titulo}</p>
          <p className="text-[26px] font-extrabold text-white tracking-tight mt-1">{valor}</p>
          {subtitulo && <p className="text-[11px] text-text-muted mt-1">{subtitulo}</p>}
        </div>
        <div className="w-[42px] h-[42px] rounded-[10px] flex items-center justify-center" style={{ background: c.bg }}>
          <Icon size={20} className={c.text} />
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
  atrasado: { bg: 'bg-[rgba(225,112,85,0.08)]', border: 'border-[rgba(225,112,85,0.15)]', text: 'text-accent-danger', badge: 'bg-[rgba(225,112,85,0.12)] text-accent-danger' },
  hoje: { bg: 'bg-[rgba(253,203,110,0.08)]', border: 'border-[rgba(253,203,110,0.15)]', text: 'text-accent-amber', badge: 'bg-[rgba(253,203,110,0.12)] text-accent-amber' },
  futuro: { bg: 'bg-[rgba(0,184,148,0.08)]', border: 'border-[rgba(0,184,148,0.15)]', text: 'text-accent-emerald', badge: 'bg-[rgba(0,184,148,0.12)] text-accent-emerald' },
};

const labelUrgencia = { atrasado: 'Atrasado', hoje: 'Hoje', futuro: 'Futuro' };
const tipoIcone = { whatsapp: MessageSquare, call: Phone, email: MessageSquare };

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const d = new Date(label + 'T12:00:00');
  return (
    <div className="bg-[#1a1a28] border border-[rgba(255,255,255,0.06)] rounded-[10px] px-3 py-2">
      <p className="text-[11px] text-[#e2e2ef] font-medium">{d.toLocaleDateString('pt-BR')}</p>
      <p className="text-[11px] text-text-secondary">{payload[0].value} Leads</p>
    </div>
  );
};

export default function Dashboard() {
  const { usuario } = useAuth();
  const [metricas, setMetricas] = useState(null);
  const [followUps, setFollowUps] = useState([]);
  const [ranking, setRanking] = useState([]);
  const [graficoDados, setGraficoDados] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [vendedorInfo, setVendedorInfo] = useState(null);

  const [dataInicio, setDataInicio] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [dataFim, setDataFim] = useState(() => new Date());

  const vendedorId = usuario?.vendedorId;
  const isAdmin = usuario?.perfil === 'admin' || usuario?.perfil === 'gestor';

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    try {
      const dp = `data_inicio=${dataInicio.toISOString()}&data_fim=${dataFim.toISOString()}`;

      const promises = [
        api.get('/vendedores'),
        api.get(`/leads/por-dia?${dp}`),
        api.get(`/leads?${dp}&limit=5000`),
      ];

      if (vendedorId) {
        promises.push(api.get(`/vendedores/${vendedorId}/followups`));
      }

      const resultados = await Promise.all(promises);
      setRanking(resultados[0].data);
      setGraficoDados(resultados[1].data);

      // Calcular metricas client-side a partir dos leads filtrados
      const leadsData = resultados[2].data?.dados || resultados[2].data || [];
      const leads = Array.isArray(leadsData) ? leadsData : [];

      const totalLeads = leads.length;
      const leadsConvertidos = leads.filter(l => l.etapaFunil === 'fechado_ganho' || l.vendaRealizada).length;
      const leadsPerdidos = leads.filter(l => l.etapaFunil === 'fechado_perdido').length;
      const leadsAtivos = leads.filter(l => !['fechado_ganho', 'fechado_perdido', 'nurturing'].includes(l.etapaFunil)).length;
      const taxaConversao = totalLeads > 0 ? Math.round((leadsConvertidos / totalLeads) * 10000) / 100 : 0;
      const faturamento = leads.reduce((sum, l) => sum + (l.valorVenda ? Number(l.valorVenda) : 0), 0)
        || leadsConvertidos * 1229;

      // Filtrar leads do vendedor logado se aplicavel
      let myLeads = leads;
      if (vendedorId) {
        myLeads = leads.filter(l => l.vendedorId === vendedorId);
      }
      const myTotal = myLeads.length;
      const myConvertidos = myLeads.filter(l => l.etapaFunil === 'fechado_ganho' || l.vendaRealizada).length;
      const myAtivos = myLeads.filter(l => !['fechado_ganho', 'fechado_perdido', 'nurturing'].includes(l.etapaFunil)).length;
      const myTaxa = myTotal > 0 ? Math.round((myConvertidos / myTotal) * 10000) / 100 : 0;
      const myFaturamento = myLeads.reduce((sum, l) => sum + (l.valorVenda ? Number(l.valorVenda) : 0), 0)
        || myConvertidos * 1229;

      setMetricas(vendedorId ? {
        totalLeads: myTotal,
        leadsConvertidos: myConvertidos,
        leadsAtivos: myAtivos,
        taxaConversao: myTaxa,
        faturamento: myFaturamento,
      } : {
        totalLeads,
        leadsConvertidos,
        leadsAtivos,
        taxaConversao,
        faturamento,
      });

      // Vendedor info (leads max, etc) — nao depende de data
      if (vendedorId) {
        const vInfo = resultados[0].data.find(v => v.id === vendedorId);
        setVendedorInfo(vInfo);
        setFollowUps(resultados[3]?.data || []);
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
          <h1 className="text-[22px] font-bold text-white">Dashboard</h1>
          <p className="text-text-secondary text-[13px] mt-1">
            {isAdmin ? 'Visao geral do time' : `Bem-vindo, ${usuario?.nome}`}
          </p>
        </div>
        <DateRangeFilter
          dataInicio={dataInicio}
          dataFim={dataFim}
          onChange={(inicio, fim) => { setDataInicio(inicio); setDataFim(fim); }}
        />
      </div>

      {/* Cards de metricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[14px]">
        <MetricCard
          titulo="Leads no Periodo"
          valor={metricas?.totalLeads ?? 0}
          icone={Users}
          cor="blue"
          subtitulo={vendedorId ? `${metricas?.leadsAtivos ?? 0} ativos` : `${metricas?.leadsAtivos ?? 0} em negociacao`}
        />
        <MetricCard
          titulo="Taxa de Conversao"
          valor={`${metricas?.taxaConversao ?? 0}%`}
          icone={TrendingUp}
          cor="green"
          subtitulo={`${metricas?.leadsConvertidos ?? 0} de ${metricas?.totalLeads ?? 0}`}
        />
        <MetricCard
          titulo="Faturamento"
          valor={`R$ ${(metricas?.faturamento ?? 0).toLocaleString('pt-BR')}`}
          icone={DollarSign}
          cor="yellow"
          subtitulo={`${metricas?.leadsConvertidos ?? 0} vendas no periodo`}
        />
        <MetricCard
          titulo="Conversoes"
          valor={metricas?.leadsConvertidos ?? 0}
          icone={Target}
          cor="purple"
          subtitulo={`de ${metricas?.totalLeads ?? 0} leads`}
        />
      </div>

      {isAdmin && <AIResumoPeriodo dataInicio={dataInicio} dataFim={dataFim} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Grafico */}
        <div className="lg:col-span-2 bg-bg-card border border-border-subtle rounded-[14px] p-[22px]">
          <h2 className="text-[14px] font-semibold text-white mb-4">Leads por dia</h2>
          {graficoDados.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={graficoDados}>
                <defs>
                  <linearGradient id="gradViolet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6c5ce7" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#6c5ce7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="data"
                  tick={{ fontSize: 10, fill: '#3a3a5a' }}
                  stroke="#3a3a5a"
                  tickFormatter={(v) => {
                    const d = new Date(v + 'T12:00:00');
                    return `${d.getDate()}/${d.getMonth() + 1}`;
                  }}
                  interval={4}
                />
                <YAxis tick={{ fontSize: 10, fill: '#3a3a5a' }} stroke="#3a3a5a" allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#6c5ce7"
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
        <div className="bg-bg-card border border-border-subtle rounded-[14px] p-[22px]">
          <h2 className="text-[14px] font-semibold text-white mb-4">Ranking do Time</h2>
          {vendedorId && (
            <div className="mb-4 bg-[rgba(108,92,231,0.1)] rounded-[10px] p-3 text-center">
              <p className="text-[10px] text-accent-violet-light">Sua posicao</p>
              <p className="text-[28px] font-extrabold text-white">#{posicaoRanking}</p>
            </div>
          )}
          <ul className="space-y-1">
            {ranking.map((v, i) => {
              const posColors = ['text-[#fdcb6e]', 'text-[#a0a0be]', 'text-[#e17055]'];
              return (
                <li
                  key={v.id}
                  className={`flex items-center justify-between p-[10px_12px] rounded-[10px] text-[12px] ${
                    v.id === vendedorId ? 'bg-[rgba(108,92,231,0.1)]' : 'hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-[13px] font-extrabold w-5 ${i < 3 ? posColors[i] : 'text-text-faint'}`}>
                      {v.rankingPosicao}
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6c5ce7] to-[#00cec9] flex items-center justify-center text-[10px] font-bold text-white">
                      {v.nomeExibicao?.[0]}
                    </div>
                    <span className="font-medium text-text-primary">{v.nomeExibicao}</span>
                  </div>
                  <span className="text-[12px] font-bold text-white">{v.totalConversoes} conv.</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Follow-ups pendentes */}
      <div className="bg-bg-card border border-border-subtle rounded-[14px] p-[22px]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[14px] font-semibold text-white">Follow-ups Pendentes</h2>
          <span className="text-[12px] text-text-muted">{followUps.length} pendentes</span>
        </div>

        {followUps.length === 0 ? (
          <p className="text-text-muted text-center py-6">Nenhum follow-up pendente</p>
        ) : (
          <div className="space-y-2">
            {followUps.map((fu) => {
              const urgencia = classificarUrgencia(fu.dataProgramada);
              const cores = coresUrgencia[urgencia];
              const IconeTipo = tipoIcone[fu.tipo] || MessageSquare;

              return (
                <div
                  key={fu.id}
                  className={`flex items-center justify-between p-3 rounded-[10px] border ${cores.bg} ${cores.border}`}
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
                      <p className="text-[11px] text-text-secondary">
                        {new Date(fu.dataProgramada).toLocaleDateString('pt-BR')}
                      </p>
                      <p className="text-[10px] text-text-muted">
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
