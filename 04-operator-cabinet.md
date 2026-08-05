# Phoenix Workforce Control — часть 4: кабинет оператора

## `src/components/operator/ShiftConsole.tsx`

```tsx
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

          <Button size="lg" variant="secondary" asChild>
            <Link to="/schedule">
              <CalendarClock />
              {schedule ? 'Изменить график' : 'Заполнить график'}
            </Link>
          </Button>
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
```

---

## `src/pages/operator/OperatorHomePage.tsx`

```tsx
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
```

---

## `src/components/operator/DailyScheduleForm.tsx`

```tsx
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { dailyScheduleSchema, type DailyScheduleInput } from '@/schemas/schedule.schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { REASON_LABEL } from '@/types/domain';
import type { DailySchedule } from '@/types/domain';
import { todayISO, trimSeconds } from '@/lib/time';
import type { ExtraReason } from '@/types/database';

interface Props {
  initial: DailySchedule | null;
  defaultStart: string;
  defaultEnd: string;
  onSubmit: (values: DailyScheduleInput) => void;
  pending: boolean;
}

export function DailyScheduleForm({ initial, defaultStart, defaultEnd, onSubmit, pending }: Props) {
  const form = useForm<DailyScheduleInput>({
    resolver: zodResolver(dailyScheduleSchema),
    defaultValues: {
      workDate: todayISO(),
      plannedStart: trimSeconds(defaultStart),
      plannedEnd: trimSeconds(defaultEnd),
      extraHours: 0,
      reason: 'other',
      comment: '',
    },
  });

  const { register, handleSubmit, reset, watch, formState } = form;
  const extra = watch('extraHours');

  useEffect(() => {
    if (!initial) return;
    reset({
      workDate: initial.work_date,
      plannedStart: trimSeconds(initial.planned_start),
      plannedEnd: trimSeconds(initial.planned_end),
      extraHours: initial.extra_hours,
      reason: (initial.reason ?? 'other') as ExtraReason,
      comment: initial.comment,
    });
  }, [initial, reset]);

  return (
    <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} noValidate className="p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field className="sm:col-span-2" label="Дата" error={formState.errors.workDate?.message}>
          <Input type="date" min={todayISO()} {...register('workDate')} />
        </Field>

        <Field label="Начало основной смены" error={formState.errors.plannedStart?.message}>
          <Input type="time" step={300} {...register('plannedStart')} />
        </Field>

        <Field label="Конец основной смены" error={formState.errors.plannedEnd?.message}>
          <Input type="time" step={300} {...register('plannedEnd')} />
        </Field>

        <Field label="Дополнительные часы" error={formState.errors.extraHours?.message}>
          <Input type="number" min={0} max={12} step={0.5} {...register('extraHours')} />
        </Field>

        <Field label="Причина доп. часов" error={formState.errors.reason?.message}>
          <select
            {...register('reason')}
            disabled={Number(extra) === 0}
            className="h-11 w-full rounded-sm border border-line-soft bg-surface-1 px-[13px] text-[0.9375rem]
                       transition-colors hover:border-line focus:border-ember focus:outline-none disabled:opacity-45"
          >
            {(Object.keys(REASON_LABEL) as ExtraReason[]).map((k) => (
              <option key={k} value={k}>
                {REASON_LABEL[k]}
              </option>
            ))}
          </select>
        </Field>

        <Field className="sm:col-span-2" label="Комментарий" error={formState.errors.comment?.message}>
          <Textarea rows={3} placeholder="Например: замена Алексея на вечернем блоке" {...register('comment')} />
        </Field>
      </div>

      {Number(extra) > 4 && (
        <p className="mt-4 rounded-sm border border-warn/40 bg-warn-dim px-3 py-2.5 text-[0.82rem] text-warn">
          Больше 4 доп. часов уйдёт руководителю на подтверждение.
        </p>
      )}

      <div className="mt-5 flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          Сохранить график
        </Button>
        <Button type="button" variant="ghost" onClick={() => reset()}>
          Сбросить
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label className="mb-[7px] block">{label}</Label>
      {children}
      {error && <p className="mt-[5px] text-[0.78rem] text-danger">{error}</p>}
    </div>
  );
}
```

---

## `src/pages/operator/OperatorSchedulePage.tsx`

