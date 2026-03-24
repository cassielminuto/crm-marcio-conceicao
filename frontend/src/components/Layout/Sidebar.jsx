import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Kanban,
  Users,
  CalendarCheck,
  Trophy,
  Target,
  BarChart3,
  Settings,
  LogOut,
  Layers,
} from 'lucide-react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/funil', label: 'Funil', icon: Kanban },
  { to: '/meus-leads', label: 'Meus Leads', icon: Users },
  { to: '/follow-ups', label: 'Follow-ups', icon: CalendarCheck },
  { to: '/ranking', label: 'Ranking', icon: Trophy },
  { to: '/metas', label: 'Metas', icon: Target },
  { to: '/relatorios', label: 'Relatorios', icon: BarChart3, adminOnly: true },
];

const adminItems = [
  { to: '/admin', label: 'Admin', icon: Settings },
];

function UserAvatar({ nome }) {
  const iniciais = (nome || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="w-[34px] h-[34px] rounded-lg bg-gradient-to-br from-[#6c5ce7] to-[#00cec9] flex items-center justify-center text-[11px] font-bold text-white shrink-0">
      {iniciais}
    </div>
  );
}

export default function Sidebar() {
  const { usuario, logout } = useAuth();

  const isAdmin = usuario?.perfil === 'admin' || usuario?.perfil === 'gestor';

  return (
    <aside className="w-[240px] shrink-0 bg-bg-secondary flex flex-col min-h-screen border-r border-border-subtle">
      <div className="px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="w-[36px] h-[36px] rounded-[10px] bg-gradient-to-br from-[#6c5ce7] to-[#00cec9] flex items-center justify-center shrink-0">
            <Layers size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-[15px] font-bold text-white leading-tight">Compativeis</h1>
            <span className="text-[10px] text-text-muted">CRM &bull; v2.0</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-2">
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[1.5px] text-text-faint">
          Menu
        </p>
        <ul className="space-y-0.5">
          {navItems.filter((item) => !item.adminOnly || isAdmin).map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-[10px] rounded-[10px] text-[13px] font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-[rgba(108,92,231,0.15)] text-accent-violet-light'
                      : 'text-text-secondary hover:bg-white/[0.03] hover:text-[#b0b0d0]'
                  }`
                }
              >
                <Icon size={18} className={undefined} />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>

        {isAdmin && (
          <>
            <p className="px-3 mt-6 mb-2 text-[10px] font-semibold uppercase tracking-[1.5px] text-text-faint">
              Administracao
            </p>
            <ul className="space-y-0.5">
              {adminItems.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-[10px] rounded-[10px] text-[13px] font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-[rgba(108,92,231,0.15)] text-accent-violet-light'
                          : 'text-text-secondary hover:bg-white/[0.03] hover:text-[#b0b0d0]'
                      }`
                    }
                  >
                    <Icon size={18} />
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </>
        )}
      </nav>

      <div className="px-4 py-4 border-t border-border-subtle">
        <div className="flex items-center gap-3">
          <UserAvatar nome={usuario?.nome} />
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-white truncate">{usuario?.nome}</p>
            <p className="text-[10px] text-text-muted truncate">{usuario?.perfil}</p>
          </div>
          <button
            onClick={logout}
            className="p-2 text-text-muted hover:text-text-secondary hover:bg-white/[0.03] rounded-[10px] transition-colors"
            title="Sair"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}
