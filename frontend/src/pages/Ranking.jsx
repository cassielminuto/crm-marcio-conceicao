import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import AvatarVendedor from '../components/AvatarVendedor';
import { Trophy, Clock, TrendingUp, TrendingDown, Star, Zap, Users } from 'lucide-react';

const PODIUM_CONFIG = [
  {
    position: 1,
    color: '#FFD700',
    colorRgb: '255,215,0',
    label: 'Ouro',
    order: 'order-2',
    height: 'h-[180px]',
    avatarSize: 64,
    ringSize: 80,
    badgeSize: 'text-[22px]',
    cardPadding: 'p-6',
    elevated: true,
  },
  {
    position: 2,
    color: '#C0C0C0',
    colorRgb: '192,192,192',
    label: 'Prata',
    order: 'order-1',
    height: 'h-[150px]',
    avatarSize: 52,
    ringSize: 66,
    badgeSize: 'text-[18px]',
    cardPadding: 'p-5',
    elevated: false,
  },
  {
    position: 3,
    color: '#CD7F32',
    colorRgb: '205,127,50',
    label: 'Bronze',
    order: 'order-3',
    height: 'h-[140px]',
    avatarSize: 48,
    ringSize: 62,
    badgeSize: 'text-[16px]',
    cardPadding: 'p-5',
    elevated: false,
  },
];

/* SVG circular progress ring */
function ConversionRing({ percentage, size = 44, strokeWidth = 3.5, color = '#6c5ce7' }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(percentage, 100) / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="transition-all duration-1000 ease-out"
      />
    </svg>
  );
}

