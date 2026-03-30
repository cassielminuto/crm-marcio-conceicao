import { useState, useRef, useEffect, useMemo } from 'react';
import { SlidersHorizontal } from 'lucide-react';

function fmtDate(d) {
  if (!d) return '';
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10);
}

function startOfDay(d) { const r = new Date(d); r.setHours(0,0,0,0); return r; }

const ATALHOS = [
  { label: 'Hoje', get: () => { const d = new Date(); return [startOfDay(d), d]; } },
  { label: 'Esta semana', get: () => { const f = new Date(); const i = new Date(); i.setDate(i.getDate() - i.getDay()); i.setHours(0,0,0,0); return [i, f]; } },
  { label: 'Este mes', get: () => { const n = new Date(); return [new Date(n.getFullYear(), n.getMonth(), 1), n]; } },
  { label: 'Mes passado', get: () => { const n = new Date(); return [new Date(n.getFullYear(), n.getMonth() - 1, 1), new Date(n.getFullYear(), n.getMonth(), 0)]; } },
];

export default function FiltroUnificado({
  dataInicio, setDataInicio,
  dataFim, setDataFim,
  vendedorId, setVendedorId,
  canal, setCanal,
  classe, setClasse,
  produtosExcluidos, setProdutosExcluidos,
  vendedores = [],
  produtosDisponiveis = [],
  onLimpar,
}) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!aberto) return;
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) setAberto(false); }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [aberto]);

  const totalAtivos = useMemo(() => {
    let n = 0;
    if (vendedorId) n++;
    if (canal) n++;
    if (classe) n++;
    if (produtosExcluidos && produtosExcluidos.size > 0) n++;
    return n;
  }, [vendedorId, canal, classe, produtosExcluidos]);

  const aplicarAtalho = (a) => {
    const [i, f] = a.get();
    setDataInicio(i);
    setDataFim(f);
  };

  const inputCls = 'w-full bg-bg-input border border-border-default rounded-lg px-3 py-1.5 text-[12px] text-text-primary focus:outline-none focus:border-[rgba(108,92,231,0.4)]';
  const labelCls = 'text-[10px] font-semibold text-text-muted uppercase tracking-[0.5px] mb-1.5 block';

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setAberto(!aberto)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-bg-card border border-border-default text-[12px] font-semibold text-text-secondary hover:border-border-hover transition-all"
      >
        <SlidersHorizontal size={14} />
        Filtros
        {totalAtivos > 0 && (
          <span className="w-5 h-5 rounded-full bg-accent-violet text-white text-[10px] font-bold flex items-center justify-center">
            {totalAtivos}
          </span>
        )}
      </button>

      {aberto && (
        <div className="absolute right-0 top-12 z-50 w-[380px] max-w-[calc(100vw-2rem)] bg-bg-card border border-border-default rounded-2xl shadow-xl p-5 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-[13px] font-bold text-white flex items-center gap-2">
              <SlidersHorizontal size={14} /> Filtros
            </h3>
            {onLimpar && (
              <button onClick={onLimpar} className="text-[10px] text-accent-violet-light hover:underline">
                Limpar tudo
              </button>
            )}
          </div>

          {/* Periodo */}
          <div>
            <label className={labelCls}>Periodo</label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={fmtDate(dataInicio)}
                onChange={(e) => setDataInicio(e.target.value ? new Date(e.target.value + 'T00:00:00') : dataInicio)}
                className={`flex-1 ${inputCls}`}
              />
              <span className="text-text-muted text-[10px]">ate</span>
              <input
                type="date"
                value={fmtDate(dataFim)}
                onChange={(e) => setDataFim(e.target.value ? new Date(e.target.value + 'T23:59:59') : dataFim)}
                className={`flex-1 ${inputCls}`}
              />
            </div>
            <div className="flex gap-1.5 mt-2">
              {ATALHOS.map(a => (
                <button
                  key={a.label}
                  onClick={() => aplicarAtalho(a)}
                  className="px-2 py-0.5 rounded-md text-[10px] text-text-secondary bg-bg-elevated hover:bg-white/[0.04] transition-colors"
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Vendedor */}
          {setVendedorId && vendedores.length > 0 && (
            <div>
              <label className={labelCls}>Vendedor</label>
              <select value={vendedorId || ''} onChange={(e) => setVendedorId(e.target.value)} className={inputCls}>
                <option value="">Todos os vendedores</option>
                {vendedores.map(v => <option key={v.id} value={v.id}>{v.nomeExibicao}</option>)}
              </select>
            </div>
          )}

          {/* Canal */}
          {setCanal && (
            <div>
              <label className={labelCls}>Canal</label>
              <div className="flex gap-2">
                {[{ v: '', l: 'Todos' }, { v: 'bio', l: 'Bio' }, { v: 'anuncio', l: 'Anuncio' }, { v: 'evento', l: 'Evento' }].map(c => (
                  <button
                    key={c.v}
                    onClick={() => setCanal(c.v)}
                    className={`px-3 py-1 rounded-lg text-[11px] font-medium transition-all ${
                      (canal || '') === c.v ? 'bg-accent-violet text-white' : 'bg-bg-elevated text-text-secondary hover:bg-white/[0.04]'
                    }`}
                  >
                    {c.l}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Classe */}
          {setClasse && (
            <div>
              <label className={labelCls}>Classe</label>
              <div className="flex gap-2">
                {[{ v: '', l: 'Todas' }, { v: 'A', l: 'A' }, { v: 'B', l: 'B' }, { v: 'C', l: 'C' }].map(c => (
                  <button
                    key={c.v}
                    onClick={() => setClasse(c.v)}
                    className={`px-3 py-1 rounded-lg text-[11px] font-medium transition-all ${
                      (classe || '') === c.v ? 'bg-accent-violet text-white' : 'bg-bg-elevated text-text-secondary hover:bg-white/[0.04]'
                    }`}
                  >
                    {c.l}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Produtos */}
          {setProdutosExcluidos && produtosDisponiveis.length > 0 && (
            <div>
              <label className={labelCls}>
                Produtos{' '}
                {produtosExcluidos && produtosExcluidos.size > 0 && (
                  <span className="text-accent-danger">({produtosExcluidos.size} excluido{produtosExcluidos.size > 1 ? 's' : ''})</span>
                )}
              </label>
              <div className="max-h-[150px] overflow-y-auto space-y-0.5 bg-bg-elevated rounded-lg p-2">
                {produtosDisponiveis.map(produto => {
                  const excl = produtosExcluidos && produtosExcluidos.has(produto);
                  return (
                    <label key={produto} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-white/[0.02] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!excl}
                        onChange={() => {
                          const novo = new Set(produtosExcluidos || []);
                          novo.has(produto) ? novo.delete(produto) : novo.add(produto);
                          setProdutosExcluidos(novo);
                        }}
                        className="rounded border-border-default"
                      />
                      <span className={`text-[11px] truncate ${excl ? 'text-text-muted line-through' : 'text-text-primary'}`}>
                        {produto}
                      </span>
                    </label>
                  );
                })}
              </div>
              <div className="flex gap-2 mt-1.5">
                <button onClick={() => setProdutosExcluidos(new Set())} className="text-[10px] text-accent-violet-light hover:underline">Marcar todos</button>
                <button onClick={() => setProdutosExcluidos(new Set(produtosDisponiveis))} className="text-[10px] text-text-muted hover:underline">Desmarcar todos</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
