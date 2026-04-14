import { Clock } from 'lucide-react';

export default function TempoMedioFunil({ tempoMedio }) {
  const dias = tempoMedio?.tempoMedioConversaoDias;
  const amostra = tempoMedio?.amostra;

  return (
    <div className="bg-bg-card border border-border-default rounded-[14px] p-6">
      <div className="flex items-center gap-2 mb-5">
        <Clock className="w-4 h-4 text-text-muted" />
        <span className="text-[11px] uppercase tracking-[1.5px] text-text-muted font-semibold">
          Tempo Médio de Conversão
        </span>
      </div>

      {dias != null ? (
        <div>
          <p
            className="text-4xl font-display font-bold text-text-primary"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {typeof dias === 'number' ? dias.toFixed(1) : dias}
            <span className="text-lg font-normal text-text-muted ml-2">dias</span>
          </p>
          {amostra != null && (
            <p className="text-xs text-text-muted mt-2">
              baseado em{' '}
              <span
                className="font-display font-semibold text-text-primary"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {amostra}
              </span>{' '}
              leads convertidos
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-text-muted">Sem dados no período</p>
      )}
    </div>
  );
}
