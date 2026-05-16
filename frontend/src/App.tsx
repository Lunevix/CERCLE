import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CircleDetailPage from './pages/CircleDetailPage';
import CreateCirclePage from './pages/CreateCirclePage';
import ReputationPage from './pages/ReputationPage';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAuthStore(s => s.token);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<DashboardPage />} />
        <Route path="circles/new" element={<CreateCirclePage />} />
        <Route path="circles/:id" element={<CircleDetailPage />} />
        <Route path="reputation" element={<ReputationPage />} />
      </Route>
    </Routes>
  );
}
