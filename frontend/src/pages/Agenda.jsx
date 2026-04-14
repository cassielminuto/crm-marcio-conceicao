import { useState, useEffect, useCallback, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Calendar, ChevronDown, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import AgendaFormModal from '../components/AgendaFormModal';
import AgendaEventoModal from '../components/AgendaEventoModal';

const CORES_TIPO = {
  reuniao_sdr_instagram: '#3b82f6',
  reuniao_sdr_inbound: '#10b981',
  reuniao_manual: '#8b5cf6',
  bloco_on: '#6b7280',
  bloco_off: '#fca5a5',
  evento_personalizado: '#f59e0b',
};

const LABELS_TIPO = {
  reuniao_sdr_instagram: 'Instagram',
  reuniao_sdr_inbound: 'Inbound',
  reuniao_manual: 'Reunião',
  bloco_on: 'ON',
  bloco_off: 'OFF',
  evento_personalizado: 'Evento',
};

function badgeReunioesHoje(eventos) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const amanha = new Date(hoje);
  amanha.setDate(amanha.getDate() + 1);

  return eventos.filter(ev => {
    if (!ev.tipo.startsWith('reuniao_')) return false;
    const inicio = new Date(ev.inicio);
    return inicio >= hoje && inicio < amanha;
  }).length;
}

