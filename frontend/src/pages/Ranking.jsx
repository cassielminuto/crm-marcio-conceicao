import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import AvatarVendedor from '../components/AvatarVendedor';
import { Trophy, Clock } from 'lucide-react';

const POS_COLORS = ['text-[#fdcb6e]', 'text-[#a0a0be]', 'text-[#e17055]'];

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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-violet" />
      </div>
    );
  }

  const maxScore = Math.max(...vendedores.map((v) => v.scorePerformance || 0), 1);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-[22px] font-bold text-white">Ranking</h1>
        <p className="text-[13px] text-text-secondary mt-1">Performance do time</p>
      </div>

      {/* Top 3 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {vendedores.slice(0, 3).map((v, i) => {
          const dash = dashboards[v.id];
          return (
            <div
              key={v.id}
              className={`bg-bg-card border rounded-[14px] p-[22px] ${
                v.id === usuario?.vendedorId ? 'border-[rgba(108,92,231,0.3)]' : 'border-border-subtle'
              } hover:border-border-hover transition-all duration-300`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="relative">
                  <AvatarVendedor nome={v.nomeExibicao} fotoUrl={v.usuario?.fotoUrl} id={v.id} tamanho={48} />
                  <Trophy size={14} className={`absolute -top-1 -right-1 ${POS_COLORS[i]}`} />
                </div>
                <div>
                  <p className="font-semibold text-white text-[13px]">{v.nomeExibicao}</p>
                  <p className="text-[10px] text-text-muted">#{v.rankingPosicao} — {v.papel?.replace('_', ' ')}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-[rgba(0,184,148,0.08)] rounded-[10px] p-2">
                  <p className="text-[16px] font-bold text-accent-emerald">{v.totalConversoes}</p>
                  <p className="text-[10px] text-text-muted">Conversoes</p>
                </div>
                <div className="bg-[rgba(108,92,231,0.08)] rounded-[10px] p-2">
                  <p className="text-[16px] font-bold text-accent-violet-light">
                    {dash?.metricas?.taxaConversao ?? 0}%
                  </p>
                  <p className="text-[10px] text-text-muted">Taxa</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Ranking completo */}
      <div className="bg-bg-card border border-border-subtle rounded-[14px] p-[22px] space-y-2">
        {vendedores.map((v, i) => {
          const dash = dashboards[v.id];
          const taxa = dash?.metricas?.taxaConversao ?? 0;
          const tempoMedio = dash?.metricas?.tempoMedioAbordagemMin;
          const isMe = v.id === usuario?.vendedorId;
          const scorePct = maxScore > 0 ? Math.min(((v.scorePerformance || 0) / maxScore) * 100, 100) : 0;

          return (
            <div
              key={v.id}
              className={`flex items-center gap-12 p-[10px_12px] rounded-[10px] ${
                isMe ? 'bg-[rgba(108,92,231,0.08)]' : 'hover:bg-white/[0.02]'
              } transition-colors`}
            >
              <span className={`text-[13px] font-extrabold w-5 shrink-0 ${i < 3 ? POS_COLORS[i] : 'text-text-faint'}`}>
                {v.rankingPosicao}
              </span>

              <div className="flex items-center gap-3 w-40 shrink-0">
                <AvatarVendedor nome={v.nomeExibicao} fotoUrl={v.usuario?.fotoUrl} id={v.id} tamanho={32} />
                <div className="min-w-0">
                  <p className="text-[12px] font-medium text-text-primary truncate">
                    {v.nomeExibicao} {isMe && <span className="text-accent-violet-light text-[10px]">(voce)</span>}
                  </p>
                  <p className="text-[10px] text-text-muted">{v.papel?.replace('_', ' ')}</p>
                </div>
              </div>

              <div className="text-center w-16 shrink-0">
                <p className="text-[12px] font-bold text-white">{v.totalConversoes}</p>
                <p className="text-[9px] text-text-muted">conv.</p>
              </div>

              <div className="text-center w-16 shrink-0">
                <p className="text-[12px] font-bold text-white">{taxa}%</p>
                <p className="text-[9px] text-text-muted">taxa</p>
              </div>

              <div className="flex items-center gap-1 w-16 shrink-0 justify-center">
                <Clock size={10} className="text-text-muted" />
                <span className="text-[11px] text-text-secondary">
                  {tempoMedio !== null && tempoMedio !== undefined ? `${tempoMedio}min` : '—'}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-[6px] bg-bg-elevated rounded overflow-hidden">
                    <div
                      className="h-full rounded bg-gradient-to-r from-[#6c5ce7] to-[#00cec9] transition-all duration-500"
                      style={{ width: `${scorePct}%` }}
                    />
                  </div>
                  <span className="text-[12px] font-bold text-white shrink-0 w-8 text-right">
                    {(v.scorePerformance || 0).toFixed(0)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
