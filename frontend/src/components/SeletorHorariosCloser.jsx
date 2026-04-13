import { useState, useEffect } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import api from '../services/api';

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const STATUS_STYLES = {
  livre: {
    bg: 'bg-[rgba(16,185,129,0.1)] hover:bg-[rgba(16,185,129,0.2)]',
    border: 'border-[rgba(16,185,129,0.3)]',
    cursor: 'cursor-pointer',
    text: 'text-accent-emerald',
  },
  ocupado: {
    bg: 'bg-[rgba(107,114,128,0.15)]',
    border: 'border-[rgba(107,114,128,0.3)]',
    cursor: 'cursor-not-allowed',
    text: 'text-text-muted',
  },
  off: {
    bg: 'bg-[rgba(239,68,68,0.1)] hover:bg-[rgba(239,68,68,0.15)]',
    border: 'border-[rgba(252,165,165,0.4)]',
    cursor: 'cursor-pointer',
    text: 'text-[#f87171]',
  },
};

export default function SeletorHorariosCloser({ vendedorId, valorAtual, onSelect }) {
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [selecionado, setSelecionado] = useState(null);

  useEffect(() => {
    if (!vendedorId) { setDados(null); return; }
    buscar();
  }, [vendedorId]);

  // Sync selecionado com valorAtual externo
  useEffect(() => {
    setSelecionado(valorAtual || null);
  }, [valorAtual]);

  async function buscar() {
    setCarregando(true);
    setErro('');
    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const fim = new Date(hoje);
      fim.setDate(fim.getDate() + 7);

      const params = new URLSearchParams({
        vendedor_id: vendedorId,
        data_inicio: hoje.toISOString(),
        data_fim: fim.toISOString(),
      });
      const { data } = await api.get(`/agenda/disponibilidade?${params}`);
      setDados(data);
    } catch (err) {
      setErro('Não foi possível carregar disponibilidade');
    } finally {
      setCarregando(false);
    }
  }

  function handleSlotClick(dia, slot) {
    if (slot.status === 'ocupado') return;

    if (slot.status === 'off') {
      const ok = window.confirm('Horário marcado como OFF. Deseja escolher mesmo assim?');
      if (!ok) return;
    }

    // Formato datetime-local: "2026-04-14T10:00"
    const valor = `${dia}T${slot.hora}`;
    setSelecionado(valor);
    onSelect(valor, slot.status === 'off');
  }

  function formatDia(dataStr) {
    const d = new Date(dataStr + 'T12:00:00');
    const diaSemana = DIAS_SEMANA[d.getDay()];
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    return { label: `${diaSemana}`, sub: `${dia}/${mes}` };
  }

  if (!vendedorId) return null;

  if (carregando) {
    return (
      <div className="flex items-center gap-2 py-4 text-text-muted text-[12px]">
        <Loader2 size={14} className="animate-spin" /> Carregando disponibilidade...
      </div>
    );
  }

  if (erro) {
    return (
      <div className="text-[12px] text-text-muted py-2">{erro}</div>
    );
  }

  if (!dados) return null;

  const dias = dados.diasDisponibilidade || [];
  if (dias.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
          Disponibilidade de {dados.vendedorNome}
        </span>
        <button
          onClick={buscar}
          className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-[var(--t-hover-bg)] transition-colors"
          title="Atualizar"
        >
          <RefreshCw size={12} />
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border-default">
        <div className="inline-grid min-w-full" style={{ gridTemplateColumns: `48px repeat(${dias.length}, 1fr)` }}>
          {/* Header: vazio + dias */}
          <div className="bg-bg-elevated border-b border-r border-border-subtle p-1" />
          {dias.map(dia => {
            const { label, sub } = formatDia(dia.data);
            return (
              <div key={dia.data} className="bg-bg-elevated border-b border-border-subtle text-center py-1.5 px-1">
                <div className="text-[10px] font-semibold text-text-secondary">{label}</div>
                <div className="text-[9px] text-text-muted">{sub}</div>
              </div>
            );
          })}

          {/* Rows: hora + slots */}
          {dias[0]?.slots.map((_, slotIdx) => {
            const hora = dias[0].slots[slotIdx].hora;
            return [
              <div key={`h-${hora}`} className="bg-bg-elevated border-r border-b border-border-subtle flex items-center justify-center text-[10px] text-text-muted font-medium py-0.5">
                {hora}
              </div>,
              ...dias.map(dia => {
                const slot = dia.slots[slotIdx];
                const style = STATUS_STYLES[slot.status] || STATUS_STYLES.livre;
                const isSelected = selecionado === `${dia.data}T${slot.hora}`;

                return (
                  <div
                    key={`${dia.data}-${slot.hora}`}
                    onClick={() => handleSlotClick(dia.data, slot)}
                    title={
                      slot.status === 'ocupado' ? `Ocupado: ${slot.evento?.titulo || 'Reunião'}` :
                      slot.status === 'off' ? `OFF${slot.evento?.titulo ? `: ${slot.evento.titulo}` : ''}` :
                      'Disponível — clique para selecionar'
                    }
                    className={`
                      border-b border-border-subtle h-7 flex items-center justify-center text-[9px] font-medium transition-all
                      ${style.bg} ${style.cursor} ${style.text}
                      ${isSelected ? 'ring-2 ring-accent-violet ring-inset shadow-[0_0_8px_rgba(124,58,237,0.3)]' : ''}
                    `}
                  >
                    {slot.status === 'ocupado' && '●'}
                    {slot.status === 'off' && '✕'}
                    {isSelected && '✓'}
                  </div>
                );
              }),
            ];
          })}
        </div>
      </div>

      {/* Legenda */}
      <div className="flex gap-3 text-[10px] text-text-muted">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent-emerald" /> Livre</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#6b7280]" /> Ocupado</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#f87171]" /> OFF</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent-violet" /> Selecionado</span>
      </div>
    </div>
  );
}
