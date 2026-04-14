import { createContext, useContext, useState, useCallback } from 'react';
import { ToastContainer } from '../components/Toast';

let toastIdCounter = 0;

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((mensagem, tipo = 'info') => {
    const id = ++toastIdCounter;
    setToasts((prev) => [...prev, { id, mensagem, tipo }]);
  }, []);

  const removerToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[9999]">
        <ToastContainer toasts={toasts} removerToast={removerToast} />
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast deve ser usado dentro de ToastProvider');
  return ctx;
}
