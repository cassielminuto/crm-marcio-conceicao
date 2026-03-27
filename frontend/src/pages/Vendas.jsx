import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import DateRangeFilter from '../components/DateRangeFilter';
import { DollarSign, TrendingUp, Trophy, ArrowUpDown, Search, Phone, MessageCircle, Mail } from 'lucide-react';

function MetricCard({ titulo, valor, icone: Icon, cor }) {
  const corMap = {
    yellow: { bg: 'rgba(253,203,110,0.1)', text: 'text-accent-amber' },
    green: { bg: 'rgba(0,184,148,0.1)', text: 'text-accent-emerald' },
    purple: { bg: 'rgba(108,92,231,0.1)', text: 'text-accent-violet-light' },
    blue: { bg: 'rgba(116,185,255,0.1)', text: 'text-accent-info' },
  };
  const c = corMap[cor] || corMap.yellow;
  return (
    <div className="bg-bg-card border border-border-subtle rounded-[14px] p-[22px] hover:border-border-hover transition-all duration-300">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] text-text-muted font-medium">{titulo}</p>
          <p className="text-[26px] font-extrabold text-white tracking-tight mt-1">{valor}</p>
        </div>
        <div className="w-[42px] h-[42px] rounded-[10px] flex items-center justify-center" style={{ background: c.bg }}>
          <Icon size={20} className={c.text} />
        </div>
      </div>
    </div>
  );
}

