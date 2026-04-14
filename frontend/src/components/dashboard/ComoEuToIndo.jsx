import { User, TrendingUp } from 'lucide-react';

function formatBRL(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

export default function ComoEuToIndo({ ranking, usuarioId }) {
  const idx = (ranking || []).findIndex((r) => r.usuarioId === usuarioId);
  const meuDado = idx >= 0 ? ranking[idx] : null;
  const posicao = idx >= 0 ? idx + 1 : null;
  const total = (ranking || []).length;

  if (!meuDado) {
    return (
      <div className="bg-bg-card border border-border-default rounded-[14px] p-6">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-4 h-4 text-text-muted" />
          <span className="text-[11px] uppercase tracking-[1.5px] text-text-muted font-semibold">
            Como eu tô indo
          </span>
        </div>
        <p className="text-sm text-text-muted">Sem dados no período</p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden bg-bg-card border border-border-default rounded-[14px] p-6 border-l-4 border-l-accent-violet">
      {/* Gradient accent background */}
      <div className="absolute inset-0 bg-gradient-to-r from-accent-violet/5 to-transparent pointer-events-none" />

      <div className="relative">
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp className="w-4 h-4 text-accent-violet" />
          <span className="text-[11px] uppercase tracking-[1.5px] text-text-muted font-semibold">
            Como eu tô indo
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Position */}
          <div>
            <p className="text-[11px] uppercase tracking-[1.5px] text-text-muted font-semibold mb-1">
              Posição
            </p>
            <p
              className="text-2xl font-display font-bold text-accent-violet"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              #{posicao}
              <span className="text-sm font-normal text-text-muted ml-1">
                de {total}
              </span>
            </p>
          </div>

          {/* Vendas */}
          <div>
            <p className="text-[11px] uppercase tracking-[1.5px] text-text-muted font-semibold mb-1">
              Vendas
            </p>
            <p
              className="text-2xl font-display font-bold text-text-primary"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {meuDado.vendas}
            </p>
          </div>

          {/* Faturamento */}
          <div>
            <p className="text-[11px] uppercase tracking-[1.5px] text-text-muted font-semibold mb-1">
              Faturamento
            </p>
            <p
              className="text-2xl font-display font-bold text-accent-emerald"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {formatBRL(meuDado.faturamento)}
            </p>
          </div>

          {/* Conversão */}
          <div>
            <p className="text-[11px] uppercase tracking-[1.5px] text-text-muted font-semibold mb-1">
              Conversão
            </p>
            <p
              className="text-2xl font-display font-bold text-text-primary"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {formatPercent(meuDado.conversao)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
