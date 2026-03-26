import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/Layout/ProtectedRoute';
import AppLayout from './components/Layout/AppLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Funil from './pages/Funil';
import MeusLeads from './pages/MeusLeads';
import FollowUps from './pages/FollowUps';
import Ranking from './pages/Ranking';
import Metas from './pages/Metas';
import Relatorios from './pages/Relatorios';
import Templates from './pages/Templates';
import Admin from './pages/Admin';
import SLAConfig from './pages/SLAConfig';
import WhatsAppAdmin from './pages/WhatsAppAdmin';
import VendedoresAdmin from './pages/VendedoresAdmin';
import LeadCard from './pages/LeadCard';
import Perfil from './pages/Perfil';
import Vendas from './pages/Vendas';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="funil" element={<Funil />} />
            <Route path="vendas" element={<Vendas />} />
            <Route path="meus-leads" element={<MeusLeads />} />
            <Route path="follow-ups" element={<FollowUps />} />
            <Route path="ranking" element={<Ranking />} />
            <Route path="metas" element={<Metas />} />
            <Route path="relatorios" element={<Relatorios />} />
            <Route path="templates" element={<Templates />} />
            <Route path="leads/:id" element={<LeadCard />} />
            <Route path="perfil" element={<Perfil />} />
            <Route path="admin" element={<Admin />}>
              <Route path="sla" element={<SLAConfig />} />
              <Route path="vendedores" element={<VendedoresAdmin />} />
              <Route path="whatsapp" element={<WhatsAppAdmin />} />
              <Route path="templates" element={<Templates />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
