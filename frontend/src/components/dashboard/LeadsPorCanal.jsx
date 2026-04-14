import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

const CANAL_LABELS = {
  bio: 'Instagram',
  anuncio: 'Anuncio',
  evento: 'Indicacao/Evento',
};

const CANAL_COLORS = {
  bio: '#3b82f6',
  anuncio: '#f59e0b',
  evento: '#10b981',
};

export default function LeadsPorCanal({ porCanal }) {
  const dados = (porCanal || []).map((item) => ({
    ...item,
    label: CANAL_LABELS[item.canal] || item.canal,
    cor: CANAL_COLORS[item.canal] || '#6b7280',
  }));

  if (!dados.length) {
    return (
      <div className="bg-bg-card border border-border-default rounded-[14px] p-6">
        <h3 className="text-[11px] uppercase tracking-[1.5px] text-text-muted font-semibold mb-4">
          Leads por Canal
        </h3>
        <p className="text-[13px] text-text-muted">Sem dados de canal no periodo</p>
      </div>
    );
  }

  return (
    <div className="bg-bg-card border border-border-default rounded-[14px] p-6">
      <h3 className="text-[11px] uppercase tracking-[1.5px] text-text-muted font-semibold mb-4">
        Leads por Canal
      </h3>

      <div className="h-[180px] mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dados} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="label"
              width={120}
              tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-bg-card)',
                border: '1px solid var(--color-border-default)',
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: 'var(--color-text-primary)' }}
              itemStyle={{ color: 'var(--color-text-muted)' }}
            />
            <Bar dataKey="leads" radius={[0, 6, 6, 0]} barSize={24}>
              {dados.map((entry, idx) => (
                <Cell key={idx} fill={entry.cor} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="border-t border-border-default pt-3">
        <div className="grid grid-cols-4 gap-2 text-[11px] text-text-muted font-semibold uppercase tracking-[1px] mb-2 px-1">
          <span>Canal</span>
          <span className="text-right">Leads</span>
          <span className="text-right">Vendas</span>
          <span className="text-right">Conversao</span>
        </div>
        {dados.map((item, idx) => (
          <div
            key={idx}
            className="grid grid-cols-4 gap-2 text-[12px] py-1.5 px-1 border-b border-border-default last:border-0"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.cor }} />
              <span className="text-text-primary">{item.label}</span>
            </div>
            <span
              className="text-right text-text-primary font-display"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {item.leads}
            </span>
            <span
              className="text-right text-text-primary font-display"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {item.vendas}
            </span>
            <span
              className="text-right text-text-primary font-display"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {(item.conversao ?? 0).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
