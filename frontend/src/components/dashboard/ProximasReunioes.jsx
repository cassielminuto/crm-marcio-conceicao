const TIPO_COLORS = {
  reuniao_sdr_instagram: { bg: 'bg-[rgba(59,130,246,0.12)]', text: 'text-[#3b82f6]', label: 'SDR Instagram' },
  reuniao_sdr_inbound: { bg: 'bg-[rgba(16,185,129,0.12)]', text: 'text-[#10b981]', label: 'SDR Inbound' },
  reuniao_manual: { bg: 'bg-[rgba(139,92,246,0.12)]', text: 'text-[#8b5cf6]', label: 'Manual' },
};

function formatTime(isoString) {
  if (!isoString) return '--:--';
  const d = new Date(isoString);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
}

function formatDate(isoString) {
  if (!isoString) return '--/--';
  const d = new Date(isoString);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' });
}

export default function ProximasReunioes({ reunioes }) {
  const proximas = reunioes?.proximas || [];
  const lista = proximas.slice(0, 10);

  return (
    <div className="bg-bg-card border border-border-default rounded-[14px] p-6">
      <h3 className="text-[11px] uppercase tracking-[1.5px] text-text-muted font-semibold mb-4">
        Proximas Reunioes
      </h3>

      {!lista.length ? (
        <p className="text-[13px] text-text-muted">
          Nenhuma reuniao agendada na proxima semana
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          {lista.map((item) => {
            const tipoCfg = TIPO_COLORS[item.tipo] || { bg: 'bg-border-default', text: 'text-text-muted', label: item.tipo };
            return (
              <div
                key={item.id}
                className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-border-default/30 transition-colors"
              >
                <div className="shrink-0 text-right w-[52px]">
                  <span
                    className="text-[14px] font-display font-semibold text-text-primary block leading-tight"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {formatTime(item.inicio)}
                  </span>
                  <span
                    className="text-[11px] text-text-muted font-display"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {formatDate(item.inicio)}
                  </span>
                </div>

                <div className="w-px h-8 bg-border-default shrink-0" />

                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-text-primary truncate">{item.titulo}</p>
                  {item.vendedorNome && (
                    <p className="text-[11px] text-text-muted truncate">{item.vendedorNome}</p>
                  )}
                </div>

                <span className={`shrink-0 text-[10px] font-semibold uppercase tracking-[0.5px] px-2 py-0.5 rounded-full ${tipoCfg.bg} ${tipoCfg.text}`}>
                  {tipoCfg.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
