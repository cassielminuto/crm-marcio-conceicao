import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Filter, DollarSign, Clock, User, Instagram, Megaphone, Trash2 } from 'lucide-react';

const ETAPAS = [
  { id: 'novo', label: 'Novo', cor: 'border-accent-info' },
  { id: 'em_abordagem', label: 'Em Abordagem', cor: 'border-accent-amber' },
  { id: 'qualificado', label: 'Qualificado', cor: 'border-accent-violet-light' },
  { id: 'proposta', label: 'Proposta', cor: 'border-accent-danger' },
  { id: 'fechado_ganho', label: 'Fechado Ganho', cor: 'border-accent-emerald' },
  { id: 'fechado_perdido', label: 'Fechado Perdido', cor: 'border-[#e17055]' },
];

const TICKET_MEDIO = 1229;

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

function LeadCard({ lead, index, onClickLead, onDeleteLead }) {
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
          <div className="flex items-start justify-between gap-2 mb-2">
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
        </div>
      )}
    </Draggable>
  );
}

function KanbanColuna({ etapa, leads, onClickLead, onDeleteLead }) {
  const pipelineValor = etapa.id === 'proposta' ? leads.length * TICKET_MEDIO : null;

  return (
    <div className="flex flex-col w-72 shrink-0">
      <div className={`rounded-t-[10px] px-3 py-2.5 border-t-2 ${etapa.cor} bg-bg-card`}>
        <div className="flex items-center justify-between">
          <h3 className="text-[12px] font-semibold text-text-primary">{etapa.label}</h3>
          <span className="text-[10px] font-bold text-text-muted bg-bg-elevated px-2 py-0.5 rounded-full">
            {leads.length}
          </span>
        </div>
        {pipelineValor !== null && pipelineValor > 0 && (
          <div className="flex items-center gap-1 mt-1 text-[10px] text-accent-amber font-medium">
            <DollarSign size={10} />
            R$ {pipelineValor.toLocaleString('pt-BR')}
          </div>
        )}
      </div>

      <Droppable droppableId={etapa.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 p-2 rounded-b-[10px] border border-t-0 border-border-subtle min-h-[200px] transition-colors ${
              snapshot.isDraggingOver ? 'bg-[rgba(108,92,231,0.04)]' : 'bg-bg-secondary'
            }`}
          >
            {leads.map((lead, idx) => (
              <LeadCard key={lead.id} lead={lead} index={idx} onClickLead={onClickLead} onDeleteLead={onDeleteLead} />
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
  const [leads, setLeads] = useState([]);
  const [vendedores, setVendedores] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const [leadParaExcluir, setLeadParaExcluir] = useState(null);
  const [excluindo, setExcluindo] = useState(false);

  const [filtroVendedor, setFiltroVendedor] = useState('');
  const [filtroClasse, setFiltroClasse] = useState('');
  const [filtroCanal, setFiltroCanal] = useState('');

  const carregarDados = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: '200' });
      if (filtroVendedor) params.set('vendedor_id', filtroVendedor);
      if (filtroClasse) params.set('classe', filtroClasse);
      if (filtroCanal) params.set('canal', filtroCanal);

      const [leadsRes, vendedoresRes] = await Promise.all([
        api.get(`/leads?${params}`),
        api.get('/vendedores'),
      ]);

      setLeads(leadsRes.data.dados);
      setVendedores(vendedoresRes.data);
    } catch (err) {
      console.error('Erro ao carregar funil:', err);
    } finally {
      setCarregando(false);
    }
  }, [filtroVendedor, filtroClasse, filtroCanal]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const handleDragEnd = async (result) => {
    const { draggableId, destination, source } = result;
    if (!destination || destination.droppableId === source.droppableId) return;

    const leadId = parseInt(draggableId, 10);
    const novaEtapa = destination.droppableId;

    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, etapaFunil: novaEtapa } : l))
    );

    try {
      await api.patch(`/leads/${leadId}/etapa`, { etapa: novaEtapa });
    } catch (err) {
      console.error('Erro ao mover lead:', err);
      carregarDados();
    }
  };

  const leadsPorEtapa = {};
  for (const etapa of ETAPAS) {
    leadsPorEtapa[etapa.id] = [];
  }
  for (const lead of leads) {
    if (leadsPorEtapa[lead.etapaFunil]) {
      leadsPorEtapa[lead.etapaFunil].push(lead);
    }
  }

  const pipelineTotal = (leadsPorEtapa.proposta?.length || 0) * TICKET_MEDIO;

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-violet" />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-white">Funil de Vendas</h1>
          <p className="text-[13px] text-text-secondary mt-1">
            {leads.length} leads no funil
            {pipelineTotal > 0 && (
              <span className="ml-2 text-accent-amber font-medium">
                | Pipeline: R$ {pipelineTotal.toLocaleString('pt-BR')}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 bg-bg-card border border-border-subtle rounded-[14px] p-3">
        <Filter size={16} className="text-text-muted" />

        <select
          value={filtroVendedor}
          onChange={(e) => setFiltroVendedor(e.target.value)}
          className="bg-bg-input border border-border-default rounded-lg px-3 py-1.5 text-[12px] text-text-primary focus:outline-none focus:border-[rgba(108,92,231,0.4)] focus:ring-[3px] focus:ring-[rgba(108,92,231,0.06)]"
        >
          <option value="">Todos os vendedores</option>
          {vendedores.map((v) => (
            <option key={v.id} value={v.id}>{v.nomeExibicao}</option>
          ))}
        </select>

        <select
          value={filtroClasse}
          onChange={(e) => setFiltroClasse(e.target.value)}
          className="bg-bg-input border border-border-default rounded-lg px-3 py-1.5 text-[12px] text-text-primary focus:outline-none focus:border-[rgba(108,92,231,0.4)] focus:ring-[3px] focus:ring-[rgba(108,92,231,0.06)]"
        >
          <option value="">Todas as classes</option>
          <option value="A">Classe A</option>
          <option value="B">Classe B</option>
          <option value="C">Classe C</option>
        </select>

        <select
          value={filtroCanal}
          onChange={(e) => setFiltroCanal(e.target.value)}
          className="bg-bg-input border border-border-default rounded-lg px-3 py-1.5 text-[12px] text-text-primary focus:outline-none focus:border-[rgba(108,92,231,0.4)] focus:ring-[3px] focus:ring-[rgba(108,92,231,0.06)]"
        >
          <option value="">Todos os canais</option>
          <option value="bio">Bio</option>
          <option value="anuncio">Anuncio</option>
          <option value="evento">Evento</option>
        </select>

        {(filtroVendedor || filtroClasse || filtroCanal) && (
          <button
            onClick={() => { setFiltroVendedor(''); setFiltroClasse(''); setFiltroCanal(''); }}
            className="text-[11px] text-accent-violet-light hover:underline"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Kanban */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {ETAPAS.map((etapa) => (
            <KanbanColuna
              key={etapa.id}
              etapa={etapa}
              leads={leadsPorEtapa[etapa.id] || []}
              onClickLead={(leadId) => navigate(`/leads/${leadId}`)}
              onDeleteLead={(lead) => setLeadParaExcluir(lead)}
            />
          ))}
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
                    carregarDados();
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
