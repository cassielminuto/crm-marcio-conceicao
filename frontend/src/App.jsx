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
import Admin from './pages/Admin';

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
            <Route path="meus-leads" element={<MeusLeads />} />
            <Route path="follow-ups" element={<FollowUps />} />
            <Route path="ranking" element={<Ranking />} />
            <Route path="metas" element={<Metas />} />
            <Route path="admin" element={<Admin />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
