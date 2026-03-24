import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { CalendarCheck, Check, Clock, AlertTriangle, Phone, MessageSquare, Mail, RotateCcw } from 'lucide-react';

function classificarUrgencia(dataProgramada, status) {
  if (status === 'executado') return 'executado';
  if (status === 'cancelado') return 'cancelado';
  const agora = new Date();
  const data = new Date(dataProgramada);
  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const dataLimpa = new Date(data.getFullYear(), data.getMonth(), data.getDate());
  if (dataLimpa < hoje) return 'atrasado';
  if (dataLimpa.getTime() === hoje.getTime()) return 'pendente';
  return 'futuro';
}

const GRUPOS = [
  { id: 'atrasado', label: 'Atrasados', dot: 'bg-[#e17055]', icone: AlertTriangle },
  { id: 'pendente', label: 'Pendentes Hoje', dot: 'bg-[#fdcb6e]', icone: Clock },
  { id: 'futuro', label: 'Futuros', dot: 'bg-[#74b9ff]', icone: CalendarCheck },
  { id: 'executado', label: 'Executados', dot: 'bg-[#00b894]', icone: Check },
];

const tipoIcone = { whatsapp: MessageSquare, call: Phone, email: Mail };

export default function FollowUps() {
  const { usuario } = useAuth();
  const [followUps, setFollowUps] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    try {
      const vendedorId = usuario?.vendedorId;
      const params = vendedorId ? `?vendedor_id=${vendedorId}` : '';
      const { data } = await api.get(`/followups${params}`);

      let todos = data;
      if (vendedorId) {
        const { data: pendentes } = await api.get(`/vendedores/${vendedorId}/followups`);
        const ids = new Set(data.map((f) => f.id));
        for (const p of pendentes) {
          if (!ids.has(p.id)) todos.push(p);
        }
      }

      setFollowUps(todos);
    } catch (err) {
      console.error('Erro ao carregar follow-ups:', err);
    } finally {
      setCarregando(false);
    }
  }, [usuario]);

  useEffect(() => { carregar(); }, [carregar]);

  const marcarExecutado = async (id) => {
    try {
      await api.patch(`/followups/${id}`, { status: 'executado' });
      carregar();
    } catch (err) {
      console.error('Erro ao marcar executado:', err);
    }
  };

  const reagendar = async (id) => {
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    amanha.setHours(10, 0, 0, 0);

    try {
      await api.patch(`/followups/${id}`, { status: 'cancelado' });
      const fu = followUps.find((f) => f.id === id);
      if (fu) {
        await api.post('/followups', {
          lead_id: fu.leadId || fu.lead?.id,
          data_programada: amanha.toISOString(),
          tipo: fu.tipo,
        });
      }
      carregar();
    } catch (err) {
      console.error('Erro ao reagendar:', err);
    }
  };

  const agrupados = {};
  for (const g of GRUPOS) agrupados[g.id] = [];
  for (const fu of followUps) {
    const urg = classificarUrgencia(fu.dataProgramada, fu.status);
    if (agrupados[urg]) agrupados[urg].push(fu);
  }

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-violet" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-[22px] font-bold text-white">Follow-ups</h1>
        <p className="text-[13px] text-text-secondary mt-1">{followUps.length} follow-ups</p>
      </div>

      {followUps.length === 0 ? (
        <div className="bg-bg-card border border-border-subtle rounded-[14px] p-12 text-center">
          <CalendarCheck size={40} className="text-text-faint mx-auto mb-3" />
          <p className="text-text-muted">Nenhum follow-up pendente</p>
        </div>
      ) : (
        GRUPOS.map((grupo) => {
          const items = agrupados[grupo.id];
          if (items.length === 0) return null;
          const GrupoIcone = grupo.icone;

          return (
            <div key={grupo.id}>
              <div className="flex items-center gap-2 mb-3 px-1">
                <div className={`w-2 h-2 rounded-full ${grupo.dot}`} />
                <GrupoIcone size={14} className="text-text-muted" />
                <h2 className="text-[12px] font-semibold text-text-secondary">
                  {grupo.label} ({items.length})
                </h2>
              </div>

              <div className="space-y-2">
                {items.map((fu) => {
                  const TipoIcone = tipoIcone[fu.tipo] || MessageSquare;
                  const isAcionavel = grupo.id === 'atrasado' || grupo.id === 'pendente';

                  return (
                    <div key={fu.id} className="bg-bg-elevated border border-border-subtle rounded-[10px] flex items-center justify-between px-4 py-3 hover:border-border-hover transition-all">
                      <div className="flex items-center gap-3">
                        <TipoIcone size={16} className="text-text-muted" />
                        <div>
                          <p className="text-[12px] font-medium text-text-primary">
                            {fu.lead?.nome || `Lead #${fu.leadId}`}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-text-muted">
                            <span>{fu.lead?.telefone}</span>
                            {fu.lead?.classe && (
                              <span className="px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.04)] text-text-secondary font-medium">
                                {fu.lead.classe}
                              </span>
                            )}
                            <span>{fu.tipo}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-[11px] text-text-secondary">
                            {new Date(fu.dataProgramada).toLocaleDateString('pt-BR')}
                          </p>
                          <p className="text-[10px] text-text-muted">
                            {new Date(fu.dataProgramada).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>

                        {isAcionavel && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => marcarExecutado(fu.id)}
                              className="p-1.5 rounded-lg bg-[rgba(0,184,148,0.1)] text-accent-emerald hover:bg-[rgba(0,184,148,0.15)] transition-colors"
                              title="Marcar como executado"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={() => reagendar(fu.id)}
                              className="p-1.5 rounded-lg bg-[rgba(108,92,231,0.1)] text-accent-violet-light hover:bg-[rgba(108,92,231,0.15)] transition-colors"
                              title="Reagendar para amanha"
                            >
                              <RotateCcw size={14} />
                            </button>
                          </div>
                        )}

                        {grupo.id === 'executado' && fu.dataExecutada && (
                          <span className="text-[10px] text-accent-emerald">
                            {new Date(fu.dataExecutada).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
