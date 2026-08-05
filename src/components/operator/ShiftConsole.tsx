import { useEffect, useState } from 'react';
import { Power, PowerOff, CalendarClock, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ConfirmDialog, useConfirm } from '@/components/common/ConfirmDialog';
import { cn } from '@/lib/utils';
import { formatElapsed, formatMinutes, formatTime, greeting, shiftProgress, trimSeconds } from '@/lib/time';
import type { Shift, DailySchedule, SessionUser } from '@/types/domain';

interface Props {
  user: SessionUser;
  shift: Shift | null;
  schedule: DailySchedule | null;
  onStart: () => void;
  onEnd: () => void;
  starting: boolean;
  ending: boolean;
}

export function ShiftConsole({ user, shift, schedule, onStart, onEnd, starting, ending }: Props) {
  const online = Boolean(shift);
  const [now, setNow] = useState(() => new Date());
  const { config, ask, close } = useConfirm();

  useEffect(() => {
    if (!online) return;
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [online]);

  const plannedStart = trimSeconds(schedule?.planned_start ?? null);
  const plannedEnd = trimSeconds(schedule?.planned_end ?? null);
  const plannedHours =
    schedule && schedule.planned_start && schedule.planned_end
      ? Math.max(1, hoursBetween(schedule.planned_start, schedule.planned_end))
      : 9;

  const progress = shift ? shiftProgress(shift.started_at, plannedHours, now) : 0;
  const elapsedMinutes = shift ? Math.floor((now.getTime() - new Date(shift.started_at).getTime()) / 60000) : 0;

  return (
    <>
      <section
        className={cn(
          'relative overflow-hidden rounded-lg border p-5 md:p-6',
          online ? 'border-online/45' : 'border-line-soft',
        )}
        style={{
          background: online
            ? 'radial-gradient(80% 120% at 100% 0%, oklch(0.26 0.07 158 / .55), transparent 65%), oklch(var(--surface-1))'
            : 'radial-gradient(80% 120% at 100% 0%, oklch(0.24 0.055 32 / .5), transparent 65%), oklch(var(--surface-1))',
        }}
      >
        <h1 className="mb-1.5 text-[clamp(1.5rem,3.4vw,2.125rem)] font-semibold leading-tight">
          {greeting(now)},{' '}
          <b className={cn('font-semibold', online ? 'text-online' : 'text-ember-hi')}>
            {user.firstName || user.fullName}
          </b>
        </h1>
        <p className="mb-6 text-sm text-ink-2">
          {schedule
            ? `Смена по графику: ${plannedStart} – ${plannedEnd} · ${user.project ?? 'без проекта'}`
            : 'График на сегодня не заполнен. Заполните его, чтобы учёт был корректным.'}
        </p>

        <div className="mb-6 flex flex-wrap items-center gap-5">
          <span
            className={cn(
              'inline-flex items-center gap-[9px] rounded-full border py-[7px] pl-3 pr-[15px] text-[0.82rem] font-semibold',
              online
                ? 'border-online/45 bg-online-dim text-online'
                : 'border-line-soft bg-surface-2 text-ink-2',
            )}
          >
            <span className={cn('size-2 rounded-full', online ? 'animate-pulse-ring bg-online' : 'bg-[oklch(0.52_0.055_22)]')} />
            {online ? 'На линии' : 'Не работает'}
          </span>

          {shift && (
            <div className="flex items-baseline gap-[10px]">
              <span className="num text-[2.75rem] font-medium leading-none">{formatElapsed(shift.started_at, now)}</span>
              <span className="text-[0.82rem] text-ink-3">с {formatTime(shift.started_at)}</span>
            </div>
          )}
        </div>

        {shift && (
          <div className="mb-6">
            <div className="mb-3 h-[5px] overflow-hidden rounded-full bg-surface-2">
              <span
                className="block h-full rounded-full bg-online transition-[width] duration-500 ease-out-expo"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-ink-3">
              <span className="num">{plannedStart}</span>
              <span>{Math.round(progress)}% смены · {formatMinutes(elapsedMinutes)}</span>
              <span className="num">{plannedEnd}</span>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {online ? (
            <Button
              size="lg"
              variant="destructive"
              disabled={ending}
              onClick={() =>
                ask({
                  title: 'Завершить смену?',
                  description: `Отработано ${formatMinutes(elapsedMinutes)}. После закрытия смену можно изменить только через руководителя.`,
                  confirmLabel: 'Завершить',
                  destructive: true,
                  onConfirm: () => {
                    close();
                    onEnd();
                  },
                })
              }
            >
              {ending ? <Loader2 className="animate-spin" /> : <PowerOff />}
              Завершить смену
            </Button>
          ) : (
            <Button size="lg" variant="online" disabled={starting} onClick={onStart}>
              {starting ? <Loader2 className="animate-spin" /> : <Power />}
              Выйти на линию
            </Button>
          )}

          <Link to="/schedule">
  <Button size="lg" variant="secondary">
    <CalendarClock />
    {schedule ? 'Изменить график' : 'Заполнить график'}
  </Button>
</Link>
        </div>
      </section>

      <ConfirmDialog config={config} onOpenChange={(o) => !o && close()} pending={ending} />
    </>
  );
}

function hoursBetween(start: string, end: string): number {
  const [sh = 0, sm = 0] = start.split(':').map(Number);
  const [eh = 0, em = 0] = end.split(':').map(Number);
  const diff = eh * 60 + em - (sh * 60 + sm);
  return (diff <= 0 ? diff + 24 * 60 : diff) / 60;
}
