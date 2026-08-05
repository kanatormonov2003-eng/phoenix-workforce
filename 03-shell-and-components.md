# Phoenix Workforce Control — часть 3: точка входа, роутинг, оболочка, общие компоненты

## `src/main.tsx`

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import App from './App';
import { AuthProvider } from '@/providers/AuthProvider';
import { QueryProvider } from '@/providers/QueryProvider';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryProvider>
        <AuthProvider>
          <App />
          <Toaster
            position="bottom-right"
            closeButton
            duration={4200}
            toastOptions={{
              classNames: {
                toast:
                  'bg-surface-2 border border-line text-ink rounded-md shadow-[0_22px_50px_-22px_oklch(0.05_0_0/.9)]',
                description: 'text-ink-3',
                actionButton: 'bg-ember text-bg-deep',
              },
            }}
          />
        </AuthProvider>
      </QueryProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
```

---

## `src/App.tsx`

```tsx
import { AppRoutes } from '@/routes/AppRoutes';

export default function App() {
  return <AppRoutes />;
}
```

---

## `src/routes/ProtectedRoute.tsx`

```tsx
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
```

## `src/routes/RoleGate.tsx`

```tsx
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
```

## `src/routes/AppRoutes.tsx`

```tsx
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
```

---

## `src/components/layout/AppShell.tsx`

```tsx
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { cn } from '@/lib/utils';

