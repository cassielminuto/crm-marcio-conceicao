import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Trash2, Loader2 } from 'lucide-react';

const TIPO_CONFIG = {
  danger: {
    icon: Trash2,
    iconBg: 'bg-[rgba(239,68,68,0.12)]',
    iconColor: 'text-accent-danger',
    btnBg: 'bg-accent-danger hover:bg-red-600',
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-[rgba(245,158,11,0.12)]',
    iconColor: 'text-accent-amber',
    btnBg: 'bg-accent-amber hover:bg-amber-600',
  },
};

export default function ConfirmDialog({
  isOpen,
  titulo = 'Confirmar ação',
  mensagem,
  tipo = 'danger',
  textoBotaoConfirmar = 'Confirmar',
  textoBotaoCancelar = 'Cancelar',
  onConfirm,
  onCancel,
  loading = false,
}) {
  const modalRef = useRef(null);

  if (!isOpen) return null;

  const config = TIPO_CONFIG[tipo] || TIPO_CONFIG.danger;
  const Icon = config.icon;

  function handleOverlayClick(e) {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      if (!loading) onCancel();
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-backdrop-fade"
      onClick={handleOverlayClick}
    >
      <div ref={modalRef} className="bg-bg-card border border-border-default rounded-2xl w-full max-w-[400px] overflow-hidden animate-modal-scale-in shadow-2xl">
        <div className="px-6 py-6 text-center space-y-3">
          <div className={`w-12 h-12 rounded-full ${config.iconBg} flex items-center justify-center mx-auto`}>
            <Icon size={22} className={config.iconColor} />
          </div>
          <h3 className="text-[15px] font-bold text-text-primary">{titulo}</h3>
          {mensagem && (
            <p className="text-[13px] text-text-secondary leading-relaxed">{mensagem}</p>
          )}
        </div>
        <div className="flex items-center gap-3 px-6 py-4 border-t border-border-subtle">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-lg text-[13px] font-medium text-text-secondary bg-bg-elevated hover:bg-bg-card-hover border border-border-default transition-colors disabled:opacity-50"
          >
            {textoBotaoCancelar}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 px-4 py-2.5 rounded-lg text-[13px] font-semibold text-white ${config.btnBg} transition-colors disabled:opacity-50 flex items-center justify-center gap-2`}
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {textoBotaoConfirmar}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
