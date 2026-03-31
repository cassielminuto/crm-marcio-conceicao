import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  align = 'right',
}) {
  const [aberto, setAberto] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const panelRef = useRef(null);

  const calcPos = useCallback(() => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const pw = 380;
    let left;
    if (align === 'left') {
      left = r.left;
      if (left + pw > window.innerWidth - 16) left = window.innerWidth - pw - 16;
    } else {
      left = r.right - pw;
      if (left < 16) left = 16;
    }
    setPos({ top: r.bottom + 8, left });
  }, [align]);

  const toggle = useCallback(() => {
    if (aberto) { setAberto(false); return; }
    calcPos();
    setAberto(true);
  }, [aberto, calcPos]);

  useEffect(() => {
    if (!aberto) return;
    function onClick(e) {
      if (btnRef.current?.contains(e.target) || panelRef.current?.contains(e.target)) return;
      setAberto(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [aberto]);

  // Reposition on scroll/resize while open
  useEffect(() => {
    if (!aberto) return;
    const update = () => calcPos();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => { window.removeEventListener('scroll', update, true); window.removeEventListener('resize', update); };
  }, [aberto, calcPos]);

  const totalAtivos = useMemo(() => {
    let n = 0;
    if (vendedorId) n++;
    if (canal) n++;
    if (classe) n++;
    if (produtosExcluidos && produtosExcluidos.size > 0) n++;
    return n;
  }, [vendedorId, canal, classe, produtosExcluidos]);

  const aplicarAtalho = (a) => { const [i, f] = a.get(); setDataInicio(i); setDataFim(f); };

  const inputCls = 'w-full bg-bg-input border border-border-default rounded-[10px] px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:border-accent-violet focus:ring-[3px] focus:ring-[rgba(124,58,237,0.15)]';
  const labelCls = 'text-[11px] font-medium text-accent-violet uppercase tracking-[1.5px] mb-1.5 block';

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        className="flex items-center gap-2 px-4 py-2 rounded-[10px] bg-bg-card border border-border-default text-[13px] font-medium text-text-secondary hover:border-border-hover transition-all"
      >
        <SlidersHorizontal size={14} />
        Filtros
        {totalAtivos > 0 && (
          <span className="w-5 h-5 rounded-full bg-[#7C3AED] text-white text-[10px] font-bold flex items-center justify-center">{totalAtivos}</span>
        )}
      </button>

      {aberto && createPortal(
        <div
          ref={panelRef}
          className="fixed z-[9999] w-[380px] bg-bg-elevated border border-border-hover rounded-[18px] shadow-[var(--t-shadow-elevated)] p-5 space-y-5 animate-fade-in overflow-y-auto"
          style={{ top: pos.top, left: pos.left, maxHeight: 'calc(100vh - 200px)' }}
        >
          <div className="flex items-center justify-between">
            <h3 className="font-display text-[14px] font-semibold text-text-primary flex items-center gap-2">
              <SlidersHorizontal size={14} /> Filtros
            </h3>
            {onLimpar && (
              <button onClick={onLimpar} className="text-[10px] text-accent-violet-light hover:underline">Limpar tudo</button>
            )}
          </div>

          <div>
            <label className={labelCls}>Periodo</label>
            <div className="flex items-center gap-2">
              <input type="date" value={fmtDate(dataInicio)} onChange={(e) => setDataInicio(e.target.value ? new Date(e.target.value + 'T00:00:00') : dataInicio)} className={`flex-1 ${inputCls}`} />
              <span className="text-text-muted text-[10px]">ate</span>
              <input type="date" value={fmtDate(dataFim)} onChange={(e) => setDataFim(e.target.value ? new Date(e.target.value + 'T23:59:59') : dataFim)} className={`flex-1 ${inputCls}`} />
            </div>
            <div className="flex gap-1.5 mt-2">
              {ATALHOS.map(a => (
                <button key={a.label} onClick={() => aplicarAtalho(a)} className="px-2.5 py-1 rounded-full text-[10px] text-text-secondary bg-bg-card-hover hover:bg-border-hover transition-colors">{a.label}</button>
              ))}
            </div>
          </div>

          {setVendedorId && vendedores.length > 0 && (
            <div>
              <label className={labelCls}>Vendedor</label>
              <select value={vendedorId || ''} onChange={(e) => setVendedorId(e.target.value)} className={inputCls}>
                <option value="">Todos os vendedores</option>
                {vendedores.map(v => <option key={v.id} value={v.id}>{v.nomeExibicao}</option>)}
              </select>
            </div>
          )}

          {setCanal && (
            <div>
              <label className={labelCls}>Canal</label>
              <div className="flex gap-2">
                {[{ v: '', l: 'Todos' }, { v: 'bio', l: 'Bio' }, { v: 'anuncio', l: 'Anuncio' }, { v: 'evento', l: 'Evento' }].map(c => (
                  <button key={c.v} onClick={() => setCanal(c.v)} className={`px-3 py-1 rounded-lg text-[11px] font-medium transition-all ${(canal || '') === c.v ? 'bg-[#7C3AED] text-white' : 'bg-bg-card-hover text-text-secondary hover:bg-border-hover'}`}>{c.l}</button>
                ))}
              </div>
            </div>
          )}

          {setClasse && (
            <div>
              <label className={labelCls}>Classe</label>
              <div className="flex gap-2">
                {[{ v: '', l: 'Todas' }, { v: 'A', l: 'A' }, { v: 'B', l: 'B' }, { v: 'C', l: 'C' }].map(c => (
                  <button key={c.v} onClick={() => setClasse(c.v)} className={`px-3 py-1 rounded-lg text-[11px] font-medium transition-all ${(classe || '') === c.v ? 'bg-[#7C3AED] text-white' : 'bg-bg-card-hover text-text-secondary hover:bg-border-hover'}`}>{c.l}</button>
                ))}
              </div>
            </div>
          )}

          {setProdutosExcluidos && produtosDisponiveis.length > 0 && (
            <div>
              <label className={labelCls}>
                Produtos{' '}
                {produtosExcluidos && produtosExcluidos.size > 0 && (
                  <span className="text-accent-danger">({produtosExcluidos.size} excluido{produtosExcluidos.size > 1 ? 's' : ''})</span>
                )}
              </label>
              <div className="max-h-[150px] overflow-y-auto space-y-0.5 bg-bg-input rounded-[10px] p-2">
                {produtosDisponiveis.map(produto => {
                  const excl = produtosExcluidos && produtosExcluidos.has(produto);
                  return (
                    <label key={produto} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-bg-card-hover cursor-pointer">
                      <input type="checkbox" checked={!excl} onChange={() => { const n = new Set(produtosExcluidos || []); n.has(produto) ? n.delete(produto) : n.add(produto); setProdutosExcluidos(n); }} className="rounded border-border-default" />
                      <span className={`text-[11px] truncate ${excl ? 'text-text-faint line-through' : 'text-text-primary'}`}>{produto}</span>
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
        </div>,
        document.body
      )}
    </>
  );
}
