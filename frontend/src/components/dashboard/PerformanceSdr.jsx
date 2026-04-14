export default function PerformanceSdr({ sdr }) {
  const { instagram, inbound } = sdr || {};

  const fmt = (v) => v != null ? v.toFixed(1) : '0.0';

  const StatRow = ({ label, value, isPercent }) => (
    <div className="flex items-center justify-between py-2 border-b border-border-default last:border-0">
      <span className="text-[12px] text-text-muted">{label}</span>
      <span
        className="text-[14px] font-display font-semibold text-text-primary"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {isPercent ? `${fmt(value)}%` : (value ?? 0)}
      </span>
    </div>
  );

  const Card = ({ title, data, accentClass }) => (
    <div className="bg-bg-card border border-border-default rounded-[14px] p-6 flex-1 min-w-[260px]">
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-2 h-2 rounded-full ${accentClass}`} />
        <h3 className="text-[11px] uppercase tracking-[1.5px] text-text-muted font-semibold">
          {title}
        </h3>
      </div>
      {data?.operadorNome && (
        <p className="text-[12px] text-text-muted mb-3">
          Operador: <span className="text-text-primary font-medium">{data.operadorNome}</span>
        </p>
      )}
      <div className="flex flex-col">
        <StatRow label="Leads criados" value={data?.total} />
        <StatRow label="Handoffs" value={data?.handoffs} />
        <StatRow label="Fechados" value={data?.fechados} />
        <StatRow label="Taxa handoff" value={data?.taxaHandoff} isPercent />
        <StatRow label="Taxa fechamento" value={data?.taxaFechamento} isPercent />
      </div>
    </div>
  );

  return (
    <div className="flex gap-4 flex-wrap">
      <Card
        title="SDR Instagram"
        data={instagram}
        accentClass="bg-accent-info"
      />
      <Card
        title="SDR Inbound"
        data={inbound}
        accentClass="bg-accent-emerald"
      />
    </div>
  );
}
