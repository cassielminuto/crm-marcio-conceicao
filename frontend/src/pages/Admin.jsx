import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Settings, Clock } from 'lucide-react';

export default function Admin() {
  const location = useLocation();
  const isRoot = location.pathname === '/admin';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Administracao</h1>
        <p className="text-sm text-gray-500 mt-1">Configuracoes do sistema</p>
      </div>

      <div className="flex gap-3">
        <NavLink
          to="/admin/sla"
          className={({ isActive }) =>
            `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`
          }
        >
          <Clock size={16} /> SLA Config
        </NavLink>
      </div>

      {isRoot && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Settings size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">Selecione uma opcao acima</p>
        </div>
      )}

      <Outlet />
    </div>
  );
}
