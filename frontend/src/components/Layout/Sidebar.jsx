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

export default function Sidebar() {
  const { usuario, logout } = useAuth();

  const isAdmin = usuario?.perfil === 'admin' || usuario?.perfil === 'gestor';

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col min-h-screen">
      <div className="p-6 border-b border-gray-700">
        <h1 className="text-lg font-bold">CRM Compatíveis</h1>
        <p className="text-sm text-gray-400 mt-1">Márcio Conceição</p>
      </div>

      <nav className="flex-1 py-4">
        <ul className="space-y-1 px-3">
          {navItems.filter((item) => !item.adminOnly || isAdmin).map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            </li>
          ))}

          {isAdmin && (
            <>
              <li className="pt-4 pb-2">
                <span className="px-3 text-xs font-semibold text-gray-500 uppercase">
                  Administração
                </span>
              </li>
              {adminItems.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      }`
                    }
                  >
                    <Icon size={18} />
                    {label}
                  </NavLink>
                </li>
              ))}
            </>
          )}
        </ul>
      </nav>

      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{usuario?.nome}</p>
            <p className="text-xs text-gray-400 truncate">{usuario?.perfil}</p>
          </div>
          <button
            onClick={logout}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            title="Sair"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}
