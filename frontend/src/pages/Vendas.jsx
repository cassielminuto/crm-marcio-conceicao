import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import FiltroUnificado from '../components/FiltroUnificado';
import {
  extrairProdutosUnicosVenda,
  isProdutoExcluidoVenda,
  extrairProdutoVenda,
} from '../utils/produtos';
import {
  DollarSign, TrendingUp, Trophy, ArrowUpDown, Search, Phone, MessageCircle,
  Mail, Trash2, Plus, X, Eye,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ConfirmDialog from '../components/ConfirmDialog';

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

function buildDateParams(dataInicio, dataFim) {
  const inicioStr = dataInicio instanceof Date ? dataInicio.toISOString().slice(0, 10) : dataInicio;
  const fimStr = dataFim instanceof Date ? dataFim.toISOString().slice(0, 10) : dataFim;
  const inicioISO = inicioStr + 'T03:00:00.000Z';
  const fimDate = new Date(fimStr + 'T12:00:00.000Z');
  fimDate.setUTCDate(fimDate.getUTCDate() + 1);
  const fimISO = fimDate.toISOString().slice(0, 10) + 'T02:59:59.999Z';
  return { dataInicioISO: inicioISO, dataFimISO: fimISO };
}

function BadgeRecorrencia({ recorrencia }) {
  if (recorrencia) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-500/15 text-orange-300">
        Recorrente
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-700/40 text-text-muted">
      1ª venda
    </span>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Modal de detalhes (read-only) — exige createPortal pra escapar de transforms
// ───────────────────────────────────────────────────────────────────────────
function VendaDetalheModal({ venda, onClose }) {
  if (!venda) return null;

  const linhas = [
    ['ID Venda', `#${venda.id}`],
    ['Lead', venda.lead ? `${venda.lead.nome} (#${venda.lead.id})` : '—'],
    ['Telefone', venda.lead?.telefone || '—'],
    ['Produto', extrairProdutoVenda(venda) || '—'],
    ['Valor total', fmtMoeda(venda.valorTotal)],
    ['Taxas', fmtMoeda(venda.taxas)],
    ['Valor líquido', venda.valorLiquido != null ? fmtMoeda(venda.valorLiquido) : '—'],
    ['Método pagamento', venda.metodoPagamento || '—'],
    ['Parcelas', venda.parcelas || '—'],
    ['Data pagamento', new Date(venda.dataPagamento).toLocaleDateString('pt-BR')],
    ['Ciclo de venda (dias)', venda.cicloVendaDias != null ? venda.cicloVendaDias : '—'],
    ['Recorrência', venda.recorrencia ? 'Sim (cobrança subsequente)' : 'Não (1ª venda)'],
    ['Origem', venda.origemVenda || '—'],
    ['Closer', venda.closerResponsavel?.nomeExibicao || '—'],
    ['Campanha', venda.campanha?.nome || '—'],
    ['Criativo', venda.criativo?.nome || '—'],
    ['Hubla invoice ID', venda.hublaInvoiceId || '—'],
    ['fbclid checkout', venda.fbclidCheckout || '—'],
    ['Criada em', new Date(venda.createdAt).toLocaleString('pt-BR')],
  ];

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/70 flex items-start overflow-y-auto p-8" onClick={onClose}>
      <div className="bg-bg-card border border-border-default rounded-[14px] w-full max-w-[640px] mx-auto my-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
          <h2 className="font-display text-[18px] font-semibold text-text-primary">Detalhes da Venda</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-2">
          {linhas.map(([label, valor]) => (
            <div key={label} className="flex justify-between items-start text-[12px] py-1 border-b border-border-subtle/40 last:border-0">
              <span className="text-text-muted uppercase tracking-wider text-[10px] font-medium">{label}</span>
              <span className="text-text-primary text-right max-w-[60%] break-words">{valor}</span>
            </div>
          ))}
          {venda.orderBumpsAceitos && Array.isArray(venda.orderBumpsAceitos) && venda.orderBumpsAceitos.length > 0 && (
            <div className="pt-3">
              <span className="text-text-muted uppercase tracking-wider text-[10px] font-medium">Order bumps</span>
              <pre className="text-[11px] bg-bg-input rounded p-2 mt-1 overflow-x-auto">{JSON.stringify(venda.orderBumpsAceitos, null, 2)}</pre>
            </div>
          )}
          {venda.utmsCheckout && (
            <div className="pt-1">
              <span className="text-text-muted uppercase tracking-wider text-[10px] font-medium">UTMs checkout</span>
              <pre className="text-[11px] bg-bg-input rounded p-2 mt-1 overflow-x-auto">{JSON.stringify(venda.utmsCheckout, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Modal de criação manual de Venda — busca debounced de Lead via /leads/busca
// ───────────────────────────────────────────────────────────────────────────
function CriarVendaModal({ onClose, onCriou, vendedores, toast }) {
  const [leadBusca, setLeadBusca] = useState('');
  const [leadCandidatos, setLeadCandidatos] = useState([]);
  const [leadSelecionado, setLeadSelecionado] = useState(null);
  const [valorTotal, setValorTotal] = useState('');
  const [produto, setProduto] = useState('');
  const [dataPagamento, setDataPagamento] = useState(() => new Date().toISOString().slice(0, 10));
  const [campanhaId, setCampanhaId] = useState('');
  const [closerId, setCloserId] = useState('');
  const [campanhas, setCampanhas] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const buscaTimer = useRef(null);

  // Carregar campanhas ativas pra select
  useEffect(() => {
    api.get('/campanhas?status=ativa')
      .then((r) => setCampanhas(Array.isArray(r.data) ? r.data : []))
      .catch(() => setCampanhas([]));
  }, []);

  // Busca debounced de leads
  useEffect(() => {
    if (buscaTimer.current) clearTimeout(buscaTimer.current);
    if (!leadBusca || leadBusca.length < 2 || leadSelecionado) {
      setLeadCandidatos([]);
      return;
    }
    buscaTimer.current = setTimeout(async () => {
      try {
        const r = await api.get(`/leads/busca?q=${encodeURIComponent(leadBusca)}`);
        setLeadCandidatos(Array.isArray(r.data) ? r.data : []);
      } catch (err) {
        setLeadCandidatos([]);
      }
    }, 300);
    return () => clearTimeout(buscaTimer.current);
  }, [leadBusca, leadSelecionado]);

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!leadSelecionado) {
      toast('Selecione um lead', 'aviso');
      return;
    }
    const valor = parseFloat(String(valorTotal).replace(/[^\d.,-]/g, '').replace(',', '.'));
    if (!valor || valor <= 0) {
      toast('Valor total deve ser numero positivo', 'aviso');
      return;
    }
    if (!dataPagamento) {
      toast('Data de pagamento obrigatoria', 'aviso');
      return;
    }
    setSalvando(true);
    try {
      const body = {
        lead_id: leadSelecionado.id,
        valor_total: valor,
        data_pagamento: new Date(dataPagamento + 'T12:00:00.000Z').toISOString(),
        produto: produto.trim() || null,
        campanha_id: campanhaId ? parseInt(campanhaId, 10) : null,
        closer_responsavel_id: closerId ? parseInt(closerId, 10) : null,
        origem_venda: 'manual',
      };
      await api.post('/vendas', body);
      toast('Venda criada', 'sucesso');
      onCriou();
      onClose();
    } catch (err) {
      toast(err.response?.data?.error || 'Erro ao criar venda', 'urgente');
    } finally {
      setSalvando(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/70 flex items-start overflow-y-auto p-8" onClick={onClose}>
      <form
        className="bg-bg-card border border-border-default rounded-[14px] w-full max-w-[560px] mx-auto my-auto"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
          <h2 className="font-display text-[18px] font-semibold text-text-primary">Nova Venda Manual</h2>
          <button type="button" onClick={onClose} className="text-text-muted hover:text-text-primary"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Busca de Lead */}
          <div>
            <label className="text-[11px] uppercase tracking-wider text-text-muted font-medium">Lead *</label>
            {leadSelecionado ? (
              <div className="mt-1 flex items-center justify-between bg-bg-input rounded-lg px-3 py-2">
                <div>
                  <p className="text-[13px] text-text-primary font-medium">{leadSelecionado.nome}</p>
                  <p className="text-[11px] text-text-muted">{leadSelecionado.telefone} · #{leadSelecionado.id}</p>
                </div>
                <button type="button" onClick={() => { setLeadSelecionado(null); setLeadBusca(''); }} className="text-text-muted hover:text-red-400 text-[11px]">trocar</button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  value={leadBusca}
                  onChange={(e) => setLeadBusca(e.target.value)}
                  placeholder="Buscar por nome, telefone ou email..."
                  autoFocus
                  className="mt-1 w-full px-3 py-2 bg-bg-input border border-border-default rounded-lg text-[13px] text-text-primary placeholder:text-text-faint focus:outline-none focus:border-accent-violet focus:ring-[3px] focus:ring-[rgba(124,58,237,0.15)]"
                />
                {leadCandidatos.length > 0 && (
                  <div className="mt-1 bg-bg-input border border-border-default rounded-lg max-h-[180px] overflow-y-auto">
                    {leadCandidatos.map((l) => (
                      <div
                        key={l.id}
                        onClick={() => { setLeadSelecionado(l); setLeadCandidatos([]); }}
                        className="px-3 py-2 hover:bg-white/[0.04] cursor-pointer border-b border-border-subtle/40 last:border-0"
                      >
                        <p className="text-[12px] text-text-primary">{l.nome}</p>
                        <p className="text-[10px] text-text-muted">{l.telefone || '—'} · #{l.id} · {l.classe || '—'}</p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Valor */}
          <div>
            <label className="text-[11px] uppercase tracking-wider text-text-muted font-medium">Valor total (R$) *</label>
            <input
              type="text"
              value={valorTotal}
              onChange={(e) => setValorTotal(e.target.value)}
              placeholder="127,00"
              inputMode="decimal"
              className="mt-1 w-full px-3 py-2 bg-bg-input border border-border-default rounded-lg text-[13px] text-text-primary focus:outline-none focus:border-accent-violet"
            />
          </div>

          {/* Produto */}
          <div>
            <label className="text-[11px] uppercase tracking-wider text-text-muted font-medium">Produto</label>
            <input
              type="text"
              value={produto}
              onChange={(e) => setProduto(e.target.value)}
              placeholder="Ex: Compativeis Completo"
              className="mt-1 w-full px-3 py-2 bg-bg-input border border-border-default rounded-lg text-[13px] text-text-primary focus:outline-none focus:border-accent-violet"
            />
          </div>

          {/* Data pagamento */}
          <div>
            <label className="text-[11px] uppercase tracking-wider text-text-muted font-medium">Data de pagamento *</label>
            <input
              type="date"
              value={dataPagamento}
              onChange={(e) => setDataPagamento(e.target.value)}
              className="mt-1 w-full px-3 py-2 bg-bg-input border border-border-default rounded-lg text-[13px] text-text-primary focus:outline-none focus:border-accent-violet"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Closer */}
            <div>
              <label className="text-[11px] uppercase tracking-wider text-text-muted font-medium">Closer</label>
              <select
                value={closerId}
                onChange={(e) => setCloserId(e.target.value)}
                className="mt-1 w-full px-3 py-2 bg-bg-input border border-border-default rounded-lg text-[13px] text-text-primary focus:outline-none focus:border-accent-violet"
              >
                <option value="">— herdar do lead —</option>
                {vendedores.map((v) => (
                  <option key={v.id} value={v.id}>{v.nomeExibicao || `Vendedor #${v.id}`}</option>
                ))}
              </select>
            </div>
            {/* Campanha */}
            <div>
              <label className="text-[11px] uppercase tracking-wider text-text-muted font-medium">Campanha</label>
              <select
                value={campanhaId}
                onChange={(e) => setCampanhaId(e.target.value)}
                className="mt-1 w-full px-3 py-2 bg-bg-input border border-border-default rounded-lg text-[13px] text-text-primary focus:outline-none focus:border-accent-violet"
              >
                <option value="">— sem atribuição —</option>
                {campanhas.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-border-subtle flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} disabled={salvando} className="px-4 py-2 text-[12px] text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50">
            Cancelar
          </button>
          <button type="submit" disabled={salvando} className="px-4 py-2 text-[12px] font-medium bg-accent-violet hover:bg-accent-violet/80 text-white rounded-lg transition-colors disabled:opacity-50">
            {salvando ? 'Salvando…' : 'Criar venda'}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Página principal
// ───────────────────────────────────────────────────────────────────────────
export default function Vendas() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const { toast } = useToast();
  const isAdmin = usuario?.perfil === 'admin' || usuario?.perfil === 'gestor';

  const [vendas, setVendas] = useState([]);
  const [vendedores, setVendedores] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [ordenacao, setOrdenacao] = useState({ campo: 'dataPagamento', dir: 'desc' });
  const [celulaSalva, setCelulaSalva] = useState(null);
  const [editandoCelula, setEditandoCelula] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [vendaDetalhe, setVendaDetalhe] = useState(null);
  const [modalCriar, setModalCriar] = useState(false);

  const [dataInicio, setDataInicio] = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1); });
  const [dataFim, setDataFim] = useState(() => new Date());
  const [filtroCloser, setFiltroCloser] = useState('');
  const [filtroCanal, setFiltroCanal] = useState(''); // canal vem do lead.canal — filtro client-side
  const [filtroRecorrencia, setFiltroRecorrencia] = useState(''); // '' | 'true' | 'false'
  const [produtosExcluidos, setProdutosExcluidos] = useState(new Set());

  const carregarVendas = useCallback(async () => {
    setCarregando(true);
    try {
      const dp = buildDateParams(dataInicio, dataFim);
      const params = new URLSearchParams();
      params.set('data_inicio', dp.dataInicioISO);
      params.set('data_fim', dp.dataFimISO);
      if (filtroCloser) params.set('closer_id', filtroCloser);
      if (filtroRecorrencia) params.set('recorrencia', filtroRecorrencia);

      const [vendasRes, vendedoresRes] = await Promise.all([
        api.get(`/vendas?${params.toString()}`),
        api.get('/vendedores'),
      ]);
      setVendas(vendasRes.data?.vendas || []);
      setVendedores(Array.isArray(vendedoresRes.data) ? vendedoresRes.data : []);
    } catch (err) {
      console.error('Erro ao carregar vendas:', err);
      toast(err.response?.data?.error || 'Erro ao carregar vendas', 'urgente');
    } finally {
      setCarregando(false);
    }
  }, [dataInicio, dataFim, filtroCloser, filtroRecorrencia, toast]);

  useEffect(() => { carregarVendas(); }, [carregarVendas]);

  const produtosDisponiveis = useMemo(() => extrairProdutosUnicosVenda(vendas), [vendas]);

  const vendasFiltradas = useMemo(() => {
    return vendas
      .filter((v) => {
        if (isProdutoExcluidoVenda(v, produtosExcluidos)) return false;
        if (filtroCanal && v.lead?.canal !== filtroCanal) return false;
        if (busca) {
          const b = busca.toLowerCase();
          const nome = (v.lead?.nome || '').toLowerCase();
          const tel = (v.lead?.telefone || '');
          const closer = (v.closerResponsavel?.nomeExibicao || '').toLowerCase();
          if (!nome.includes(b) && !tel.includes(b) && !closer.includes(b)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const { campo, dir } = ordenacao;
        let va, vb;
        if (campo === 'valorTotal') { va = Number(a.valorTotal || 0); vb = Number(b.valorTotal || 0); }
        else if (campo === 'nome') { va = (a.lead?.nome || '').toLowerCase(); vb = (b.lead?.nome || '').toLowerCase(); }
        else if (campo === 'closer') { va = (a.closerResponsavel?.nomeExibicao || '').toLowerCase(); vb = (b.closerResponsavel?.nomeExibicao || '').toLowerCase(); }
        else { va = new Date(a.dataPagamento).getTime(); vb = new Date(b.dataPagamento).getTime(); }
        if (va < vb) return dir === 'asc' ? -1 : 1;
        if (va > vb) return dir === 'asc' ? 1 : -1;
        return 0;
      });
  }, [vendas, produtosExcluidos, filtroCanal, busca, ordenacao]);

  const totalFaturamento = vendasFiltradas.reduce((s, v) => s + Number(v.valorTotal || 0), 0);
  const totalVendas = vendasFiltradas.length;
  const ticketMedio = totalVendas > 0 ? Math.round(totalFaturamento / totalVendas) : 0;
  const maiorVenda = vendasFiltradas.reduce((m, v) => Math.max(m, Number(v.valorTotal || 0)), 0);

  const toggleOrdem = (campo) => {
    setOrdenacao((prev) => ({ campo, dir: prev.campo === campo && prev.dir === 'desc' ? 'asc' : 'desc' }));
  };

  const mostrarFeedback = (vendaId, campo) => {
    setCelulaSalva({ vendaId, campo });
    setTimeout(() => setCelulaSalva(null), 1200);
  };

  const salvarValor = async (vendaId, novoValor) => {
    try {
      await api.patch(`/vendas/${vendaId}`, { valor_total: novoValor });
      setVendas((prev) => prev.map((v) => (v.id === vendaId ? { ...v, valorTotal: novoValor } : v)));
      mostrarFeedback(vendaId, 'valor');
    } catch (err) {
      toast(err.response?.data?.error || 'Erro ao salvar valor', 'urgente');
    }
  };

  const salvarProduto = async (vendaId, novoProduto) => {
    try {
      await api.patch(`/vendas/${vendaId}`, { produto: novoProduto || null });
      setVendas((prev) => prev.map((v) => (v.id === vendaId ? { ...v, produto: novoProduto || null } : v)));
      mostrarFeedback(vendaId, 'produto');
    } catch (err) {
      toast(err.response?.data?.error || 'Erro ao salvar produto', 'urgente');
    }
    setEditandoCelula(null);
  };

  const salvarDataPagamento = async (vendaId, novaData) => {
    if (!novaData) { setEditandoCelula(null); return; }
    try {
      const dataISO = new Date(novaData + 'T12:00:00.000Z').toISOString();
      await api.patch(`/vendas/${vendaId}`, { data_pagamento: dataISO });
      setVendas((prev) => prev.map((v) => (v.id === vendaId ? { ...v, dataPagamento: dataISO } : v)));
      mostrarFeedback(vendaId, 'data');
    } catch (err) {
      toast(err.response?.data?.error || 'Erro ao salvar data', 'urgente');
    }
    setEditandoCelula(null);
  };

  const salvarCloser = async (vendaId, novoCloserId) => {
    try {
      await api.patch(`/vendas/${vendaId}`, { closer_responsavel_id: novoCloserId || null });
      // Re-fetch da venda completa pra atualizar o include do closerResponsavel
      const r = await api.get(`/vendas/${vendaId}`);
      setVendas((prev) => prev.map((v) => (v.id === vendaId ? r.data : v)));
      mostrarFeedback(vendaId, 'closer');
    } catch (err) {
      toast(err.response?.data?.error || 'Erro ao trocar closer', 'urgente');
    }
  };

  const excluirVenda = (venda) => {
    setConfirmDialog({
      titulo: 'Excluir venda?',
      mensagem: `Esta ação remove a Venda #${venda.id} (${fmtMoeda(venda.valorTotal)}) permanentemente. Não é possível desfazer.`,
      tipo: 'danger',
      textoBotaoConfirmar: 'Excluir',
      onConfirm: async () => {
        try {
          await api.delete(`/vendas/${venda.id}`);
          setVendas((prev) => prev.filter((v) => v.id !== venda.id));
          toast('Venda excluída', 'sucesso');
        } catch (err) {
          toast(err.response?.data?.error || 'Erro ao excluir venda', 'urgente');
        }
        setConfirmDialog(null);
      },
    });
  };

  const limparFiltros = () => {
    const n = new Date();
    setDataInicio(new Date(n.getFullYear(), n.getMonth(), 1));
    setDataFim(n);
    setFiltroCloser('');
    setFiltroCanal('');
    setFiltroRecorrencia('');
    setProdutosExcluidos(new Set());
  };

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-violet" />
      </div>
    );
  }

  const ThSort = ({ campo, children }) => (
    <th onClick={() => toggleOrdem(campo)} className="text-left text-[10px] font-semibold text-text-muted uppercase px-4 py-3 cursor-pointer hover:text-text-secondary select-none">
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
          <h1 className="font-display text-[24px] font-semibold text-text-primary">Vendas</h1>
          <p className="text-[13px] text-text-secondary mt-1">CRUD da entidade Venda — separada do Lead (Fase 2)</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin && (
            <button onClick={() => setModalCriar(true)} className="inline-flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium bg-accent-violet hover:bg-accent-violet/80 text-white rounded-lg transition-colors">
              <Plus size={14} /> Nova venda
            </button>
          )}
          <FiltroUnificado
            dataInicio={dataInicio} setDataInicio={setDataInicio}
            dataFim={dataFim} setDataFim={setDataFim}
            vendedorId={filtroCloser} setVendedorId={setFiltroCloser}
            canal={filtroCanal} setCanal={setFiltroCanal}
            produtosExcluidos={produtosExcluidos} setProdutosExcluidos={setProdutosExcluidos}
            vendedores={vendedores}
            produtosDisponiveis={produtosDisponiveis}
            onLimpar={limparFiltros}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[14px]">
        <MetricCard titulo="Total de Vendas" valor={totalVendas} icone={TrendingUp} cor="green" />
        <MetricCard
          titulo="Faturamento Total"
          valor={fmtMoeda(totalFaturamento)}
          subtitulo={produtosExcluidos.size > 0 ? `excluindo ${produtosExcluidos.size} produto${produtosExcluidos.size > 1 ? 's' : ''}` : undefined}
          icone={DollarSign} cor="yellow"
        />
        <MetricCard titulo="Ticket Médio" valor={fmtMoeda(ticketMedio)} icone={DollarSign} cor="purple" />
        <MetricCard titulo="Maior Venda" valor={fmtMoeda(maiorVenda)} icone={Trophy} cor="blue" />
      </div>

      {/* Busca + filtro recorrencia */}
      <div className="flex items-center gap-3 bg-bg-card border border-border-default rounded-[14px] p-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text" value={busca} onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, telefone ou closer..."
            className="w-full pl-9 pr-3 py-2 bg-bg-input border border-border-default rounded-[10px] text-[13px] text-text-primary placeholder:text-text-faint focus:outline-none focus:border-accent-violet focus:ring-[3px] focus:ring-[rgba(124,58,237,0.15)]"
          />
        </div>
        <select
          value={filtroRecorrencia}
          onChange={(e) => setFiltroRecorrencia(e.target.value)}
          className="px-3 py-2 bg-bg-input border border-border-default rounded-[10px] text-[12px] text-text-primary focus:outline-none focus:border-accent-violet"
        >
          <option value="">Todas as vendas</option>
          <option value="false">1ª venda (CAC)</option>
          <option value="true">Recorrências (LTV)</option>
        </select>
        <span className="text-[11px] text-text-muted shrink-0">{vendasFiltradas.length} vendas | {fmtMoeda(totalFaturamento)}</span>
      </div>

      {/* Tabela */}
      <div className="bg-bg-card border border-border-default rounded-[14px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-bg-card border-b border-border-subtle">
                <ThSort campo="nome">Lead</ThSort>
                <th className="text-left text-[10px] font-semibold text-text-muted uppercase px-4 py-3">Contato</th>
                <ThSort campo="valorTotal">Valor</ThSort>
                <th className="text-left text-[10px] font-semibold text-text-muted uppercase px-4 py-3">Produto</th>
                <ThSort campo="closer">Closer</ThSort>
                <ThSort campo="dataPagamento">Data Pgto</ThSort>
                <th className="text-left text-[10px] font-semibold text-text-muted uppercase px-4 py-3 hidden xl:table-cell">Campanha</th>
                <th className="text-left text-[10px] font-semibold text-text-muted uppercase px-4 py-3">Recorrência</th>
                <th className="text-left text-[10px] font-semibold text-text-muted uppercase px-4 py-3 w-[80px]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {vendasFiltradas.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-text-muted">Nenhuma venda encontrada no período</td></tr>
              ) : (
                vendasFiltradas.map((venda) => {
                  const lead = venda.lead || {};
                  const produtoDisplay = extrairProdutoVenda(venda) || '—';
                  return (
                    <tr key={venda.id} className="hover:bg-white/[0.02] border-b border-border-subtle last:border-b-0 transition-colors">
                      {/* Lead */}
                      <td className="px-4 py-3">
                        <p
                          className="text-[12px] font-medium text-text-primary hover:text-accent-violet-light cursor-pointer"
                          onClick={() => lead.id && navigate(`/leads/${lead.id}`)}
                        >
                          {lead.nome || '—'}
                        </p>
                        {lead.id && <p className="text-[10px] text-text-muted">Lead #{lead.id}</p>}
                      </td>
                      {/* Contato */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-[12px] text-text-secondary">
                          <Phone size={11} /><span>{lead.telefone || '—'}</span>
                          {lead.telefone && (
                            <a href={`https://wa.me/${(lead.telefone || '').replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="p-0.5 rounded text-accent-emerald hover:bg-[rgba(0,184,148,0.08)] transition-all" onClick={(e) => e.stopPropagation()}>
                              <MessageCircle size={12} />
                            </a>
                          )}
                        </div>
                      </td>
                      {/* Valor */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-0.5">
                          <span className="text-[10px] text-text-muted">R$</span>
                          <input
                            type="text"
                            defaultValue={venda.valorTotal ? Number(venda.valorTotal).toLocaleString('pt-BR') : '0'}
                            onFocus={(e) => { e.target.value = venda.valorTotal ? String(Number(venda.valorTotal)) : ''; e.target.select(); }}
                            onBlur={(e) => {
                              const valor = parseFloat(e.target.value.replace(/[^\d.,]/g, '').replace(',', '.')) || null;
                              const atual = venda.valorTotal ? Number(venda.valorTotal) : null;
                              if (valor && valor > 0 && valor !== atual) salvarValor(venda.id, valor);
                              e.target.value = valor ? Number(valor).toLocaleString('pt-BR') : '0';
                            }}
                            onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                            className={`w-[90px] text-right px-2 py-1 rounded-lg bg-transparent border border-transparent hover:border-border-default focus:border-[rgba(108,92,231,0.4)] focus:bg-bg-input font-semibold text-[12px] outline-none transition-all ${celulaSalva?.vendaId === venda.id && celulaSalva?.campo === 'valor' ? 'text-[#10B981]' : 'text-accent-amber'}`}
                          />
                        </div>
                      </td>
                      {/* Produto */}
                      <td className="px-4 py-3">
                        {editandoCelula?.vendaId === venda.id && editandoCelula?.campo === 'produto' ? (
                          <input
                            type="text"
                            autoFocus
                            defaultValue={editandoCelula.valor}
                            onBlur={(e) => {
                              const v = e.target.value.trim();
                              if (v !== produtoDisplay && v !== '—') salvarProduto(venda.id, v);
                              else setEditandoCelula(null);
                            }}
                            onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') setEditandoCelula(null); }}
                            className="w-full bg-bg-input border border-[rgba(108,92,231,0.4)] rounded-lg text-text-primary text-[11px] px-2 py-1 outline-none transition-all"
                          />
                        ) : (
                          <span
                            onClick={() => setEditandoCelula({ vendaId: venda.id, campo: 'produto', valor: produtoDisplay === '—' ? '' : produtoDisplay })}
                            className={`text-[11px] truncate max-w-[150px] block cursor-pointer hover:text-accent-violet-light transition-colors ${celulaSalva?.vendaId === venda.id && celulaSalva?.campo === 'produto' ? 'text-[#10B981]' : 'text-text-secondary'}`}
                            title="Clique para editar"
                          >
                            {produtoDisplay}
                          </span>
                        )}
                      </td>
                      {/* Closer (PATCH na Venda — UX-1 a) */}
                      <td className="px-4 py-3">
                        <select
                          value={venda.closerResponsavelId || ''}
                          onChange={(e) => {
                            const novoId = e.target.value ? parseInt(e.target.value, 10) : null;
                            if (novoId !== venda.closerResponsavelId) salvarCloser(venda.id, novoId);
                          }}
                          className={`bg-bg-input border border-border-default rounded-lg text-[11px] px-2 py-1 outline-none focus:border-[rgba(108,92,231,0.4)] transition-all ${celulaSalva?.vendaId === venda.id && celulaSalva?.campo === 'closer' ? 'text-[#10B981]' : 'text-text-primary'}`}
                        >
                          <option value="">{'—'}</option>
                          {vendedores.map((v) => (<option key={v.id} value={v.id}>{v.nomeExibicao || `#${v.id}`}</option>))}
                        </select>
                      </td>
                      {/* Data pagamento */}
                      <td className="px-4 py-3">
                        {editandoCelula?.vendaId === venda.id && editandoCelula?.campo === 'data' ? (
                          <input
                            type="date"
                            autoFocus
                            defaultValue={editandoCelula.valor}
                            onBlur={(e) => salvarDataPagamento(venda.id, e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') setEditandoCelula(null); }}
                            className="bg-bg-input border border-[rgba(108,92,231,0.4)] rounded-lg text-text-primary text-[11px] px-2 py-1 outline-none transition-all"
                          />
                        ) : (
                          <span
                            onClick={() => setEditandoCelula({ vendaId: venda.id, campo: 'data', valor: new Date(venda.dataPagamento).toISOString().slice(0, 10) })}
                            className={`text-[11px] whitespace-nowrap cursor-pointer hover:text-accent-violet-light transition-colors ${celulaSalva?.vendaId === venda.id && celulaSalva?.campo === 'data' ? 'text-[#10B981]' : 'text-text-muted'}`}
                            title="Clique para editar"
                          >
                            {new Date(venda.dataPagamento).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </td>
                      {/* Campanha (read-only) */}
                      <td className="px-4 py-3 hidden xl:table-cell">
                        <span className="text-[11px] text-text-muted truncate max-w-[140px] block">
                          {venda.campanha?.nome || '—'}
                        </span>
                      </td>
                      {/* Recorrência */}
                      <td className="px-4 py-3">
                        <BadgeRecorrencia recorrencia={venda.recorrencia} />
                      </td>
                      {/* Ações */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setVendaDetalhe(venda)}
                            title="Ver detalhes"
                            className="p-1.5 rounded-lg text-text-tertiary hover:text-accent-violet-light hover:bg-accent-violet/10 transition-all"
                          >
                            <Eye size={14} />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => excluirVenda(venda)}
                              title="Excluir venda"
                              className="p-1.5 rounded-lg text-text-tertiary hover:text-red-400 hover:bg-red-400/10 transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
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

      {confirmDialog && (
        <ConfirmDialog
          isOpen
          titulo={confirmDialog.titulo}
          mensagem={confirmDialog.mensagem}
          tipo={confirmDialog.tipo}
          textoBotaoConfirmar={confirmDialog.textoBotaoConfirmar || 'Confirmar'}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}

      {vendaDetalhe && (
        <VendaDetalheModal venda={vendaDetalhe} onClose={() => setVendaDetalhe(null)} />
      )}

      {modalCriar && (
        <CriarVendaModal
          onClose={() => setModalCriar(false)}
          onCriou={carregarVendas}
          vendedores={vendedores}
          toast={toast}
        />
      )}
    </div>
  );
}
