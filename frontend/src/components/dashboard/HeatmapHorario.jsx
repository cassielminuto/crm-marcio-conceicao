import { Clock } from 'lucide-react';

export default function HeatmapHorario({ heatmap }) {
  const data = heatmap || [];
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const peakEntry = data.reduce(
    (best, d) => (d.count > (best?.count || 0) ? d : best),
    data[0] || null
  );

  // Split into 2 rows of 12 for a compact layout
  const row1 = data.slice(0, 12);
  const row2 = data.slice(12, 24);

  function cellOpacity(count) {
    if (count === 0) return 0;
    // Min 15% opacity, max 100%
    return 0.15 + (count / maxCount) * 0.85;
  }

  function renderRow(entries) {
    return (
      <div className="flex gap-1">
        {entries.map((entry) => {
          const isPeak = peakEntry && entry.hora === peakEntry.hora && entry.count > 0;
          return (
            <div key={entry.hora} className="flex flex-col items-center gap-1 flex-1 min-w-0">
              <div
                className={`w-full aspect-square rounded-md transition-colors ${
                  isPeak ? 'ring-2 ring-violet-400 ring-offset-1 ring-offset-bg-card' : ''
                }`}
                style={{
                  backgroundColor:
                    entry.count === 0
                      ? 'var(--color-border-default)'
                      : `rgba(139, 92, 246, ${cellOpacity(entry.count)})`,
                }}
                title={`${entry.hora} — ${entry.count} lead${entry.count !== 1 ? 's' : ''}`}
              />
              <span
                className="text-[9px] text-text-muted leading-none font-display"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {entry.hora.replace(':00', 'h')}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="bg-bg-card border border-border-default rounded-[14px] p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] uppercase tracking-[1.5px] text-text-muted font-semibold">
          Horario de chegada dos leads
        </span>
        <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center">
          <Clock className="w-4.5 h-4.5 text-violet-500" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {row1.length > 0 && renderRow(row1)}
        {row2.length > 0 && renderRow(row2)}
      </div>

      {peakEntry && peakEntry.count > 0 && (
        <p className="text-sm text-text-muted mt-3">
          Pico:{' '}
          <span className="font-semibold text-violet-400">
            {peakEntry.hora}
          </span>{' '}
          com{' '}
          <span
            className="font-display font-semibold text-text-primary"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {peakEntry.count}
          </span>{' '}
          {peakEntry.count === 1 ? 'lead' : 'leads'}
        </p>
      )}
    </div>
  );
}