export function AppShell() {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[244px_1fr]">
      <button
        type="button"
        aria-label="Закрыть меню"
        onClick={() => setNavOpen(false)}
        className={cn(
          'fixed inset-0 z-[59] bg-bg-deep/60 transition-opacity duration-300 ease-out-quart lg:hidden',
          navOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />
      <Sidebar open={navOpen} onNavigate={() => setNavOpen(false)} />

      <div className="flex min-w-0 flex-col">
        <Topbar onBurger={() => setNavOpen(true)} />
        <main className="mx-auto w-full max-w-[1420px] animate-fade-up p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

## `src/components/layout/Sidebar.tsx`

```tsx
import { NavLink } from 'react-router-dom';
import {
  Flame, LayoutDashboard, Users, Radio, CalendarRange, BarChart3, Send,
  Power, CalendarClock, History, LogOut,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLineStatus } from '@/hooks/useLineStatus';
import { cn, initials } from '@/lib/utils';
import { ROUTES } from '@/lib/constants';

interface NavItem {
  to: string;
  label: string;
  icon: typeof Users;
  end?: boolean;
  badge?: number;
}

export function Sidebar({ open, onNavigate }: { open: boolean; onNavigate: () => void }) {
  const { user, isAdmin, signOut } = useAuth();
  const { data: line } = useLineStatus();
  const onlineCount = line?.filter((r) => r.line_state === 'online').length ?? 0;

  const items: NavItem[] = isAdmin
    ? [
        { to: ROUTES.admin.dashboard, label: 'Дашборд', icon: LayoutDashboard, end: true },
        { to: ROUTES.admin.operators, label: 'Операторы', icon: Users, badge: line?.length },
        { to: ROUTES.admin.monitor, label: 'Мониторинг линии', icon: Radio, badge: onlineCount },
        { to: ROUTES.admin.schedules, label: 'Графики', icon: CalendarRange },
        { to: ROUTES.admin.reports, label: 'Отчёты', icon: BarChart3 },
        { to: ROUTES.admin.settings, label: 'Telegram', icon: Send },
      ]
    : [
        { to: ROUTES.operator.home, label: 'Линия', icon: Power, end: true },
        { to: ROUTES.operator.schedule, label: 'Мой график', icon: CalendarClock },
        { to: ROUTES.operator.history, label: 'История смен', icon: History },
      ];

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-[60] flex w-[264px] flex-col gap-5 border-r border-line-soft bg-bg-deep px-3 pb-4 pt-5',
        'transition-transform duration-300 ease-out-expo lg:sticky lg:top-0 lg:h-dvh lg:w-auto lg:translate-x-0',
        open ? 'translate-x-0 shadow-[0_0_70px_oklch(0.05_0_0/.7)]' : '-translate-x-full',
      )}
    >
      <div className="ml-2 flex items-center gap-[10px]">
        <div className="grid size-9 place-items-center rounded-[10px] bg-ember shadow-[0_8px_28px_-8px_oklch(var(--ember)/.75)]">
          <Flame className="size-[19px] text-bg-deep" />
        </div>
        <div>
          <div className="text-[0.95rem] font-bold tracking-[-0.01em]">Phoenix</div>
          <div className="text-[0.72rem] font-medium uppercase tracking-[0.06em] text-ink-3">
            {isAdmin ? 'Control' : 'Workforce'}
          </div>
        </div>
      </div>

      <nav className="flex flex-col gap-[2px]">
        <div className="eyebrow mb-2 px-[10px]">{isAdmin ? 'Управление' : 'Моя смена'}</div>
        {items.map(({ to, label, icon: Icon, end, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-[11px] rounded-sm px-[10px] py-[9px] text-sm transition-colors duration-150 ease-out-quart',
                isActive
                  ? 'bg-ember-ghost font-medium text-ember-hi'
                  : 'text-ink-2 hover:bg-surface-1 hover:text-ink',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={cn('size-[17px]', isActive ? 'text-ember-hi' : 'text-ink-3')} />
                {label}
                {badge != null && (
                  <span
                    className={cn(
                      'num ml-auto rounded-full px-[7px] py-px text-[0.7rem]',
                      isActive ? 'bg-ember-dim text-ember-hi' : 'bg-surface-2 text-ink-3',
                    )}
                  >
                    {badge}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto border-t border-line-soft pt-3">
        <div className="flex items-center gap-[10px] rounded-sm px-2 py-[9px] transition-colors hover:bg-surface-1">
          <div className="grid size-8 flex-none place-items-center rounded-[9px] bg-surface-3 text-[0.75rem] font-bold text-ink-2">
            {initials(user?.fullName ?? '')}
          </div>
          <div className="min-w-0">
            <div className="truncate text-[0.82rem] font-medium">{user?.fullName}</div>
            <div className="truncate text-[0.7rem] text-ink-3">
              {isAdmin ? 'Администратор' : `Оператор · ${user?.project ?? '—'}`}
            </div>
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            title="Выйти"
            className="ml-auto grid size-[30px] flex-none place-items-center rounded-xs text-ink-3 transition-colors hover:bg-surface-3 hover:text-ink"
          >
            <LogOut className="size-[15px]" />
          </button>
        </div>
      </div>
    </aside>
  );
}
```

## `src/components/layout/Topbar.tsx`

```tsx
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { formatClock, formatDateLong } from '@/lib/time';

const TITLES: Record<string, [string, string]> = {
  '/': ['Линия', 'Ваш рабочий статус'],
  '/schedule': ['Мой график', 'Заполните смену на день'],
  '/history': ['История смен', 'Только ваши записи'],
  '/admin': ['Дашборд', formatDateLong()],
  '/admin/operators': ['Операторы', 'Управление учётными записями'],
  '/admin/monitor': ['Мониторинг линии', 'Обновление в реальном времени'],
  '/admin/schedules': ['Графики', 'Заявки операторов на смены'],
  '/admin/reports': ['Отчёты', 'Сводка по часам и нагрузке'],
  '/admin/settings': ['Telegram', 'Канал уведомлений о линии'],
};

export function Topbar({ onBurger }: { onBurger: () => void }) {
  const { pathname } = useLocation();
  const [clock, setClock] = useState(formatClock());
  const [title, sub] = TITLES[pathname] ?? ['Phoenix', ''];

  useEffect(() => {
    const id = setInterval(() => setClock(formatClock()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    document.title = `${title} · Phoenix`;
  }, [title]);

  return (
    <header className="sticky top-0 z-40 flex items-center gap-4 border-b border-line-soft bg-bg/[0.82] px-4 py-3 backdrop-blur-[14px] backdrop-saturate-150 md:px-6 md:py-4">
      <button
        type="button"
        onClick={onBurger}
        aria-label="Открыть меню"
        className="grid size-[30px] place-items-center rounded-xs text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink lg:hidden"
      >
        <Menu className="size-[19px]" />
      </button>

      <div className="min-w-0">
        <h2 className="truncate text-[1.0625rem] font-semibold">{title}</h2>
        <p className="-mt-0.5 truncate text-[0.78rem] text-ink-3 first-letter:uppercase">{sub}</p>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <span className="inline-flex items-center gap-[7px] text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-online">
          <span className="size-[7px] animate-pulse-ring rounded-full bg-online" />
          Live
        </span>
        <span className="num hidden text-sm text-ink-2 sm:inline">{clock}</span>
      </div>
    </header>
  );
}
```

---

## `src/components/common/BootScreen.tsx`

```tsx
import { Flame } from 'lucide-react';

export function BootScreen() {
  return (
    <div className="grid min-h-dvh place-items-center bg-bg-deep">
      <div className="flex flex-col items-center gap-4">
        <div className="grid size-11 animate-pulse place-items-center rounded-md bg-ember">
          <Flame className="size-6 text-bg-deep" />
        </div>
        <p className="text-sm text-ink-3">Проверяем доступ…</p>
      </div>
    </div>
  );
}
```

## `src/components/common/StatusTag.tsx`

```tsx
import { cn } from '@/lib/utils';
import { LINE_STATE_LABEL, APPROVAL_LABEL } from '@/types/domain';
import type { LineState, ApprovalStatus } from '@/types/database';

const LINE_STYLES: Record<LineState, string> = {
  online: 'bg-online-dim text-online border-online/40',
  offline: 'bg-surface-2 text-ink-3 border-line-soft',
  late: 'bg-warn-dim text-warn border-warn/40',
  blocked: 'bg-danger-dim text-danger border-danger/40',
};

const APPROVAL_STYLES: Record<ApprovalStatus, string> = {
  approved: 'bg-online-dim text-online border-online/40',
  pending: 'bg-warn-dim text-warn border-warn/40',
  rejected: 'bg-danger-dim text-danger border-danger/40',
};

const base =
  'inline-flex items-center gap-[6px] whitespace-nowrap rounded-xs border px-[9px] py-[3px] text-[0.74rem] font-medium';

export function LineTag({ state }: { state: LineState }) {
  return (
    <span className={cn(base, LINE_STYLES[state])}>
      <span
        className={cn('size-[6px] rounded-full bg-current', state === 'online' && 'animate-pulse-ring')}
      />
      {LINE_STATE_LABEL[state]}
    </span>
  );
}

export function ApprovalTag({ status }: { status: ApprovalStatus }) {
  return (
    <span className={cn(base, APPROVAL_STYLES[status])}>
      <span className="size-[6px] rounded-full bg-current" />
      {APPROVAL_LABEL[status]}
    </span>
  );
}

export function PlainTag({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'ember' }) {
  return (
    <span
      className={cn(
        base,
        tone === 'ember'
          ? 'border-ember-dim bg-ember-ghost text-ember-hi'
          : 'border-line-soft bg-surface-2 text-ink-2',
      )}
    >
      {children}
    </span>
  );
}
```

## `src/components/common/MetricStrip.tsx`

```tsx
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Metric {
  label: string;
  value: string | number;
  unit?: string;
  foot?: React.ReactNode;
  icon: LucideIcon;
  accent?: boolean;
}

export function MetricStrip({ metrics, loading }: { metrics: Metric[]; loading?: boolean }) {
  return (
    <div className="mb-6 grid grid-cols-1 overflow-hidden rounded-lg border border-line-soft bg-gradient-to-b from-surface-1 to-[oklch(0.165_0.011_322)] sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((m, i) => (
        <div
          key={m.label}
          className={cn(
            'relative border-b border-line-soft px-5 pb-4 pt-5 last:border-b-0',
            'sm:border-b-0 sm:[&:nth-child(-n+2)]:border-b xl:[&:nth-child(-n+2)]:border-b-0',
            'sm:odd:border-r xl:border-r xl:last:border-r-0',
            i === metrics.length - 1 && 'sm:border-r-0',
          )}
        >
          <div className="mb-3 flex items-center gap-[7px]">
            <m.icon className="size-[14px] text-ink-3" />
            <span className="eyebrow">{m.label}</span>
          </div>

          {loading ? (
            <div className="skeleton h-9 w-24" />
          ) : (
            <div className={cn('num text-[2.375rem] font-medium leading-none', m.accent && 'text-online')}>
              {m.value}
              {m.unit && <small className="ml-[3px] text-[0.95rem] font-normal tracking-normal text-ink-3">{m.unit}</small>}
            </div>
          )}

          {m.foot && <div className="mt-[10px] flex items-center gap-[6px] text-[0.78rem] text-ink-3">{m.foot}</div>}
        </div>
      ))}
    </div>
  );
}

export function Delta({ value, suffix = '' }: { value: number; suffix?: string }) {
  const up = value >= 0;
  return (
    <span
      className={cn(
        'num rounded-xs px-[6px] py-px text-[0.74rem]',
        up ? 'bg-online-dim text-online' : 'bg-danger-dim text-danger',
      )}
    >
      {up ? '+' : ''}
      {value}
      {suffix}
    </span>
  );
}
```

## `src/components/common/DataState.tsx`

```tsx
import type { LucideIcon } from 'lucide-react';
import { AlertOctagon, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { humanizeError } from '@/lib/errors';

export function EmptyState({
  icon: Icon,
  title,
  text,
  action,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-5 py-8 text-center">
      <div className="grid size-[52px] place-items-center rounded-[15px] border border-line-soft bg-surface-2 text-ink-3">
        <Icon className="size-[22px]" />
      </div>
      <h5 className="text-[0.95rem] font-semibold">{title}</h5>
      <p className="max-w-[38ch] text-[0.84rem] text-ink-3">{text}</p>
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="flex items-start gap-[11px] rounded-md border border-danger/45 bg-danger-dim p-4">
      <AlertOctagon className="mt-px size-[17px] flex-none text-danger" />
      <div className="min-w-0 flex-1">
        <strong className="mb-0.5 block text-sm text-[oklch(0.88_0.08_28)]">Не удалось загрузить данные</strong>
        <p className="text-[0.82rem] text-[oklch(0.76_0.05_28)]">{humanizeError(error)}</p>
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <RefreshCw className="size-[14px]" />
          Ещё раз
        </Button>
      )}
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div role="status" aria-label="Загрузка">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-3 border-b border-line-soft px-5 py-[13px] last:border-b-0">
          <div className="skeleton size-8 rounded-[9px]" />
          {Array.from({ length: cols - 1 }).map((__, c) => (
            <div key={c} className="skeleton h-3" style={{ width: `${[34, 18, 14, 20, 12][c] ?? 15}%` }} />
          ))}
        </div>
      ))}
    </div>
  );
}
```

## `src/components/common/ConfirmDialog.tsx`

```tsx
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

export interface ConfirmConfig {
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
}

export function ConfirmDialog({
  config,
  onOpenChange,
  pending,
}: {
  config: ConfirmConfig | null;
  onOpenChange: (open: boolean) => void;
  pending?: boolean;
}) {
  return (
    <AlertDialog open={Boolean(config)} onOpenChange={onOpenChange}>
      <AlertDialogContent className="border-line bg-surface-1">
        <AlertDialogHeader>
          <AlertDialogTitle>{config?.title}</AlertDialogTitle>
          <AlertDialogDescription className="text-ink-3">{config?.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Отмена</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={() => config?.onConfirm()}
            className={cn(
              config?.destructive &&
                'border border-danger/50 bg-danger-dim text-[oklch(0.88_0.10_28)] hover:bg-[oklch(0.36_0.13_22)]',
            )}
          >
            {pending ? 'Выполняем…' : config?.confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Хук-обёртка, чтобы не плодить состояние в каждой странице */
import { useCallback, useState } from 'react';

export function useConfirm() {
  const [config, setConfig] = useState<ConfirmConfig | null>(null);
  const ask = useCallback((c: ConfirmConfig) => setConfig(c), []);
  const close = useCallback(() => setConfig(null), []);
  return { config, ask, close };
}
```

## `src/components/common/Avatar.tsx`

```tsx
import { cn, initials } from '@/lib/utils';

export function Avatar({
  name,
  online,
  size = 'md',
}: {
  name: string;
  online?: boolean;
  size?: 'sm' | 'md';
}) {
  return (
    <div
      className={cn(
        'grid flex-none place-items-center rounded-[9px] font-bold tracking-[0.02em]',
        size === 'sm' ? 'size-7 text-[0.68rem]' : 'size-8 text-[0.75rem]',
        online ? 'bg-online-dim text-online' : 'bg-surface-3 text-ink-2',
      )}
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}
```

## `src/components/common/PersonCell.tsx`

```tsx
import { Avatar } from './Avatar';

export function PersonCell({ name, email, online }: { name: string; email: string; online?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-[11px]">
      <Avatar name={name} online={online} />
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{name}</div>
        <div className="truncate text-xs text-ink-3">{email}</div>
      </div>
    </div>
  );
}
```

## `src/components/common/Panel.tsx`

```tsx
import { cn } from '@/lib/utils';

export function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={cn('panel', className)}>{children}</section>;
}

export function PanelHead({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className="panel-head">
      <h4 className="text-[0.9375rem] font-semibold">{title}</h4>
      {right && <div className="ml-auto flex items-center gap-2">{right}</div>}
    </div>
  );
}

export function PanelBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('p-5', className)}>{children}</div>;
}
```

---

## `src/pages/LoginPage.tsx`

```tsx
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Flame, ShieldAlert, Loader2 } from 'lucide-react';
import { loginSchema, type LoginInput } from '@/schemas/auth.schema';
import { useAuth } from '@/hooks/useAuth';
import { humanizeError } from '@/lib/errors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const { session, user, signIn, loading } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });

  if (!loading && session && user) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/'} replace />;
  }

  const onSubmit = async (values: LoginInput) => {
    setServerError(null);
    try {
      await signIn(values.email.trim().toLowerCase(), values.password);
      navigate('/', { replace: true });
    } catch (err) {
      setServerError(humanizeError(err));
    }
  };

  return (
    <div
      className="grid min-h-dvh place-items-center p-5"
      style={{
        background:
          'radial-gradient(120% 80% at 12% 0%, oklch(0.225 0.060 32 / 0.55), transparent 62%),' +
          'radial-gradient(90% 70% at 100% 100%, oklch(0.20 0.040 322 / 0.7), transparent 60%),' +
          'oklch(var(--bg-deep))',
      }}
    >
      <div className="w-full max-w-[420px]">
        <div className="mb-7 flex items-center gap-[10px]">
          <div className="grid size-9 place-items-center rounded-[10px] bg-ember shadow-[0_8px_28px_-8px_oklch(var(--ember)/.75)]">
            <Flame className="size-[19px] text-bg-deep" />
          </div>
          <div>
            <div className="text-[0.95rem] font-bold">Phoenix</div>
            <div className="text-[0.72rem] font-medium uppercase tracking-[0.06em] text-ink-3">
              Workforce Control
            </div>
          </div>
        </div>

        <h1 className="mb-1.5 text-xl">Вход в систему</h1>
        <p className="mb-6 text-sm text-ink-2">Закрытый контур. Учётные записи выдаёт администратор.</p>

        {serverError && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-[9px] rounded-sm border border-danger/50 bg-danger-dim px-3 py-2.5 text-[0.84rem] text-[oklch(0.88_0.08_30)]"
          >
            <ShieldAlert className="mt-px size-4 flex-none" />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} noValidate className="space-y-4">
          <div className="space-y-[7px]">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              placeholder="operator@phoenix.io"
              aria-invalid={Boolean(errors.email)}
              {...register('email')}
            />
            {errors.email && <p className="text-[0.78rem] text-danger">{errors.email.message}</p>}
          </div>

          <div className="space-y-[7px]">
            <Label htmlFor="password">Пароль</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              aria-invalid={Boolean(errors.password)}
              {...register('password')}
            />
            {errors.password && <p className="text-[0.78rem] text-danger">{errors.password.message}</p>}
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Проверяем доступ
              </>
            ) : (
              'Войти'
            )}
          </Button>
        </form>

        <p className="mt-5 border-t border-line-soft pt-4 text-[0.8rem] leading-relaxed text-ink-3">
          Регистрация закрыта. Забыли пароль? Обратитесь к руководителю смены: новый пароль выдаётся вручную.
        </p>
      </div>
    </div>
  );
}
```

## `src/pages/BlockedPage.tsx`

```tsx
import { Ban } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

export default function BlockedPage() {
  const { signOut, user } = useAuth();
  return (
    <div className="grid min-h-dvh place-items-center bg-bg-deep p-6 text-center">
      <div className="max-w-[42ch]">
        <div className="mx-auto mb-5 grid size-14 place-items-center rounded-md border border-danger/40 bg-danger-dim">
          <Ban className="size-6 text-danger" />
        </div>
        <h1 className="mb-2 text-xl">Доступ приостановлен</h1>
        <p className="mb-6 text-sm text-ink-2">
          {user?.fullName}, ваша учётная запись заблокирована администратором. Активная смена закрыта
          автоматически. Свяжитесь с руководителем, чтобы восстановить доступ.
        </p>
        <Button variant="secondary" onClick={() => void signOut()}>
          Выйти
        </Button>
      </div>
    </div>
  );
}
```

## `src/pages/NotFoundPage.tsx`

```tsx
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="grid min-h-dvh place-items-center p-6 text-center">
      <div>
        <div className="num text-[clamp(5rem,18vw,10rem)] font-bold leading-[0.85] tracking-[-0.06em] text-surface-3">
          4<span className="text-ember">0</span>4
        </div>
        <h1 className="mb-2 mt-6 text-lg">Страница ушла со смены</h1>
        <p className="mb-7 text-sm text-ink-2">Такого маршрута нет или у вас нет к нему доступа.</p>
        <Button onClick={() => navigate(user?.role === 'admin' ? '/admin' : '/', { replace: true })}>
          Вернуться на панель
        </Button>
      </div>
    </div>
  );
}
```

---

## `src/components/ui/button.tsx` (кастомизированный shadcn)

```tsx
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-medium ' +
    'transition-[transform,background-color,opacity] duration-150 ease-out-quart active:translate-y-px ' +
    'disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-ember font-semibold text-[oklch(0.14_0.02_32)] hover:bg-ember-hi',
        online:
          'bg-online font-semibold text-[oklch(0.16_0.04_158)] shadow-[0_10px_34px_-14px_oklch(var(--online)/.9)] hover:bg-[oklch(0.83_0.15_158)]',
        secondary: 'border border-line-soft bg-surface-2 text-ink hover:border-line hover:bg-surface-3',
        destructive:
          'border border-danger/50 bg-danger-dim text-[oklch(0.88_0.10_28)] hover:bg-[oklch(0.38_0.13_25)]',
        ghost: 'text-ink-2 hover:bg-surface-2 hover:text-ink',
        link: 'text-ember-hi underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 px-3 text-[0.8125rem] [&_svg]:size-[14px]',
        default: 'h-10 px-[18px] [&_svg]:size-4',
        lg: 'h-12 rounded-md px-[22px] text-base [&_svg]:size-[18px]',
        icon: 'size-[30px] rounded-xs [&_svg]:size-[15px]',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />;
  },
);
Button.displayName = 'Button';

export { buttonVariants };
```

## `src/components/ui/input.tsx`

```tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        'flex h-11 w-full rounded-sm border border-line-soft bg-surface-1 px-[13px] py-[11px]',
        'text-[0.9375rem] font-light transition-colors duration-150 ease-out-quart',
        'placeholder:text-[oklch(0.48_0.012_322)]',
        'hover:border-line focus:border-ember focus:bg-surface-2 focus:outline-none focus-visible:ring-0',
        'aria-[invalid=true]:border-danger disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';
```

## `src/components/ui/table.tsx` (сокращённо, ключевые стили)

```tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

export const Table = ({ className, ...p }: React.HTMLAttributes<HTMLTableElement>) => (
  <div className="w-full overflow-x-auto">
    <table className={cn('w-full border-collapse', className)} {...p} />
  </div>
);

export const THead = ({ className, ...p }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <thead className={cn('bg-[oklch(0.165_0.011_322)]', className)} {...p} />
);

export const TH = ({ className, ...p }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th
    className={cn(
      'whitespace-nowrap border-b border-line-soft px-5 py-[11px] text-left',
      'text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-ink-3',
      className,
    )}
    {...p}
  />
);

export const TR = ({ className, ...p }: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={cn('transition-colors duration-100 hover:bg-surface-2', className)} {...p} />
);

export const TD = ({ className, ...p }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn('border-b border-line-soft px-5 py-[13px] align-middle text-sm', className)} {...p} />
);
```
