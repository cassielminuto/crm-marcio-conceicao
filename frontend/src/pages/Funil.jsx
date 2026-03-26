import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Filter, Clock, User, Instagram, Megaphone, Trash2, Calendar } from 'lucide-react';


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

function LeadCard({ lead, index, onClickLead, onDeleteLead, onSalvarValor }) {
  const score = scoreCor(lead.pontuacao);
  const CanalIcone = lead.canal === 'bio' ? Instagram : Megaphone;

  return (
    <Draggable draggableId={String(lead.id)} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onClickLead(lead.id)}
          className={`group relative bg-bg-card border border-border-subtle rounded-[10px] p-3 mb-2 cursor-grab active:cursor-grabbing transition-all ${
            snapshot.isDragging ? 'shadow-lg ring-1 ring-accent-violet/30 border-border-active' : 'hover:border-border-hover'
          }`}
        >
          <button
            onClick={(e) => { e.stopPropagation(); onDeleteLead(lead); }}
            className="absolute top-2 right-2 p-1 rounded-md text-text-muted hover:text-accent-danger hover:bg-[rgba(225,112,85,0.08)] opacity-0 group-hover:opacity-100 transition-all"
          >
            <Trash2 size={12} />
          </button>
          <div className="flex items-start justify-between gap-2 mb-2 pr-5">
            <p className="text-[12px] font-medium text-text-primary truncate flex-1 hover:text-accent-violet-light">{lead.nome}</p>
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

          {lead.vendedor && (
            <div className="flex items-center gap-1 mt-2 text-[10px] text-text-muted">
              <User size={10} />
              {lead.vendedor.nomeExibicao}
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

function KanbanColuna({ etapa, leads, count, onClickLead, onDeleteLead, onSalvarValor }) {
  const somaColuna = leads.reduce((sum, l) => sum + (l.valorVenda ? Number(l.valorVenda) : 0), 0);
  const valorCor = etapa.tipo === 'ganho' ? 'text-accent-emerald' : etapa.tipo === 'perdido' ? 'text-accent-danger' : 'text-accent-amber';

  return (
    <div className="flex flex-col w-72 shrink-0">
      <div className="rounded-t-[10px] px-3 py-2.5 border-t-2 bg-bg-card" style={{ borderTopColor: etapa.cor }}>
        <div className="flex items-center justify-between">
          <h3 className="text-[12px] font-semibold text-text-primary">{etapa.label}</h3>
          <span className="text-[10px] font-bold text-text-muted bg-bg-elevated px-2 py-0.5 rounded-full">
            {count}
          </span>
        </div>
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
            {leads.map((lead, idx) => (
              <LeadCard key={lead.id} lead={lead} index={idx} onClickLead={onClickLead} onDeleteLead={onDeleteLead} onSalvarValor={onSalvarValor} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}

export default function Funil() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [etapas, setEtapas] = useState([]);
  const [funilData, setFunilData] = useState(null);
  const [vendedores, setVendedores] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const [leadParaExcluir, setLeadParaExcluir] = useState(null);
  const [excluindo, setExcluindo] = useState(false);

  const [filtroVendedor, setFiltroVendedor] = useState('');
  const [filtroClasse, setFiltroClasse] = useState('');
  const [filtroCanal, setFiltroCanal] = useState('');
  const [dataInicio, setDataInicio] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  });
  const [dataFim, setDataFim] = useState(() => new Date().toISOString().slice(0, 10));

  const carregarFunil = useCallback(async () => {
    setCarregando(true);
    try {
      const params = {};
      if (filtroVendedor) params.vendedor_id = filtroVendedor;
      if (filtroClasse) params.classe = filtroClasse;
      if (filtroCanal) params.canal = filtroCanal;
      if (dataInicio) params.data_inicio = dataInicio;
      if (dataFim) params.data_fim = dataFim;

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
      console.error('Erro ao mover lead:', err);
      carregarFunil();
    }
  };

  const salvarValorLead = async (leadId, valor) => {
    try {
      await api.patch(`/leads/${leadId}`, { valorVenda: valor });
      // Atualizar localmente
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

  const temFiltro = filtroVendedor || filtroClasse || filtroCanal;

  if (carregando && !funilData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-violet" />
      </div>
    );
  }

  // Calcular pipeline e receita client-side para refletir edits inline
  let pipelineTotal = 0;
  let receitaTotal = 0;
  let total = 0;

  if (funilData?.etapas) {
    for (const [etapa, data] of Object.entries(funilData.etapas)) {
      total += data.leads.length;
      const soma = data.leads.reduce((s, l) => s + (l.valorVenda ? Number(l.valorVenda) : 0), 0);
      if (etapa === 'fechado_ganho') receitaTotal += soma;
      else if (etapa !== 'fechado_perdido' && etapa !== 'nurturing') pipelineTotal += soma;
    }
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-white">Funil de Vendas</h1>
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
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap bg-bg-card border border-border-subtle rounded-[14px] p-3">
        <Filter size={16} className="text-text-muted shrink-0" />

        <select
          value={filtroVendedor}
          onChange={(e) => setFiltroVendedor(e.target.value)}
          className="bg-bg-input border border-border-default rounded-lg px-3 py-1.5 text-[12px] text-text-primary focus:outline-none focus:border-[rgba(108,92,231,0.4)]"
        >
          <option value="">Todos os vendedores</option>
          {vendedores.map((v) => (
            <option key={v.id} value={v.id}>{v.nomeExibicao}</option>
          ))}
        </select>

        <select
          value={filtroClasse}
          onChange={(e) => setFiltroClasse(e.target.value)}
          className="bg-bg-input border border-border-default rounded-lg px-3 py-1.5 text-[12px] text-text-primary focus:outline-none focus:border-[rgba(108,92,231,0.4)]"
        >
          <option value="">Todas as classes</option>
          <option value="A">Classe A</option>
          <option value="B">Classe B</option>
          <option value="C">Classe C</option>
        </select>

        <select
          value={filtroCanal}
          onChange={(e) => setFiltroCanal(e.target.value)}
          className="bg-bg-input border border-border-default rounded-lg px-3 py-1.5 text-[12px] text-text-primary focus:outline-none focus:border-[rgba(108,92,231,0.4)]"
        >
          <option value="">Todos os canais</option>
          <option value="bio">Bio</option>
          <option value="anuncio">Anuncio</option>
          <option value="evento">Evento</option>
        </select>

        <input
          type="date"
          value={dataInicio}
          onChange={(e) => setDataInicio(e.target.value)}
          className="bg-bg-input border border-border-default rounded-lg px-3 py-1.5 text-[12px] text-text-primary focus:outline-none focus:border-[rgba(108,92,231,0.4)]"
          title="Data inicio"
        />
        <input
          type="date"
          value={dataFim}
          onChange={(e) => setDataFim(e.target.value)}
          className="bg-bg-input border border-border-default rounded-lg px-3 py-1.5 text-[12px] text-text-primary focus:outline-none focus:border-[rgba(108,92,231,0.4)]"
          title="Data fim"
        />

        {temFiltro && (
          <button
            onClick={() => { setFiltroVendedor(''); setFiltroClasse(''); setFiltroCanal(''); const n = new Date(); setDataInicio(new Date(n.getFullYear(), n.getMonth(), 1).toISOString().slice(0, 10)); setDataFim(n.toISOString().slice(0, 10)); }}
            className="text-[11px] text-accent-violet-light hover:underline"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Kanban */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {etapas.map((etapa) => {
            const data = funilData?.etapas?.[etapa.slug] || { leads: [], count: 0 };
            return (
              <KanbanColuna
                key={etapa.slug}
                etapa={etapa}
                leads={data.leads}
                count={data.leads.length}
                onClickLead={(leadId) => navigate(`/leads/${leadId}`)}
                onDeleteLead={(lead) => setLeadParaExcluir(lead)}
                onSalvarValor={salvarValorLead}
              />
            );
          })}
        </div>
      </DragDropContext>

      {leadParaExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-bg-card border border-border-default rounded-2xl p-6 max-w-[400px] w-full mx-4 animate-fade-in">
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
      )}
    </div>
  );
}
