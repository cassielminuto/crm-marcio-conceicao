import { useEffect } from 'react';
import { X, Bell } from 'lucide-react';

export default function Toast({ mensagem, tipo = 'info', onClose, duracao = 6000 }) {
  useEffect(() => {
    if (duracao > 0) {
      const timer = setTimeout(onClose, duracao);
      return () => clearTimeout(timer);
    }
  }, [duracao, onClose]);

  const cores = {
    info: 'bg-blue-600',
    sucesso: 'bg-green-600',
    urgente: 'bg-red-600',
    aviso: 'bg-yellow-500',
  };

  return (
    <div className={`${cores[tipo]} text-white px-4 py-3 rounded-lg shadow-lg flex items-start gap-3 max-w-sm animate-slide-in`}>
      <Bell size={18} className="mt-0.5 shrink-0" />
      <p className="text-sm flex-1">{mensagem}</p>
      <button onClick={onClose} className="shrink-0 hover:opacity-75">
        <X size={16} />
      </button>
    </div>
  );
}

export function ToastContainer({ toasts, removerToast }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
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
