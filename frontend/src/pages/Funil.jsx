import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import FiltroUnificado from '../components/FiltroUnificado';
import { extrairProduto, extrairProdutosUnicos, isProdutoExcluido } from '../utils/produtos';
import { Filter, Clock, User, Instagram, Megaphone, Trash2, Calendar, X, Plus, ChevronLeft, ChevronRight, Settings, Package } from 'lucide-react';

const CORES = ['#3b82f6','#eab308','#a855f7','#f97316','#22c55e','#ef4444','#06b6d4','#ec4899','#6366f1','#84cc16'];

function tempoDesdeEntrada(data) {
  if (!data) return '';
  const diff = Date.now() - new Date(data).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

function scoreCor(pontuacao) {
  if (pontuacao >= 75) return { bg: 'bg-[rgba(225,112,85,0.12)]', text: 'text-[#e17055]', label: 'Quente' };
  if (pontuacao >= 45) return { bg: 'bg-[rgba(253,203,110,0.12)]', text: 'text-[#fdcb6e]', label: 'Morno' };
  return { bg: 'bg-[rgba(116,185,255,0.1)]', text: 'text-[#74b9ff]', label: 'Frio' };
}

function formatarMoeda(valor) {
  if (!valor && valor !== 0) return 'R$ 0';
  return `R$ ${Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function classeBadge(classe) {
  if (classe === 'A') return { bg: 'bg-classe-a/15', text: 'text-classe-a', border: 'border-classe-a/30' };
  if (classe === 'B') return { bg: 'bg-classe-b/15', text: 'text-classe-b', border: 'border-classe-b/30' };
  return { bg: 'bg-classe-c/15', text: 'text-classe-c', border: 'border-classe-c/30' };
}

function slaExcedido(lead) {
  if (!lead.dataAtribuicao && !lead.data_atribuicao) return false;
  const atribuicao = new Date(lead.dataAtribuicao || lead.data_atribuicao).getTime();
  const agora = Date.now();
  const diffMin = (agora - atribuicao) / 60000;
  if (lead.classe === 'A') return diffMin > 5;
  if (lead.classe === 'B') return diffMin > 120;
  return false;
}

function vendedorIniciais(vendedor) {
  if (!vendedor?.nomeExibicao) return '?';
  const partes = vendedor.nomeExibicao.trim().split(/\s+/);
  if (partes.length >= 2) return (partes[0][0] + partes[1][0]).toUpperCase();
  return partes[0].substring(0, 2).toUpperCase();
}

function LeadCard({ lead, index, onClickLead, onDeleteLead, onSalvarValor }) {
  const score = scoreCor(lead.pontuacao);
  const CanalIcone = lead.canal === 'bio' ? Instagram : Megaphone;
  const classe = classeBadge(lead.classe);
  const slaOver = slaExcedido(lead);
  const etapaAtiva = lead.etapaFunil !== 'fechado_ganho' && lead.etapaFunil !== 'fechado_perdido';

  return (
    <Draggable draggableId={String(lead.id)} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onClickLead(lead.id)}
          style={{
            ...provided.draggableProps.style,
            ...(snapshot.isDragging ? { transform: `${provided.draggableProps.style?.transform || ''} rotate(1.5deg)` } : {}),
          }}
          className={`group relative bg-bg-card border rounded-[10px] p-3 mb-2 cursor-grab active:cursor-grabbing transition-all duration-200 ${
            snapshot.isDragging
              ? 'shadow-[0_16px_40px_rgba(0,0,0,0.45),0_0_0_1px_rgba(124,58,237,0.3)] border-accent-violet/40 z-50'
              : 'border-border-subtle hover:border-accent-violet/25 hover:shadow-[0_8px_24px_rgba(0,0,0,0.25)] hover:-translate-y-0.5'
          }`}
        >
          <button
            onClick={(e) => { e.stopPropagation(); onDeleteLead(lead); }}
            className="absolute top-2 right-2 p-1 rounded-md text-text-muted hover:text-accent-danger hover:bg-[rgba(225,112,85,0.08)] opacity-0 group-hover:opacity-100 transition-all"
          >
            <Trash2 size={12} />
          </button>

          {/* Name row with avatar, class badge, SLA indicator, and score */}
          <div className="flex items-center gap-2 mb-2 pr-5">
            {/* Vendor avatar or SLA dot */}
            {lead.vendedor ? (
              <div className="relative shrink-0">
                <div className="w-6 h-6 rounded-full bg-accent-violet/15 flex items-center justify-center text-[9px] font-bold text-accent-violet-light">
                  {vendedorIniciais(lead.vendedor)}
                </div>
                {etapaAtiva && (
                  <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-bg-card ${
                    slaOver ? 'bg-accent-danger animate-sla-pulse' : 'bg-accent-emerald'
                  }`} />
                )}
              </div>
            ) : (
              etapaAtiva && (
                <span className={`shrink-0 w-2 h-2 rounded-full ${
                  slaOver ? 'bg-accent-danger animate-sla-pulse' : 'bg-accent-emerald'
                }`} />
              )
            )}
            <p className="text-[12px] font-medium text-text-primary truncate flex-1 hover:text-accent-violet-light max-w-[140px]">{lead.nome}</p>
            {/* Class badge */}
            {lead.classe && (
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${classe.bg} ${classe.text} ${classe.border} shrink-0`}>
                {lead.classe}
              </span>
            )}
            {/* Score badge */}
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${score.bg} ${score.text} shrink-0`}>
              {lead.pontuacao}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${score.bg} ${score.text}`}>
              {score.label}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] text-text-muted">
              <CanalIcone size={10} />
              {lead.canal === 'bio' ? 'Bio' : 'Anuncio'}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] text-text-faint">
              <Clock size={10} />
              {tempoDesdeEntrada(lead.dataPreenchimento || lead.createdAt)}
            </span>
          </div>

          {lead.vendaRealizada && extrairProduto(lead) && (
            <div className="mt-1.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] text-[11px] font-medium bg-[rgba(124,58,237,0.12)] text-[#A78BFA] max-w-full truncate">
                <Package size={10} className="shrink-0" />
                <span className="truncate">{extrairProduto(lead)}</span>
              </span>
            </div>
          )}

          {lead.vendedor && (
            <div className="flex items-center gap-1 mt-1.5 text-[10px] text-text-muted truncate">
              <User size={10} className="shrink-0" />
              <span className="truncate">{lead.vendedor.nomeExibicao}</span>
            </div>
          )}

          <div className="flex items-center gap-3 mt-1.5">
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <span className="text-[10px] text-text-muted">R$</span>
              <input
                type="text"
                defaultValue={lead.valorVenda ? Number(lead.valorVenda).toLocaleString('pt-BR') : ''}
                placeholder="0"
                onFocus={(e) => {
                  e.target.value = lead.valorVenda ? String(Number(lead.valorVenda)) : '';
                  e.target.select();
                }}
                onBlur={(e) => {
                  const valor = parseFloat(e.target.value.replace(/[^\d.,]/g, '').replace(',', '.')) || null;
                  const atual = lead.valorVenda ? Number(lead.valorVenda) : null;
                  if (valor !== atual) {
                    onSalvarValor(lead.id, valor);
                  }
                  e.target.value = valor ? Number(valor).toLocaleString('pt-BR') : '';
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                className="w-[70px] px-1.5 py-0.5 rounded-md bg-transparent border border-transparent hover:border-border-default focus:border-[rgba(108,92,231,0.4)] focus:bg-bg-input text-[11px] font-semibold text-accent-amber outline-none transition-all text-right"
              />
            </div>
            {lead.previsaoFechamento && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-text-muted">
                <Calendar size={9} />
                Prev: {new Date(lead.previsaoFechamento).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
              </span>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}

function KanbanColuna({ etapa, leads, count, valorTotal, onClickLead, onDeleteLead, onSalvarValor, isAdmin, editandoLabel, setEditandoLabel, editLabel, setEditLabel, salvarLabel, editandoCor, setEditandoCor, atualizarCor, confirmarExclusaoEtapa, moverEtapa, etapaIndex, etapasTotal }) {
  const isClosed = etapa.tipo === 'ganho' || etapa.tipo === 'perdido';
  const somaColuna = isClosed ? (valorTotal || 0) : leads.reduce((sum, l) => sum + (l.valorVenda ? Number(l.valorVenda) : 0), 0);
  const valorCor = etapa.tipo === 'ganho' ? 'text-accent-emerald' : etapa.tipo === 'perdido' ? 'text-accent-danger' : 'text-accent-amber';

  return (
    <div className="flex flex-col w-72 shrink-0">
      <div
        className="rounded-t-[10px] px-3 py-2.5 border-t-[3px] bg-bg-card relative overflow-hidden"
        style={{ borderTopColor: etapa.cor }}
      >
        {/* Subtle gradient fade from column accent color */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `linear-gradient(180deg, ${etapa.cor}0A 0%, transparent 60%)` }}
        />
        {isAdmin ? (
          <div className="flex items-center gap-2 group/header relative">
            {/* Reorder arrows */}
            <button
              onClick={() => moverEtapa(etapa.id, 'left')}
              disabled={etapaIndex === 0}
              className="p-0.5 rounded text-text-muted hover:text-text-primary disabled:opacity-20 opacity-0 group-hover/header:opacity-100 transition-all"
            >
              <ChevronLeft size={12} />
            </button>

            {/* Color indicator - clickable */}
            <div className="relative">
              <button
                onClick={() => setEditandoCor(editandoCor === etapa.id ? null : etapa.id)}
                className="w-3 h-3 rounded-full cursor-pointer hover:ring-2 hover:ring-white/20 shrink-0"
                style={{ backgroundColor: etapa.cor }}
              />
              {editandoCor === etapa.id && (
                <div className="absolute top-5 left-0 z-50 bg-bg-card border border-border-default rounded-xl p-2 flex gap-1.5 flex-wrap w-[140px] shadow-lg">
                  {CORES.map(c => (
                    <button key={c} onClick={() => { atualizarCor(etapa.id, c); setEditandoCor(null); }} className="w-5 h-5 rounded-full hover:ring-2 hover:ring-white/30 transition-all" style={{ backgroundColor: c }} />
                  ))}
                </div>
              )}
            </div>

            {/* Label - editable */}
            {editandoLabel === etapa.id ? (
              <input
                value={editLabel}
                onChange={e => setEditLabel(e.target.value)}
                onBlur={() => salvarLabel(etapa.id)}
                onKeyDown={e => { if (e.key === 'Enter') salvarLabel(etapa.id); if (e.key === 'Escape') setEditandoLabel(null); }}
                className="bg-bg-input border border-border-default rounded px-2 py-0.5 text-[12px] font-semibold text-white outline-none w-[100px]"
                autoFocus
              />
            ) : (
              <span
                onClick={() => { setEditandoLabel(etapa.id); setEditLabel(etapa.label); }}
                className="text-[12px] font-semibold text-text-primary cursor-pointer hover:text-accent-violet-light transition-colors truncate"
              >
                {etapa.label}
              </span>
            )}

            {/* Count */}
            <span className="text-[10px] font-bold text-text-muted bg-bg-elevated px-2 py-0.5 rounded-full shrink-0">
              {count}
            </span>

            {/* Reorder right */}
            <button
              onClick={() => moverEtapa(etapa.id, 'right')}
              disabled={etapaIndex >= etapasTotal - 1}
              className="p-0.5 rounded text-text-muted hover:text-text-primary disabled:opacity-20 opacity-0 group-hover/header:opacity-100 transition-all"
            >
              <ChevronRight size={12} />
            </button>

            {/* Delete */}
            <button
              onClick={() => confirmarExclusaoEtapa(etapa)}
              className="p-0.5 rounded text-text-muted hover:text-accent-danger opacity-0 group-hover/header:opacity-100 transition-all ml-auto"
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between relative">
            <h3 className="text-[12px] font-semibold text-text-primary">{etapa.label}</h3>
            <span className="text-[10px] font-bold text-text-muted bg-bg-elevated px-2 py-0.5 rounded-full" style={{ borderColor: `${etapa.cor}30`, borderWidth: '1px' }}>
              {count}
            </span>
          </div>
        )}
        <div className={`mt-1 text-[10px] font-medium ${somaColuna > 0 ? valorCor : 'text-text-muted'}`}>
          {formatarMoeda(somaColuna)}
        </div>
      </div>

      <Droppable droppableId={etapa.slug}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 p-2 rounded-b-[10px] border border-t-0 border-border-subtle min-h-[200px] max-h-[70vh] overflow-y-auto transition-colors ${
              snapshot.isDraggingOver ? 'bg-[rgba(108,92,231,0.04)]' : 'bg-bg-secondary'
            }`}
          >
            {isClosed && leads.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-24 text-text-muted">
                <span className="text-[11px]">Arraste leads para cá</span>
              </div>
            ) : (
              leads.map((lead, idx) => (
                <LeadCard key={lead.id} lead={lead} index={idx} onClickLead={onClickLead} onDeleteLead={onDeleteLead} onSalvarValor={onSalvarValor} />
              ))
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}

