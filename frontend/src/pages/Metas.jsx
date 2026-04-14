import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import AvatarVendedor from '../components/AvatarVendedor';
import { Target, Plus, X, CalendarDays, TrendingUp, Award, Flame, Loader2, Building2, Users, ArrowRight, AlertTriangle } from 'lucide-react';

const STATUS_COR = {
  em_andamento: { bg: 'bg-[rgba(116,185,255,0.12)]', text: 'text-accent-info', label: 'Em andamento', ring: '#74b9ff' },
  atingida: { bg: 'bg-[rgba(0,184,148,0.12)]', text: 'text-accent-emerald', label: 'Atingida', ring: '#00b894' },
  nao_atingida: { bg: 'bg-[rgba(225,112,85,0.12)]', text: 'text-accent-danger', label: 'Nao atingida', ring: '#e17055' },
};

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
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(128,128,128,0.1)" strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={`url(#${gradientId})`} strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className="transition-all duration-1000 ease-out" />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-[22px] font-black text-text-primary leading-none tabular-nums">{clampedPct.toFixed(0)}%</span>
        <span className="text-[9px] text-text-muted mt-0.5">atingido</span>
      </div>
    </div>
  );
}

function GoalProgressBar({ percentage, status = 'em_andamento' }) {
  const clampedPct = Math.min(percentage, 100);
  const gradients = {
    em_andamento: 'linear-gradient(90deg, #6c5ce7, #00cec9)',
    atingida: 'linear-gradient(90deg, #00b894, #55efc4)',
    nao_atingida: 'linear-gradient(90deg, #e17055, #fdcb6e)',
  };
  return (
    <div className="w-full h-[8px] bg-bg-elevated rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${clampedPct}%`, background: gradients[status] || gradients.em_andamento }} />
    </div>
  );
}

function diasRestantes(periodo) {
  if (!periodo) return null;
  const [year, month] = periodo.split('-').map(Number);
  const lastDay = new Date(year, month, 0);
  const now = new Date();
  return Math.max(0, Math.ceil((lastDay - now) / 86400000));
}

