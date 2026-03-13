import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Trophy, TrendingUp, Clock, Users, Star } from 'lucide-react';

function MetricaBar({ valor, max, cor }) {
  const pct = max > 0 ? Math.min((valor / max) * 100, 100) : 0;
  return (
    <div className="w-full bg-gray-100 rounded-full h-2">
      <div
        className={`h-2 rounded-full transition-all duration-500 ${cor}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

const MEDALHAS = ['text-yellow-500', 'text-gray-400', 'text-amber-600'];

export default function Ranking() {
  const { usuario } = useAuth();
  const [vendedores, setVendedores] = useState([]);
  const [dashboards, setDashboards] = useState({});
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregar() {
      try {
        const { data: vends } = await api.get('/vendedores');
        setVendedores(vends);

        // Buscar dashboard de cada vendedor em paralelo
        const dashResults = await Promise.all(
          vends.map((v) => api.get(`/vendedores/${v.id}/dashboard`).catch(() => null))
        );

        const dashMap = {};
        for (let i = 0; i < vends.length; i++) {
          if (dashResults[i]) {
            dashMap[vends[i].id] = dashResults[i].data;
          }
        }
        setDashboards(dashMap);
      } catch (err) {
        console.error('Erro ao carregar ranking:', err);
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, []);

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Calcular valores máximos para barras relativas
  const maxConversoes = Math.max(...vendedores.map((v) => v.totalConversoes), 1);
  const maxTaxa = Math.max(
    ...vendedores.map((v) => dashboards[v.id]?.metricas?.taxaConversao || 0),
    1
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Ranking</h1>
        <p className="text-sm text-gray-500 mt-1">Performance do time</p>
      </div>

      {/* Cards de destaques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {vendedores.slice(0, 3).map((v, i) => {
          const dash = dashboards[v.id];
          const medalha = MEDALHAS[i] || 'text-gray-400';

          return (
            <div
              key={v.id}
              className={`bg-white rounded-xl border p-5 ${
                v.id === usuario?.vendedorId ? 'border-blue-300 ring-2 ring-blue-100' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-xl font-bold text-gray-600">
                    {v.nomeExibicao?.[0]}
                  </div>
                  <Trophy size={16} className={`absolute -top-1 -right-1 ${medalha}`} />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{v.nomeExibicao}</p>
                  <p className="text-xs text-gray-400">#{v.rankingPosicao} — {v.papel?.replace('_', ' ')}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-green-50 rounded-lg p-2">
                  <p className="text-lg font-bold text-green-700">{v.totalConversoes}</p>
                  <p className="text-[10px] text-green-500">Conversoes</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-2">
                  <p className="text-lg font-bold text-blue-700">
                    {dash?.metricas?.taxaConversao ?? 0}%
                  </p>
                  <p className="text-[10px] text-blue-500">Taxa</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabela de ranking */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3 w-12">#</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Vendedor</th>
              <th className="text-center text-xs font-semibold text-gray-500 uppercase px-4 py-3">Conversoes</th>
              <th className="text-center text-xs font-semibold text-gray-500 uppercase px-4 py-3">Taxa</th>
              <th className="text-center text-xs font-semibold text-gray-500 uppercase px-4 py-3">Tempo Medio</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3 w-48">Performance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {vendedores.map((v) => {
              const dash = dashboards[v.id];
              const taxa = dash?.metricas?.taxaConversao ?? 0;
              const tempoMedio = dash?.metricas?.tempoMedioAbordagemMin;
              const isMe = v.id === usuario?.vendedorId;

              return (
                <tr key={v.id} className={isMe ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {v.rankingPosicao <= 3 ? (
                        <Star size={14} className={MEDALHAS[v.rankingPosicao - 1]} fill="currentColor" />
                      ) : (
                        <span className="text-sm text-gray-400">{v.rankingPosicao}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600">
                        {v.nomeExibicao?.[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {v.nomeExibicao} {isMe && <span className="text-blue-500 text-xs">(voce)</span>}
                        </p>
                        <p className="text-xs text-gray-400">{v.papel?.replace('_', ' ')}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="space-y-1">
                      <span className="text-sm font-bold text-gray-800">{v.totalConversoes}</span>
                      <MetricaBar valor={v.totalConversoes} max={maxConversoes} cor="bg-green-500" />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="space-y-1">
                      <span className="text-sm font-bold text-gray-800">{taxa}%</span>
                      <MetricaBar valor={taxa} max={maxTaxa} cor="bg-blue-500" />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Clock size={12} className="text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {tempoMedio !== null && tempoMedio !== undefined ? `${tempoMedio}min` : '—'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-gray-400">
                        <span>Score</span>
                        <span>{v.scorePerformance?.toFixed(1) || '0.0'}</span>
                      </div>
                      <MetricaBar valor={v.scorePerformance || 0} max={100} cor="bg-purple-500" />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
