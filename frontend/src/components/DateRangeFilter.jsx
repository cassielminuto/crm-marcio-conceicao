import { useState, useMemo } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';

function startOfDay(d) { const r = new Date(d); r.setHours(0,0,0,0); return r; }
function endOfDay(d) { const r = new Date(d); r.setHours(23,59,59,999); return r; }

const PRESETS = [
  { label: 'Hoje', getValue: () => { const d = new Date(); return { inicio: startOfDay(d), fim: endOfDay(d) }; } },
  { label: 'Ultimos 7 dias', getValue: () => { const f = new Date(); const i = new Date(); i.setDate(i.getDate() - 7); return { inicio: startOfDay(i), fim: endOfDay(f) }; } },
  { label: 'Este mes', getValue: () => { const n = new Date(); return { inicio: new Date(n.getFullYear(), n.getMonth(), 1), fim: endOfDay(n) }; } },
  { label: 'Mes passado', getValue: () => { const n = new Date(); return { inicio: new Date(n.getFullYear(), n.getMonth() - 1, 1), fim: new Date(n.getFullYear(), n.getMonth(), 0, 23, 59, 59) }; } },
  { label: 'Ultimos 90 dias', getValue: () => { const f = new Date(); const i = new Date(); i.setDate(i.getDate() - 90); return { inicio: startOfDay(i), fim: endOfDay(f) }; } },
  { label: 'Este ano', getValue: () => { const n = new Date(); return { inicio: new Date(n.getFullYear(), 0, 1), fim: endOfDay(n) }; } },
];

function formatDate(d) {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export default function DateRangeFilter({ dataInicio, dataFim, onChange }) {
  const [aberto, setAberto] = useState(false);
  const [customInicio, setCustomInicio] = useState('');
  const [customFim, setCustomFim] = useState('');

  const presetAtivo = useMemo(() => {
    return PRESETS.find(p => {
      const v = p.getValue();
      return v.inicio.toDateString() === dataInicio.toDateString() &&
             v.fim.toDateString() === dataFim.toDateString();
    })?.label || 'Personalizado';
  }, [dataInicio, dataFim]);

  return (
    <div className="relative">
      <button
        onClick={() => setAberto(!aberto)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-bg-card border border-border-default hover:border-border-hover text-[12px] font-medium text-text-secondary hover:text-text-primary transition-all"
      >
        <Calendar size={14} className="text-text-muted" />
        <span>{formatDate(dataInicio)} — {formatDate(dataFim)}</span>
        <span className="text-[10px] text-accent-violet-light font-semibold">{presetAtivo}</span>
        <ChevronDown size={12} className="text-text-muted" />
      </button>

      {aberto && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAberto(false)} />
          <div className="absolute top-full mt-2 right-0 z-50 bg-bg-card border border-border-default rounded-xl shadow-2xl p-3 w-[280px] animate-fade-in">
            <div className="space-y-1 mb-3">
              {PRESETS.map(p => (
                <button
                  key={p.label}
                  onClick={() => {
                    const v = p.getValue();
                    onChange(v.inicio, v.fim);
                    setAberto(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-[12px] font-medium transition-all ${
                    p.label === presetAtivo
                      ? 'bg-[rgba(108,92,231,0.1)] text-accent-violet-light'
                      : 'text-text-secondary hover:bg-white/[0.03] hover:text-text-primary'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="border-t border-border-subtle pt-3">
              <p className="text-[10px] text-text-muted font-semibold uppercase tracking-wider mb-2">Personalizado</p>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={customInicio}
                  onChange={(e) => setCustomInicio(e.target.value)}
                  className="flex-1 px-2 py-1.5 rounded-lg bg-bg-input border border-border-default text-text-primary text-[11px] outline-none focus:border-[rgba(108,92,231,0.4)]"
                />
                <input
                  type="date"
                  value={customFim}
                  onChange={(e) => setCustomFim(e.target.value)}
                  className="flex-1 px-2 py-1.5 rounded-lg bg-bg-input border border-border-default text-text-primary text-[11px] outline-none focus:border-[rgba(108,92,231,0.4)]"
                />
              </div>
              <button
                onClick={() => {
                  if (customInicio && customFim) {
                    onChange(new Date(customInicio + 'T00:00:00'), new Date(customFim + 'T23:59:59'));
                    setAberto(false);
                  }
                }}
                disabled={!customInicio || !customFim}
                className="w-full mt-2 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white bg-gradient-to-r from-[#6c5ce7] to-[#00cec9] disabled:opacity-30 transition-all"
              >
                Aplicar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
