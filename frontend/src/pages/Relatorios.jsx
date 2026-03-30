import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import DateRangeFilter from '../components/DateRangeFilter';
import AIResumoPeriodo from '../components/AIResumoPeriodo';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FileDown, TrendingUp, DollarSign, Users } from 'lucide-react';

const CORES_CLASSE = { A: '#e17055', B: '#fdcb6e', C: '#74b9ff' };
const CORES_PIE = ['#6c5ce7', '#00cec9', '#e17055', '#fdcb6e'];

function CardMetrica({ titulo, valor, icone: Icon, cor }) {
  return (
    <div className="bg-bg-card border border-border-subtle rounded-[14px] p-[22px] hover:border-border-hover transition-all duration-300">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] text-text-muted font-medium">{titulo}</p>
          <p className="text-[22px] font-extrabold text-white mt-1">{valor}</p>
        </div>
        <div className={`w-[42px] h-[42px] rounded-[10px] flex items-center justify-center ${cor}`}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1a28] border border-[rgba(255,255,255,0.06)] rounded-[10px] px-3 py-2">
      <p className="text-[11px] text-[#e2e2ef] font-medium">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-[11px] text-text-secondary">{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

export default function Relatorios() {
  const [geral, setGeral] = useState(null);
  const [porCanal, setPorCanal] = useState([]);
  const [porClasse, setPorClasse] = useState([]);
  const [porCloser, setPorCloser] = useState([]);
  const [leadsPorDia, setLeadsPorDia] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const [dataInicio, setDataInicio] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [dataFim, setDataFim] = useState(() => new Date());

  const carregar = useCallback(async () => {
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

      const [funilRes, vendasRes, canalRes, classeRes, closerRes, diasRes] = await Promise.all([
        api.get(`/leads/funil?${dp}`),
        api.get(`/leads/vendas?${dp}`),
        api.get(`/relatorios/por-canal?${dp}`),
        api.get(`/relatorios/por-classe?${dp}`),
        api.get(`/relatorios/por-closer?${dp}`),
        api.get(`/leads/por-dia?${dp}`),
      ]);

      // Total de leads do funil (por createdAt)
      const funilData = funilRes.data;
      const allLeads = [];
      if (funilData?.etapas) {
        for (const etapaData of Object.values(funilData.etapas)) {
          if (etapaData.leads) allLeads.push(...etapaData.leads);
        }
      }
      // Vendas/faturamento por dataConversao (fonte correta)
      const vendasData = vendasRes.data;
      const totalLeads = allLeads.length;
      const convertidos = vendasData?.totalVendas || 0;
      const faturamento = vendasData?.faturamento || 0;
      const faturamentoTotal = vendasData?.faturamentoTotal || faturamento;
      const taxaConversao = totalLeads > 0 ? Math.round((convertidos / totalLeads) * 10000) / 100 : 0;
      setGeral({ totalLeads, convertidos, faturamento, taxaConversao, faturamentoTotal });

      setPorCanal(canalRes.data);
      setPorClasse(classeRes.data);
      setPorCloser(closerRes.data);
      setLeadsPorDia(diasRes.data);
    } catch (err) {
      console.error('Erro ao carregar relatorios:', err);
    } finally {
      setCarregando(false);
    }
  }, [dataInicio, dataFim]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const exportarCSV = (dados, nome) => {
    if (!dados || dados.length === 0) return;
    const headers = Object.keys(dados[0]);
    const csv = [
      headers.join(','),
      ...dados.map((row) => headers.map((h) => JSON.stringify(row[h] ?? '')).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${nome}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-violet" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-white">Relatorios</h1>
          <p className="text-[13px] text-text-secondary mt-1">Visao gerencial do CRM</p>
        </div>
        <div className="flex items-center gap-3">
          <DateRangeFilter
            dataInicio={dataInicio}
            dataFim={dataFim}
            onChange={(inicio, fim) => { setDataInicio(inicio); setDataFim(fim); }}
          />
          <button
            onClick={() => exportarCSV(porCloser, 'relatorio-closers')}
            className="flex items-center gap-1 bg-[rgba(0,184,148,0.12)] text-accent-emerald px-3 py-2 rounded-[10px] text-[11px] font-semibold hover:bg-[rgba(0,184,148,0.18)] transition-colors"
          >
            <FileDown size={14} /> CSV Closers
          </button>
          <button
            onClick={() => exportarCSV(porCanal, 'relatorio-canais')}
            className="flex items-center gap-1 bg-[rgba(108,92,231,0.12)] text-accent-violet-light px-3 py-2 rounded-[10px] text-[11px] font-semibold hover:bg-[rgba(108,92,231,0.18)] transition-colors"
          >
            <FileDown size={14} /> CSV Canais
          </button>
        </div>
      </div>

      {geral && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-[14px]">
          <CardMetrica titulo="Total de Leads" valor={geral.totalLeads} icone={Users} cor="bg-[rgba(116,185,255,0.1)] text-accent-info" />
          <CardMetrica titulo="Taxa de Conversao" valor={`${geral.taxaConversao}%`} icone={TrendingUp} cor="bg-[rgba(0,184,148,0.1)] text-accent-emerald" />
          <CardMetrica titulo="Faturamento" valor={`R$ ${geral.faturamento.toLocaleString('pt-BR')}`} icone={DollarSign} cor="bg-[rgba(253,203,110,0.1)] text-accent-amber" />
          <CardMetrica titulo="Convertidos" valor={geral.convertidos} icone={TrendingUp} cor="bg-[rgba(108,92,231,0.1)] text-accent-violet-light" />
        </div>
      )}

      <AIResumoPeriodo dataInicio={dataInicio} dataFim={dataFim} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-bg-card border border-border-subtle rounded-[14px] p-[22px]">
          <h2 className="text-[13px] font-semibold text-white mb-4">Conversao por Canal</h2>
          {porCanal.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={porCanal}>
                <defs>
                  <linearGradient id="gradBar1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6c5ce7" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#6c5ce7" stopOpacity={0.3} />
                  </linearGradient>
                  <linearGradient id="gradBar2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00cec9" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#00cec9" stopOpacity={0.3} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
                <XAxis dataKey="canal" tick={{ fontSize: 10, fill: '#3a3a5a' }} stroke="#3a3a5a" />
                <YAxis tick={{ fontSize: 10, fill: '#3a3a5a' }} stroke="#3a3a5a" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="totalLeads" fill="url(#gradBar1)" name="Total" radius={[4, 4, 0, 0]} />
                <Bar dataKey="convertidos" fill="url(#gradBar2)" name="Convertidos" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-text-muted text-center py-8">Sem dados</p>
          )}
          <div className="mt-3 space-y-1">
            {porCanal.map((c) => (
              <div key={c.canal} className="flex justify-between text-[11px]">
                <span className="text-text-secondary capitalize">{c.canal}</span>
                <span className="font-medium text-text-primary">{c.taxaConversao}% ({c.convertidos}/{c.totalLeads}) — R$ {c.faturamento.toLocaleString('pt-BR')}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-bg-card border border-border-subtle rounded-[14px] p-[22px]">
          <h2 className="text-[13px] font-semibold text-white mb-4">Conversao por Classe</h2>
          {porClasse.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={porClasse} dataKey="totalLeads" nameKey="classe" cx="50%" cy="50%" outerRadius={80} label={({ classe, taxaConversao }) => `${classe}: ${taxaConversao}%`}>
                  {porClasse.map((entry, idx) => (
                    <Cell key={entry.classe} fill={CORES_CLASSE[entry.classe] || CORES_PIE[idx]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-text-muted text-center py-8">Sem dados</p>
          )}
          <div className="mt-3 space-y-1">
            {porClasse.map((c) => (
              <div key={c.classe} className="flex justify-between text-[11px]">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: CORES_CLASSE[c.classe] }} />
                  <span className="text-text-secondary">Classe {c.classe}</span>
                </span>
                <span className="font-medium text-text-primary">{c.taxaConversao}% ({c.convertidos}/{c.totalLeads})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-bg-card border border-border-subtle rounded-[14px] p-[22px]">
        <h2 className="text-[13px] font-semibold text-white mb-4">Volume de Leads (30 dias)</h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={leadsPorDia}>
            <defs>
              <linearGradient id="gradVolume" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6c5ce7" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#6c5ce7" stopOpacity={0.3} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
            <XAxis dataKey="data" tick={{ fontSize: 10, fill: '#3a3a5a' }} stroke="#3a3a5a" tickFormatter={(v) => { const d = new Date(v + 'T12:00:00'); return `${d.getDate()}/${d.getMonth() + 1}`; }} interval={4} />
            <YAxis tick={{ fontSize: 10, fill: '#3a3a5a' }} stroke="#3a3a5a" allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="total" fill="url(#gradVolume)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-bg-card border border-border-subtle rounded-[14px] overflow-hidden">
        <div className="px-[22px] py-3 border-b border-border-subtle">
          <h2 className="text-[13px] font-semibold text-white">Performance por Closer</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-subtle">
              <th className="text-left text-[11px] font-semibold text-text-muted uppercase px-4 py-3">Closer</th>
              <th className="text-center text-[11px] font-semibold text-text-muted uppercase px-4 py-3">Leads</th>
              <th className="text-center text-[11px] font-semibold text-text-muted uppercase px-4 py-3">Conversoes</th>
              <th className="text-center text-[11px] font-semibold text-text-muted uppercase px-4 py-3">Taxa</th>
              <th className="text-center text-[11px] font-semibold text-text-muted uppercase px-4 py-3">Tempo Medio</th>
              <th className="text-right text-[11px] font-semibold text-text-muted uppercase px-4 py-3">Faturamento</th>
            </tr>
          </thead>
          <tbody>
            {porCloser.map((c) => (
              <tr key={c.vendedorId} className="hover:bg-white/[0.02] border-b border-border-subtle last:border-b-0">
                <td className="px-4 py-3">
                  <p className="text-[12px] font-medium text-text-primary">{c.nome}</p>
                  <p className="text-[10px] text-text-muted">{c.papel?.replace('_', ' ')}</p>
                </td>
                <td className="px-4 py-3 text-center text-[12px] text-text-secondary">{c.totalLeads}</td>
                <td className="px-4 py-3 text-center text-[12px] font-bold text-accent-emerald">{c.convertidos}</td>
                <td className="px-4 py-3 text-center text-[12px] text-text-secondary">{c.taxaConversao}%</td>
                <td className="px-4 py-3 text-center text-[12px] text-text-secondary">
                  {c.tempoMedioAbordagemMin !== null ? `${c.tempoMedioAbordagemMin}min` : '—'}
                </td>
                <td className="px-4 py-3 text-right text-[12px] font-medium text-text-primary">
                  R$ {c.faturamento.toLocaleString('pt-BR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