export default function Funil() {
  const { usuario } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const isAdmin = usuario?.perfil === 'admin' || usuario?.perfil === 'gestor';
  const temVisaoCompleta = isAdmin || usuario?.vendedor?.papel === 'sdr';
  const [etapas, setEtapas] = useState([]);
  const [funilData, setFunilData] = useState(null);
  const [vendedores, setVendedores] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const [leadParaExcluir, setLeadParaExcluir] = useState(null);
  const [excluindo, setExcluindo] = useState(false);

  // Admin: inline editing state
  const [modoEdicao, setModoEdicao] = useState(false);
  const [editandoLabel, setEditandoLabel] = useState(null);
  const [editLabel, setEditLabel] = useState('');
  const [editandoCor, setEditandoCor] = useState(null);
  const [etapaParaExcluir, setEtapaParaExcluir] = useState(null);
  const [moverParaId, setMoverParaId] = useState('');
  const [processandoExclusaoEtapa, setProcessandoExclusaoEtapa] = useState(false);
  const [novaEtapaAberta, setNovaEtapaAberta] = useState(false);
  const [novaLabel, setNovaLabel] = useState('');
  const [novoTipo, setNovoTipo] = useState('normal');
  const [criandoEtapa, setCriandoEtapa] = useState(false);

  const [filtroVendedor, setFiltroVendedor] = useState('');
  const [filtroClasse, setFiltroClasse] = useState('');
  const [filtroCanal, setFiltroCanal] = useState('');
  const [produtosExcluidos, setProdutosExcluidos] = useState(new Set());
  const [dataInicio, setDataInicio] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  });
  const [dataFim, setDataFim] = useState(() => new Date().toISOString().slice(0, 10));

  const carregarFunil = useCallback(async () => {
    setCarregando(true);
    try {
      const params = { incluir_leads_fechados: 'true' };
      if (filtroVendedor) params.vendedor_id = filtroVendedor;
      if (filtroClasse) params.classe = filtroClasse;
      if (filtroCanal) params.canal = filtroCanal;
      // BRT (UTC-3): inicio = 03:00Z mesmo dia, fim = 02:59:59Z dia seguinte
      if (dataInicio) params.data_inicio = dataInicio + 'T03:00:00.000Z';
      if (dataFim) {
        const fimDate = new Date(dataFim + 'T12:00:00.000Z');
        fimDate.setUTCDate(fimDate.getUTCDate() + 1);
        params.data_fim = fimDate.toISOString().slice(0, 10) + 'T02:59:59.999Z';
      }

      const [funilRes, vendedoresRes, etapasRes] = await Promise.all([
        api.get('/leads/funil', { params }),
        api.get('/vendedores'),
        api.get('/etapas'),
      ]);

      setFunilData(funilRes.data);
      setVendedores(Array.isArray(vendedoresRes.data) ? vendedoresRes.data : []);
      setEtapas(Array.isArray(etapasRes.data) ? etapasRes.data : []);
    } catch (err) {
      console.error('Erro ao carregar funil:', err);
    } finally {
      setCarregando(false);
    }
  }, [filtroVendedor, filtroClasse, filtroCanal, dataInicio, dataFim]);

  useEffect(() => {
    carregarFunil();
  }, [carregarFunil]);

  const handleDragEnd = async (result) => {
    const { draggableId, destination, source } = result;
    if (!destination || destination.droppableId === source.droppableId) return;

    const leadId = parseInt(draggableId, 10);
    const novaEtapa = destination.droppableId;

    try {
      await api.patch(`/leads/${leadId}/etapa`, { etapa: novaEtapa });
      carregarFunil();
    } catch (err) {
      if (err.response?.status === 403) {
        toast('Apenas o vendedor responsável pode mover este lead', 'urgente');
      } else {
        console.error('Erro ao mover lead:', err);
      }
      carregarFunil(); // Reverte visual
    }
  };

  const salvarValorLead = async (leadId, valor) => {
    try {
      await api.patch(`/leads/${leadId}`, { valorVenda: valor });
      setFunilData(prev => {
        if (!prev) return prev;
        const novo = { ...prev, etapas: { ...prev.etapas } };
        for (const etapa of Object.keys(novo.etapas)) {
          novo.etapas[etapa] = {
            ...novo.etapas[etapa],
            leads: novo.etapas[etapa].leads.map(l =>
              l.id === leadId ? { ...l, valorVenda: valor } : l
            ),
          };
        }
        return novo;
      });
    } catch (err) {
      console.error('Erro ao salvar valor:', err);
    }
  };

  // ---- Admin: etapa management ----
  const salvarLabel = async (id) => {
    if (!editLabel.trim()) { setEditandoLabel(null); return; }
    try {
      await api.patch(`/etapas/${id}`, { label: editLabel.trim() });
      setEtapas(prev => prev.map(e => e.id === id ? { ...e, label: editLabel.trim() } : e));
    } catch (err) {
      console.error('Erro ao renomear etapa:', err);
    }
    setEditandoLabel(null);
  };

  const atualizarCor = async (id, cor) => {
    try {
      await api.patch(`/etapas/${id}`, { cor });
      setEtapas(prev => prev.map(e => e.id === id ? { ...e, cor } : e));
    } catch (err) {
      console.error('Erro ao atualizar cor:', err);
    }
  };

  const moverEtapa = async (id, direcao) => {
    const idx = etapas.findIndex(e => e.id === id);
    if (idx < 0) return;
    const novaOrdem = [...etapas];
    const swap = direcao === 'left' ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= novaOrdem.length) return;
    [novaOrdem[idx], novaOrdem[swap]] = [novaOrdem[swap], novaOrdem[idx]];
    setEtapas(novaOrdem);
    try {
      await api.post('/etapas/reordenar', { ordem: novaOrdem.map(e => e.id) });
    } catch (err) {
      console.error('Erro ao reordenar:', err);
      carregarFunil();
    }
  };

  const confirmarExclusaoEtapa = (etapa) => {
    setEtapaParaExcluir(etapa);
    setMoverParaId('');
  };

  const executarExclusaoEtapa = async () => {
    if (!etapaParaExcluir) return;
    setProcessandoExclusaoEtapa(true);
    try {
      const body = {};
      if (etapaParaExcluir._count > 0 && moverParaId) body.moverParaId = parseInt(moverParaId, 10);
      await api.delete(`/etapas/${etapaParaExcluir.id}`, { data: body });
      setEtapaParaExcluir(null);
      carregarFunil();
    } catch (err) {
      console.error('Erro ao excluir etapa:', err);
      toast(err.response?.data?.error || 'Erro ao excluir', 'urgente');
    } finally {
      setProcessandoExclusaoEtapa(false);
    }
  };

  const criarNovaEtapa = async () => {
    if (!novaLabel.trim()) return;
    setCriandoEtapa(true);
    try {
      await api.post('/etapas', { label: novaLabel.trim(), tipo: novoTipo });
      setNovaLabel('');
      setNovoTipo('normal');
      setNovaEtapaAberta(false);
      carregarFunil();
    } catch (err) {
      console.error('Erro ao criar etapa:', err);
      toast(err.response?.data?.error || 'Erro ao criar', 'urgente');
    } finally {
      setCriandoEtapa(false);
    }
  };

  const temFiltro = filtroVendedor || filtroClasse || filtroCanal || produtosExcluidos.size > 0;

  // Extract unique products from funil data (only vendaRealizada leads with real Hubla product)
  const produtosDisponiveis = useMemo(() => {
    const allLeads = [];
    if (funilData?.etapas) {
      for (const data of Object.values(funilData.etapas)) {
        allLeads.push(...data.leads);
      }
    }
    return extrairProdutosUnicos(allLeads);
  }, [funilData]);

  if (carregando && !funilData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-violet" />
      </div>
    );
  }

  // Calcular pipeline e receita client-side
  let pipelineTotal = 0;
  let receitaTotal = 0;
  let total = 0;

  // Build a set of ganho/perdido slugs from etapas config
  const ganhoSlugs = new Set(etapas.filter(e => e.tipo === 'ganho').map(e => e.slug));
  const perdidoSlugs = new Set(etapas.filter(e => e.tipo === 'perdido').map(e => e.slug));

  if (funilData?.etapas) {
    for (const [slug, data] of Object.entries(funilData.etapas)) {
      const isClosed = ganhoSlugs.has(slug) || perdidoSlugs.has(slug);
      total += isClosed ? (data.count || 0) : data.leads.length;
      if (isClosed) {
        // Colunas fechadas: usar valorTotal do backend (sem cards carregados)
        if (ganhoSlugs.has(slug)) receitaTotal += data.valorTotal || 0;
      } else {
        const leadsContab = data.leads.filter(l => !isProdutoExcluido(l, produtosExcluidos));
        const soma = leadsContab.reduce((s, l) => s + (l.valorVenda ? Number(l.valorVenda) : 0), 0);
        pipelineTotal += soma;
      }
    }
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-text-primary">Funil de Vendas</h1>
          <p className="text-[13px] text-text-secondary mt-1">
            {total} leads no funil
            {pipelineTotal > 0 && (
              <span className="ml-2 text-accent-amber font-medium">
                | Pipeline: {formatarMoeda(pipelineTotal)}
              </span>
            )}
            {receitaTotal > 0 && (
              <span className="ml-2 text-accent-emerald font-medium">
                | Receita: {formatarMoeda(receitaTotal)}
              </span>
            )}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => {
              if (modoEdicao) {
                setModoEdicao(false);
                setEditandoLabel(null);
                setEditandoCor(null);
                setNovaEtapaAberta(false);
              } else {
                setModoEdicao(true);
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold transition-all ${
              modoEdicao
                ? 'bg-accent-violet-light/10 text-accent-violet-light border border-accent-violet-light/30'
                : 'bg-bg-card border border-border-default text-text-secondary hover:text-text-primary hover:border-border-hover'
            }`}
          >
            <Settings size={14} />
            {modoEdicao ? 'Concluir edicao' : 'Editar Funil'}
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <FiltroUnificado
          align="left"
          dataInicio={dataInicio} setDataInicio={(v) => setDataInicio(v instanceof Date ? v.toISOString().slice(0, 10) : v)}
          dataFim={dataFim} setDataFim={(v) => setDataFim(v instanceof Date ? v.toISOString().slice(0, 10) : v)}
          vendedorId={filtroVendedor} setVendedorId={setFiltroVendedor}
          canal={filtroCanal} setCanal={setFiltroCanal}
          classe={filtroClasse} setClasse={setFiltroClasse}
          produtosExcluidos={produtosExcluidos} setProdutosExcluidos={setProdutosExcluidos}
          vendedores={vendedores}
          produtosDisponiveis={produtosDisponiveis}
          onLimpar={() => { setFiltroVendedor(''); setFiltroClasse(''); setFiltroCanal(''); setProdutosExcluidos(new Set()); const n = new Date(); setDataInicio(new Date(n.getFullYear(), n.getMonth(), 1).toISOString().slice(0, 10)); setDataFim(n.toISOString().slice(0, 10)); }}
        />
      </div>

      {/* Kanban */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {etapas.map((etapa, idx) => {
            const data = funilData?.etapas?.[etapa.slug] || { leads: [], count: 0, valorTotal: 0 };
            const isClosed = etapa.tipo === 'ganho' || etapa.tipo === 'perdido';
            return (
              <KanbanColuna
                key={etapa.slug}
                etapa={etapa}
                leads={data.leads}
                count={isClosed ? data.count : data.leads.length}
                valorTotal={data.valorTotal}
                onClickLead={(leadId) => navigate(`/leads/${leadId}`)}
                onDeleteLead={(lead) => setLeadParaExcluir(lead)}
                onSalvarValor={salvarValorLead}
                isAdmin={isAdmin && modoEdicao}
                editandoLabel={editandoLabel}
                setEditandoLabel={setEditandoLabel}
                editLabel={editLabel}
                setEditLabel={setEditLabel}
                salvarLabel={salvarLabel}
                editandoCor={editandoCor}
                setEditandoCor={setEditandoCor}
                atualizarCor={atualizarCor}
                confirmarExclusaoEtapa={confirmarExclusaoEtapa}
                moverEtapa={moverEtapa}
                etapaIndex={idx}
                etapasTotal={etapas.length}
              />
            );
          })}

          {/* Nova Etapa - admin only, edit mode */}
          {isAdmin && modoEdicao && (
            novaEtapaAberta ? (
              <div className="min-w-[280px] shrink-0 bg-bg-card border border-border-default rounded-[14px] p-4 space-y-3 animate-fade-in">
                <input
                  type="text"
                  value={novaLabel}
                  onChange={e => setNovaLabel(e.target.value)}
                  placeholder="Nome da etapa"
                  className="w-full bg-bg-input border border-border-default rounded-lg px-3 py-2 text-[13px] text-white outline-none focus:border-[rgba(108,92,231,0.4)]"
                  onKeyDown={e => e.key === 'Enter' && criarNovaEtapa()}
                  autoFocus
                />
                <select
                  value={novoTipo}
                  onChange={e => setNovoTipo(e.target.value)}
                  className="w-full bg-bg-input border border-border-default rounded-lg px-3 py-2 text-[12px] text-text-primary focus:outline-none"
                >
                  <option value="normal">Normal</option>
                  <option value="ganho">Ganho</option>
                  <option value="perdido">Perdido</option>
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setNovaEtapaAberta(false); setNovaLabel(''); }}
                    className="flex-1 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-text-secondary bg-bg-elevated border border-border-default hover:border-border-hover transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={criarNovaEtapa}
                    disabled={criandoEtapa || !novaLabel.trim()}
                    className="flex-1 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white bg-accent-violet hover:bg-[#5b4bd5] disabled:opacity-50 transition-all"
                  >
                    {criandoEtapa ? 'Criando...' : 'Criar'}
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => setNovaEtapaAberta(true)}
                className="min-w-[280px] shrink-0 bg-bg-card/30 border border-dashed border-border-default rounded-[14px] p-4 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-accent-violet-light/30 transition-all"
              >
                <Plus size={24} className="text-text-muted" />
                <span className="text-[12px] text-text-muted">Nova Etapa</span>
              </div>
            )
          )}
        </div>
      </DragDropContext>

      {/* Modal excluir lead */}
      {leadParaExcluir && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-bg-card border border-border-default rounded-2xl p-6 max-w-[400px] w-full mx-4 my-8 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[rgba(225,112,85,0.1)] flex items-center justify-center">
                <Trash2 size={20} className="text-accent-danger" />
              </div>
              <div>
                <h3 className="text-[14px] font-bold text-white">Excluir lead?</h3>
                <p className="text-[11px] text-text-muted">Esta acao nao pode ser desfeita</p>
              </div>
            </div>
            <p className="text-[12px] text-text-secondary mb-5">
              O lead <strong className="text-white">{leadParaExcluir.nome}</strong> e todo o seu historico serao excluidos permanentemente.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setLeadParaExcluir(null)}
                disabled={excluindo}
                className="px-4 py-2 rounded-lg text-[12px] font-semibold text-text-secondary bg-bg-elevated border border-border-default hover:border-border-hover transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  setExcluindo(true);
                  try {
                    await api.delete(`/leads/${leadParaExcluir.id}`);
                    setLeadParaExcluir(null);
                    carregarFunil();
                  } catch (err) {
                    console.error('Erro ao excluir:', err);
                  } finally {
                    setExcluindo(false);
                  }
                }}
                disabled={excluindo}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold text-white bg-accent-danger hover:bg-[#c0392b] transition-all disabled:opacity-50"
              >
                <Trash2 size={13} />
                {excluindo ? 'Excluindo...' : 'Excluir permanentemente'}
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Modal excluir etapa */}
      {etapaParaExcluir && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-bg-card border border-border-default rounded-2xl p-6 max-w-[420px] w-full mx-4 my-8 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[rgba(225,112,85,0.1)] flex items-center justify-center">
                <Trash2 size={20} className="text-accent-danger" />
              </div>
              <div>
                <h3 className="text-[14px] font-bold text-white">Excluir etapa "{etapaParaExcluir.label}"?</h3>
                <p className="text-[11px] text-text-muted">A etapa sera desativada</p>
              </div>
            </div>

            {etapaParaExcluir._count > 0 && (
              <div className="mb-4">
                <p className="text-[12px] text-text-secondary mb-2">
                  Existem <strong className="text-white">{etapaParaExcluir._count} leads</strong> nesta etapa. Para onde mover?
                </p>
                <select
                  value={moverParaId}
                  onChange={e => setMoverParaId(e.target.value)}
                  className="w-full bg-bg-input border border-border-default rounded-lg px-3 py-2 text-[12px] text-text-primary focus:outline-none focus:border-[rgba(108,92,231,0.4)]"
                >
                  <option value="">Selecionar etapa destino...</option>
                  {etapas.filter(e => e.id !== etapaParaExcluir.id).map(e => (
                    <option key={e.id} value={e.id}>{e.label}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setEtapaParaExcluir(null)}
                disabled={processandoExclusaoEtapa}
                className="px-4 py-2 rounded-lg text-[12px] font-semibold text-text-secondary bg-bg-elevated border border-border-default hover:border-border-hover transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={executarExclusaoEtapa}
                disabled={processandoExclusaoEtapa || (etapaParaExcluir._count > 0 && !moverParaId)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold text-white bg-accent-danger hover:bg-[#c0392b] transition-all disabled:opacity-50"
              >
                <Trash2 size={13} />
                {processandoExclusaoEtapa ? 'Excluindo...' : etapaParaExcluir._count > 0 ? 'Mover e Excluir' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
}
