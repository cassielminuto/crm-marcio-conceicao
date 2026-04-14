import { Zap, Phone, MessageSquare, FileText, Mail } from 'lucide-react';

const TIPO_CONFIG = {
  call: {
    label: 'Ligacoes',
    Icon: Phone,
    bgClass: 'bg-blue-500/10',
    textClass: 'text-blue-400',
  },
  whatsapp_enviado: {
    label: 'WhatsApp enviado',
    Icon: MessageSquare,
    bgClass: 'bg-green-500/10',
    textClass: 'text-green-400',
  },
  whatsapp_recebido: {
    label: 'WhatsApp recebido',
    Icon: MessageSquare,
    bgClass: 'bg-emerald-500/10',
    textClass: 'text-emerald-400',
  },
  nota: {
    label: 'Notas',
    Icon: FileText,
    bgClass: 'bg-gray-500/10',
    textClass: 'text-gray-400',
  },
  email: {
    label: 'E-mail',
    Icon: Mail,
    bgClass: 'bg-amber-500/10',
    textClass: 'text-amber-400',
  },
};

export default function AtividadeTime({ atividade }) {
  const { totalInteracoes = 0, porTipo = [] } = atividade || {};

  const isEmpty = totalInteracoes === 0;

  return (
    <div className="bg-bg-card border border-border-default rounded-[14px] p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] uppercase tracking-[1.5px] text-text-muted font-semibold">
          Atividade do time
        </span>
        <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center">
          <Zap className="w-4.5 h-4.5 text-violet-500" />
        </div>
      </div>

      {isEmpty ? (
        <p className="text-sm text-text-muted">Nenhuma interacao registrada hoje</p>
      ) : (
        <>
          <p
            className="text-3xl font-display text-text-primary font-bold"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {totalInteracoes}
          </p>
          <p className="text-sm text-text-muted mt-1 mb-4">
            {totalInteracoes === 1 ? 'interacao registrada' : 'interacoes registradas'} hoje
          </p>

          <div className="flex flex-wrap gap-2">
            {porTipo.map(({ tipo, count }) => {
              const config = TIPO_CONFIG[tipo] || {
                label: tipo,
                Icon: Zap,
                bgClass: 'bg-gray-500/10',
                textClass: 'text-gray-400',
              };
              const { label, Icon, bgClass, textClass } = config;

              return (
                <div
                  key={tipo}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${bgClass}`}
                >
                  <Icon className={`w-3.5 h-3.5 ${textClass}`} />
                  <span
                    className={`text-xs font-medium ${textClass}`}
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {count}
                  </span>
                  <span className="text-xs text-text-muted">{label}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
