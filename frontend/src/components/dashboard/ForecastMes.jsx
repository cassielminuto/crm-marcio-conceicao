import { TrendingUp } from 'lucide-react';

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function ForecastMes({ pipeline }) {
  const {
    forecast = 0,
    realizadoMes = 0,
    diasPassados = 1,
    diasNoMes = 30,
  } = pipeline || {};

  const pctRealizado = forecast > 0 ? Math.min((realizadoMes / forecast) * 100, 100) : 0;
  const ritmoEsperado = diasNoMes > 0 ? forecast / diasNoMes : 0;
  const ritmoAtual = diasPassados > 0 ? realizadoMes / diasPassados : 0;
  const onTrack = ritmoAtual >= ritmoEsperado;

  const accentColor = onTrack ? 'emerald' : 'amber';
  const bgTint = onTrack ? 'bg-emerald-500/10' : 'bg-amber-500/10';
  const iconColor = onTrack ? 'text-emerald-500' : 'text-amber-500';
  const barColor = onTrack ? 'bg-emerald-500' : 'bg-amber-500';
  const numColor = onTrack ? 'text-emerald-500' : 'text-amber-500';

  return (
    <div className="bg-bg-card border border-border-default rounded-[14px] p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] uppercase tracking-[1.5px] text-text-muted font-semibold">
          Forecast do mes
        </span>
        <div className={`w-9 h-9 rounded-xl ${bgTint} flex items-center justify-center`}>
          <TrendingUp className={`w-4.5 h-4.5 ${iconColor}`} />
        </div>
      </div>

      <p
        className="text-3xl font-display text-text-primary font-bold"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {formatCurrency(forecast)}
      </p>

      {/* Progress bar */}
      <div className="mt-3 mb-2">
        <div className="w-full h-2 rounded-full bg-border-default overflow-hidden">
          <div
            className={`h-full rounded-full ${barColor} transition-all duration-500`}
            style={{ width: `${pctRealizado}%` }}
          />
        </div>
      </div>

      <p className="text-sm text-text-muted">
        <span
          className={`font-display font-semibold ${numColor}`}
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {formatCurrency(realizadoMes)}
        </span>{' '}
        realizado em{' '}
        <span
          className="font-display font-semibold text-text-primary"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {diasPassados}/{diasNoMes}
        </span>{' '}
        dias
      </p>
    </div>
  );
}
