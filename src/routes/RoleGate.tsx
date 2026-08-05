import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import type { AppRole } from '@/types/database';
import { BootScreen } from '@/components/common/BootScreen';

export function RoleGate({ allow }: { allow: AppRole }) {
  const { user, loading } = useAuth();

  if (loading) return <BootScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== allow) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/'} replace />;
  }
  return <Outlet />;
}
