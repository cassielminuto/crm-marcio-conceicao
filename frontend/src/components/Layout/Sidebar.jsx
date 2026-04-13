import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AvatarVendedor from '../AvatarVendedor';
import api from '../../services/api';
import {
  LayoutDashboard, Kanban, DollarSign, Users, CalendarCheck,
  Trophy, Target, BarChart3, Settings, LogOut, UserSearch, Calendar,
} from 'lucide-react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/funil', label: 'Funil', icon: Kanban },
  { to: '/vendas', label: 'Vendas', icon: DollarSign },
  { to: '/sdr', label: 'SDR', icon: UserSearch },
  { to: '/meus-leads', label: 'Meus Leads', icon: Users },
  { to: '/follow-ups', label: 'Follow-ups', icon: CalendarCheck },
  { to: '/ranking', label: 'Ranking', icon: Trophy },
  { to: '/metas', label: 'Metas', icon: Target },
  { to: '/agenda', label: 'Agenda', icon: Calendar },
  { to: '/relatorios', label: 'Relatorios', icon: BarChart3, adminOnly: true },
];

const adminItems = [
  { to: '/admin', label: 'Admin', icon: Settings },
];

function SidebarIcon({ to, label, icon: Icon, badge }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      title={label}
      className="group relative"
    >
      {({ isActive }) => (
        <div className={`relative w-10 h-10 flex items-center justify-center rounded-[10px] transition-all duration-200 ${
          isActive
            ? 'bg-[rgba(124,58,237,0.15)] text-accent-violet-light'
            : 'text-text-muted hover:bg-bg-card-hover hover:text-text-secondary'
        }`}>
          {/* Active indicator bar on left */}
          {isActive && (
            <span className="absolute -left-[5px] top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-accent-violet shadow-[0_0_8px_rgba(124,58,237,0.5)]" />
          )}
          <span className="transition-transform duration-200 group-hover:scale-110 flex items-center justify-center">
            <Icon size={20} />
          </span>
          {/* Badge */}
          {badge > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-accent-violet text-[9px] font-bold text-white px-1 leading-none">
              {badge > 9 ? '9+' : badge}
            </span>
          )}
          {/* Tooltip — slides in from left */}
          <span className="absolute left-full ml-3 px-2.5 py-1 rounded-md bg-bg-elevated border border-border-hover text-[11px] font-medium text-text-primary whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 group-hover:animate-slide-in-left transition-opacity z-50 shadow-lg">
            {label}
          </span>
        </div>
      )}
    </NavLink>
  );
}

export default function Sidebar() {
  const { usuario, logout } = useAuth();
  const isAdmin = usuario?.perfil === 'admin' || usuario?.perfil === 'gestor';
  const [reunioesHoje, setReunioesHoje] = useState(0);

  useEffect(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    const params = new URLSearchParams({
      data_inicio: hoje.toISOString(),
      data_fim: amanha.toISOString(),
    });
    // Closer comum: só seus eventos (backend filtra por vendedor_id)
    if (usuario?.perfil === 'vendedor' && usuario?.vendedorId) {
      params.set('vendedor_id', usuario.vendedorId);
    }

    api.get(`/agenda?${params.toString()}`).then(res => {
      const eventos = res.data?.eventos || [];
      const count = eventos.filter(ev => ev.tipo.startsWith('reuniao_')).length;
      setReunioesHoje(count);
    }).catch(() => {});
  }, [usuario]);

  return (
    <aside className="w-16 shrink-0 bg-bg-secondary flex flex-col items-center min-h-screen border-r border-border-default py-4 relative z-[2]">
      {/* Subtle gradient accent line on right edge */}
      <div className="absolute top-0 right-0 w-px h-full bg-gradient-to-b from-transparent via-[rgba(124,58,237,0.2)] to-transparent pointer-events-none" />

      {/* Logo with subtle glow */}
      <NavLink to="/" className="relative w-9 h-9 rounded-[10px] bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] flex items-center justify-center mb-6 shrink-0 hover:shadow-[0_0_20px_rgba(124,58,237,0.3)] transition-shadow" title="HLPIPE">
        <span className="absolute inset-0 rounded-[10px] bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] opacity-40 blur-[8px] -z-10" />
        <span className="text-[11px] font-bold text-white tracking-tight">HL</span>
      </NavLink>

      {/* Nav icons */}
      <nav className="flex-1 flex flex-col items-center gap-1">
        {navItems.filter(item => !item.adminOnly || isAdmin).map(item => (
          <SidebarIcon key={item.to} {...item} badge={item.to === '/agenda' ? reunioesHoje : undefined} />
        ))}
        {isAdmin && (
          <>
            {/* Gradient separator between main nav and admin */}
            <div className="w-6 my-2">
              <div className="h-px bg-gradient-to-r from-transparent via-border-hover to-transparent" />
            </div>
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
          className="group w-10 h-10 flex items-center justify-center rounded-[10px] text-text-muted hover:bg-bg-card-hover hover:text-accent-danger transition-all"
        >
          <span className="transition-transform duration-200 group-hover:scale-110 flex items-center justify-center">
            <LogOut size={18} />
          </span>
        </button>
      </div>
    </aside>
  );
}
