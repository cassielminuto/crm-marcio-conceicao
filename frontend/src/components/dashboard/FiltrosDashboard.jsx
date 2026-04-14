import { useState } from 'react';
import { Calendar, ChevronDown, Filter } from 'lucide-react';

const PRESETS = [
  { label: 'Hoje', key: 'hoje' },
  { label: 'Ontem', key: 'ontem' },
  { label: 'Últimos 7d', key: '7d' },
  { label: 'Últimos 30d', key: '30d' },
  { label: 'Este mês', key: 'este-mes' },
  { label: 'Mês passado', key: 'mes-passado' },
  { label: 'Customizado', key: 'customizado' },
];

const CANAIS = ['Todos', 'Instagram (bio)', 'Anúncio', 'Evento'];

function computeDates(key) {
  const today = new Date();
  const fmt = (d) => d.toISOString().slice(0, 10);

  switch (key) {
    case 'hoje':
      return { dataInicio: fmt(today), dataFim: fmt(today) };
    case 'ontem': {
      const ontem = new Date(today);
      ontem.setDate(ontem.getDate() - 1);
      return { dataInicio: fmt(ontem), dataFim: fmt(ontem) };
    }
    case '7d': {
      const inicio = new Date(today);
      inicio.setDate(inicio.getDate() - 6);
      return { dataInicio: fmt(inicio), dataFim: fmt(today) };
    }
    case '30d': {
      const inicio = new Date(today);
      inicio.setDate(inicio.getDate() - 29);
      return { dataInicio: fmt(inicio), dataFim: fmt(today) };
    }
    case 'este-mes': {
      const inicio = new Date(today.getFullYear(), today.getMonth(), 1);
      return { dataInicio: fmt(inicio), dataFim: fmt(today) };
    }
    case 'mes-passado': {
      const inicio = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const fim = new Date(today.getFullYear(), today.getMonth(), 0);
      return { dataInicio: fmt(inicio), dataFim: fmt(fim) };
    }
    default:
      return {};
  }
}

export default function FiltrosDashboard({ filtros, setFiltros, vendedores }) {
  const [presetAtivo, setPresetAtivo] = useState('30d');

  function handlePreset(key) {
    setPresetAtivo(key);
    if (key !== 'customizado') {
      const { dataInicio, dataFim } = computeDates(key);
      setFiltros((prev) => ({ ...prev, dataInicio, dataFim }));
    }
  }

  function handleChange(field, value) {
    setFiltros((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <div className="bg-bg-card border border-border-default rounded-[14px] p-6">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-4 h-4 text-text-muted" />
        <span className="text-[11px] uppercase tracking-[1.5px] text-text-muted font-semibold">
          Filtros
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Period presets */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Calendar className="w-4 h-4 text-text-muted mr-1" />
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => handlePreset(p.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                presetAtivo === p.key
                  ? 'bg-accent-violet text-white'
                  : 'bg-bg-card text-text-muted hover:text-text-primary hover:bg-bg-card-hover border border-border-default'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom date inputs */}
        {presetAtivo === 'customizado' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filtros.dataInicio || ''}
              onChange={(e) => handleChange('dataInicio', e.target.value)}
              className="px-3 py-1.5 rounded-lg text-xs bg-bg-card border border-border-default text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-violet"
            />
            <span className="text-text-muted text-xs">a</span>
            <input
              type="date"
              value={filtros.dataFim || ''}
              onChange={(e) => handleChange('dataFim', e.target.value)}
              className="px-3 py-1.5 rounded-lg text-xs bg-bg-card border border-border-default text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-violet"
            />
          </div>
        )}

        {/* Vendedor dropdown */}
        <div className="relative">
          <select
            value={filtros.vendedorId || ''}
            onChange={(e) => handleChange('vendedorId', e.target.value)}
            className="appearance-none px-3 py-1.5 pr-8 rounded-lg text-xs bg-bg-card border border-border-default text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-violet cursor-pointer"
          >
            <option value="">Todos vendedores</option>
            {(vendedores || []).map((v) => (
              <option key={v.id} value={v.id}>
                {v.nomeExibicao || v.nome}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-text-muted absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Canal dropdown */}
        <div className="relative">
          <select
            value={filtros.canal || 'Todos'}
            onChange={(e) =>
              handleChange('canal', e.target.value === 'Todos' ? '' : e.target.value)
            }
            className="appearance-none px-3 py-1.5 pr-8 rounded-lg text-xs bg-bg-card border border-border-default text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-violet cursor-pointer"
          >
            {CANAIS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-text-muted absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Compare toggle */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <div
            className={`relative w-9 h-5 rounded-full transition-colors ${
              filtros.comparar ? 'bg-accent-violet' : 'bg-border-default'
            }`}
            onClick={() => handleChange('comparar', !filtros.comparar)}
          >
            <div
              className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                filtros.comparar ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </div>
          <span className="text-xs text-text-muted">Comparar período anterior</span>
        </label>
      </div>
    </div>
  );
}
