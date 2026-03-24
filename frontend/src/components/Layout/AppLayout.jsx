import { useState, useCallback } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { ToastContainer } from '../Toast';
import NotificationPanel from '../NotificationPanel';
import useSocket from '../../hooks/useSocket';
import { useAuth } from '../../context/AuthContext';
import { Search, Bell } from 'lucide-react';

let toastIdCounter = 0;

function UserAvatar({ nome, fotoUrl }) {
  const iniciais = (nome || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  if (fotoUrl) {
    return <img src={fotoUrl} alt={nome} className="w-[34px] h-[34px] rounded-lg object-cover" />;
  }
  return (
    <div className="w-[34px] h-[34px] rounded-lg bg-gradient-to-br from-[#6c5ce7] to-[#00cec9] flex items-center justify-center text-[11px] font-bold text-white">
      {iniciais}
    </div>
  );
}

export default function AppLayout() {
  const navigate = useNavigate();
  const [toasts, setToasts] = useState([]);
  const [notifAberto, setNotifAberto] = useState(false);
  const [totalNaoLidas, setTotalNaoLidas] = useState(0);
  const { usuario } = useAuth();

  const adicionarToast = useCallback((mensagem, tipo = 'info') => {
    const id = ++toastIdCounter;
    setToasts((prev) => [...prev, { id, mensagem, tipo }]);
  }, []);

  const removerToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleNovoLead = useCallback((data) => {
    const tipo = data.urgente ? 'urgente' : 'info';
    const classeLabel = data.classe === 'A' ? 'URGENTE' : `Classe ${data.classe}`;

    if (
      usuario?.perfil === 'admin' ||
      usuario?.perfil === 'gestor' ||
      data.vendedorId === usuario?.vendedorId
    ) {
      adicionarToast(
        `Novo lead ${classeLabel}: ${data.nome} (score ${data.pontuacao}) → ${data.vendedorNome || 'nurturing'}`,
        tipo
      );
    }
  }, [usuario, adicionarToast]);

  const handleSlaAlerta = useCallback((data) => {
    if (data.tipo === 'redistribuicao') {
      adicionarToast(
        `SLA estourado: ${data.leadNome} (Classe ${data.classe}) redistribuido de ${data.vendedorAnterior} para ${data.vendedorNovo}`,
        'urgente'
      );
    } else {
      adicionarToast(
        `SLA estourado: ${data.leadNome} (Classe ${data.classe}) sem abordagem ha ${data.tempoMinutos}min`,
        'aviso'
      );
    }
  }, [adicionarToast]);

  const handleDuplicata = useCallback((data) => {
    const nomes = data.duplicatas?.map((d) => d.nome).join(', ') || '';
    adicionarToast(
      `Duplicata detectada: ${data.leadNome} — matches com ${nomes}`,
      'aviso'
    );
  }, [adicionarToast]);

  useSocket(handleNovoLead, handleSlaAlerta, handleDuplicata);

  return (
    <div className="flex min-h-screen bg-bg-primary">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-[56px] shrink-0 flex items-center justify-between px-8 border-b border-border-subtle bg-bg-secondary/50 backdrop-blur-sm">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Buscar leads, vendedores..."
              className="w-[360px] bg-bg-card border border-border-default rounded-[10px] pl-9 pr-3 py-2 text-[12px] text-text-primary placeholder:text-text-faint focus:outline-none focus:border-[rgba(108,92,231,0.4)] focus:ring-[3px] focus:ring-[rgba(108,92,231,0.06)] transition-all"
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                onClick={() => setNotifAberto(!notifAberto)}
                className="relative p-2 text-text-muted hover:text-text-secondary transition-colors"
              >
                <Bell size={18} />
                {totalNaoLidas > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-[18px] h-[18px] bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                    {totalNaoLidas > 9 ? '9+' : totalNaoLidas}
                  </span>
                )}
              </button>
              {notifAberto && (
                <NotificationPanel
                  onClose={() => setNotifAberto(false)}
                  onCountUpdate={setTotalNaoLidas}
                />
              )}
            </div>
            <button onClick={() => navigate('/perfil')} className="hover:opacity-80 transition-opacity">
              <UserAvatar nome={usuario?.nome} fotoUrl={usuario?.fotoUrl} />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 px-8 py-7 overflow-auto">
          <Outlet />
        </main>
      </div>
      <ToastContainer toasts={toasts} removerToast={removerToast} />
    </div>
  );
}
