import { CalendarDays, Clock, PlusCircle, TrendingUp } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentShift, useTodaySchedule, useShiftHistory, useStartShift, useEndShift } from '@/hooks/useShift';
import { ShiftConsole } from '@/components/operator/ShiftConsole';
import { Panel, PanelHead } from '@/components/common/Panel';
import { ErrorState } from '@/components/common/DataState';
import { ApprovalTag } from '@/components/common/StatusTag';
import { formatDate, formatMinutes, formatTime, todayISO, trimSeconds } from '@/lib/time';

export default function OperatorHomePage() {
  const { user } = useAuth();
  const employeeId = user?.employeeId ?? null;

  const shiftQ = useCurrentShift(employeeId);
  const schedQ = useTodaySchedule(employeeId);
  const histQ = useShiftHistory(employeeId, 7);

  const start = useStartShift();
  const end = useEndShift();

  if (!user) return null;
  if (shiftQ.isError) return <ErrorState error={shiftQ.error} onRetry={() => void shiftQ.refetch()} />;

  const weekMinutes = (histQ.data ?? []).reduce((acc, s) => acc + (s.total_minutes ?? 0), 0);
  const weekTarget = 45 * 60;
  const weekPct = Math.min(100, Math.round((weekMinutes / weekTarget) * 100));

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[1fr_340px]">
      <ShiftConsole
        user={user}
        shift={shiftQ.data ?? null}
        schedule={schedQ.data ?? null}
        onStart={() => start.mutate()}
        onEnd={() => end.mutate(undefined)}
        starting={start.isPending}
        ending={end.isPending}
      />

      <div className="flex flex-col gap-5">
        <Panel>
          <PanelHead title="Сегодня" />
          <dl className="flex flex-col">
            <Row icon={CalendarDays} label="Дата" value={formatDate(todayISO())} />
            <Row
              icon={Clock}
              label="Плановая смена"
              value={
                schedQ.data
                  ? `${trimSeconds(schedQ.data.planned_start)} – ${trimSeconds(schedQ.data.planned_end)}`
                  : 'не заполнена'
              }
            />
            <Row
              icon={Clock}
              label="Фактически начал"
              value={shiftQ.data ? formatTime(shiftQ.data.started_at) : '—'}
            />
            <Row
              icon={PlusCircle}
              label="Доп. часы"
              value={schedQ.data?.extra_hours ? `${schedQ.data.extra_hours.toFixed(1)} ч` : '0'}
            />
            <div className="flex items-center gap-3 px-5 py-[13px]">
              <span className="text-[0.84rem] text-ink-2">Статус графика</span>
              <span className="ml-auto">
                {schedQ.data ? <ApprovalTag status={schedQ.data.status} /> : <span className="text-sm text-ink-3">—</span>}
              </span>
            </div>
          </dl>
        </Panel>

        <Panel>
          <PanelHead title="За последние 7 смен" />
          <div className="p-5">
            <div className="mb-3 flex items-end justify-between">
              <div>
                <div className="num text-[1.875rem] font-medium leading-none">
                  {Math.floor(weekMinutes / 60)}
                  <small className="ml-1 text-[0.95rem] font-normal text-ink-3">
                    ч {String(weekMinutes % 60).padStart(2, '0')}м
                  </small>
                </div>
                <p className="mt-1 text-[0.78rem] text-ink-3">
                  {histQ.data?.length ?? 0} смен · {formatMinutes(weekMinutes / Math.max(1, histQ.data?.length ?? 1))} в среднем
                </p>
              </div>
              <TrendingUp className="size-5 text-online" />
            </div>
            <div className="h-[5px] overflow-hidden rounded-full bg-surface-2">
              <span
                className="block h-full rounded-full bg-online transition-[width] duration-500 ease-out-expo"
                style={{ width: `${weekPct}%` }}
              />
            </div>
            <div className="mt-3 flex justify-between text-xs text-ink-3">
              <span>{weekPct}% недельной нормы</span>
              <span className="num">45 ч</span>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-line-soft px-5 py-[13px]">
      <Icon className="size-[15px] text-ink-3" />
      <span className="text-[0.84rem] text-ink-2">{label}</span>
      <span className="num ml-auto text-[0.86rem] font-medium">{value}</span>
    </div>
  );
}
