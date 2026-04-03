import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import DashboardPage from './DashboardPage';
import SalesPage from './SalesPage';

const Index = () => {
  const { user, isAdmin } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return isAdmin ? <DashboardPage /> : <SalesPage />;
};

export default Index;
