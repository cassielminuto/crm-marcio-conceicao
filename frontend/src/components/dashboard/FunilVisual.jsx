import { ArrowRight } from 'lucide-react';

export default function FunilVisual({ funil }) {
  if (!funil || funil.length === 0) {
    return (
      <div className="bg-bg-card border border-border-default rounded-[14px] p-6">
        <span className="text-[11px] uppercase tracking-[1.5px] text-text-muted font-semibold">
          Funil de Vendas
        </span>
        <p className="text-sm text-text-muted mt-4">Sem dados no período</p>
      </div>
    );
  }

  const maxQtd = Math.max(...funil.map((f) => f.qtd), 1);

  function barColor(etapa) {
    if (etapa.tipo === 'ganho') return 'bg-accent-emerald';
    if (etapa.tipo === 'perdido') return 'bg-accent-danger';
    return '';
  }

  return (
    <div className="bg-bg-card border border-border-default rounded-[14px] p-6">
      <span className="text-[11px] uppercase tracking-[1.5px] text-text-muted font-semibold">
        Funil de Vendas
      </span>

      <div className="mt-5 space-y-3">
        {funil.map((etapa, i) => {
          const widthPct = Math.max((etapa.qtd / maxQtd) * 100, 8);
          const useDynamic = etapa.tipo !== 'ganho' && etapa.tipo !== 'perdido';

          return (
            <div key={etapa.slug}>
              {/* Bar row */}
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-text-primary">
                      {etapa.label}
                    </span>
                    <span
                      className="text-xs font-display font-semibold text-text-primary"
                      style={{ fontVariantNumeric: 'tabular-nums' }}
                    >
                      {etapa.qtd}
                    </span>
                  </div>
                  <div className="w-full h-8 rounded-lg bg-border-default/30 overflow-hidden">
                    <div
                      className={`h-full rounded-lg transition-all duration-500 ${barColor(etapa)}`}
                      style={{
                        width: `${widthPct}%`,
                        backgroundColor: useDynamic ? etapa.cor : undefined,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Conversion arrow between bars */}
              {i < funil.length - 1 && etapa.conversaoPct != null && (
                <div className="flex items-center gap-1.5 ml-4 my-1">
                  <ArrowRight className="w-3 h-3 text-text-muted" />
                  <span
                    className="text-[11px] text-text-muted font-display"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {typeof etapa.conversaoPct === 'number'
                      ? `${etapa.conversaoPct.toFixed(1)}%`
                      : etapa.conversaoPct}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
