export default function TopAnuncios({ topAnuncios }) {
  const { topPorLeads = [], topPorConversao = [] } = topAnuncios || {};

  const isEmpty = !topPorLeads.length && !topPorConversao.length;

  if (isEmpty) {
    return (
      <div className="bg-bg-card border border-border-default rounded-[14px] p-6">
        <h3 className="text-[11px] uppercase tracking-[1.5px] text-text-muted font-semibold mb-4">
          Top Anuncios
        </h3>
        <p className="text-[13px] text-text-muted">Sem dados de anuncios no periodo</p>
      </div>
    );
  }

  const maxLeads = topPorLeads.length ? Math.max(...topPorLeads.map((a) => a.leads)) : 1;
  const maxConversao = topPorConversao.length ? Math.max(...topPorConversao.map((a) => a.conversao)) : 1;

  const ListColumn = ({ title, items, valueKey, maxVal, suffix, color }) => (
    <div className="flex-1 min-w-[240px]">
      <h4 className="text-[11px] uppercase tracking-[1.5px] text-text-muted font-semibold mb-3">
        {title}
      </h4>
      <div className="flex flex-col gap-2.5">
        {items.map((item, idx) => {
          const val = item[valueKey] ?? 0;
          const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
          return (
            <div key={idx}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[12px] text-text-primary truncate max-w-[70%]">
                  <span className="text-text-muted mr-1.5">{idx + 1}.</span>
                  {item.nome}
                </span>
                <span
                  className="text-[12px] font-display font-semibold text-text-primary ml-2 shrink-0"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {suffix === '%' ? `${val.toFixed(1)}%` : val}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-border-default overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="bg-bg-card border border-border-default rounded-[14px] p-6">
      <h3 className="text-[11px] uppercase tracking-[1.5px] text-text-muted font-semibold mb-4">
        Top Anuncios
      </h3>
      <div className="flex gap-6 flex-wrap">
        {topPorLeads.length > 0 && (
          <ListColumn
            title="Top por Leads"
            items={topPorLeads}
            valueKey="leads"
            maxVal={maxLeads}
            suffix=""
            color="#3b82f6"
          />
        )}
        {topPorConversao.length > 0 && (
          <ListColumn
            title="Top por Conversao"
            items={topPorConversao}
            valueKey="conversao"
            maxVal={maxConversao}
            suffix="%"
            color="#10b981"
          />
        )}
      </div>
    </div>
  );
}
