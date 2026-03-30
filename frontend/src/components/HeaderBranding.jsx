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
    <div className="flex items-center justify-between py-4 mb-2 border-b border-[rgba(255,255,255,0.06)]">
      <div>
        <p className="font-display text-[24px] tracking-[1px]">
          <span className="font-bold text-[#7C3AED]" style={{ textShadow: '0 0 20px rgba(124,58,237,0.3)' }}>HL</span>
          <span className="font-normal text-[#F0F0F5]">PIPE</span>
        </p>
        <p className="text-[11px] font-medium text-[#5C5C6F] uppercase tracking-[2px]">CRM Comercial</p>
      </div>
      <div className="text-right hidden md:block">
        <p className="text-[14px] font-medium text-[#F0F0F5]">{getSaudacao()}, {nome}</p>
        <p className="text-[12px] text-[#5C5C6F] mt-0.5">{formatarData()}</p>
      </div>
    </div>
  );
}
