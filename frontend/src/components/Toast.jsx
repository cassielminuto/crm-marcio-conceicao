import { useEffect } from 'react';
import { X, Bell } from 'lucide-react';

export default function Toast({ mensagem, tipo = 'info', onClose, duracao = 10000 }) {
  useEffect(() => {
    if (duracao > 0) {
      const timer = setTimeout(onClose, duracao);
      return () => clearTimeout(timer);
    }
  }, [duracao, onClose]);

  const cores = {
    info: 'border-l-2 border-accent-info',
    sucesso: 'border-l-2 border-accent-emerald',
    urgente: 'border-l-2 border-accent-danger',
    aviso: 'border-l-2 border-accent-amber',
  };

  return (
    <div className={`bg-bg-elevated border border-border-default ${cores[tipo]} rounded-xl backdrop-blur-sm px-4 py-3 flex items-start gap-3 max-w-sm animate-slide-in shadow-lg`}>
      <Bell size={16} className="mt-0.5 shrink-0 text-text-muted" />
      <p className="text-[12px] flex-1 text-text-primary">{mensagem}</p>
      <button onClick={onClose} className="shrink-0 text-text-muted hover:text-text-secondary transition-colors">
        <X size={14} />
      </button>
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
          className="mb-2 px-3 py-1.5 rounded-lg bg-bg-card border border-border-default text-[11px] font-semibold text-text-muted hover:text-white hover:border-border-hover transition-all"
        >
          ✕ Fechar todas ({toasts.length})
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
