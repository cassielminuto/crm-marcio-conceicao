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
  { id: 'atrasado', label: 'Atrasados', cor: 'border-red-300', headerBg: 'bg-red-50', textCor: 'text-red-700', icone: AlertTriangle },
  { id: 'pendente', label: 'Pendentes Hoje', cor: 'border-yellow-300', headerBg: 'bg-yellow-50', textCor: 'text-yellow-700', icone: Clock },
  { id: 'futuro', label: 'Futuros', cor: 'border-blue-300', headerBg: 'bg-blue-50', textCor: 'text-blue-600', icone: CalendarCheck },
  { id: 'executado', label: 'Executados', cor: 'border-green-300', headerBg: 'bg-green-50', textCor: 'text-green-700', icone: Check },
];

const tipoIcone = { whatsapp: MessageSquare, call: Phone, email: Mail };

export default function FollowUps() {
  const { usuario } = useAuth();
  const [followUps, setFollowUps] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    try {
      // Buscar follow-ups do vendedor logado (ou todos se admin)
      const vendedorId = usuario?.vendedorId;
      const params = vendedorId ? `?vendedor_id=${vendedorId}` : '';

      // Buscar pendentes de todos os dias (não só hoje) para ver atrasados
      const { data } = await api.get(`/followups${params}`);

      // Buscar também atrasados (dias anteriores)
      let todos = data;
      if (vendedorId) {
        const { data: pendentes } = await api.get(`/vendedores/${vendedorId}/followups`);
        // Merge sem duplicatas
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
      // Buscar dados do follow-up original para reagendar
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

  // Agrupar por urgência
  const agrupados = {};
  for (const g of GRUPOS) agrupados[g.id] = [];
  for (const fu of followUps) {
    const urg = classificarUrgencia(fu.dataProgramada, fu.status);
    if (agrupados[urg]) agrupados[urg].push(fu);
  }

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Follow-ups</h1>
        <p className="text-sm text-gray-500 mt-1">{followUps.length} follow-ups</p>
      </div>

      {followUps.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <CalendarCheck size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">Nenhum follow-up pendente</p>
        </div>
      ) : (
        GRUPOS.map((grupo) => {
          const items = agrupados[grupo.id];
          if (items.length === 0) return null;
          const GrupoIcone = grupo.icone;

          return (
            <div key={grupo.id} className={`rounded-xl border ${grupo.cor} overflow-hidden`}>
              <div className={`px-4 py-3 ${grupo.headerBg} flex items-center gap-2`}>
                <GrupoIcone size={16} className={grupo.textCor} />
                <h2 className={`text-sm font-semibold ${grupo.textCor}`}>
                  {grupo.label} ({items.length})
                </h2>
              </div>

              <div className="bg-white divide-y divide-gray-100">
                {items.map((fu) => {
                  const TipoIcone = tipoIcone[fu.tipo] || MessageSquare;
                  const isAcionavel = grupo.id === 'atrasado' || grupo.id === 'pendente';

                  return (
                    <div key={fu.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <TipoIcone size={16} className="text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-800">
                            {fu.lead?.nome || `Lead #${fu.leadId}`}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <span>{fu.lead?.telefone}</span>
                            {fu.lead?.classe && (
                              <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium">
                                {fu.lead.classe}
                              </span>
                            )}
                            <span>{fu.tipo}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-xs text-gray-500">
                            {new Date(fu.dataProgramada).toLocaleDateString('pt-BR')}
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(fu.dataProgramada).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>

                        {isAcionavel && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => marcarExecutado(fu.id)}
                              className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                              title="Marcar como executado"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={() => reagendar(fu.id)}
                              className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                              title="Reagendar para amanha"
                            >
                              <RotateCcw size={14} />
                            </button>
                          </div>
                        )}

                        {grupo.id === 'executado' && fu.dataExecutada && (
                          <span className="text-[10px] text-green-500">
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
