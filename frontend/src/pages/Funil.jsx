import { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Filter, DollarSign, Clock, User, Instagram, Megaphone } from 'lucide-react';

const ETAPAS = [
  { id: 'novo', label: 'Novo', cor: 'border-blue-400', headerBg: 'bg-blue-50' },
  { id: 'em_abordagem', label: 'Em Abordagem', cor: 'border-yellow-400', headerBg: 'bg-yellow-50' },
  { id: 'qualificado', label: 'Qualificado', cor: 'border-purple-400', headerBg: 'bg-purple-50' },
  { id: 'proposta', label: 'Proposta', cor: 'border-orange-400', headerBg: 'bg-orange-50' },
  { id: 'fechado_ganho', label: 'Fechado Ganho', cor: 'border-green-400', headerBg: 'bg-green-50' },
  { id: 'fechado_perdido', label: 'Fechado Perdido', cor: 'border-red-400', headerBg: 'bg-red-50' },
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
  if (pontuacao >= 75) return { bg: 'bg-red-100', text: 'text-red-700', label: 'Quente' };
  if (pontuacao >= 45) return { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Morno' };
  return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Frio' };
}

function LeadCard({ lead, index }) {
  const score = scoreCor(lead.pontuacao);
  const CanalIcone = lead.canal === 'bio' ? Instagram : Megaphone;

  return (
    <Draggable draggableId={String(lead.id)} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`bg-white rounded-lg border p-3 mb-2 cursor-grab active:cursor-grabbing transition-shadow ${
            snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-300' : 'shadow-sm hover:shadow-md'
          }`}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <p className="text-sm font-medium text-gray-800 truncate flex-1">{lead.nome}</p>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${score.bg} ${score.text} shrink-0`}>
              {lead.pontuacao}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${score.bg} ${score.text}`}>
              {score.label}
            </span>

            <span className="inline-flex items-center gap-1 text-[10px] text-gray-500">
              <CanalIcone size={10} />
              {lead.canal === 'bio' ? 'Bio' : 'Anuncio'}
            </span>

            <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
              <Clock size={10} />
              {tempoDesdeEntrada(lead.dataPreenchimento || lead.createdAt)}
            </span>
          </div>

          {lead.vendedor && (
            <div className="flex items-center gap-1 mt-2 text-[10px] text-gray-500">
              <User size={10} />
              {lead.vendedor.nomeExibicao}
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}

function KanbanColuna({ etapa, leads }) {
  const pipelineValor = etapa.id === 'proposta' ? leads.length * TICKET_MEDIO : null;

  return (
    <div className="flex flex-col w-72 shrink-0">
      <div className={`rounded-t-lg px-3 py-2 border-t-4 ${etapa.cor} ${etapa.headerBg}`}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">{etapa.label}</h3>
          <span className="text-xs font-bold text-gray-500 bg-white px-2 py-0.5 rounded-full">
            {leads.length}
          </span>
        </div>
        {pipelineValor !== null && pipelineValor > 0 && (
          <div className="flex items-center gap-1 mt-1 text-[11px] text-orange-600 font-medium">
            <DollarSign size={11} />
            R$ {pipelineValor.toLocaleString('pt-BR')}
          </div>
        )}
      </div>

      <Droppable droppableId={etapa.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 p-2 rounded-b-lg border border-t-0 border-gray-200 min-h-[200px] transition-colors ${
              snapshot.isDraggingOver ? 'bg-blue-50' : 'bg-gray-50'
            }`}
          >
            {leads.map((lead, idx) => (
              <LeadCard key={lead.id} lead={lead} index={idx} />
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
  const [leads, setLeads] = useState([]);
  const [vendedores, setVendedores] = useState([]);
  const [carregando, setCarregando] = useState(true);

  // Filtros
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

    // Atualizar otimisticamente
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

  // Agrupar leads por etapa
  const leadsPorEtapa = {};
  for (const etapa of ETAPAS) {
    leadsPorEtapa[etapa.id] = [];
  }
  for (const lead of leads) {
    if (leadsPorEtapa[lead.etapaFunil]) {
      leadsPorEtapa[lead.etapaFunil].push(lead);
    }
  }

  // Pipeline total (leads em proposta)
  const pipelineTotal = (leadsPorEtapa.proposta?.length || 0) * TICKET_MEDIO;

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Funil de Vendas</h1>
          <p className="text-sm text-gray-500 mt-1">
            {leads.length} leads no funil
            {pipelineTotal > 0 && (
              <span className="ml-2 text-orange-600 font-medium">
                | Pipeline: R$ {pipelineTotal.toLocaleString('pt-BR')}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 bg-white rounded-lg border border-gray-200 p-3">
        <Filter size={16} className="text-gray-400" />

        <select
          value={filtroVendedor}
          onChange={(e) => setFiltroVendedor(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos os vendedores</option>
          {vendedores.map((v) => (
            <option key={v.id} value={v.id}>{v.nomeExibicao}</option>
          ))}
        </select>

        <select
          value={filtroClasse}
          onChange={(e) => setFiltroClasse(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todas as classes</option>
          <option value="A">Classe A</option>
          <option value="B">Classe B</option>
          <option value="C">Classe C</option>
        </select>

        <select
          value={filtroCanal}
          onChange={(e) => setFiltroCanal(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos os canais</option>
          <option value="bio">Bio</option>
          <option value="anuncio">Anuncio</option>
          <option value="evento">Evento</option>
        </select>

        {(filtroVendedor || filtroClasse || filtroCanal) && (
          <button
            onClick={() => { setFiltroVendedor(''); setFiltroClasse(''); setFiltroCanal(''); }}
            className="text-xs text-blue-600 hover:underline"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {ETAPAS.map((etapa) => (
            <KanbanColuna
              key={etapa.id}
              etapa={etapa}
              leads={leadsPorEtapa[etapa.id] || []}
            />
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}
