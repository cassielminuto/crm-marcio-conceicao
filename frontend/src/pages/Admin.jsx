import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Settings, Clock, Smartphone, FileText } from 'lucide-react';

export default function Admin() {
  const location = useLocation();
  const isRoot = location.pathname === '/admin';

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-[22px] font-bold text-white">Administracao</h1>
        <p className="text-[13px] text-text-secondary mt-1">Configuracoes do sistema</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <NavLink
          to="/admin/sla"
          className={({ isActive }) =>
            `flex items-center gap-2 px-4 py-2 rounded-[10px] text-[12px] font-semibold transition-all duration-250 ${
              isActive
                ? 'bg-gradient-to-r from-[#6c5ce7] to-[#00cec9] text-white shadow-[0_4px_16px_rgba(108,92,231,0.25)]'
                : 'bg-bg-elevated border border-border-default text-text-secondary hover:border-border-active hover:text-[#b0b0d0]'
            }`
          }
        >
          <Clock size={16} /> SLA Config
        </NavLink>
        <NavLink
          to="/admin/whatsapp"
          className={({ isActive }) =>
            `flex items-center gap-2 px-4 py-2 rounded-[10px] text-[12px] font-semibold transition-all duration-250 ${
              isActive
                ? 'bg-gradient-to-r from-[#00b894] to-[#00cec9] text-white shadow-[0_4px_16px_rgba(0,184,148,0.25)]'
                : 'bg-bg-elevated border border-border-default text-text-secondary hover:border-border-active hover:text-[#b0b0d0]'
            }`
          }
        >
          <Smartphone size={16} /> WhatsApp
        </NavLink>
        <NavLink
          to="/admin/templates"
          className={({ isActive }) =>
            `flex items-center gap-2 px-4 py-2 rounded-[10px] text-[12px] font-semibold transition-all duration-250 ${
              isActive
                ? 'bg-gradient-to-r from-[#6c5ce7] to-[#a78bfa] text-white shadow-[0_4px_16px_rgba(108,92,231,0.25)]'
                : 'bg-bg-elevated border border-border-default text-text-secondary hover:border-border-active hover:text-[#b0b0d0]'
            }`
          }
        >
          <FileText size={16} /> Templates
        </NavLink>
      </div>

      {isRoot && (
        <div className="bg-bg-card border border-border-subtle rounded-[14px] p-12 text-center">
          <Settings size={40} className="text-text-faint mx-auto mb-3" />
          <p className="text-text-muted">Selecione uma opcao acima</p>
        </div>
      )}

      <Outlet />
    </div>
  );
}
