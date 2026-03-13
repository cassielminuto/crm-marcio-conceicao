import { useState, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { ToastContainer } from '../Toast';
import useSocket from '../../hooks/useSocket';
import { useAuth } from '../../context/AuthContext';

let toastIdCounter = 0;

export default function AppLayout() {
  const [toasts, setToasts] = useState([]);
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

    // Mostrar notificação se for para o vendedor logado ou se for admin
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
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
      <ToastContainer toasts={toasts} removerToast={removerToast} />
    </div>
  );
}
