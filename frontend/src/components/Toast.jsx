import { useEffect, useState } from 'react';
import { X, CheckCircle, AlertTriangle, Info, AlertOctagon } from 'lucide-react';

const TIPO_CONFIG = {
  info: {
    icon: Info,
    border: 'border-l-[3px] border-accent-info',
    iconColor: 'text-accent-info',
    progressColor: 'bg-accent-info',
    bg: 'bg-[rgba(59,130,246,0.06)]',
  },
  sucesso: {
    icon: CheckCircle,
    border: 'border-l-[3px] border-accent-emerald',
    iconColor: 'text-accent-emerald',
    progressColor: 'bg-accent-emerald',
    bg: 'bg-[rgba(16,185,129,0.06)]',
  },
  urgente: {
    icon: AlertOctagon,
    border: 'border-l-[3px] border-accent-danger',
    iconColor: 'text-accent-danger',
    progressColor: 'bg-accent-danger',
    bg: 'bg-[rgba(239,68,68,0.06)]',
  },
  aviso: {
    icon: AlertTriangle,
    border: 'border-l-[3px] border-accent-amber',
    iconColor: 'text-accent-amber',
    progressColor: 'bg-accent-amber',
    bg: 'bg-[rgba(245,158,11,0.06)]',
  },
};

export default function Toast({ mensagem, tipo = 'info', onClose, duracao = 10000 }) {
  const [saindo, setSaindo] = useState(false);
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    if (duracao > 0 && !hovering) {
      const timer = setTimeout(() => {
        setSaindo(true);
        setTimeout(onClose, 250);
      }, duracao);
      return () => clearTimeout(timer);
    }
  }, [duracao, onClose, hovering]);

  const config = TIPO_CONFIG[tipo] || TIPO_CONFIG.info;
  const Icone = config.icon;

  const handleClose = () => {
    setSaindo(true);
    setTimeout(onClose, 250);
  };

  return (
    <div
      className={`relative glass-strong ${config.border} rounded-xl px-4 py-3 flex items-start gap-3 max-w-sm shadow-lg group overflow-hidden ${saindo ? 'animate-toast-out' : 'animate-toast-in'}`}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div className={`mt-0.5 shrink-0 ${config.iconColor}`}>
        <Icone size={16} />
      </div>
      <p className="text-[12px] flex-1 text-text-primary leading-relaxed">{mensagem}</p>
      <button
        onClick={handleClose}
        className="shrink-0 text-text-muted hover:text-text-secondary transition-colors opacity-0 group-hover:opacity-100"
      >
        <X size={14} />
      </button>

      {/* Progress bar */}
      {duracao > 0 && !hovering && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/[0.03]">
          <div
            className={`h-full ${config.progressColor} opacity-60 rounded-full`}
            style={{ animation: `toast-progress ${duracao}ms linear forwards` }}
          />
        </div>
      )}
    </div>
  );
}

export function ToastContainer({ toasts, removerToast }) {
  if (toasts.length === 0) return null;

  const toastsVisiveis = toasts.slice(-5);

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.length > 1 && (
        <button
          onClick={() => toasts.forEach(t => removerToast(t.id))}
          className="mb-2 px-3 py-1.5 rounded-lg glass border border-border-default text-[11px] font-semibold text-text-muted hover:text-white hover:border-border-hover transition-all"
        >
          Fechar todas ({toasts.length})
        </button>
      )}
      {toastsVisiveis.map((t) => (
        <Toast
          key={t.id}
          mensagem={t.mensagem}
          tipo={t.tipo}
          onClose={() => removerToast(t.id)}
        />
      ))}
    </div>
  );
}
