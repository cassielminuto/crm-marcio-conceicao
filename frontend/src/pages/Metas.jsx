import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import AvatarVendedor from '../components/AvatarVendedor';
import { Target, Plus, X, CalendarDays, TrendingUp, Award, Flame } from 'lucide-react';

const STATUS_COR = {
  em_andamento: { bg: 'bg-[rgba(116,185,255,0.12)]', text: 'text-accent-info', label: 'Em andamento', ring: '#74b9ff' },
  atingida: { bg: 'bg-[rgba(0,184,148,0.12)]', text: 'text-accent-emerald', label: 'Atingida', ring: '#00b894' },
  nao_atingida: { bg: 'bg-[rgba(225,112,85,0.12)]', text: 'text-accent-danger', label: 'Nao atingida', ring: '#e17055' },
};

/* Large SVG circular progress ring for goal visualization */
function GoalProgressRing({ percentage, size = 100, strokeWidth = 8, status = 'em_andamento' }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedPct = Math.min(percentage, 100);
  const offset = circumference - (clampedPct / 100) * circumference;

  const colors = {
    em_andamento: { start: '#6c5ce7', end: '#00cec9' },
    atingida: { start: '#00b894', end: '#55efc4' },
    nao_atingida: { start: '#e17055', end: '#fdcb6e' },
  };
  const c = colors[status] || colors.em_andamento;
  const gradientId = `goal-grad-${size}-${status}-${Math.random().toString(36).slice(2, 6)}`;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={c.start} />
            <stop offset="100%" stopColor={c.end} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.04)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-[22px] font-black text-white leading-none tabular-nums">
          {clampedPct.toFixed(0)}%
        </span>
        <span className="text-[9px] text-text-muted mt-0.5">atingido</span>
      </div>
    </div>
  );
}

/* Horizontal thick progress bar with gradient fill */
function GoalProgressBar({ percentage, status = 'em_andamento' }) {
  const clampedPct = Math.min(percentage, 100);
  const gradients = {
    em_andamento: 'linear-gradient(90deg, #6c5ce7, #00cec9)',
    atingida: 'linear-gradient(90deg, #00b894, #55efc4)',
    nao_atingida: 'linear-gradient(90deg, #e17055, #fdcb6e)',
  };

  return (
    <div className="w-full h-[8px] bg-white/[0.04] rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-1000 ease-out"
        style={{
          width: `${clampedPct}%`,
          background: gradients[status] || gradients.em_andamento,
        }}
      />
    </div>
  );
}

