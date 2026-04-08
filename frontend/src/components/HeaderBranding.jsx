import { useAuth } from '../context/AuthContext';

function getSaudacao() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Bom dia';
  if (h >= 12 && h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function formatarData() {
  const s = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function HeaderBranding() {
  const { usuario } = useAuth();
  const nome = usuario?.nome?.split(' ')[0] || '';

  return (
    <div className="flex items-center justify-between py-4 mb-2 border-b border-border-default">
      <div>
        <p className="font-display text-[24px] tracking-[1px]">
          <span className="font-bold text-gradient" style={{ WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', background: 'linear-gradient(135deg, #7C3AED 0%, #3B82F6 100%)' }}>HL</span>
          <span className="font-normal text-text-primary">PIPE</span>
        </p>
        <div className="flex items-center gap-2">
          <p className="text-[11px] font-medium text-text-muted uppercase tracking-[2px]">CRM Comercial</p>
          {/* Live indicator dot */}
          <span className="relative flex items-center justify-center w-2 h-2">
            <span className="absolute inset-0 rounded-full bg-accent-emerald/40 animate-live-pulse" />
            <span className="relative w-1.5 h-1.5 rounded-full bg-accent-emerald" />
          </span>
        </div>
      </div>
      <div className="text-right hidden md:block">
        <p className="font-display text-[14px] font-semibold text-text-primary">{getSaudacao()}, {nome}</p>
        <p className="text-[12px] font-light text-text-muted mt-0.5">{formatarData()}</p>
      </div>
    </div>
  );
}