export default function Agenda() {
  const { usuario } = useAuth();
  const { toast } = useToast();
  const calendarRef = useRef(null);
  const [eventos, setEventos] = useState([]);
  const [vendedores, setVendedores] = useState([]);
  const [filtroVendedor, setFiltroVendedor] = useState('todos');
  const [carregando, setCarregando] = useState(true);
  const [reunioesHoje, setReunioesHoje] = useState(0);

  // Modais
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [eventoModalOpen, setEventoModalOpen] = useState(null); // evento selecionado
  const [eventoEditar, setEventoEditar] = useState(null); // pra modo edição
  const [defaultSlot, setDefaultSlot] = useState({ start: '', end: '' });

  const isAdminGestorSdr = usuario?.perfil === 'admin' || usuario?.perfil === 'gestor' || usuario?.perfil === 'sdr';
  const isAdminGestor = usuario?.perfil === 'admin' || usuario?.perfil === 'gestor';

  // Carregar vendedores pra filtro
  useEffect(() => {
    if (isAdminGestorSdr) {
      api.get('/vendedores').then(res => {
        const lista = Array.isArray(res.data) ? res.data : res.data.vendedores || [];
        setVendedores(lista.filter(v => v.ativo));
      }).catch(() => {});
    }
  }, [isAdminGestorSdr]);

  // Carregar eventos
  const carregarEventos = useCallback(async (info) => {
    setCarregando(true);
    try {
      const params = new URLSearchParams();
      if (info?.startStr) params.set('data_inicio', info.startStr);
      if (info?.endStr) params.set('data_fim', info.endStr);
      if (filtroVendedor !== 'todos') params.set('vendedor_id', filtroVendedor);

      const { data } = await api.get(`/agenda?${params.toString()}`);
      const lista = data.eventos || [];
      setEventos(lista);
      setReunioesHoje(badgeReunioesHoje(lista));
    } catch (err) {
      console.error('Erro ao carregar agenda:', err);
    } finally {
      setCarregando(false);
    }
  }, [filtroVendedor]);

  // Recarregar quando filtro mudar
  useEffect(() => {
    const calApi = calendarRef.current?.getApi();
    if (calApi) {
      const view = calApi.view;
      carregarEventos({ startStr: view.activeStart.toISOString(), endStr: view.activeEnd.toISOString() });
    }
  }, [filtroVendedor, carregarEventos]);

  // Mapear eventos pro FullCalendar
  const eventosFC = eventos.map(ev => {
    const isOff = ev.marcadoEmHorarioOff;
    const isPassado = ev.statusReuniao != null;
    const isBlocoOff = ev.tipo === 'bloco_off';
    const isBlocoOn = ev.tipo === 'bloco_on';

    // Cores por tipo
    let backgroundColor, borderColor, textColor;
    if (isBlocoOff) {
      backgroundColor = 'rgba(239, 68, 68, 0.12)';
      borderColor = '#fca5a5';
      textColor = '#f87171';
    } else if (isBlocoOn) {
      backgroundColor = 'rgba(107, 114, 128, 0.12)';
      borderColor = '#9ca3af';
      textColor = '#9ca3af';
    } else {
      backgroundColor = ev.cor || CORES_TIPO[ev.tipo] || '#6b7280';
      borderColor = isOff ? '#ef4444' : backgroundColor;
      textColor = '#ffffff';
    }

    // Drag: dono ou admin/gestor
    const podeMover = (usuario?.vendedorId === ev.vendedorId) || isAdminGestor;

    return {
      id: String(ev.id),
      title: ev.titulo,
      start: ev.inicio,
      end: ev.fim,
      backgroundColor,
      borderColor,
      textColor,
      display: 'auto',
      editable: podeMover,
      classNames: [
        isPassado ? 'fc-evento-passado' : '',
        isOff ? 'fc-evento-off-override' : '',
        isBlocoOff ? 'fc-bloco-off' : '',
        isBlocoOn ? 'fc-bloco-on' : '',
      ].filter(Boolean),
      extendedProps: { ...ev },
    };
  });

  function handleEventClick(info) {
    const ev = info.event.extendedProps;
    setEventoModalOpen(ev);
  }

  function handleSelect(info) {
    const pad = n => String(n).padStart(2, '0');
    const fmt = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    setDefaultSlot({ start: fmt(info.start), end: fmt(info.end) });
    setEventoEditar(null);
    setFormModalOpen(true);
  }

  async function handleEventDrop(info) {
    const ev = info.event.extendedProps;
    try {
      await api.patch(`/agenda/${ev.id}`, {
        inicio: info.event.start.toISOString(),
        fim: info.event.end.toISOString(),
      });
      recarregarAtual();
    } catch (err) {
      toast(err.response?.data?.error || 'Erro ao mover evento', 'urgente');
      info.revert();
    }
  }

  async function handleEventResize(info) {
    const ev = info.event.extendedProps;
    try {
      await api.patch(`/agenda/${ev.id}`, {
        inicio: info.event.start.toISOString(),
        fim: info.event.end.toISOString(),
      });
      recarregarAtual();
    } catch (err) {
      toast(err.response?.data?.error || 'Erro ao redimensionar evento', 'urgente');
      info.revert();
    }
  }

  function recarregarAtual() {
    const calApi = calendarRef.current?.getApi();
    if (calApi) {
      const view = calApi.view;
      carregarEventos({ startStr: view.activeStart.toISOString(), endStr: view.activeEnd.toISOString() });
    }
  }

  function handleNovoEvento() {
    setDefaultSlot({ start: '', end: '' });
    setEventoEditar(null);
    setFormModalOpen(true);
  }

  function handleEditarEvento(ev) {
    setEventoEditar(ev);
    setDefaultSlot({ start: '', end: '' });
    setFormModalOpen(true);
  }

  return (
    <div className="animate-page-enter p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-violet to-accent-info flex items-center justify-center">
            <Calendar size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-text-primary font-display">Agenda</h1>
            <p className="text-xs text-text-muted">
              {reunioesHoje > 0
                ? `${reunioesHoje} reunião${reunioesHoje > 1 ? 'ões' : ''} hoje`
                : 'Nenhuma reunião hoje'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Filtro por closer */}
          {isAdminGestorSdr && (
            <div className="relative">
              <select
                value={filtroVendedor}
                onChange={(e) => setFiltroVendedor(e.target.value)}
                className="appearance-none bg-bg-card border border-border-default rounded-lg px-4 py-2 pr-8 text-sm text-text-primary focus:outline-none focus:border-accent-violet transition-colors cursor-pointer"
              >
                <option value="todos">Todos os closers</option>
                {vendedores.map(v => (
                  <option key={v.id} value={v.id}>{v.nomeExibicao || `Vendedor #${v.id}`}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            </div>
          )}

          {/* Botão novo evento */}
          <button
            onClick={handleNovoEvento}
            className="w-9 h-9 rounded-lg bg-accent-violet hover:bg-accent-violet-light text-white flex items-center justify-center transition-colors shadow-lg shadow-accent-violet/20"
            title="Novo evento"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-3 text-xs text-text-secondary">
        {Object.entries(CORES_TIPO).map(([tipo, cor]) => (
          <div key={tipo} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cor }} />
            <span>{LABELS_TIPO[tipo]}</span>
          </div>
        ))}
      </div>

      {/* Calendário */}
      <div className={`bg-bg-card rounded-xl border border-border-default p-4 transition-opacity ${carregando ? 'opacity-60' : 'opacity-100'}`}>
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          locale="pt-br"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay',
          }}
          buttonText={{
            today: 'Hoje',
            month: 'Mês',
            week: 'Semana',
            day: 'Dia',
          }}
          slotMinTime="08:00:00"
          slotMaxTime="22:00:00"
          allDaySlot={false}
          nowIndicator
          height="auto"
          contentHeight={650}
          expandRows
          slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
          eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
          dayHeaderFormat={{ weekday: 'short', day: 'numeric', month: 'numeric' }}
          events={eventosFC}
          datesSet={(info) => carregarEventos({ startStr: info.startStr, endStr: info.endStr })}
          eventClick={handleEventClick}
          editable
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
          selectable
          select={handleSelect}
          selectMirror
        />
      </div>

      {/* CSS overrides pra FullCalendar usar variáveis de tema */}
      <style>{`
        /* Base do calendário */
        .fc {
          --fc-border-color: var(--t-border-default);
          --fc-page-bg-color: transparent;
          --fc-neutral-bg-color: var(--t-bg-elevated);
          --fc-today-bg-color: rgba(124, 58, 237, 0.06);
          --fc-now-indicator-color: #7C3AED;
          --fc-event-border-color: transparent;
          font-family: 'Inter', sans-serif;
        }

        /* Textos */
        .fc .fc-col-header-cell-cushion,
        .fc .fc-daygrid-day-number,
        .fc .fc-timegrid-slot-label-cushion,
        .fc .fc-list-day-text,
        .fc .fc-list-day-side-text {
          color: var(--t-text-secondary);
          font-size: 12px;
        }

        .fc .fc-toolbar-title {
          color: var(--t-text-primary);
          font-size: 16px;
          font-weight: 600;
          font-family: 'Sora', 'Inter', sans-serif;
        }

        /* Botões */
        .fc .fc-button {
          background: var(--t-bg-elevated);
          border: 1px solid var(--t-border-default);
          color: var(--t-text-secondary);
          font-size: 12px;
          font-weight: 500;
          padding: 6px 12px;
          border-radius: 8px;
          transition: all 0.15s;
          box-shadow: none;
        }

        .fc .fc-button:hover {
          background: var(--t-bg-card-hover);
          color: var(--t-text-primary);
          border-color: var(--t-border-hover);
        }

        .fc .fc-button-active,
        .fc .fc-button.fc-button-active {
          background: rgba(124, 58, 237, 0.15) !important;
          color: #A78BFA !important;
          border-color: rgba(124, 58, 237, 0.3) !important;
        }

        .fc .fc-button:focus {
          box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.3);
        }

        .fc .fc-button-group > .fc-button {
          border-radius: 0;
        }
        .fc .fc-button-group > .fc-button:first-child {
          border-radius: 8px 0 0 8px;
        }
        .fc .fc-button-group > .fc-button:last-child {
          border-radius: 0 8px 8px 0;
        }

        /* Evento */
        .fc .fc-event {
          border-radius: 6px;
          padding: 3px 6px;
          font-size: 13px;
          font-weight: 600;
          border-width: 2px;
          border-left-width: 3px;
          cursor: pointer;
          transition: opacity 0.15s;
          line-height: 1.3;
        }

        .fc .fc-event .fc-event-title {
          font-weight: 600;
          white-space: normal;
          overflow: visible;
        }

        .fc .fc-event .fc-event-time {
          font-size: 11px;
          font-weight: 500;
          opacity: 0.85;
        }

        .fc .fc-event:hover {
          filter: brightness(1.1);
        }

        /* Evento passado (com status) */
        .fc .fc-evento-passado {
          opacity: 0.45;
        }

        /* Evento marcado em horário OFF */
        .fc .fc-evento-off-override {
          border-width: 2px !important;
          border-style: dashed !important;
        }

        /* Bloco OFF — soft rosado */
        .fc .fc-bloco-off {
          border-left-width: 3px !important;
          border-left-style: solid !important;
          border-left-color: #fca5a5 !important;
        }

        /* Bloco ON — soft cinza */
        .fc .fc-bloco-on {
          border-left-width: 3px !important;
          border-left-style: solid !important;
          border-left-color: #9ca3af !important;
        }

        /* Time grid slots */
        .fc .fc-timegrid-slot {
          height: 48px;
        }

        .fc .fc-timegrid-slot-label {
          vertical-align: top;
        }

        /* Header cells */
        .fc .fc-col-header-cell {
          padding: 8px 0;
          background: var(--t-bg-elevated);
          border-bottom: 1px solid var(--t-border-default);
        }

        /* Today column highlight */
        .fc .fc-day-today {
          background: rgba(124, 58, 237, 0.04) !important;
        }

        /* Grid lines */
        .fc td, .fc th {
          border-color: var(--t-border-subtle);
        }

        /* Now indicator */
        .fc .fc-timegrid-now-indicator-line {
          border-color: #7C3AED;
          border-width: 2px;
        }

        .fc .fc-timegrid-now-indicator-arrow {
          border-color: #7C3AED;
          border-top-color: transparent;
          border-bottom-color: transparent;
        }

        /* Background events (blocos ON/OFF) */
        .fc .fc-bg-event {
          opacity: 0.15;
          border-radius: 4px;
        }

        /* Scrollbar in time grid */
        .fc .fc-scroller::-webkit-scrollbar { width: 4px; }
        .fc .fc-scroller::-webkit-scrollbar-thumb {
          background: var(--t-border-hover);
          border-radius: 9999px;
        }
      `}</style>

      {/* Modal: Criar / Editar evento */}
      <AgendaFormModal
        isOpen={formModalOpen}
        onClose={() => { setFormModalOpen(false); setEventoEditar(null); }}
        onSaved={recarregarAtual}
        evento={eventoEditar}
        vendedores={vendedores}
        defaultStart={defaultSlot.start}
        defaultEnd={defaultSlot.end}
      />

      {/* Modal: Detalhes do evento */}
      {eventoModalOpen && (
        <AgendaEventoModal
          evento={eventoModalOpen}
          onClose={() => setEventoModalOpen(null)}
          onEditar={handleEditarEvento}
          onDeleted={recarregarAtual}
          onStatusUpdated={recarregarAtual}
        />
      )}
    </div>
  );
}

// Export badge helper pra uso no Sidebar
export { badgeReunioesHoje };
