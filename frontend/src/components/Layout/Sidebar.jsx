import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AvatarVendedor from '../AvatarVendedor';
import {
  LayoutDashboard, Kanban, DollarSign, Users, CalendarCheck,
  Trophy, Target, BarChart3, Settings, LogOut,
} from 'lucide-react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/funil', label: 'Funil', icon: Kanban },
  { to: '/vendas', label: 'Vendas', icon: DollarSign },
  { to: '/meus-leads', label: 'Meus Leads', icon: Users },
  { to: '/follow-ups', label: 'Follow-ups', icon: CalendarCheck },
  { to: '/ranking', label: 'Ranking', icon: Trophy },
  { to: '/metas', label: 'Metas', icon: Target },
  { to: '/relatorios', label: 'Relatorios', icon: BarChart3, adminOnly: true },
];

const adminItems = [
  { to: '/admin', label: 'Admin', icon: Settings },
];

function SidebarIcon({ to, label, icon: Icon }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      title={label}
      className={({ isActive }) =>
        `group relative w-10 h-10 flex items-center justify-center rounded-[10px] transition-all duration-200 ${
          isActive
            ? 'bg-[rgba(124,58,237,0.15)] text-accent-violet-light'
            : 'text-text-muted hover:bg-bg-card-hover hover:text-text-secondary'
        }`
      }
    >
      <Icon size={20} />
      <span className="absolute left-full ml-3 px-2.5 py-1 rounded-md bg-bg-elevated border border-border-hover text-[11px] font-medium text-text-primary whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-lg">
        {label}
      </span>
    </NavLink>
  );
}

export default function Sidebar() {
  const { usuario, logout } = useAuth();
  const isAdmin = usuario?.perfil === 'admin' || usuario?.perfil === 'gestor';

  return (
    <aside className="w-16 shrink-0 bg-bg-secondary flex flex-col items-center min-h-screen border-r border-border-default py-4 relative z-[2]">
      {/* Logo */}
      <NavLink to="/" className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] flex items-center justify-center mb-6 shrink-0 hover:shadow-[0_0_20px_rgba(124,58,237,0.3)] transition-shadow" title="HLPIPE">
        <span className="text-[11px] font-bold text-white tracking-tight">HL</span>
      </NavLink>

      {/* Nav icons */}
      <nav className="flex-1 flex flex-col items-center gap-1">
        {navItems.filter(item => !item.adminOnly || isAdmin).map(item => (
          <SidebarIcon key={item.to} {...item} />
        ))}
        {isAdmin && (
          <>
            <div className="w-6 h-px bg-border-default my-2" />
            {adminItems.map(item => (
              <SidebarIcon key={item.to} {...item} />
            ))}
          </>
        )}
      </nav>

      {/* Bottom: user + logout */}
      <div className="flex flex-col items-center gap-2 mt-auto">
        <NavLink to="/perfil" title={usuario?.nome} className="hover:shadow-[0_0_12px_rgba(124,58,237,0.3)] rounded-full transition-shadow">
          <AvatarVendedor nome={usuario?.nome} fotoUrl={usuario?.fotoUrl} id={usuario?.id} tamanho={36} />
        </NavLink>
        <button
          onClick={logout}
          title="Sair"
          className="w-10 h-10 flex items-center justify-center rounded-[10px] text-text-muted hover:bg-bg-card-hover hover:text-accent-danger transition-all"
        >
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
}
