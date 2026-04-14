export default function TaxaNoShow({ reunioes }) {
  const { agendadas = 0, realizadas = 0, noShows = 0, taxaNoShow = 0 } = reunioes || {};

  const pending = Math.max(0, agendadas - realizadas - noShows);
  const total = agendadas || 1;

  const pctRealizadas = (realizadas / total) * 100;
  const pctNoShows = (noShows / total) * 100;
  const pctPending = (pending / total) * 100;

  const getNoShowColor = (taxa) => {
    if (taxa >= 20) return 'text-accent-danger';
    if (taxa >= 10) return 'text-accent-amber';
    return 'text-accent-emerald';
  };

  const getNoShowBg = (taxa) => {
    if (taxa >= 20) return 'bg-accent-danger';
    if (taxa >= 10) return 'bg-accent-amber';
    return 'bg-accent-emerald';
  };

  return (
    <div className="bg-bg-card border border-border-default rounded-[14px] p-6">
      <h3 className="text-[11px] uppercase tracking-[1.5px] text-text-muted font-semibold mb-4">
        Taxa No-Show
      </h3>

      <div className="flex items-baseline gap-2 mb-1">
        <span
          className={`text-[32px] font-display font-bold leading-none ${getNoShowColor(taxaNoShow)}`}
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {taxaNoShow.toFixed(1)}%
        </span>
      </div>

      <p className="text-[12px] text-text-muted mb-5">
        {noShows} no-show{noShows !== 1 ? 's' : ''} de {agendadas} agendada{agendadas !== 1 ? 's' : ''}
      </p>

      <div className="flex h-3 rounded-full overflow-hidden bg-border-default mb-3">
        {pctRealizadas > 0 && (
          <div
            className="bg-accent-emerald transition-all duration-300"
            style={{ width: `${pctRealizadas}%` }}
          />
        )}
        {pctNoShows > 0 && (
          <div
            className={`${getNoShowBg(taxaNoShow)} transition-all duration-300`}
            style={{ width: `${pctNoShows}%` }}
          />
        )}
        {pctPending > 0 && (
          <div
            className="bg-text-muted/30 transition-all duration-300"
            style={{ width: `${pctPending}%` }}
          />
        )}
      </div>

      <div className="flex items-center gap-4 text-[11px] text-text-muted">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-accent-emerald" />
          <span>Realizadas ({realizadas})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${getNoShowBg(taxaNoShow)}`} />
          <span>No-shows ({noShows})</span>
        </div>
        {pending > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-text-muted/30" />
            <span>Pendentes ({pending})</span>
          </div>
        )}
      </div>
    </div>
  );
}