function fmtMoeda(v) {
  return `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function Vendas() {
  const navigate = useNavigate();
  const [vendas, setVendas] = useState([]);
  const [vendedores, setVendedores] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [ordenacao, setOrdenacao] = useState({ campo: 'dataConversao', dir: 'desc' });

  const [dataInicio, setDataInicio] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [dataFim, setDataFim] = useState(() => new Date());

  const carregarVendas = useCallback(async () => {
    setCarregando(true);
    try {
      // BRT (UTC-3): dia comeca 03:00Z, termina dia seguinte 02:59:59Z
      const inicioISO = fmtDate(dataInicio) + 'T03:00:00.000Z';
      const fimNext = new Date(dataFim); fimNext.setDate(fimNext.getDate() + 1);
      const fimISO = fmtDate(fimNext) + 'T02:59:59.999Z';
      const dp = `data_inicio=${inicioISO}&data_fim=${fimISO}`;
      const [vendasRes, vendedoresRes] = await Promise.all([
        api.get(`/leads?${dp}&venda_realizada=true&limit=5000`),
        api.get('/vendedores'),
      ]);
      const leads = Array.isArray(vendasRes.data) ? vendasRes.data : vendasRes.data?.dados || [];
      setVendas(leads);
      setVendedores(Array.isArray(vendedoresRes.data) ? vendedoresRes.data : []);
    } catch (err) {
      console.error('Erro ao carregar vendas:', err);
    } finally {
      setCarregando(false);
    }
  }, [dataInicio, dataFim]);

  useEffect(() => { carregarVendas(); }, [carregarVendas]);

  // Filtro + ordenação
  const vendasFiltradas = vendas
    .filter(l => {
      if (!busca) return true;
      const b = busca.toLowerCase();
      return (l.nome || '').toLowerCase().includes(b) || (l.telefone || '').includes(b) || (l.vendedor?.nomeExibicao || '').toLowerCase().includes(b);
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

  const totalFaturamento = vendasFiltradas.reduce((s, l) => s + (l.valorVenda ? Number(l.valorVenda) : 0), 0);
  const totalVendas = vendasFiltradas.length;
  const ticketMedio = totalVendas > 0 ? Math.round(totalFaturamento / totalVendas) : 0;
  const maiorVenda = vendasFiltradas.reduce((m, l) => Math.max(m, Number(l.valorVenda || 0)), 0);

  const toggleOrdem = (campo) => {
    setOrdenacao(prev => ({
      campo,
      dir: prev.campo === campo && prev.dir === 'desc' ? 'asc' : 'desc',
    }));
  };

  const salvarValor = async (leadId, novoValor) => {
    try {
      await api.patch(`/leads/${leadId}`, { valorVenda: novoValor });
      setVendas(prev => prev.map(l => l.id === leadId ? { ...l, valorVenda: novoValor } : l));
    } catch (err) {
      console.error('Erro ao salvar valor:', err);
    }
  };

  const redistribuir = async (leadId, novoVendedorId) => {
    try {
      await api.patch(`/leads/${leadId}/vendedor`, { vendedor_id: novoVendedorId, motivo: 'Atribuicao manual na aba Vendas' });
      carregarVendas();
    } catch (err) {
      console.error('Erro ao redistribuir:', err);
    }
  };

  const produto = (lead) => {
    if (lead.dadosRespondi?.hubla?.produto) return lead.dadosRespondi.hubla.produto;
    if (lead.formularioTitulo && lead.formularioTitulo !== 'Manual') return lead.formularioTitulo;
    return '—';
  };

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-violet" />
      </div>
    );
  }

  const ThSort = ({ campo, children }) => (
    <th
      onClick={() => toggleOrdem(campo)}
      className="text-left text-[10px] font-semibold text-text-muted uppercase px-4 py-3 cursor-pointer hover:text-text-secondary select-none"
    >
      <span className="inline-flex items-center gap-1">
        {children}
        <ArrowUpDown size={10} className={ordenacao.campo === campo ? 'text-accent-violet-light' : 'opacity-30'} />
      </span>
    </th>
  );

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-white">Vendas</h1>
          <p className="text-[13px] text-text-secondary mt-1">Gestao de vendas e faturamento</p>
        </div>
        <DateRangeFilter
          dataInicio={dataInicio}
          dataFim={dataFim}
          onChange={(inicio, fim) => { setDataInicio(inicio); setDataFim(fim); }}
        />
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[14px]">
        <MetricCard titulo="Total de Vendas" valor={totalVendas} icone={TrendingUp} cor="green" />
        <MetricCard titulo="Faturamento Total" valor={fmtMoeda(totalFaturamento)} icone={DollarSign} cor="yellow" />
        <MetricCard titulo="Ticket Medio" valor={fmtMoeda(ticketMedio)} icone={DollarSign} cor="purple" />
        <MetricCard titulo="Maior Venda" valor={fmtMoeda(maiorVenda)} icone={Trophy} cor="blue" />
      </div>

      {/* Busca */}
      <div className="flex items-center gap-3 bg-bg-card border border-border-subtle rounded-[14px] p-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, telefone ou vendedor..."
            className="w-full pl-9 pr-3 py-1.5 bg-bg-input border border-border-default rounded-lg text-[12px] text-text-primary placeholder:text-text-faint focus:outline-none focus:border-[rgba(108,92,231,0.4)]"
          />
        </div>
        <span className="text-[11px] text-text-muted shrink-0">
          {vendasFiltradas.length} vendas | {fmtMoeda(totalFaturamento)}
        </span>
      </div>

      {/* Tabela */}
      <div className="bg-bg-card border border-border-subtle rounded-[14px] overflow-hidden">
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
              </tr>
            </thead>
            <tbody>
              {vendasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-text-muted">
                    Nenhuma venda encontrada no periodo
                  </td>
                </tr>
              ) : (
                vendasFiltradas.map((lead) => (
                  <tr key={lead.id} className="hover:bg-white/[0.02] border-b border-border-subtle last:border-b-0 transition-colors">
                    {/* Cliente */}
                    <td className="px-4 py-3">
                      <p
                        className="text-[12px] font-medium text-text-primary hover:text-accent-violet-light cursor-pointer"
                        onClick={() => navigate(`/leads/${lead.id}`)}
                      >
                        {lead.nome}
                      </p>
                      {lead.email && (
                        <div className="flex items-center gap-1 text-[10px] text-text-muted mt-0.5">
                          <Mail size={9} />
                          <span className="truncate max-w-[150px]">{lead.email}</span>
                        </div>
                      )}
                    </td>

                    {/* Contato */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-[12px] text-text-secondary">
                        <Phone size={11} />
                        <span>{lead.telefone}</span>
                        <a
                          href={`https://wa.me/${(lead.telefone || '').replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-0.5 rounded text-accent-emerald hover:bg-[rgba(0,184,148,0.08)] transition-all"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MessageCircle size={12} />
                        </a>
                      </div>
                    </td>

                    {/* Valor editável */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-0.5">
                        <span className="text-[10px] text-text-muted">R$</span>
                        <input
                          type="text"
                          defaultValue={lead.valorVenda ? Number(lead.valorVenda).toLocaleString('pt-BR') : '0'}
                          onFocus={(e) => { e.target.value = lead.valorVenda ? String(Number(lead.valorVenda)) : ''; e.target.select(); }}
                          onBlur={(e) => {
                            const valor = parseFloat(e.target.value.replace(/[^\d.,]/g, '').replace(',', '.')) || null;
                            const atual = lead.valorVenda ? Number(lead.valorVenda) : null;
                            if (valor !== atual) salvarValor(lead.id, valor);
                            e.target.value = valor ? Number(valor).toLocaleString('pt-BR') : '0';
                          }}
                          onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                          className="w-[90px] text-right px-2 py-1 rounded-lg bg-transparent border border-transparent hover:border-border-default focus:border-[rgba(108,92,231,0.4)] focus:bg-bg-input text-accent-amber font-semibold text-[12px] outline-none transition-all"
                        />
                      </div>
                    </td>

                    {/* Produto */}
                    <td className="px-4 py-3">
                      <span className="text-[11px] text-text-secondary truncate max-w-[150px] block">{produto(lead)}</span>
                    </td>

                    {/* Vendedor editável */}
                    <td className="px-4 py-3">
                      <select
                        value={lead.vendedorId || ''}
                        onChange={(e) => {
                          const novoId = parseInt(e.target.value, 10);
                          if (novoId && novoId !== lead.vendedorId) redistribuir(lead.id, novoId);
                        }}
                        className="bg-bg-input border border-border-default rounded-lg text-text-primary text-[11px] px-2 py-1 outline-none focus:border-[rgba(108,92,231,0.4)] transition-all"
                      >
                        <option value="">—</option>
                        {vendedores.map(v => (
                          <option key={v.id} value={v.id}>{v.nomeExibicao}</option>
                        ))}
                      </select>
                    </td>

                    {/* Data */}
                    <td className="px-4 py-3 text-[11px] text-text-muted whitespace-nowrap">
                      {new Date(lead.dataConversao || lead.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Totalizador */}
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
