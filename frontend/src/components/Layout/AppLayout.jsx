import { useState, useCallback, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { ToastContainer } from '../Toast';
import NotificationPanel from '../NotificationPanel';
import AddLeadModal from '../AddLeadModal';
import useSocket from '../../hooks/useSocket';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Search, Bell, Plus, Loader } from 'lucide-react';
import HeaderBranding from '../HeaderBranding';
import AvatarVendedor from '../AvatarVendedor';

let toastIdCounter = 0;


export default function AppLayout() {
  const navigate = useNavigate();
  const [toasts, setToasts] = useState([]);
  const [notifAberto, setNotifAberto] = useState(false);
  const [totalNaoLidas, setTotalNaoLidas] = useState(0);
  const [modalLeadAberto, setModalLeadAberto] = useState(false);
  const [vendedores, setVendedores] = useState([]);
  const [termoBusca, setTermoBusca] = useState('');
  const [resultadosBusca, setResultadosBusca] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [buscaAberta, setBuscaAberta] = useState(false);
  const { usuario } = useAuth();

  // Carregar vendedores para o modal
  useEffect(() => {
    api.get('/vendedores').then(res => {
      const data = Array.isArray(res.data) ? res.data : [];
      setVendedores(data);
    }).catch(() => {});
  }, []);

  // Busca debounced
  useEffect(() => {
    if (termoBusca.length < 2) { setResultadosBusca([]); setBuscaAberta(false); return; }
    const timer = setTimeout(async () => {
      setBuscando(true);
      try {
        const { data } = await api.get(`/leads/busca?q=${encodeURIComponent(termoBusca)}`);
        setResultadosBusca(data);
        setBuscaAberta(true);
      } catch (e) {
        setResultadosBusca([]);
      }
      setBuscando(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [termoBusca]);

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

  const handleDuplicata = useCallback((data) => {
    const nomes = data.duplicatas?.map((d) => d.nome).join(', ') || '';
    adicionarToast(
      `Duplicata detectada: ${data.leadNome} — matches com ${nomes}`,
      'aviso'
    );
  }, [adicionarToast]);

  useSocket(handleNovoLead, null, handleDuplicata);

  return (
    <div className="flex min-h-screen bg-[#08080C]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-[56px] shrink-0 flex items-center justify-between px-8 border-b border-[rgba(255,255,255,0.06)] bg-[#0C0C12]/60 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted z-10" />
              {buscando && <Loader size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted animate-spin z-10" />}
              <input
                type="text"
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                onFocus={() => { if (resultadosBusca.length > 0) setBuscaAberta(true); }}
                onKeyDown={(e) => { if (e.key === 'Escape') { setBuscaAberta(false); e.target.blur(); } }}
                placeholder="Buscar leads por nome, telefone..."
                className="w-[360px] bg-[#0F0F16] border border-[rgba(255,255,255,0.06)] rounded-[10px] pl-9 pr-3 py-2 text-[13px] text-[#F0F0F5] placeholder:text-[#3D3D4D] focus:outline-none focus:border-[#7C3AED] focus:ring-[3px] focus:ring-[rgba(124,58,237,0.15)] transition-all"
              />
              {buscaAberta && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setBuscaAberta(false)} />
                  <div className="absolute top-full mt-1 left-0 w-[400px] z-50 bg-[#1A1A24] border border-[rgba(255,255,255,0.10)] rounded-[14px] shadow-[0_8px_32px_rgba(0,0,0,0.4)] max-h-[400px] overflow-y-auto animate-fade-in">
                    {resultadosBusca.length === 0 ? (
                      <p className="text-[12px] text-text-muted text-center py-6">Nenhum lead encontrado</p>
                    ) : (
                      resultadosBusca.map((lead) => (
                        <div
                          key={lead.id}
                          onClick={() => { navigate(`/leads/${lead.id}`); setBuscaAberta(false); setTermoBusca(''); }}
                          className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.03] cursor-pointer transition-colors border-b border-border-subtle last:border-0"
                        >
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold text-white truncate">{lead.nome}</p>
                            <p className="text-[11px] text-text-muted truncate">
                              {lead.telefone}{lead.email ? ` · ${lead.email}` : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-3">
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                              lead.classe === 'A' ? 'bg-[rgba(239,68,68,0.12)] text-[#EF4444]' :
                              lead.classe === 'B' ? 'bg-[rgba(245,158,11,0.12)] text-[#F59E0B]' :
                              'bg-[rgba(59,130,246,0.12)] text-[#3B82F6]'
                            }`}>{lead.classe}</span>
                            <span className="text-[10px] text-text-muted">{lead.vendedor?.nomeExibicao || ''}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
            <button
              onClick={() => setModalLeadAberto(true)}
              className="w-[38px] h-[38px] rounded-[10px] bg-[#7C3AED] flex items-center justify-center hover:bg-[#6D28D9] hover:shadow-[0_0_20px_rgba(124,58,237,0.25)] transition-all shrink-0"
              title="Adicionar lead"
            >
              <Plus size={16} className="text-white" />
            </button>
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
              <AvatarVendedor nome={usuario?.nome} fotoUrl={usuario?.fotoUrl} id={usuario?.id} tamanho={34} />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 px-10 py-8 overflow-auto">
          <HeaderBranding />
          <Outlet />
        </main>
      </div>
      <ToastContainer toasts={toasts} removerToast={removerToast} />

      <AddLeadModal
        isOpen={modalLeadAberto}
        onClose={() => setModalLeadAberto(false)}
        onLeadCriado={(lead) => {
          adicionarToast(`Lead criado: ${lead.nome} (Classe ${lead.classe})`, 'sucesso');
        }}
        vendedores={vendedores}
      />
    </div>
  );
}
