import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { BootScreen } from '@/components/common/BootScreen';
import { ROUTES } from '@/lib/constants';

export function ProtectedRoute() {
  const { session, user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <BootScreen />;
  if (!session) return <Navigate to={ROUTES.login} replace state={{ from: location.pathname }} />;
  if (user && !user.isActive) return <Navigate to={ROUTES.blocked} replace />;

  return <Outlet />;
}
