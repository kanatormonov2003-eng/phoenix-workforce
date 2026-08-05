import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { RoleGate } from './RoleGate';
import { AppShell } from '@/components/layout/AppShell';
import { BootScreen } from '@/components/common/BootScreen';
import { useAuth } from '@/hooks/useAuth';

const LoginPage = lazy(() => import('@/pages/LoginPage'));
const BlockedPage = lazy(() => import('@/pages/BlockedPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

const OperatorHome = lazy(() => import('@/pages/operator/OperatorHomePage'));
const OperatorSchedule = lazy(() => import('@/pages/operator/OperatorSchedulePage'));
const OperatorHistory = lazy(() => import('@/pages/operator/OperatorHistoryPage'));

const Dashboard = lazy(() => import('@/pages/admin/DashboardPage'));
const Operators = lazy(() => import('@/pages/admin/OperatorsPage'));
const Monitor = lazy(() => import('@/pages/admin/MonitorPage'));
const Schedules = lazy(() => import('@/pages/admin/SchedulesPage'));
const Reports = lazy(() => import('@/pages/admin/ReportsPage'));
const Settings = lazy(() => import('@/pages/admin/SettingsPage'));

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <BootScreen />;
  return <Navigate to={user?.role === 'admin' ? '/admin' : '/'} replace />;
}

export function AppRoutes() {
  return (
    <Suspense fallback={<BootScreen />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/blocked" element={<BlockedPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            {/* оператор */}
            <Route element={<RoleGate allow="operator" />}>
              <Route index element={<OperatorHome />} />
              <Route path="schedule" element={<OperatorSchedule />} />
              <Route path="history" element={<OperatorHistory />} />
            </Route>

            {/* администратор */}
            <Route path="admin" element={<RoleGate allow="admin" />}>
              <Route index element={<Dashboard />} />
              <Route path="operators" element={<Operators />} />
              <Route path="monitor" element={<Monitor />} />
              <Route path="schedules" element={<Schedules />} />
              <Route path="reports" element={<Reports />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Route>
        </Route>

        <Route path="/home" element={<RootRedirect />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