```tsx
import { Check } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTodaySchedule } from '@/hooks/useShift';
import { useSaveDailySchedule } from '@/hooks/useSchedules';
import { DailyScheduleForm } from '@/components/operator/DailyScheduleForm';
import { Panel, PanelHead } from '@/components/common/Panel';
import { TableSkeleton } from '@/components/common/DataState';

const RULES = [
  'График на завтра заполняется до 20:00 текущего дня.',
  'Доп. часы свыше 4 требуют подтверждения руководителя.',
  'Изменить прошедшую дату нельзя, пишите руководителю.',
  'Фактическое время смены считается по кнопке «Выйти на линию», а не по графику.',
];

export default function OperatorSchedulePage() {
  const { user } = useAuth();
  const scheduleQ = useTodaySchedule(user?.employeeId ?? null);
  const save = useSaveDailySchedule();

  const [defStart = '09:00', defEnd = '18:00'] = (user?.defaultSchedule ?? '09:00-18:00').split('-');

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[1fr_340px]">
      <Panel>
        <PanelHead
          title="График на день"
          right={<span className="text-[0.76rem] text-ink-3">заполняется ежедневно</span>}
        />
        {scheduleQ.isLoading ? (
          <TableSkeleton rows={4} cols={3} />
        ) : (
          <DailyScheduleForm
            initial={scheduleQ.data ?? null}
            defaultStart={defStart}
            defaultEnd={defEnd}
            pending={save.isPending}
            onSubmit={(values) => save.mutate(values)}
          />
        )}
      </Panel>

      <Panel>
        <PanelHead title="Правила" />
        <ul className="flex flex-col gap-4 p-5 text-[0.85rem] text-ink-2">
          {RULES.map((r) => (
            <li key={r} className="flex gap-[10px]">
              <Check className="mt-0.5 size-4 flex-none text-online" />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
```

---

## `src/pages/operator/OperatorHistoryPage.tsx`

```tsx
import { useState } from 'react';
import { History as HistoryIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useShiftHistory } from '@/hooks/useShift';
import { Panel } from '@/components/common/Panel';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/common/DataState';
import { PlainTag } from '@/components/common/StatusTag';
import { Table, THead, TH, TR, TD } from '@/components/ui/table';
import { formatDate, formatMinutes, formatTime } from '@/lib/time';
import { cn } from '@/lib/utils';
import type { ShiftStatus } from '@/types/database';

const RANGE = { week: 7, month: 31 } as const;

const STATUS_LABEL: Record<ShiftStatus, string> = {
  online: 'Идёт сейчас',
  closed: 'Закрыта',
  auto_closed: 'Закрыта системой',
  absent: 'Прогул',
};

export default function OperatorHistoryPage() {
  const { user } = useAuth();
  const [range, setRange] = useState<keyof typeof RANGE>('week');
  const q = useShiftHistory(user?.employeeId ?? null, RANGE[range]);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="inline-flex gap-[2px] rounded-sm border border-line-soft bg-surface-2 p-[3px]">
          {(['week', 'month'] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setRange(k)}
              className={cn(
                'rounded-[7px] px-[13px] py-1.5 text-[0.8125rem] font-medium transition-colors duration-150',
                range === k ? 'bg-surface-3 text-ink' : 'text-ink-3 hover:text-ink',
              )}
            >
              {k === 'week' ? 'Неделя' : 'Месяц'}
            </button>
          ))}
        </div>
        <span className="ml-auto text-[0.8rem] text-ink-3">Показаны только ваши записи</span>
      </div>

      <Panel>
        {q.isLoading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : q.isError ? (
          <div className="p-5">
            <ErrorState error={q.error} onRetry={() => void q.refetch()} />
          </div>
        ) : !q.data?.length ? (
          <EmptyState
            icon={HistoryIcon}
            title="Смен пока нет"
            text="Как только вы отметитесь на линии, здесь появится история с фактическим временем."
          />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Дата</TH>
                <TH>Начало</TH>
                <TH>Конец</TH>
                <TH>Отработано</TH>
                <TH>Статус</TH>
              </tr>
            </THead>
            <tbody>
              {q.data.map((s) => (
                <TR key={s.id}>
                  <TD className="num">{formatDate(s.work_date)}</TD>
                  <TD className="num">{formatTime(s.started_at)}</TD>
                  <TD className="num text-ink-2">{s.ended_at ? formatTime(s.ended_at) : '—'}</TD>
                  <TD className="num font-semibold">{formatMinutes(s.total_minutes)}</TD>
                  <TD>
                    <PlainTag tone={s.status === 'online' ? 'ember' : 'neutral'}>
                      {STATUS_LABEL[s.status]}
                    </PlainTag>
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
    </>
  );
}
```
