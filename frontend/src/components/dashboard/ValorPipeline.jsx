import { DollarSign } from 'lucide-react';

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function ValorPipeline({ pipeline }) {
  const { valorPipeline = 0, leadsPipeline = 0 } = pipeline || {};

  return (
    <div className="bg-bg-card border border-border-default rounded-[14px] p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] uppercase tracking-[1.5px] text-text-muted font-semibold">
          Pipeline
        </span>
        <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
          <DollarSign className="w-4.5 h-4.5 text-amber-500" />
        </div>
      </div>

      <p
        className="text-3xl font-display text-text-primary font-bold"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {formatCurrency(valorPipeline)}
      </p>

      <p className="text-sm text-text-muted mt-1">
        <span
          className="font-display font-semibold text-amber-500"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {leadsPipeline}
        </span>{' '}
        {leadsPipeline === 1 ? 'lead' : 'leads'} em negociacao
      </p>
    </div>
  );
}
