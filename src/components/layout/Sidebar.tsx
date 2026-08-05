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
