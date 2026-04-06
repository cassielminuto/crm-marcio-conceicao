import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import FiltroUnificado from '../components/FiltroUnificado';
import { extrairProdutosUnicos, isProdutoExcluido } from '../utils/produtos';
import { DollarSign, TrendingUp, Trophy, ArrowUpDown, Search, Phone, MessageCircle, Mail, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function MetricCard({ titulo, valor, subtitulo, icone: Icon, cor }) {
  const corMap = {
    yellow: { bg: 'rgba(245,158,11,0.12)', text: 'text-[#F59E0B]' },
    green: { bg: 'rgba(16,185,129,0.12)', text: 'text-[#10B981]' },
    purple: { bg: 'rgba(124,58,237,0.12)', text: 'text-[#A78BFA]' },
    blue: { bg: 'rgba(59,130,246,0.12)', text: 'text-[#3B82F6]' },
  };
  const c = corMap[cor] || corMap.yellow;
  return (
    <div className="bg-bg-card border border-border-default rounded-[14px] p-5 hover:border-border-hover transition-all duration-300">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[1.5px] text-text-muted font-medium">{titulo}</p>
          <p className="font-display text-[32px] font-bold text-text-primary tracking-tight mt-1">{valor}</p>
          {subtitulo && <p className="text-[12px] text-text-muted mt-1">{subtitulo}</p>}
        </div>
        <div className="w-10 h-10 rounded-[10px] flex items-center justify-center" style={{ background: c.bg }}>
          <Icon size={20} className={c.text} />
        </div>
      </div>
    </div>
  );
}

function fmtMoeda(v) {
  return `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function getProdutoDisplay(lead) {
  const dr = lead.dadosRespondi;
  if (dr?.hubla?.produto) return dr.hubla.produto;
  if (dr?.hubla?.produtos?.length > 0) return dr.hubla.produtos[0];
  if (dr?.produtos?.length > 0) return dr.produtos[0];
  if (lead.formularioTitulo && lead.formularioTitulo !== 'Manual') return lead.formularioTitulo;
  return '\u2014';
}

function buildDateParams(dataInicio, dataFim) {
  const inicioStr = dataInicio instanceof Date ? dataInicio.toISOString().slice(0, 10) : dataInicio;
  const fimStr = dataFim instanceof Date ? dataFim.toISOString().slice(0, 10) : dataFim;
  const inicioISO = inicioStr + 'T03:00:00.000Z';
  const fimDate = new Date(fimStr + 'T12:00:00.000Z');
  fimDate.setUTCDate(fimDate.getUTCDate() + 1);
  const fimISO = fimDate.toISOString().slice(0, 10) + 'T02:59:59.999Z';
  return `data_inicio=${inicioISO}&data_fim=${fimISO}`;
}

export default function Vendas() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const isAdmin = usuario?.perfil === 'admin' || usuario?.perfil === 'gestor';
  const [vendas, setVendas] = useState([]);
  const [vendedores, setVendedores] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [ordenacao, setOrdenacao] = useState({ campo: 'dataConversao', dir: 'desc' });
  const [celulaSalva, setCelulaSalva] = useState(null); // { leadId, campo } - feedback visual
  const [editandoCelula, setEditandoCelula] = useState(null); // { leadId, campo, valor }

  const [dataInicio, setDataInicio] = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1); });
  const [dataFim, setDataFim] = useState(() => new Date());
  const [filtroVendedor, setFiltroVendedor] = useState('');
  const [filtroCanal, setFiltroCanal] = useState('');
  const [produtosExcluidos, setProdutosExcluidos] = useState(new Set());

  const carregarVendas = useCallback(async () => {
    setCarregando(true);
    try {
      const dp = buildDateParams(dataInicio, dataFim);
      const [vendasRes, vendedoresRes] = await Promise.all([
        api.get(`/leads/vendas?${dp}`),
        api.get('/vendedores'),
      ]);
      setVendas(vendasRes.data?.vendas || []);
      setVendedores(Array.isArray(vendedoresRes.data) ? vendedoresRes.data : []);
    } catch (err) {
      console.error('Erro ao carregar vendas:', err);
    } finally {
      setCarregando(false);
    }
  }, [dataInicio, dataFim]);

  useEffect(() => { carregarVendas(); }, [carregarVendas]);

  const produtosDisponiveis = useMemo(() => extrairProdutosUnicos(vendas), [vendas]);

  const vendasFiltradas = useMemo(() => {
    return vendas
      .filter(l => {
        if (isProdutoExcluido(l, produtosExcluidos)) return false;
        if (filtroVendedor && l.vendedorId !== parseInt(filtroVendedor)) return false;
        if (filtroCanal && l.canal !== filtroCanal) return false;
        if (busca) {
          const b = busca.toLowerCase();
          if (!(l.nome || '').toLowerCase().includes(b) && !(l.telefone || '').includes(b) && !(l.vendedor?.nomeExibicao || '').toLowerCase().includes(b)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const { campo, dir } = ordenacao;
        let va, vb;
        if (campo === 'valorVenda') { va = Number(a.valorVenda || 0); vb = Number(b.valorVenda || 0); }
        else if (campo === 'nome') { va = (a.nome || '').toLowerCase(); vb = (b.nome || '').toLowerCase(); }
        else if (campo === 'vendedor') { va = (a.vendedor?.nomeExibicao || '').toLowerCase(); vb = (b.vendedor?.nomeExibicao || '').toLowerCase(); }
        else { va = new Date(a.dataConversao || a.createdAt).getTime(); vb = new Date(b.dataConversao || b.createdAt).getTime(); }
        if (va < vb) return dir === 'asc' ? -1 : 1;
        if (va > vb) return dir === 'asc' ? 1 : -1;
        return 0;
      });
  }, [vendas, produtosExcluidos, filtroVendedor, filtroCanal, busca, ordenacao]);

  const totalFaturamento = vendasFiltradas.reduce((s, l) => s + (l.valorVenda ? Number(l.valorVenda) : 0), 0);
  const totalVendas = vendasFiltradas.length;
  const ticketMedio = totalVendas > 0 ? Math.round(totalFaturamento / totalVendas) : 0;
  const maiorVenda = vendasFiltradas.reduce((m, l) => Math.max(m, Number(l.valorVenda || 0)), 0);

  const toggleOrdem = (campo) => {
    setOrdenacao(prev => ({ campo, dir: prev.campo === campo && prev.dir === 'desc' ? 'asc' : 'desc' }));
  };

  const mostrarFeedback = (leadId, campo) => {
    setCelulaSalva({ leadId, campo });
    setTimeout(() => setCelulaSalva(null), 1200);
  };

  const salvarValor = async (leadId, novoValor) => {
    try {
      await api.patch(`/leads/${leadId}`, { valorVenda: novoValor });
      setVendas(prev => prev.map(l => l.id === leadId ? { ...l, valorVenda: novoValor } : l));
      mostrarFeedback(leadId, 'valor');
    } catch (err) { console.error('Erro ao salvar valor:', err); }
  };

  const salvarProduto = async (leadId, novoProduto) => {
    try {
      const lead = vendas.find(l => l.id === leadId);
      const dadosRespondi = { ...(lead.dadosRespondi || {}), hubla: { ...(lead.dadosRespondi?.hubla || {}), produto: novoProduto } };
      await api.patch(`/leads/${leadId}`, { dadosRespondi });
      setVendas(prev => prev.map(l => l.id === leadId ? { ...l, dadosRespondi } : l));
      mostrarFeedback(leadId, 'produto');
    } catch (err) { console.error('Erro ao salvar produto:', err); }
    setEditandoCelula(null);
  };

  const salvarDataConversao = async (leadId, novaData) => {
    if (!novaData) { setEditandoCelula(null); return; }
    try {
      const dataISO = new Date(novaData + 'T12:00:00').toISOString();
      await api.patch(`/leads/${leadId}`, { dataConversao: dataISO });
      setVendas(prev => prev.map(l => l.id === leadId ? { ...l, dataConversao: dataISO } : l));
      mostrarFeedback(leadId, 'data');
    } catch (err) { console.error('Erro ao salvar data:', err); }
    setEditandoCelula(null);
  };

  const redistribuir = async (leadId, novoVendedorId) => {
    try {
      await api.patch(`/leads/${leadId}/vendedor`, { vendedor_id: novoVendedorId, motivo: 'Atribuicao manual na aba Vendas' });
      carregarVendas();
    } catch (err) { console.error('Erro ao redistribuir:', err); }
  };

  const removerVenda = async (lead) => {
    if (!window.confirm(`Tem certeza que deseja remover esta venda?\nO lead "${lead.nome}" será mantido mas os campos de venda serão zerados.`)) return;
    try {
      await api.patch(`/leads/${lead.id}`, {
        vendaRealizada: false,
        valorVenda: null,
        dataConversao: null,
        etapaFunil: 'em_abordagem',
      });
      setVendas(prev => prev.filter(l => l.id !== lead.id));
    } catch (err) {
      console.error('Erro ao remover venda:', err);
      alert('Erro ao remover venda. Tente novamente.');
    }
  };

  const limparFiltros = () => {
    const n = new Date();
    setDataInicio(new Date(n.getFullYear(), n.getMonth(), 1));
    setDataFim(n);
    setFiltroVendedor('');
    setFiltroCanal('');
    setProdutosExcluidos(new Set());
  };

  if (carregando) {
    return (<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-violet" /></div>);
  }

  const ThSort = ({ campo, children }) => (
    <th onClick={() => toggleOrdem(campo)} className="text-left text-[10px] font-semibold text-text-muted uppercase px-4 py-3 cursor-pointer hover:text-text-secondary select-none">
      <span className="inline-flex items-center gap-1">{children}<ArrowUpDown size={10} className={ordenacao.campo === campo ? 'text-accent-violet-light' : 'opacity-30'} /></span>
    </th>
  );

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-[24px] font-semibold text-text-primary">Vendas</h1>
          <p className="text-[13px] text-text-secondary mt-1">Gestao de vendas e faturamento</p>
        </div>
        <FiltroUnificado
          dataInicio={dataInicio} setDataInicio={setDataInicio}
          dataFim={dataFim} setDataFim={setDataFim}
          vendedorId={filtroVendedor} setVendedorId={setFiltroVendedor}
          canal={filtroCanal} setCanal={setFiltroCanal}
          produtosExcluidos={produtosExcluidos} setProdutosExcluidos={setProdutosExcluidos}
          vendedores={vendedores}
          produtosDisponiveis={produtosDisponiveis}
          onLimpar={limparFiltros}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[14px]">
        <MetricCard titulo="Total de Vendas" valor={totalVendas} icone={TrendingUp} cor="green" />
        <MetricCard
          titulo="Faturamento Total"
          valor={fmtMoeda(totalFaturamento)}
          subtitulo={produtosExcluidos.size > 0 ? `excluindo ${produtosExcluidos.size} produto${produtosExcluidos.size > 1 ? 's' : ''}` : undefined}
          icone={DollarSign} cor="yellow"
        />
        <MetricCard titulo="Ticket Medio" valor={fmtMoeda(ticketMedio)} icone={DollarSign} cor="purple" />
        <MetricCard titulo="Maior Venda" valor={fmtMoeda(maiorVenda)} icone={Trophy} cor="blue" />
      </div>

      {/* Busca */}
      <div className="flex items-center gap-3 bg-bg-card border border-border-default rounded-[14px] p-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input type="text" value={busca} onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, telefone ou vendedor..."
            className="w-full pl-9 pr-3 py-2 bg-bg-input border border-border-default rounded-[10px] text-[13px] text-text-primary placeholder:text-text-faint focus:outline-none focus:border-accent-violet focus:ring-[3px] focus:ring-[rgba(124,58,237,0.15)]"
          />
        </div>
        <span className="text-[11px] text-text-muted shrink-0">{vendasFiltradas.length} vendas | {fmtMoeda(totalFaturamento)}</span>
      </div>

      {/* Tabela */}
      <div className="bg-bg-card border border-border-default rounded-[14px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-bg-card border-b border-border-subtle">
                <ThSort campo="nome">Cliente</ThSort>
                <th className="text-left text-[10px] font-semibold text-text-muted uppercase px-4 py-3">Contato</th>
                <ThSort campo="valorVenda">Valor</ThSort>
                <th className="text-left text-[10px] font-semibold text-text-muted uppercase px-4 py-3">Produto</th>
                <ThSort campo="vendedor">Vendedor</ThSort>
                <ThSort campo="dataConversao">Data</ThSort>
                {isAdmin && <th className="text-left text-[10px] font-semibold text-text-muted uppercase px-4 py-3 w-[60px]">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {vendasFiltradas.length === 0 ? (
                <tr><td colSpan={isAdmin ? 7 : 6} className="text-center py-12 text-text-muted">Nenhuma venda encontrada no periodo</td></tr>
              ) : (
                vendasFiltradas.map((lead) => (
                  <tr key={lead.id} className="hover:bg-white/[0.02] border-b border-border-subtle last:border-b-0 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-[12px] font-medium text-text-primary hover:text-accent-violet-light cursor-pointer" onClick={() => navigate(`/leads/${lead.id}`)}>{lead.nome}</p>
                      {lead.email && (<div className="flex items-center gap-1 text-[10px] text-text-muted mt-0.5"><Mail size={9} /><span className="truncate max-w-[150px]">{lead.email}</span></div>)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-[12px] text-text-secondary">
                        <Phone size={11} /><span>{lead.telefone}</span>
                        <a href={`https://wa.me/${(lead.telefone || '').replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="p-0.5 rounded text-accent-emerald hover:bg-[rgba(0,184,148,0.08)] transition-all" onClick={(e) => e.stopPropagation()}><MessageCircle size={12} /></a>
                      </div>
                    </td>
                    {/* Valor - editavel inline */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-0.5">
                        <span className="text-[10px] text-text-muted">R$</span>
                        <input type="text" defaultValue={lead.valorVenda ? Number(lead.valorVenda).toLocaleString('pt-BR') : '0'}
                          onFocus={(e) => { e.target.value = lead.valorVenda ? String(Number(lead.valorVenda)) : ''; e.target.select(); }}
                          onBlur={(e) => { const valor = parseFloat(e.target.value.replace(/[^\d.,]/g, '').replace(',', '.')) || null; const atual = lead.valorVenda ? Number(lead.valorVenda) : null; if (valor !== atual) salvarValor(lead.id, valor); e.target.value = valor ? Number(valor).toLocaleString('pt-BR') : '0'; }}
                          onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                          className={`w-[90px] text-right px-2 py-1 rounded-lg bg-transparent border border-transparent hover:border-border-default focus:border-[rgba(108,92,231,0.4)] focus:bg-bg-input font-semibold text-[12px] outline-none transition-all ${celulaSalva?.leadId === lead.id && celulaSalva?.campo === 'valor' ? 'text-[#10B981]' : 'text-accent-amber'}`}
                        />
                      </div>
                    </td>

                    {/* Produto - editavel inline */}
                    <td className="px-4 py-3">
                      {editandoCelula?.leadId === lead.id && editandoCelula?.campo === 'produto' ? (
                        <input
                          type="text"
                          autoFocus
                          defaultValue={editandoCelula.valor}
                          onBlur={(e) => { const v = e.target.value.trim(); if (v !== getProdutoDisplay(lead) && v !== '\u2014') salvarProduto(lead.id, v); else setEditandoCelula(null); }}
                          onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') setEditandoCelula(null); }}
                          className="w-full bg-bg-input border border-[rgba(108,92,231,0.4)] rounded-lg text-text-primary text-[11px] px-2 py-1 outline-none transition-all"
                        />
                      ) : (
                        <span
                          onClick={() => setEditandoCelula({ leadId: lead.id, campo: 'produto', valor: getProdutoDisplay(lead) === '\u2014' ? '' : getProdutoDisplay(lead) })}
                          className={`text-[11px] truncate max-w-[150px] block cursor-pointer hover:text-accent-violet-light transition-colors ${celulaSalva?.leadId === lead.id && celulaSalva?.campo === 'produto' ? 'text-[#10B981]' : 'text-text-secondary'}`}
                          title="Clique para editar"
                        >
                          {getProdutoDisplay(lead)}
                        </span>
                      )}
                    </td>

                    {/* Vendedor - select inline (ja existente) */}
                    <td className="px-4 py-3">
                      <select value={lead.vendedorId || ''} onChange={(e) => { const novoId = parseInt(e.target.value, 10); if (novoId && novoId !== lead.vendedorId) redistribuir(lead.id, novoId); }}
                        className="bg-bg-input border border-border-default rounded-lg text-text-primary text-[11px] px-2 py-1 outline-none focus:border-[rgba(108,92,231,0.4)] transition-all">
                        <option value="">{'\u2014'}</option>
                        {vendedores.map(v => (<option key={v.id} value={v.id}>{v.nomeExibicao}</option>))}
                      </select>
                    </td>

                    {/* Data - editavel inline */}
                    <td className="px-4 py-3">
                      {editandoCelula?.leadId === lead.id && editandoCelula?.campo === 'data' ? (
                        <input
                          type="date"
                          autoFocus
                          defaultValue={editandoCelula.valor}
                          onBlur={(e) => salvarDataConversao(lead.id, e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') setEditandoCelula(null); }}
                          className="bg-bg-input border border-[rgba(108,92,231,0.4)] rounded-lg text-text-primary text-[11px] px-2 py-1 outline-none transition-all"
                        />
                      ) : (
                        <span
                          onClick={() => setEditandoCelula({ leadId: lead.id, campo: 'data', valor: new Date(lead.dataConversao || lead.createdAt).toISOString().slice(0, 10) })}
                          className={`text-[11px] whitespace-nowrap cursor-pointer hover:text-accent-violet-light transition-colors ${celulaSalva?.leadId === lead.id && celulaSalva?.campo === 'data' ? 'text-[#10B981]' : 'text-text-muted'}`}
                          title="Clique para editar"
                        >
                          {new Date(lead.dataConversao || lead.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <button onClick={() => removerVenda(lead)} title="Remover venda" className="p-1.5 rounded-lg text-text-tertiary hover:text-red-400 hover:bg-red-400/10 transition-all">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {vendasFiltradas.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border-subtle bg-bg-elevated/50">
            <span className="text-[11px] font-semibold text-text-muted">{vendasFiltradas.length} vendas</span>
            <span className="text-[13px] font-bold text-accent-amber">Total: {fmtMoeda(totalFaturamento)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
