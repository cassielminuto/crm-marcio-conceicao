import { Trophy } from 'lucide-react';

const MEDAL_COLORS = [
  'bg-yellow-400 text-yellow-900',   // gold
  'bg-gray-300 text-gray-700',       // silver
  'bg-amber-600 text-amber-100',     // bronze
];

function formatBRL(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value) {
  return `${Number(value).toFixed(1)}%`;
}

export default function RankingVendedores({ ranking }) {
  if (!ranking || ranking.length === 0) {
    return (
      <div className="bg-bg-card border border-border-default rounded-[14px] p-6">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-4 h-4 text-text-muted" />
          <span className="text-[11px] uppercase tracking-[1.5px] text-text-muted font-semibold">
            Ranking de Vendedores
          </span>
        </div>
        <p className="text-sm text-text-muted">Sem dados no período</p>
      </div>
    );
  }

  return (
    <div className="bg-bg-card border border-border-default rounded-[14px] p-6">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-4 h-4 text-text-muted" />
        <span className="text-[11px] uppercase tracking-[1.5px] text-text-muted font-semibold">
          Ranking de Vendedores
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-default">
              <th className="text-left py-2 pr-3 text-[11px] uppercase tracking-[1.5px] text-text-muted font-semibold w-10">
                #
              </th>
              <th className="text-left py-2 pr-3 text-[11px] uppercase tracking-[1.5px] text-text-muted font-semibold">
                Vendedor
              </th>
              <th className="text-right py-2 px-3 text-[11px] uppercase tracking-[1.5px] text-text-muted font-semibold">
                Vendas
              </th>
              <th className="text-right py-2 px-3 text-[11px] uppercase tracking-[1.5px] text-text-muted font-semibold">
                Faturamento
              </th>
              <th className="text-right py-2 px-3 text-[11px] uppercase tracking-[1.5px] text-text-muted font-semibold">
                Ticket Médio
              </th>
              <th className="text-right py-2 pl-3 text-[11px] uppercase tracking-[1.5px] text-text-muted font-semibold">
                Conversão
              </th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((v, i) => (
              <tr
                key={v.vendedorId}
                className="border-b border-border-default last:border-b-0 hover:bg-bg-card-hover transition-colors"
              >
                <td className="py-3 pr-3">
                  {i < 3 ? (
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${MEDAL_COLORS[i]}`}
                    >
                      {i + 1}
                    </span>
                  ) : (
                    <span
                      className="text-text-muted font-display"
                      style={{ fontVariantNumeric: 'tabular-nums' }}
                    >
                      {i + 1}
                    </span>
                  )}
                </td>
                <td className="py-3 pr-3 text-text-primary font-medium">
                  {v.nomeExibicao}
                </td>
                <td
                  className="py-3 px-3 text-right text-text-primary font-display"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {v.vendas}
                </td>
                <td
                  className="py-3 px-3 text-right text-accent-emerald font-display font-semibold"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {formatBRL(v.faturamento)}
                </td>
                <td
                  className="py-3 px-3 text-right text-text-primary font-display"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {formatBRL(v.ticketMedio)}
                </td>
                <td
                  className="py-3 pl-3 text-right text-text-primary font-display"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {formatPercent(v.conversao)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