function formatarReais(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// ─────────────────────────────────────────────
// Modal: Definir Meta Empresa
// ─────────────────────────────────────────────
function ModalMetaEmpresa({ periodoAtual, metaExistente, onClose, onSaved }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    periodo: metaExistente?.periodo || periodoAtual,
    valor_meta: metaExistente ? Number(metaExistente.valorMeta) : '',
    observacao: metaExistente?.observacao || '',
  });
  const [salvando, setSalvando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.valor_meta) return;
    setSalvando(true);
    try {
      await api.post('/metas/empresa', {
        periodo: form.periodo,
        valor_meta: parseFloat(form.valor_meta),
        observacao: form.observacao || null,
      });
      onSaved();
      onClose();
    } catch (err) {
      toast(err.response?.data?.error || 'Erro ao salvar meta empresa', 'urgente');
    } finally {
      setSalvando(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-start justify-center p-4 overflow-y-auto" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="w-full max-w-md my-8 bg-bg-card rounded-2xl border border-border-subtle shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
          <h2 className="text-[15px] font-bold text-text-primary">{metaExistente ? 'Editar' : 'Definir'} Meta da Empresa</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="text-[11px] font-medium text-text-muted mb-1 block">Período *</label>
            <input type="month" value={form.periodo} onChange={e => setForm(f => ({ ...f, periodo: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-bg-elevated border border-border-subtle text-[13px] text-text-primary focus:outline-none focus:border-accent-violet" required />
          </div>
          <div>
            <label className="text-[11px] font-medium text-text-muted mb-1 block">Meta de faturamento (R$) *</label>
            <input type="number" step="0.01" value={form.valor_meta} onChange={e => setForm(f => ({ ...f, valor_meta: e.target.value }))} placeholder="100000" className="w-full px-3 py-2 rounded-lg bg-bg-elevated border border-border-subtle text-[13px] text-text-primary focus:outline-none focus:border-accent-violet" required autoFocus />
          </div>
          <div>
            <label className="text-[11px] font-medium text-text-muted mb-1 block">Observação</label>
            <textarea value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} rows={2} className="w-full px-3 py-2 rounded-lg bg-bg-elevated border border-border-subtle text-[13px] text-text-primary resize-none focus:outline-none focus:border-accent-violet" placeholder="Ex: meta agressiva pra abril..." />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-[13px] font-medium text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors">Cancelar</button>
            <button type="submit" disabled={salvando} className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold bg-accent-violet text-white hover:bg-accent-violet/90 transition-colors disabled:opacity-50">
              {salvando ? <Loader2 size={14} className="animate-spin" /> : <Building2 size={14} />}
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

// ─────────────────────────────────────────────
// Modal: Distribuir Meta entre Vendedores
// ─────────────────────────────────────────────
function ModalDistribuir({ periodo, metaEmpresaValor, vendedores, metasExistentes, onClose, onSaved }) {
  const { toast } = useToast();
  // Inicializar com valores existentes
  const [dist, setDist] = useState(() => {
    return vendedores.map(v => {
      const existente = metasExistentes.find(m => m.vendedorId === v.id);
      return { vendedorId: v.id, nome: v.nomeExibicao, valorMeta: existente ? Number(existente.valorMeta) : 0 };
    });
  });
  const [salvando, setSalvando] = useState(false);

  const somaTotal = dist.reduce((s, d) => s + (Number(d.valorMeta) || 0), 0);
  const gap = metaEmpresaValor - somaTotal;
  const excede = somaTotal > metaEmpresaValor;

  function handleChange(vendedorId, valor) {
    setDist(d => d.map(item => item.vendedorId === vendedorId ? { ...item, valorMeta: valor } : item));
  }

  async function handleSubmit() {
    if (excede) { toast('Soma distribuída excede meta empresa', 'aviso'); return; }
    const validos = dist.filter(d => d.valorMeta > 0);
    if (validos.length === 0) { toast('Distribua valor para pelo menos 1 vendedor', 'aviso'); return; }
    setSalvando(true);
    try {
      await api.post('/metas/distribuir', {
        periodo,
        distribuicao: validos.map(d => ({ vendedorId: d.vendedorId, valorMeta: Number(d.valorMeta) })),
      });
      onSaved();
      onClose();
    } catch (err) {
      toast(err.response?.data?.error || 'Erro ao distribuir metas', 'urgente');
    } finally {
      setSalvando(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-start justify-center p-4 overflow-y-auto" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="w-full max-w-lg my-8 bg-bg-card rounded-2xl border border-border-subtle shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
          <h2 className="text-[15px] font-bold text-text-primary">Distribuir Meta — {periodo}</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"><X size={18} /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Summary bar */}
          <div className="bg-bg-elevated rounded-xl p-4 border border-border-subtle">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-text-muted">Distribuído: R$ {formatarReais(somaTotal)}</span>
              <span className="text-[11px] text-text-muted">Meta empresa: R$ {formatarReais(metaEmpresaValor)}</span>
            </div>
            <GoalProgressBar percentage={metaEmpresaValor > 0 ? (somaTotal / metaEmpresaValor) * 100 : 0} status={excede ? 'nao_atingida' : 'em_andamento'} />
            {gap > 0 && !excede && (
              <p className="text-[11px] text-text-muted mt-2 flex items-center gap-1">
                <AlertTriangle size={11} className="text-accent-amber" />
                Gap não distribuído: R$ {formatarReais(gap)}
              </p>
            )}
            {excede && (
              <p className="text-[11px] text-accent-danger mt-2 flex items-center gap-1">
                <AlertTriangle size={11} />
                Soma excede meta empresa em R$ {formatarReais(somaTotal - metaEmpresaValor)}
              </p>
            )}
          </div>

          {/* Vendedor list */}
          <div className="space-y-3">
            {dist.map(d => (
              <div key={d.vendedorId} className="flex items-center gap-3">
                <span className="text-[13px] text-text-primary w-32 truncate">{d.nome}</span>
                <div className="flex-1">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-text-muted">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={d.valorMeta || ''}
                      onChange={e => handleChange(d.vendedorId, e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-lg bg-bg-elevated border border-border-subtle text-[13px] text-text-primary focus:outline-none focus:border-accent-violet"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border-subtle">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-[13px] font-medium text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors">Cancelar</button>
          <button onClick={handleSubmit} disabled={salvando || excede} className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold bg-accent-emerald text-white hover:bg-accent-emerald/90 transition-colors disabled:opacity-50">
            {salvando ? <Loader2 size={14} className="animate-spin" /> : <Users size={14} />}
            Distribuir
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─────────────────────────────────────────────
// Main: Metas
// ─────────────────────────────────────────────
export default function Metas() {
  const { usuario } = useAuth();
  const [metas, setMetas] = useState([]);
  const [vendedores, setVendedores] = useState([]);
  const [empresaData, setEmpresaData] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [showModalEmpresa, setShowModalEmpresa] = useState(false);
  const [showModalDistribuir, setShowModalDistribuir] = useState(false);

  const isAdmin = usuario?.perfil === 'admin' || usuario?.perfil === 'gestor';
  const periodoAtual = new Date().toISOString().slice(0, 7);

  const carregar = useCallback(async () => {
    try {
      const [metasRes, vendRes, empresaRes] = await Promise.all([
        api.get(`/metas?periodo=${periodoAtual}`),
        api.get('/vendedores'),
        api.get(`/metas/empresa?periodo=${periodoAtual}`),
      ]);
      setMetas(metasRes.data);
      setVendedores(Array.isArray(vendRes.data) ? vendRes.data : vendRes.data.vendedores || []);
      setEmpresaData(empresaRes.data);
    } catch (err) {
      console.error('Erro ao carregar metas:', err);
    } finally {
      setCarregando(false);
    }
  }, [periodoAtual]);

  useEffect(() => { carregar(); }, [carregar]);

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-accent-violet" />
      </div>
    );
  }

  const metaEmpresa = empresaData?.metaEmpresa;
  const dias = diasRestantes(periodoAtual);

  // Filtrar closers ativos pro modal de distribuição (não SDR, não trainee)
  const closersAtivos = vendedores.filter(v => v.ativo && v.papel !== 'sdr' && v.papel !== 'trainee');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-violet/20 to-accent-emerald/20 flex items-center justify-center">
            <Target size={20} className="text-accent-violet-light" />
          </div>
          <div>
            <h1 className="text-[22px] font-bold text-text-primary">Metas</h1>
            <p className="text-[13px] text-text-secondary mt-0.5 flex items-center gap-1.5">
              <CalendarDays size={12} className="text-text-muted" />
              Período: {periodoAtual}
              {dias !== null && dias > 0 && <span className="text-text-muted">• {dias}d restantes</span>}
            </p>
          </div>
        </div>
      </div>

      {/* Meta Empresa Card */}
      {metaEmpresa ? (
        <div className="bg-bg-card border border-border-subtle rounded-[16px] p-6" style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Building2 size={16} className="text-accent-violet-light" />
              <h2 className="text-[14px] font-bold text-text-primary">Meta da Empresa — {metaEmpresa.periodo}</h2>
            </div>
            {isAdmin && (
              <div className="flex items-center gap-2">
                <button onClick={() => setShowModalEmpresa(true)} className="px-3 py-1.5 rounded-lg text-[11px] font-medium text-text-muted hover:text-text-primary hover:bg-bg-elevated border border-border-subtle transition-colors">
                  Editar
                </button>
                <button onClick={() => setShowModalDistribuir(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-accent-violet text-white hover:bg-accent-violet/90 transition-colors">
                  <Users size={12} />
                  Distribuir
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-6">
            <div className="shrink-0">
              <GoalProgressRing
                percentage={empresaData.percentualEmpresa || 0}
                size={110}
                strokeWidth={9}
                status={empresaData.percentualEmpresa >= 100 ? 'atingida' : 'em_andamento'}
              />
            </div>

            <div className="flex-1 space-y-3">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-[9px] text-text-muted uppercase tracking-wide mb-0.5">Meta</p>
                  <p className="text-[18px] font-bold text-text-secondary tabular-nums">R$ {formatarReais(metaEmpresa.valorMeta)}</p>
                </div>
                <div>
                  <p className="text-[9px] text-text-muted uppercase tracking-wide mb-0.5">Realizado</p>
                  <p className="text-[18px] font-bold text-text-primary tabular-nums">R$ {formatarReais(empresaData.realizadoEmpresa)}</p>
                </div>
                <div>
                  <p className="text-[9px] text-text-muted uppercase tracking-wide mb-0.5">Distribuído</p>
                  <p className="text-[18px] font-bold text-text-secondary tabular-nums">R$ {formatarReais(empresaData.somaDistribuida)}</p>
                </div>
              </div>

              <GoalProgressBar percentage={empresaData.percentualEmpresa || 0} status={empresaData.percentualEmpresa >= 100 ? 'atingida' : 'em_andamento'} />

              <div className="flex items-center justify-between">
                <span className="text-[10px] text-text-muted tabular-nums">{(empresaData.percentualEmpresa || 0).toFixed(1)}% atingido</span>
                {empresaData.gapDistribuicao > 0 && (
                  <span className="text-[10px] text-accent-amber flex items-center gap-1">
                    <AlertTriangle size={10} />
                    Gap: R$ {formatarReais(empresaData.gapDistribuicao)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {metaEmpresa.observacao && (
            <p className="text-[11px] text-text-muted mt-4 pt-3 border-t border-border-subtle italic">{metaEmpresa.observacao}</p>
          )}
        </div>
      ) : (
        /* Empty state: sem meta empresa */
        <div className="bg-bg-card border border-border-subtle rounded-[16px] p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-violet/10 to-accent-emerald/10 mb-4">
            <Building2 size={28} className="text-accent-violet-light" />
          </div>
          <p className="text-[15px] font-semibold text-text-primary mb-1">Sem meta empresa este mês</p>
          <p className="text-[13px] text-text-muted max-w-sm mx-auto">
            Defina a meta de faturamento da empresa para {periodoAtual} e depois distribua entre os vendedores.
          </p>
          {isAdmin && (
            <button onClick={() => setShowModalEmpresa(true)} className="mt-5 inline-flex items-center gap-2 bg-gradient-to-r from-[#6c5ce7] to-[#00cec9] text-white px-5 py-2.5 rounded-[10px] text-[12px] font-semibold hover:shadow-[0_4px_20px_rgba(108,92,231,0.3)] transition-all">
              <Plus size={14} />
              Definir Meta da Empresa
            </button>
          )}
        </div>
      )}

      {/* Metas individuais por vendedor */}
      {metas.length > 0 && (
        <>
          <div className="flex items-center gap-2">
            <Users size={14} className="text-text-muted" />
            <h2 className="text-[13px] font-semibold text-text-secondary">Metas por Vendedor</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {metas.map((meta) => {
              const pct = Number(meta.percentual) || 0;
              const status = STATUS_COR[meta.status] || STATUS_COR.em_andamento;

              return (
                <div key={meta.id} className="bg-bg-card border border-border-subtle rounded-[16px] p-5 hover:border-border-hover transition-all duration-300" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.1)' }}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <AvatarVendedor nome={meta.vendedor?.nomeExibicao} fotoUrl={meta.vendedor?.usuario?.fotoUrl} id={meta.vendedor?.id} tamanho={40} />
                      <div>
                        <p className="font-semibold text-text-primary text-[13px]">{meta.vendedor?.nomeExibicao}</p>
                        <p className="text-[10px] text-text-muted">{meta.vendedor?.papel?.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${status.bg} ${status.text}`}>
                      {meta.status === 'atingida' && <Award size={10} className="inline mr-1 -mt-0.5" />}
                      {status.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-5">
                    <div className="shrink-0">
                      <GoalProgressRing percentage={pct} size={90} strokeWidth={7} status={meta.status || 'em_andamento'} />
                    </div>

                    <div className="flex-1 min-w-0 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[9px] text-text-muted uppercase tracking-wide mb-0.5">Atual</p>
                          <p className="text-[16px] font-bold text-text-primary leading-tight tabular-nums">R$ {formatarReais(meta.valorAtual)}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-text-muted uppercase tracking-wide mb-0.5">Meta</p>
                          <p className="text-[16px] font-bold text-text-secondary leading-tight tabular-nums">R$ {formatarReais(meta.valorMeta)}</p>
                        </div>
                      </div>

                      <GoalProgressBar percentage={pct} status={meta.status || 'em_andamento'} />

                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-text-muted tabular-nums">{pct.toFixed(1)}% atingido</span>
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
        </>
      )}

      {/* Empty: tem meta empresa mas sem distribuição */}
      {metaEmpresa && metas.length === 0 && (
        <div className="bg-bg-card border border-border-subtle rounded-[16px] p-10 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-accent-violet/10 mb-3">
            <ArrowRight size={20} className="text-accent-violet-light" />
          </div>
          <p className="text-[14px] font-semibold text-text-primary mb-1">Meta empresa definida!</p>
          <p className="text-[13px] text-text-muted">Agora distribua entre os vendedores para acompanhar o progresso individual.</p>
          {isAdmin && (
            <button onClick={() => setShowModalDistribuir(true)} className="mt-4 inline-flex items-center gap-2 bg-accent-violet text-white px-4 py-2 rounded-[10px] text-[12px] font-semibold hover:bg-accent-violet/90 transition-colors">
              <Users size={14} />
              Distribuir entre Vendedores
            </button>
          )}
        </div>
      )}

      {/* Modais */}
      {showModalEmpresa && (
        <ModalMetaEmpresa
          periodoAtual={periodoAtual}
          metaExistente={metaEmpresa}
          onClose={() => setShowModalEmpresa(false)}
          onSaved={carregar}
        />
      )}

      {showModalDistribuir && (
        <ModalDistribuir
          periodo={periodoAtual}
          metaEmpresaValor={Number(metaEmpresa?.valorMeta || 0)}
          vendedores={closersAtivos}
          metasExistentes={metas}
          onClose={() => setShowModalDistribuir(false)}
          onSaved={carregar}
        />
      )}
    </div>
  );
}
