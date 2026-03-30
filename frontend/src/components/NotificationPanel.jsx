import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Bell, BellOff, UserPlus, AlertTriangle, Copy, X, CheckCheck } from 'lucide-react';

function tempoRelativo(data) {
  const agora = Date.now();
  const diff = agora - new Date(data).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min}min atras`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h atras`;
  const d = Math.floor(h / 24);
  return `${d}d atras`;
}

const TIPO_ICONE = {
  novo_lead: UserPlus,
  sla_alerta: AlertTriangle,
  duplicata: Copy,
  geral: Bell,
};

const TIPO_COR = {
  novo_lead: 'text-accent-emerald bg-[rgba(0,184,148,0.1)]',
  sla_alerta: 'text-accent-danger bg-[rgba(225,112,85,0.1)]',
  duplicata: 'text-accent-amber bg-[rgba(253,203,110,0.1)]',
  geral: 'text-accent-info bg-[rgba(116,185,255,0.1)]',
};

function getIconeCor(tipo, dados) {
  if (tipo === 'novo_lead' && dados?.classe === 'A') return 'text-accent-danger bg-[rgba(225,112,85,0.1)]';
  if (tipo === 'novo_lead' && dados?.classe === 'B') return 'text-accent-amber bg-[rgba(253,203,110,0.1)]';
  return TIPO_COR[tipo] || TIPO_COR.geral;
}

export default function NotificationPanel({ onClose, onCountUpdate }) {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [notificacoes, setNotificacoes] = useState([]);
  const [totalNaoLidas, setTotalNaoLidas] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const panelRef = useRef(null);
  const socketRef = useRef(null);

  const carregar = useCallback(async () => {
    try {
      const { data } = await api.get('/notificacoes?limit=30');
      setNotificacoes(data.notificacoes);
      setTotalNaoLidas(data.totalNaoLidas);
      if (onCountUpdate) onCountUpdate(data.totalNaoLidas);
    } catch (err) {
      console.error('Erro ao carregar notificacoes:', err);
    } finally {
      setCarregando(false);
    }
  }, [onCountUpdate]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // WebSocket para real-time
  useEffect(() => {
    const socket = io('/', { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    const handleNovoLead = (data) => {
      if (
        usuario?.perfil === 'admin' ||
        usuario?.perfil === 'gestor' ||
        data.vendedorId === usuario?.vendedorId
      ) {
        // Adicionar no topo da lista
        const nova = {
          id: Date.now(),
          tipo: 'novo_lead',
          titulo: `Novo lead ${data.classe === 'A' ? 'URGENTE' : ''}: ${data.nome}`,
          mensagem: `Classe ${data.classe} | Score ${data.pontuacao}`,
          dados: data,
          lida: false,
          createdAt: new Date().toISOString(),
        };
        setNotificacoes(prev => [nova, ...prev]);
        setTotalNaoLidas(prev => {
          const novo = prev + 1;
          if (onCountUpdate) onCountUpdate(novo);
          return novo;
        });

        // Push notification do navegador
        if ('Notification' in window && Notification.permission === 'granted') {
          const notif = new Notification(`Novo Lead: ${data.nome}`, {
            body: `Classe ${data.classe} | Score ${data.pontuacao}`,
            icon: '/favicon.ico',
            tag: `lead-${data.leadId}`,
          });
          notif.onclick = () => {
            window.focus();
            navigate(`/leads/${data.leadId}`);
          };
        }
      }
    };

    socket.on('novo_lead', handleNovoLead);

    return () => {
      socket.disconnect();
    };
  }, [usuario, onCountUpdate, navigate]);

  // Pedir permissao para push notifications
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Fechar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const marcarLida = async (notif) => {
    // Se e uma notificacao real (tem id numerico do banco)
    if (typeof notif.id === 'number') {
      try {
        await api.patch(`/notificacoes/${notif.id}/lida`);
      } catch (err) {
        // silenciar
      }
    }
    setNotificacoes(prev => prev.map(n => n.id === notif.id ? { ...n, lida: true } : n));
    setTotalNaoLidas(prev => {
      const novo = Math.max(0, prev - 1);
      if (onCountUpdate) onCountUpdate(novo);
      return novo;
    });

    // Navegar se tem leadId
    if (notif.dados?.leadId) {
      navigate(`/leads/${notif.dados.leadId}`);
      onClose();
    }
  };

  const marcarTodas = async () => {
    try {
      await api.patch('/notificacoes/ler-todas');
      setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })));
      setTotalNaoLidas(0);
      if (onCountUpdate) onCountUpdate(0);
    } catch (err) {
      console.error('Erro ao marcar todas:', err);
    }
  };

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full mt-2 w-[380px] bg-bg-card border border-border-default rounded-[14px] shadow-2xl z-50 overflow-hidden animate-fade-in"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-white">Notificacoes</span>
          {totalNaoLidas > 0 && (
            <span className="px-1.5 py-0.5 bg-accent-danger rounded-full text-[9px] font-bold text-white min-w-[18px] text-center">
              {totalNaoLidas}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {totalNaoLidas > 0 && (
            <button
              onClick={marcarTodas}
              className="flex items-center gap-1 text-[10px] text-text-muted hover:text-accent-violet-light transition-colors"
            >
              <CheckCheck size={12} />
              Marcar todas
            </button>
          )}
          <button onClick={onClose} className="text-text-muted hover:text-text-secondary transition-colors">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Lista */}
      <div className="max-h-[420px] overflow-y-auto">
        {carregando ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-accent-violet" />
          </div>
        ) : notificacoes.length === 0 ? (
          <div className="py-12 text-center">
            <BellOff size={24} className="text-text-faint mx-auto mb-2" />
            <p className="text-[12px] text-text-muted">Nenhuma notificacao</p>
          </div>
        ) : (
          notificacoes.map((notif) => {
            const Icone = TIPO_ICONE[notif.tipo] || Bell;
            const iconeCor = getIconeCor(notif.tipo, notif.dados);
            return (
              <button
                key={notif.id}
                onClick={() => marcarLida(notif)}
                className={`w-full text-left flex gap-3 px-4 py-3 border-b border-border-subtle hover:bg-white/[0.02] transition-colors ${
                  !notif.lida ? 'bg-[rgba(108,92,231,0.04)]' : ''
                }`}
              >
                <div className={`w-8 h-8 rounded-lg ${iconeCor} flex items-center justify-center shrink-0 mt-0.5`}>
                  <Icone size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[11px] font-medium truncate ${!notif.lida ? 'text-white' : 'text-text-primary'}`}>
                    {notif.titulo}
                  </p>
                  <p className="text-[10px] text-text-muted mt-0.5 line-clamp-2">{notif.mensagem}</p>
                  <p className="text-[9px] text-text-faint mt-1">{tempoRelativo(notif.createdAt)}</p>
                </div>
                {!notif.lida && (
                  <div className="w-2 h-2 rounded-full bg-accent-violet shrink-0 mt-2" />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