/* Days remaining calculator */
function diasRestantes(periodo) {
  if (!periodo) return null;
  const [year, month] = periodo.split('-').map(Number);
  const lastDay = new Date(year, month, 0);
  const now = new Date();
  const diff = Math.ceil((lastDay - now) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

export default function Metas() {
  const { usuario } = useAuth();
  const [metas, setMetas] = useState([]);
  const [vendedores, setVendedores] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState({ vendedor_id: '', periodo: '', valor_meta: '' });
  const [salvando, setSalvando] = useState(false);

  const isAdmin = usuario?.perfil === 'admin' || usuario?.perfil === 'gestor';
  const periodoAtual = new Date().toISOString().slice(0, 7);

  const carregar = useCallback(async () => {
    try {
      const [metasRes, vendRes] = await Promise.all([
        api.get(`/metas?periodo=${periodoAtual}`),
        api.get('/vendedores'),
      ]);
      setMetas(metasRes.data);
      setVendedores(vendRes.data);
    } catch (err) {
      console.error('Erro ao carregar metas:', err);
    } finally {
      setCarregando(false);
    }
  }, [periodoAtual]);

  useEffect(() => { carregar(); }, [carregar]);

  const criarMeta = async (e) => {
    e.preventDefault();
    setSalvando(true);
    try {
      await api.post('/metas', {
        vendedor_id: parseInt(form.vendedor_id, 10),
        periodo: form.periodo || periodoAtual,
        valor_meta: parseFloat(form.valor_meta),
      });
      setMostrarForm(false);
      setForm({ vendedor_id: '', periodo: '', valor_meta: '' });
      carregar();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao criar meta');
    } finally {
      setSalvando(false);
    }
  };

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-violet" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-violet/20 to-accent-emerald/20 flex items-center justify-center">
            <Target size={20} className="text-accent-violet-light" />
          </div>
          <div>
            <h1 className="text-[22px] font-bold text-white">Metas</h1>
            <p className="text-[13px] text-text-secondary mt-0.5 flex items-center gap-1.5">
              <CalendarDays size={12} className="text-text-muted" />
              Periodo: {periodoAtual}
            </p>
          </div>
        </div>
        {isAdmin && (
          <button
            onClick={() => setMostrarForm(!mostrarForm)}
            className="flex items-center gap-2 bg-gradient-to-r from-[#6c5ce7] to-[#00cec9] text-white px-4 py-2.5 rounded-[12px] text-[12px] font-semibold hover:shadow-[0_4px_20px_rgba(108,92,231,0.3)] hover:translate-y-[-1px] transition-all duration-250"
          >
            {mostrarForm ? <X size={16} /> : <Plus size={16} />}
            {mostrarForm ? 'Cancelar' : 'Nova Meta'}
          </button>
        )}
      </div>

      {/* Admin form */}
      {mostrarForm && isAdmin && (
        <form
          onSubmit={criarMeta}
          className="bg-bg-card border border-border-subtle rounded-[16px] p-6 space-y-5"
          style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }}
        >
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-lg bg-accent-violet/10 flex items-center justify-center">
              <Plus size={12} className="text-accent-violet-light" />
            </div>
            <h3 className="text-[13px] font-semibold text-white">Criar nova meta</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-text-muted uppercase tracking-wide">Vendedor</label>
              <select
                value={form.vendedor_id}
                onChange={(e) => setForm({ ...form, vendedor_id: e.target.value })}
                className="w-full bg-bg-input border border-border-default rounded-[10px] px-3 py-2.5 text-[12px] text-text-primary focus:outline-none focus:border-[rgba(108,92,231,0.5)] focus:ring-[3px] focus:ring-[rgba(108,92,231,0.08)] transition-all"
                required
              >
                <option value="">Selecionar vendedor</option>
                {vendedores.map((v) => (
                  <option key={v.id} value={v.id}>{v.nomeExibicao}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-text-muted uppercase tracking-wide">Periodo</label>
              <input
                type="month"
                value={form.periodo || periodoAtual}
                onChange={(e) => setForm({ ...form, periodo: e.target.value })}
                className="w-full bg-bg-input border border-border-default rounded-[10px] px-3 py-2.5 text-[12px] text-text-primary focus:outline-none focus:border-[rgba(108,92,231,0.5)] focus:ring-[3px] focus:ring-[rgba(108,92,231,0.08)] transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-text-muted uppercase tracking-wide">Valor da meta (R$)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={form.valor_meta}
                onChange={(e) => setForm({ ...form, valor_meta: e.target.value })}
                className="w-full bg-bg-input border border-border-default rounded-[10px] px-3 py-2.5 text-[12px] text-text-primary placeholder:text-text-faint focus:outline-none focus:border-[rgba(108,92,231,0.5)] focus:ring-[3px] focus:ring-[rgba(108,92,231,0.08)] transition-all"
                required
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={salvando}
              className="bg-gradient-to-r from-accent-emerald to-[#55efc4] text-[#1a1a2e] px-6 py-2.5 rounded-[10px] text-[12px] font-bold hover:shadow-[0_4px_20px_rgba(0,184,148,0.3)] hover:translate-y-[-1px] disabled:opacity-50 transition-all duration-250"
            >
              {salvando ? 'Salvando...' : 'Criar Meta'}
            </button>
          </div>
        </form>
      )}

      {/* Empty state */}
      {metas.length === 0 ? (
        <div className="bg-bg-card border border-border-subtle rounded-[16px] p-16 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-violet/10 to-accent-emerald/10 mb-4">
            <Flame size={28} className="text-accent-violet-light" />
          </div>
          <p className="text-[15px] font-semibold text-white mb-1">Hora de definir as metas!</p>
          <p className="text-[13px] text-text-muted max-w-sm mx-auto">
            Nenhuma meta definida para este periodo. Defina metas para acompanhar a performance do time e manter todos motivados.
          </p>
          {isAdmin && (
            <button
              onClick={() => setMostrarForm(true)}
              className="mt-5 inline-flex items-center gap-2 bg-gradient-to-r from-[#6c5ce7] to-[#00cec9] text-white px-5 py-2.5 rounded-[10px] text-[12px] font-semibold hover:shadow-[0_4px_20px_rgba(108,92,231,0.3)] transition-all"
            >
              <Plus size={14} />
              Criar primeira meta
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {metas.map((meta) => {
            const pct = Number(meta.percentual) || 0;
            const status = STATUS_COR[meta.status] || STATUS_COR.em_andamento;
            const dias = diasRestantes(meta.periodo);

            return (
              <div
                key={meta.id}
                className="bg-bg-card border border-border-subtle rounded-[16px] p-5 hover:border-border-hover transition-all duration-300 group"
                style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.1)' }}
              >
                {/* Top row: avatar, name, status badge */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <AvatarVendedor
                      nome={meta.vendedor?.nomeExibicao}
                      fotoUrl={meta.vendedor?.usuario?.fotoUrl}
                      id={meta.vendedor?.id}
                      tamanho={40}
                    />
                    <div>
                      <p className="font-semibold text-white text-[13px]">{meta.vendedor?.nomeExibicao}</p>
                      <p className="text-[10px] text-text-muted">{meta.vendedor?.papel?.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {dias !== null && dias > 0 && (
                      <span className="text-[10px] text-text-muted flex items-center gap-1">
                        <CalendarDays size={10} />
                        {dias}d restantes
                      </span>
                    )}
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${status.bg} ${status.text}`}>
                      {meta.status === 'atingida' && <Award size={10} className="inline mr-1 -mt-0.5" />}
                      {status.label}
                    </span>
                  </div>
                </div>

                {/* Center: Progress ring + values */}
                <div className="flex items-center gap-5">
                  {/* Circular progress */}
                  <div className="shrink-0">
                    <GoalProgressRing
                      percentage={pct}
                      size={90}
                      strokeWidth={7}
                      status={meta.status || 'em_andamento'}
                    />
                  </div>

                  {/* Values + bar */}
                  <div className="flex-1 min-w-0 space-y-3">
                    {/* Target vs actual */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[9px] text-text-muted uppercase tracking-wide mb-0.5">Atual</p>
                        <p className="text-[16px] font-bold text-white leading-tight tabular-nums">
                          R$ {Number(meta.valorAtual).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] text-text-muted uppercase tracking-wide mb-0.5">Meta</p>
                        <p className="text-[16px] font-bold text-text-secondary leading-tight tabular-nums">
                          R$ {Number(meta.valorMeta).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                        </p>
                      </div>
                    </div>

                    {/* Horizontal bar */}
                    <GoalProgressBar
                      percentage={pct}
                      status={meta.status || 'em_andamento'}
                    />

                    {/* Leads info */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-text-muted tabular-nums">
                        {pct.toFixed(1)}% atingido
                      </span>
                      {meta.leadsMeta && (
                        <span className="text-[10px] text-text-muted flex items-center gap-1 tabular-nums">
                          <TrendingUp size={10} />
                          {meta.leadsAtual}/{meta.leadsMeta} leads
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