/* Sparkle/confetti dots for #1 */
function SparkleEffect() {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-[16px] pointer-events-none">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 rounded-full animate-pulse"
          style={{
            background: '#FFD700',
            opacity: 0.4 + Math.random() * 0.4,
            top: `${10 + Math.random() * 80}%`,
            left: `${10 + Math.random() * 80}%`,
            animationDelay: `${i * 0.3}s`,
            animationDuration: `${1.5 + Math.random()}s`,
          }}
        />
      ))}
    </div>
  );
}

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
  const top3 = vendedores.slice(0, 3);
  const rest = vendedores.slice(3);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FFD700]/20 to-[#6c5ce7]/20 flex items-center justify-center">
          <Trophy size={20} className="text-[#FFD700]" />
        </div>
        <div>
          <h1 className="text-[22px] font-bold text-white">Ranking</h1>
          <p className="text-[13px] text-text-secondary mt-0.5">Performance do time</p>
        </div>
      </div>

      {/* ===== PODIUM ===== */}
      <div className="flex items-end justify-center gap-3 md:gap-5 px-4">
        {[1, 0, 2].map((configIdx) => {
          const cfg = PODIUM_CONFIG[configIdx];
          const v = top3[configIdx];
          if (!v) return null;
          const dash = dashboards[v.id];
          const taxa = dash?.metricas?.taxaConversao ?? 0;
          const isMe = v.id === usuario?.vendedorId;

          return (
            <div
              key={v.id}
              className={`relative flex flex-col items-center ${cfg.order} w-full max-w-[220px]`}
            >
              {/* Card */}
              <div
                className={`relative w-full bg-bg-card rounded-[16px] ${cfg.cardPadding} border transition-all duration-500 hover:translate-y-[-2px] ${
                  isMe ? 'border-[rgba(108,92,231,0.4)]' : 'border-border-subtle'
                }`}
                style={{
                  boxShadow: cfg.elevated
                    ? `0 0 30px rgba(${cfg.colorRgb},0.12), 0 8px 32px rgba(0,0,0,0.3)`
                    : `0 4px 20px rgba(0,0,0,0.2)`,
                  background: `linear-gradient(135deg, rgba(${cfg.colorRgb},0.04) 0%, rgba(30,30,46,1) 60%)`,
                }}
              >
                {/* Animated gradient border glow for #1 */}
                {cfg.position === 1 && <SparkleEffect />}

                {/* Position badge */}
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full flex items-center justify-center font-black text-[12px] shadow-lg"
                  style={{
                    background: `linear-gradient(135deg, ${cfg.color}, ${cfg.color}88)`,
                    color: cfg.position === 1 ? '#1a1a2e' : '#fff',
                  }}
                >
                  {cfg.position}
                </div>

                {/* Avatar with colored ring */}
                <div className="flex justify-center mt-2 mb-3">
                  <div className="relative">
                    <div
                      className="rounded-full p-[3px]"
                      style={{
                        background: `linear-gradient(135deg, ${cfg.color}, ${cfg.color}66)`,
                      }}
                    >
                      <div className="rounded-full bg-bg-card p-[2px]">
                        <AvatarVendedor
                          nome={v.nomeExibicao}
                          fotoUrl={v.usuario?.fotoUrl}
                          id={v.id}
                          tamanho={cfg.avatarSize}
                        />
                      </div>
                    </div>
                    {cfg.position === 1 && (
                      <div className="absolute -top-2 -right-2">
                        <Trophy size={18} className="text-[#FFD700] drop-shadow-lg" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Name */}
                <p className="font-bold text-white text-[13px] text-center truncate">
                  {v.nomeExibicao}
                </p>
                <p className="text-[10px] text-text-muted text-center mb-3">
                  {v.papel?.replace('_', ' ')}
                </p>

                {/* Conversion ring + stats */}
                <div className="flex items-center justify-center gap-3 mb-3">
                  <div className="relative flex items-center justify-center">
                    <ConversionRing percentage={taxa} size={cfg.position === 1 ? 56 : 48} strokeWidth={4} color={cfg.color} />
                    <span className="absolute text-[11px] font-bold text-white">{taxa}%</span>
                  </div>
                </div>

                {/* Mini stat blocks */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-[rgba(0,184,148,0.08)] rounded-[8px] py-1.5 px-2 text-center">
                    <p className="text-[14px] font-bold text-accent-emerald">{v.totalConversoes}</p>
                    <p className="text-[9px] text-text-muted">Conversoes</p>
                  </div>
                  <div className="bg-[rgba(108,92,231,0.08)] rounded-[8px] py-1.5 px-2 text-center">
                    <p className="text-[14px] font-bold text-accent-violet-light">
                      {v.leadsAtivos ?? 0}
                    </p>
                    <p className="text-[9px] text-text-muted">Leads ativos</p>
                  </div>
                </div>

                {/* Ticket medio */}
                {v.ticketMedio != null && (
                  <div className="mt-2 bg-white/[0.03] rounded-[8px] py-1.5 px-2 text-center">
                    <p className="text-[12px] font-semibold text-white">
                      R$ {Number(v.ticketMedio).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                    </p>
                    <p className="text-[9px] text-text-muted">Ticket medio</p>
                  </div>
                )}
              </div>

              {/* Podium base */}
              <div
                className={`w-full rounded-b-[10px] mt-[-6px] flex items-end justify-center ${cfg.height}`}
                style={{
                  background: `linear-gradient(180deg, rgba(${cfg.colorRgb},0.10) 0%, rgba(${cfg.colorRgb},0.02) 100%)`,
                  borderLeft: `1px solid rgba(${cfg.colorRgb},0.08)`,
                  borderRight: `1px solid rgba(${cfg.colorRgb},0.08)`,
                  borderBottom: `1px solid rgba(${cfg.colorRgb},0.08)`,
                }}
              >
                <span
                  className={`${cfg.badgeSize} font-black mb-4 opacity-20`}
                  style={{ color: cfg.color }}
                >
                  #{cfg.position}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ===== FULL RANKING LIST ===== */}
      <div className="bg-bg-card border border-border-subtle rounded-[16px] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3 border-b border-border-subtle flex items-center gap-2">
          <Users size={14} className="text-text-muted" />
          <span className="text-[12px] font-semibold text-text-secondary">Ranking completo</span>
        </div>

        <div className="divide-y divide-white/[0.03]">
          {vendedores.map((v, i) => {
            const dash = dashboards[v.id];
            const taxa = dash?.metricas?.taxaConversao ?? 0;
            const tempoMedio = dash?.metricas?.tempoMedioAbordagemMin;
            const isMe = v.id === usuario?.vendedorId;
            const scorePct = maxScore > 0 ? Math.min(((v.scorePerformance || 0) / maxScore) * 100, 100) : 0;
            const isTop3 = i < 3;
            const posColors = ['#FFD700', '#C0C0C0', '#CD7F32'];

            return (
              <div
                key={v.id}
                className={`flex items-center gap-4 px-5 py-3 transition-all duration-200 ${
                  isMe
                    ? 'bg-[rgba(108,92,231,0.06)]'
                    : 'hover:bg-white/[0.02]'
                }`}
              >
                {/* Position badge */}
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-extrabold"
                  style={
                    isTop3
                      ? {
                          background: `linear-gradient(135deg, ${posColors[i]}33, ${posColors[i]}11)`,
                          color: posColors[i],
                          border: `1px solid ${posColors[i]}44`,
                        }
                      : {
                          background: 'rgba(255,255,255,0.04)',
                          color: 'rgba(255,255,255,0.3)',
                          border: '1px solid rgba(255,255,255,0.06)',
                        }
                  }
                >
                  {v.rankingPosicao}
                </div>

                {/* Avatar + name */}
                <div className="flex items-center gap-3 w-44 shrink-0">
                  <div
                    className="rounded-full shrink-0"
                    style={{
                      padding: '2px',
                      background: isTop3
                        ? `linear-gradient(135deg, ${posColors[i]}, ${posColors[i]}44)`
                        : 'rgba(255,255,255,0.08)',
                    }}
                  >
                    <div className="rounded-full bg-bg-card">
                      <AvatarVendedor
                        nome={v.nomeExibicao}
                        fotoUrl={v.usuario?.fotoUrl}
                        id={v.id}
                        tamanho={32}
                      />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium text-text-primary truncate">
                      {v.nomeExibicao}{' '}
                      {isMe && (
                        <span className="text-accent-violet-light text-[10px] font-normal">(voce)</span>
                      )}
                    </p>
                    <p className="text-[10px] text-text-muted">{v.papel?.replace('_', ' ')}</p>
                  </div>
                </div>

                {/* Conversoes */}
                <div className="text-center w-16 shrink-0">
                  <p className="text-[13px] font-bold text-white">{v.totalConversoes}</p>
                  <p className="text-[9px] text-text-muted">conv.</p>
                </div>

                {/* Conversion rate ring */}
                <div className="flex items-center gap-2 w-20 shrink-0 justify-center">
                  <div className="relative flex items-center justify-center">
                    <ConversionRing
                      percentage={taxa}
                      size={32}
                      strokeWidth={3}
                      color={taxa >= 30 ? '#00b894' : taxa >= 15 ? '#6c5ce7' : '#e17055'}
                    />
                    <span className="absolute text-[8px] font-bold text-white">{taxa}%</span>
                  </div>
                  <span className="text-[9px] text-text-muted">taxa</span>
                </div>

                {/* Tempo medio */}
                <div className="flex items-center gap-1 w-16 shrink-0 justify-center">
                  <Clock size={10} className="text-text-muted" />
                  <span className="text-[11px] text-text-secondary">
                    {tempoMedio !== null && tempoMedio !== undefined ? `${tempoMedio}min` : '—'}
                  </span>
                </div>

                {/* Performance trend */}
                <div className="w-8 shrink-0 flex justify-center">
                  {v.scorePerformance > 0 ? (
                    scorePct >= 50 ? (
                      <TrendingUp size={14} className="text-accent-emerald" />
                    ) : (
                      <TrendingDown size={14} className="text-accent-danger" />
                    )
                  ) : (
                    <span className="text-text-faint text-[10px]">--</span>
                  )}
                </div>

                {/* Score bar */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-[5px] bg-white/[0.04] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                          width: `${scorePct}%`,
                          background: isTop3
                            ? `linear-gradient(90deg, ${posColors[i]}88, ${posColors[i]})`
                            : 'linear-gradient(90deg, #6c5ce7, #00cec9)',
                        }}
                      />
                    </div>
                    <span className="text-[11px] font-bold text-white shrink-0 w-8 text-right tabular-nums">
                      {(v.scorePerformance || 0).toFixed(0)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
