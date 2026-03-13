import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Users, TrendingUp, DollarSign, Target, Clock, Phone, MessageSquare, AlertTriangle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function MetricCard({ titulo, valor, icone: Icon, cor, subtitulo }) {
  const cores = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{titulo}</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{valor}</p>
          {subtitulo && <p className="text-xs text-gray-400 mt-1">{subtitulo}</p>}
        </div>
        <div className={`p-2.5 rounded-lg ${cores[cor]}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

function classificarUrgencia(dataProgramada) {
  const agora = new Date();
  const data = new Date(dataProgramada);
  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const dataLimpa = new Date(data.getFullYear(), data.getMonth(), data.getDate());

  if (dataLimpa < hoje) return 'atrasado';
  if (dataLimpa.getTime() === hoje.getTime()) return 'hoje';
  return 'futuro';
}

const coresUrgencia = {
  atrasado: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100 text-red-700' },
  hoje: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', badge: 'bg-yellow-100 text-yellow-700' },
  futuro: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', badge: 'bg-green-100 text-green-700' },
};

const labelUrgencia = { atrasado: 'Atrasado', hoje: 'Hoje', futuro: 'Futuro' };

const tipoIcone = { whatsapp: MessageSquare, call: Phone, email: MessageSquare };

export default function Dashboard() {
  const { usuario } = useAuth();
  const [dash, setDash] = useState(null);
  const [followUps, setFollowUps] = useState([]);
  const [ranking, setRanking] = useState([]);
  const [graficoDados, setGraficoDados] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const vendedorId = usuario?.vendedorId;
  const isAdmin = usuario?.perfil === 'admin' || usuario?.perfil === 'gestor';

  const carregarDados = useCallback(async () => {
    try {
      const promises = [
        api.get('/vendedores'),
        api.get('/leads/por-dia?dias=30'),
      ];

      if (vendedorId) {
        promises.push(
          api.get(`/vendedores/${vendedorId}/dashboard`),
          api.get(`/vendedores/${vendedorId}/followups`),
        );
      }

      const resultados = await Promise.all(promises);
      setRanking(resultados[0].data);
      setGraficoDados(resultados[1].data);

      if (vendedorId) {
        setDash(resultados[2].data);
        setFollowUps(resultados[3].data);
      } else if (isAdmin && resultados[0].data.length > 0) {
        // Admin: carregar dashboard do primeiro vendedor como visão geral
        const primeiro = resultados[0].data[0];
        const [dashRes, fuRes] = await Promise.all([
          api.get(`/vendedores/${primeiro.id}/dashboard`),
          api.get(`/vendedores/${primeiro.id}/followups`),
        ]);
        setDash(dashRes.data);
        setFollowUps(fuRes.data);
      }
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
    } finally {
      setCarregando(false);
    }
  }, [vendedorId, isAdmin]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const metricas = dash?.metricas;
  const posicaoRanking = vendedorId
    ? ranking.find((v) => v.id === vendedorId)?.rankingPosicao || '-'
    : '-';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500 mt-1">
          {isAdmin ? 'Visao geral do time' : `Bem-vindo, ${usuario?.nome}`}
        </p>
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          titulo="Leads Ativos"
          valor={dash?.vendedor?.leadsAtivos ?? 0}
          icone={Users}
          cor="blue"
          subtitulo={`de ${dash?.vendedor?.leadsMax ?? 30} max`}
        />
        <MetricCard
          titulo="Taxa de Conversao"
          valor={`${metricas?.taxaConversao ?? 0}%`}
          icone={TrendingUp}
          cor="green"
          subtitulo={`${metricas?.leadsConvertidos ?? 0} de ${metricas?.totalLeads ?? 0}`}
        />
        <MetricCard
          titulo="Pipeline Total"
          valor={`R$ ${((metricas?.leadsConvertidos ?? 0) * 1229).toLocaleString('pt-BR')}`}
          icone={DollarSign}
          cor="yellow"
          subtitulo="Ticket medio R$ 1.229"
        />
        <MetricCard
          titulo="% da Meta"
          valor={`${metricas ? Math.round((metricas.leadsConvertidos / Math.max(metricas.totalLeads, 1)) * 100) : 0}%`}
          icone={Target}
          cor="purple"
          subtitulo={`${dash?.mes?.conversoes ?? 0} conversoes no mes`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de leads por dia */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Leads por dia (30 dias)</h2>
          {graficoDados.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={graficoDados}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="data"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => {
                    const d = new Date(v + 'T12:00:00');
                    return `${d.getDate()}/${d.getMonth() + 1}`;
                  }}
                  interval={4}
                />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  labelFormatter={(v) => {
                    const d = new Date(v + 'T12:00:00');
                    return d.toLocaleDateString('pt-BR');
                  }}
                  formatter={(value) => [value, 'Leads']}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#3b82f6"
                  fill="#dbeafe"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-center py-12">Sem dados no periodo</p>
          )}
        </div>

        {/* Ranking */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Ranking do Time</h2>
          {vendedorId && (
            <div className="mb-4 bg-blue-50 rounded-lg p-3 text-center">
              <p className="text-xs text-blue-500">Sua posicao</p>
              <p className="text-3xl font-bold text-blue-600">#{posicaoRanking}</p>
            </div>
          )}
          <ul className="space-y-2">
            {ranking.map((v) => (
              <li
                key={v.id}
                className={`flex items-center justify-between p-2.5 rounded-lg text-sm ${
                  v.id === vendedorId ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-bold">
                    {v.rankingPosicao}
                  </span>
                  <span className="font-medium text-gray-700">{v.nomeExibicao}</span>
                </div>
                <span className="text-gray-500">{v.totalConversoes} conv.</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Follow-ups pendentes */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Follow-ups Pendentes</h2>
          <span className="text-sm text-gray-400">{followUps.length} pendentes</span>
        </div>

        {followUps.length === 0 ? (
          <p className="text-gray-400 text-center py-6">Nenhum follow-up pendente</p>
        ) : (
          <div className="space-y-2">
            {followUps.map((fu) => {
              const urgencia = classificarUrgencia(fu.dataProgramada);
              const cores = coresUrgencia[urgencia];
              const IconeTipo = tipoIcone[fu.tipo] || MessageSquare;

              return (
                <div
                  key={fu.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${cores.bg} ${cores.border}`}
                >
                  <div className="flex items-center gap-3">
                    <IconeTipo size={16} className={cores.text} />
                    <div>
                      <p className={`text-sm font-medium ${cores.text}`}>
                        {fu.lead?.nome}
                      </p>
                      <p className="text-xs text-gray-500">
                        {fu.lead?.telefone} — Classe {fu.lead?.classe}
                      </p>
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
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cores.badge}`}>
                      {urgencia === 'atrasado' && <AlertTriangle size={10} className="inline mr-1" />}
                      {labelUrgencia[urgencia]}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
