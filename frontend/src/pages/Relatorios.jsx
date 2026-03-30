import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../services/api';
import FiltroUnificado from '../components/FiltroUnificado';
import { extrairProduto, extrairProdutosUnicos, isProdutoExcluido } from '../utils/produtos';
import AIResumoPeriodo from '../components/AIResumoPeriodo';
import OrigemLeads from '../components/OrigemLeads';
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

function downloadCSV(data, filename) {
  const BOM = '\uFEFF';
  const csv = BOM + data;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function csvEscape(val) {
  if (val == null) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function fmtDateBR(d) {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt)) return '';
  return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
}

function today() { return new Date().toISOString().slice(0, 10); }

export default function Relatorios() {
  const [geral, setGeral] = useState(null);
  const [porCanal, setPorCanal] = useState([]);
  const [porClasse, setPorClasse] = useState([]);
  const [porCloser, setPorCloser] = useState([]);
  const [leadsPorDia, setLeadsPorDia] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [vendedores, setVendedores] = useState([]);
  const [rawVendas, setRawVendas] = useState([]);
  const [rawLeads, setRawLeads] = useState([]);
  const [filtroVendedor, setFiltroVendedor] = useState('');
  const [filtroCanal, setFiltroCanal] = useState('');
  const [produtosExcluidos, setProdutosExcluidos] = useState(new Set());

  const [dataInicio, setDataInicio] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [dataFim, setDataFim] = useState(() => new Date());

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const inicioStr = dataInicio instanceof Date ? dataInicio.toISOString().slice(0, 10) : dataInicio;
      const fimStr = dataFim instanceof Date ? dataFim.toISOString().slice(0, 10) : dataFim;
      const inicioISO = inicioStr + 'T03:00:00.000Z';
      const fimDate = new Date(fimStr + 'T12:00:00.000Z');
      fimDate.setUTCDate(fimDate.getUTCDate() + 1);
      const fimISO = fimDate.toISOString().slice(0, 10) + 'T02:59:59.999Z';
      const dp = `data_inicio=${inicioISO}&data_fim=${fimISO}`;

      const [funilRes, vendasRes, canalRes, classeRes, closerRes, diasRes, vendedoresRes] = await Promise.all([
        api.get(`/leads/funil?${dp}`),
        api.get(`/leads/vendas?${dp}`),
        api.get(`/relatorios/por-canal?${dp}`),
        api.get(`/relatorios/por-classe?${dp}`),
        api.get(`/relatorios/por-closer?${dp}`),
        api.get(`/leads/por-dia?${dp}`),
        api.get('/vendedores'),
      ]);

      setVendedores(Array.isArray(vendedoresRes.data) ? vendedoresRes.data : []);

      const funilData = funilRes.data;
      const allLeads = [];
      if (funilData?.etapas) {
        for (const etapaData of Object.values(funilData.etapas)) {
          if (etapaData.leads) allLeads.push(...etapaData.leads);
        }
      }
      setRawLeads(allLeads);

      const vendasData = vendasRes.data;
      const vendasList = vendasData?.vendas || [];
      setRawVendas(vendasList);
      const totalLeads = allLeads.length;
      const convertidos = vendasData?.totalVendas || 0;
      const faturamento = vendasData?.faturamento || 0;
      const taxaConversao = totalLeads > 0 ? Math.round((convertidos / totalLeads) * 10000) / 100 : 0;
      setGeral({ totalLeads, convertidos, faturamento, taxaConversao });

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

  useEffect(() => { carregar(); }, [carregar]);

  const produtosDisponiveis = useMemo(() => extrairProdutosUnicos(rawVendas), [rawVendas]);

  const filtrar = (lead) => {
    if (filtroVendedor && lead.vendedorId !== parseInt(filtroVendedor)) return false;
    if (filtroCanal && lead.canal !== filtroCanal) return false;
    if (isProdutoExcluido(lead, produtosExcluidos)) return false;
    return true;
  };

  const vendasFiltradas = useMemo(() => rawVendas.filter(filtrar), [rawVendas, filtroVendedor, filtroCanal, produtosExcluidos]);
  const leadsFiltrados = useMemo(() => rawLeads.filter(filtrar), [rawLeads, filtroVendedor, filtroCanal, produtosExcluidos]);

  const geralFiltrado = useMemo(() => {
    if (!geral) return null;
    if (!filtroVendedor && !filtroCanal && produtosExcluidos.size === 0) return geral;
    const faturamento = vendasFiltradas.reduce((s, v) => s + (v.valorVenda ? Number(v.valorVenda) : 0), 0);
    const convertidos = vendasFiltradas.length;
    const totalLeads = leadsFiltrados.length;
    const taxaConversao = totalLeads > 0 ? Math.round((convertidos / totalLeads) * 10000) / 100 : 0;
    return { totalLeads, faturamento, convertidos, taxaConversao };
  }, [geral, vendasFiltradas, leadsFiltrados, filtroVendedor, filtroCanal, produtosExcluidos]);

  // --- Exportacao CSV ---
  const exportarVendas = () => {
    if (vendasFiltradas.length === 0) return;
    const header = ['Nome', 'Telefone', 'Email', 'Vendedor', 'Canal', 'Produto', 'Valor (R$)', 'Data da Venda', 'Etapa'];
    const rows = vendasFiltradas.map(l => [
      csvEscape(l.nome),
      csvEscape(l.telefone),
      csvEscape(l.email),
      csvEscape(l.vendedor?.nomeExibicao),
      csvEscape(l.canal),
      csvEscape(extrairProduto(l) || ''),
      l.valorVenda ? Number(l.valorVenda).toFixed(2) : '0.00',
      csvEscape(fmtDateBR(l.dataConversao)),
      csvEscape(l.etapaFunil),
    ]);
    const csv = [header.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadCSV(csv, `vendas_${today()}.csv`);
  };

  const exportarLeads = () => {
    if (leadsFiltrados.length === 0) return;
    const header = ['Nome', 'Telefone', 'Email', 'Vendedor', 'Canal', 'Etapa', 'Score', 'Classificacao', 'Data de Entrada', 'Venda Realizada', 'Valor (R$)'];
    const rows = leadsFiltrados.map(l => [
      csvEscape(l.nome),
      csvEscape(l.telefone),
      csvEscape(l.email),
      csvEscape(l.vendedor?.nomeExibicao),
      csvEscape(l.canal),
      csvEscape(l.etapaFunil),
      l.pontuacao ?? '',
      csvEscape(l.classe),
      csvEscape(fmtDateBR(l.createdAt)),
      l.vendaRealizada ? 'Sim' : 'Nao',
      l.valorVenda ? Number(l.valorVenda).toFixed(2) : '',
    ]);
    const csv = [header.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadCSV(csv, `leads_${today()}.csv`);
  };

  const exportarCompleto = () => {
    if (!geralFiltrado) return;
    const faturamento = vendasFiltradas.reduce((s, v) => s + (v.valorVenda ? Number(v.valorVenda) : 0), 0);
    const ticketMedio = vendasFiltradas.length > 0 ? (faturamento / vendasFiltradas.length).toFixed(2) : '0.00';

    const metricas = [
      'Metrica,Valor',
      `Total de Leads,${geralFiltrado.totalLeads}`,
      `Total de Vendas,${vendasFiltradas.length}`,
      `Faturamento Total,${faturamento.toFixed(2)}`,
      `Ticket Medio,${ticketMedio}`,
      `Taxa de Conversao,${geralFiltrado.taxaConversao}%`,
    ];

    const headerLeads = ['Nome', 'Telefone', 'Email', 'Vendedor', 'Canal', 'Etapa', 'Score', 'Classificacao', 'Data de Entrada', 'Venda Realizada', 'Valor (R$)'];
    const rowsLeads = leadsFiltrados.map(l => [
      csvEscape(l.nome),
      csvEscape(l.telefone),
      csvEscape(l.email),
      csvEscape(l.vendedor?.nomeExibicao),
      csvEscape(l.canal),
      csvEscape(l.etapaFunil),
      l.pontuacao ?? '',
      csvEscape(l.classe),
      csvEscape(fmtDateBR(l.createdAt)),
      l.vendaRealizada ? 'Sim' : 'Nao',
      l.valorVenda ? Number(l.valorVenda).toFixed(2) : '',
    ]);

    const csv = [...metricas, '', headerLeads.join(','), ...rowsLeads.map(r => r.join(','))].join('\n');
    downloadCSV(csv, `relatorio_completo_${today()}.csv`);
  };

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-violet" />
      </div>
    );
  }

  const btnCls = 'flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-[11px] font-semibold transition-colors disabled:opacity-30 disabled:cursor-not-allowed';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-white">Relatorios</h1>
          <p className="text-[13px] text-text-secondary mt-1">Visao gerencial do CRM</p>
        </div>
        <FiltroUnificado
          dataInicio={dataInicio} setDataInicio={setDataInicio}
          dataFim={dataFim} setDataFim={setDataFim}
          vendedorId={filtroVendedor} setVendedorId={setFiltroVendedor}
          canal={filtroCanal} setCanal={setFiltroCanal}
          produtosExcluidos={produtosExcluidos} setProdutosExcluidos={setProdutosExcluidos}
          vendedores={vendedores}
          produtosDisponiveis={produtosDisponiveis}
          onLimpar={() => { setFiltroVendedor(''); setFiltroCanal(''); setProdutosExcluidos(new Set()); }}
        />
      </div>

      {/* Botoes de exportacao */}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={exportarVendas} disabled={vendasFiltradas.length === 0}
          className={`${btnCls} bg-[rgba(0,184,148,0.12)] text-accent-emerald hover:bg-[rgba(0,184,148,0.18)]`}>
          <FileDown size={14} /> Exportar Vendas ({vendasFiltradas.length})
        </button>
        <button onClick={exportarLeads} disabled={leadsFiltrados.length === 0}
          className={`${btnCls} bg-[rgba(108,92,231,0.12)] text-accent-violet-light hover:bg-[rgba(108,92,231,0.18)]`}>
          <FileDown size={14} /> Exportar Leads ({leadsFiltrados.length})
        </button>
        <button onClick={exportarCompleto} disabled={!geralFiltrado || leadsFiltrados.length === 0}
          className={`${btnCls} bg-[rgba(253,203,110,0.12)] text-accent-amber hover:bg-[rgba(253,203,110,0.18)]`}>
          <FileDown size={14} /> Relatorio Completo
        </button>
      </div>

      {geralFiltrado && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-[14px]">
          <CardMetrica titulo="Total de Leads" valor={geralFiltrado.totalLeads} icone={Users} cor="bg-[rgba(116,185,255,0.1)] text-accent-info" />
          <CardMetrica titulo="Taxa de Conversao" valor={`${geralFiltrado.taxaConversao}%`} icone={TrendingUp} cor="bg-[rgba(0,184,148,0.1)] text-accent-emerald" />
          <CardMetrica titulo="Faturamento" valor={`R$ ${geralFiltrado.faturamento.toLocaleString('pt-BR')}`} icone={DollarSign} cor="bg-[rgba(253,203,110,0.1)] text-accent-amber" />
          <CardMetrica titulo="Convertidos" valor={geralFiltrado.convertidos} icone={TrendingUp} cor="bg-[rgba(108,92,231,0.1)] text-accent-violet-light" />
        </div>
      )}

      <AIResumoPeriodo dataInicio={dataInicio} dataFim={dataFim} />

      <OrigemLeads leads={leadsFiltrados} vendas={vendasFiltradas} />

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
                  {c.tempoMedioAbordagemMin !== null ? `${c.tempoMedioAbordagemMin}min` : '\u2014'}
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
