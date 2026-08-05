# Phoenix Workforce Control — часть 5: админ-панель

## `src/pages/admin/DashboardPage.tsx`

```tsx
import { Users, Radio, Clock, PlusCircle, AlertTriangle, Hourglass, Moon } from 'lucide-react';
import { useDashboardStats } from '@/hooks/useReports';
import { useLineStatus } from '@/hooks/useLineStatus';
import { MetricStrip, Delta, type Metric } from '@/components/common/MetricStrip';
import { Panel, PanelHead } from '@/components/common/Panel';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/common/DataState';
import { PersonCell } from '@/components/common/PersonCell';
import { LineTag, PlainTag } from '@/components/common/StatusTag';
import { Table, THead, TH, TR, TD } from '@/components/ui/table';
import { LoadChart } from '@/components/admin/LoadChart';
import { formatMinutes } from '@/lib/time';

export default function DashboardPage() {
  const stats = useDashboardStats();
  const line = useLineStatus();

  const s = stats.data;
  const online = (line.data ?? []).filter((r) => r.line_state === 'online');
  const late = (line.data ?? []).filter((r) => r.line_state === 'late');
  const stale = online.filter((r) => r.today_minutes > 11 * 60);

  const metrics: Metric[] = [
    {
      label: 'Всего сотрудников',
      value: s?.total_employees ?? 0,
      icon: Users,
      foot: s?.blocked ? <span>{s.blocked} заблокировано</span> : <span>все активны</span>,
    },
    {
      label: 'Онлайн сейчас',
      value: s?.online_now ?? 0,
      unit: `/${s?.total_employees ?? 0}`,
      icon: Radio,
      accent: true,
      foot: (
        <span>
          {s?.total_employees ? Math.round(((s.online_now ?? 0) / s.total_employees) * 100) : 0}% линии занято
        </span>
      ),
    },
    {
      label: 'Часов сегодня',
      value: s?.hours_today ?? 0,
      unit: ' ч',
      icon: Clock,
      foot: <span>{s?.worked_today ?? 0} сотрудников работали</span>,
    },
    {
      label: 'Доп. часы',
      value: s?.extra_today ?? 0,
      unit: ' ч',
      icon: PlusCircle,
      foot: <span>среднее на смену {formatMinutes(s?.avg_minutes ?? 0)}</span>,
    },
  ];

  return (
    <>
      {stats.isError && (
        <div className="mb-5">
          <ErrorState error={stats.error} onRetry={() => void stats.refetch()} />
        </div>
      )}

      <MetricStrip metrics={metrics} loading={stats.isLoading} />

      <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <Panel>
          <PanelHead
            title="Кто на линии"
            right={<span className="text-[0.76rem] text-ink-3">{online.length} активных смен</span>}
          />
          {line.isLoading ? (
            <TableSkeleton rows={5} cols={5} />
          ) : !online.length ? (
            <EmptyState
              icon={Moon}
              title="Линия пуста"
              text="Сейчас никто не отмечен на линии. Первая смена по графику начнётся утром."
            />
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Оператор</TH>
                  <TH>Проект</TH>
                  <TH>Начал</TH>
                  <TH>В смене</TH>
                  <TH>Статус</TH>
                </tr>
              </THead>
              <tbody>
                {online.map((r) => (
                  <TR key={r.employee_id}>
                    <TD>
                      <PersonCell name={r.full_name} email={r.email} online />
                    </TD>
                    <TD>
                      <PlainTag>{r.project}</PlainTag>
                    </TD>
                    <TD className="num">{r.started_label ?? '—'}</TD>
                    <TD className="num">{formatMinutes(r.today_minutes)}</TD>
                    <TD>
                      <LineTag state={r.line_state} />
                    </TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>

        <div className="flex flex-col gap-5">
          <Panel>
            <PanelHead title="Требуют внимания" />
            <div className="flex flex-col gap-3 p-5">
              {!late.length && !stale.length && (
                <p className="text-sm text-ink-3">Всё спокойно. Опозданий и зависших смен нет.</p>
              )}

              {late.map((r) => (
                <div
                  key={r.employee_id}
                  className="flex items-start gap-[11px] rounded-md border border-danger/45 bg-danger-dim p-4"
                >
                  <AlertTriangle className="mt-px size-[17px] flex-none text-danger" />
                  <div>
                    <strong className="mb-0.5 block text-sm text-[oklch(0.88_0.08_28)]">Опоздание на линию</strong>
                    <p className="text-[0.82rem] text-[oklch(0.76_0.05_28)]">
                      {r.full_name} — смена с {r.planned_start?.slice(0, 5) ?? '—'}, не вышел. Уведомление
                      отправлено в Telegram.
                    </p>
                  </div>
                </div>
              ))}

              {stale.map((r) => (
                <div
                  key={r.employee_id}
                  className="flex items-start gap-[11px] rounded-md border border-warn/45 bg-warn-dim p-4"
                >
                  <Hourglass className="mt-px size-[17px] flex-none text-warn" />
                  <div>
                    <strong className="mb-0.5 block text-sm text-[oklch(0.92_0.07_82)]">Незакрытая смена</strong>
                    <p className="text-[0.82rem] text-[oklch(0.80_0.04_82)]">
                      {r.full_name} в статусе online уже {formatMinutes(r.today_minutes)}.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <PanelHead title="Загрузка по часам" right={<PlainTag tone="ember">сегодня</PlainTag>} />
            <div className="p-5">
              <LoadChart />
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
```

---

## `src/components/admin/LoadChart.tsx`

```tsx
import { useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useDailySummary } from '@/hooks/useReports';

/** Раскладывает смены по часам суток: сколько операторов было на линии в каждый час */
export function LoadChart() {
  const { data, isLoading } = useDailySummary();

  const series = useMemo(() => {
    const buckets = Array.from({ length: 15 }, (_, i) => ({ hour: `${String(i + 7).padStart(2, '0')}`, count: 0 }));
    for (const row of data ?? []) {
      if (!row.first_start) continue;
      const from = new Date(row.first_start).getHours();
      const to = row.last_end ? new Date(row.last_end).getHours() : new Date().getHours();
      for (let h = from; h <= to; h += 1) {
        const idx = h - 7;
        const bucket = buckets[idx];
        if (bucket) bucket.count += 1;
      }
    }
    return buckets;
  }, [data]);

  if (isLoading) return <div className="skeleton h-[150px] w-full rounded-md" />;

  return (
    <ResponsiveContainer width="100%" height={150}>
      <AreaChart data={series} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
        <defs>
          <linearGradient id="emberFade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.665 0.185 32)" stopOpacity={0.34} />
            <stop offset="100%" stopColor="oklch(0.665 0.185 32)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="oklch(0.225 0.012 322)" vertical={false} />
        <XAxis dataKey="hour" tickLine={false} axisLine={{ stroke: 'oklch(0.245 0.012 322)' }}
               tick={{ fill: 'oklch(0.575 0.013 322)', fontSize: 11 }} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false}
               tick={{ fill: 'oklch(0.575 0.013 322)', fontSize: 11 }} />
        <Tooltip
          cursor={{ stroke: 'oklch(0.315 0.013 322)' }}
          contentStyle={{
            background: 'oklch(0.225 0.013 322)',
            border: '1px solid oklch(0.315 0.013 322)',
            borderRadius: 9,
            fontSize: 12,
            color: 'oklch(0.955 0.005 322)',
          }}
          labelFormatter={(l: string) => `${l}:00`}
          formatter={(v: number) => [`${v} операторов`, 'На линии']}
        />
        <Area type="monotone" dataKey="count" stroke="oklch(0.665 0.185 32)" strokeWidth={2}
              fill="url(#emberFade)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
```

---

## `src/components/admin/OperatorDialog.tsx`

```tsx
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dices, Loader2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { employeeCreateSchema, type EmployeeCreateInput } from '@/schemas/employee.schema';
import { useProjects } from '@/hooks/useEmployees';
import { generatePassword } from '@/lib/utils';
import { SCHEDULE_PRESETS } from '@/lib/constants';
import type { EmployeeListItem } from '@/types/domain';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  editing: EmployeeListItem | null;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: EmployeeCreateInput) => void;
}

export function OperatorDialog({ open, editing, pending, onOpenChange, onSubmit }: Props) {
  const { data: projects } = useProjects();
  const isEdit = Boolean(editing);

  const form = useForm<EmployeeCreateInput>({
    resolver: zodResolver(employeeCreateSchema),
    defaultValues: {
      firstName: '', lastName: '', email: '', password: '',
      projectId: '', schedule: '09:00-18:00',
      defaultStart: '09:00', defaultEnd: '18:00', phone: '',
    },
  });
  const { register, handleSubmit, reset, setValue, watch, formState } = form;

  useEffect(() => {
    if (!open) return;
    if (editing) {
      const [first = '', last = ''] = editing.fullName.split(' ');
      const [start = '09:00', end = '18:00'] = editing.schedule.split('-');
      reset({
        firstName: first, lastName: last, email: editing.email, password: '',
        projectId: projects?.find((p) => p.name === editing.project)?.id ?? '',
        schedule: editing.schedule, defaultStart: start, defaultEnd: end, phone: '',
      });
    } else {
      reset({
        firstName: '', lastName: '', email: '', password: '',
        projectId: projects?.[0]?.id ?? '', schedule: '09:00-18:00',
        defaultStart: '09:00', defaultEnd: '18:00', phone: '',
      });
    }
  }, [open, editing, projects, reset]);

  const password = watch('password');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px] border-line bg-surface-1">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Редактировать: ${editing?.fullName}` : 'Новый оператор'}</DialogTitle>
          <DialogDescription className="text-ink-3">
            {isEdit
              ? 'Пароль меняется только если заполнить поле. Пустое поле оставит старый.'
              : 'Учётная запись создаётся сразу. Оператор входит по этим данным, самостоятельная регистрация закрыта.'}
          </DialogDescription>
        </DialogHeader>

        <form
          id="operator-form"
          onSubmit={(e) => void handleSubmit(onSubmit)(e)}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
        >
          <Field label="Имя" error={formState.errors.firstName?.message}>
            <Input placeholder="Иван" {...register('firstName')} />
          </Field>
          <Field label="Фамилия" error={formState.errors.lastName?.message}>
            <Input placeholder="Петров" {...register('lastName')} />
          </Field>

          <Field className="sm:col-span-2" label="Email" error={formState.errors.email?.message}>
            <Input type="email" autoComplete="off" placeholder="ivan@phoenix.io" disabled={isEdit} {...register('email')} />
          </Field>

          <Field label={isEdit ? 'Новый пароль' : 'Пароль'} error={formState.errors.password?.message}>
            <div className="flex gap-1.5">
              <Input autoComplete="new-password" placeholder="мин. 8 символов" {...register('password')} />
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="size-11 flex-none"
                title="Сгенерировать"
                onClick={() => {
                  const pwd = generatePassword();
                  setValue('password', pwd, { shouldValidate: true });
                  void navigator.clipboard?.writeText(pwd);
                  toast.info('Пароль скопирован', { description: 'Передайте его сотруднику лично.' });
                }}
              >
                <Dices />
              </Button>
            </div>
          </Field>

          <Field label="Проект" error={formState.errors.projectId?.message}>
            <select
              {...register('projectId')}
              className="h-11 w-full rounded-sm border border-line-soft bg-surface-1 px-[13px] text-[0.9375rem]
                         transition-colors hover:border-line focus:border-ember focus:outline-none"
            >
              <option value="">Выберите проект</option>
              {projects?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Начало смены" error={formState.errors.defaultStart?.message}>
            <Input type="time" step={300} {...register('defaultStart')} />
          </Field>
          <Field label="Конец смены" error={formState.errors.defaultEnd?.message}>
            <Input type="time" step={300} {...register('defaultEnd')} />
          </Field>

          <Field className="sm:col-span-2" label="График по умолчанию" error={formState.errors.schedule?.message}>
            <select
              {...register('schedule')}
              className="h-11 w-full rounded-sm border border-line-soft bg-surface-1 px-[13px] text-[0.9375rem]
                         transition-colors hover:border-line focus:border-ember focus:outline-none"
            >
              {SCHEDULE_PRESETS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <p className="mt-[5px] text-xs text-ink-3">
              Оператор уточняет фактический график ежедневно в своём кабинете.
            </p>
          </Field>
        </form>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={pending}>
            Отмена
          </Button>
          <Button type="submit" form="operator-form" disabled={pending || (!isEdit && !password)}>
            {pending && <Loader2 className="animate-spin" />}
            {isEdit ? 'Сохранить' : 'Создать'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label, error, className, children,
}: {
  label: string; error?: string; className?: string; children: React.ReactNode;
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

## `src/pages/admin/OperatorsPage.tsx`

```tsx
import { useMemo, useState } from 'react';
import { Ban, LockOpen, Pencil, Search, Trash2, UserPlus, UserSearch } from 'lucide-react';
import { useLineStatus } from '@/hooks/useLineStatus';
import { useCreateEmployee, useDeleteEmployee, useProjects, useToggleBlock, useUpdateEmployee } from '@/hooks/useEmployees';
import { OperatorDialog } from '@/components/admin/OperatorDialog';
import { ConfirmDialog, useConfirm } from '@/components/common/ConfirmDialog';
import { Panel } from '@/components/common/Panel';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/common/DataState';
import { PersonCell } from '@/components/common/PersonCell';
import { LineTag, PlainTag } from '@/components/common/StatusTag';
import { Table, THead, TH, TR, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatMinutes } from '@/lib/time';
import type { EmployeeListItem } from '@/types/domain';
import type { LineState } from '@/types/database';

export default function OperatorsPage() {
  const line = useLineStatus();
  const { data: projects } = useProjects();

  const [query, setQuery] = useState('');
  const [project, setProject] = useState('');
  const [state, setState] = useState<'' | LineState>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EmployeeListItem | null>(null);

  const create = useCreateEmployee();
  const update = useUpdateEmployee();
  const block = useToggleBlock();
  const remove = useDeleteEmployee();
  const { config, ask, close } = useConfirm();

  const rows: EmployeeListItem[] = useMemo(
    () =>
      (line.data ?? []).map((r) => ({
        employeeId: r.employee_id,
        userId: r.user_id,
        fullName: r.full_name,
        email: r.email,
        project: r.project,
        schedule: r.default_schedule,
        lineState: r.line_state,
        startedLabel: r.started_label,
        todayMinutes: r.today_minutes,
        extraHours: r.extra_hours ?? 0,
        blocked: r.blocked,
      })),
    [line.data],
  );

  const filtered = rows.filter((r) => {
    const q = query.trim().toLowerCase();
    const okQ = !q || r.fullName.toLowerCase().includes(q) || r.email.toLowerCase().includes(q);
    const okP = !project || r.project === project;
    const okS = !state || r.lineState === state;
    return okQ && okP && okS;
  });

  const resetFilters = () => {
    setQuery('');
    setProject('');
    setState('');
  };

  const selectClass =
    'h-9 rounded-sm border border-line-soft bg-surface-1 px-[11px] text-[0.84rem] ' +
    'transition-colors hover:border-line focus:border-ember focus:outline-none';

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex items-center">
          <Search className="pointer-events-none absolute left-[10px] size-[15px] text-ink-3" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по имени или email"
            className="h-9 min-w-[230px] pl-8 text-[0.84rem]"
          />
        </div>

        <select className={selectClass} value={project} onChange={(e) => setProject(e.target.value)}>
          <option value="">Все проекты</option>
          {projects?.map((p) => (
            <option key={p.id} value={p.name}>
              {p.name}
            </option>
          ))}
        </select>

        <select className={selectClass} value={state} onChange={(e) => setState(e.target.value as LineState | '')}>
          <option value="">Любой статус</option>
          <option value="online">На линии</option>
          <option value="offline">Не на линии</option>
          <option value="late">Опоздание</option>
          <option value="blocked">Заблокирован</option>
        </select>

        <Button
          className="ml-auto"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <UserPlus />
          Создать оператора
        </Button>
      </div>

      <Panel>
        {line.isLoading ? (
          <TableSkeleton rows={7} cols={6} />
        ) : line.isError ? (
          <div className="p-5">
            <ErrorState error={line.error} onRetry={() => void line.refetch()} />
          </div>
        ) : !filtered.length ? (
          <EmptyState
            icon={UserSearch}
            title={rows.length ? 'Никого не нашли' : 'Операторов ещё нет'}
            text={
              rows.length
                ? 'Под фильтры не попал ни один сотрудник. Сбросьте условия или создайте нового оператора.'
                : 'Создайте первую учётную запись: оператор получит доступ и сможет отмечаться на линии.'
            }
            action={
              rows.length ? (
                <Button variant="secondary" onClick={resetFilters}>
                  Сбросить фильтры
                </Button>
              ) : (
                <Button onClick={() => setDialogOpen(true)}>
                  <UserPlus />
                  Создать оператора
                </Button>
              )
            }
          />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Сотрудник</TH>
                <TH>Проект</TH>
                <TH>График</TH>
                <TH>Статус</TH>
                <TH>Сегодня</TH>
                <TH className="text-right">Действия</TH>
              </tr>
            </THead>
            <tbody>
              {filtered.map((r) => (
                <TR key={r.employeeId}>
                  <TD>
                    <PersonCell name={r.fullName} email={r.email} online={r.lineState === 'online'} />
                  </TD>
                  <TD>
                    <PlainTag>{r.project}</PlainTag>
                  </TD>
                  <TD className="num">{r.schedule}</TD>
                  <TD>
                    <LineTag state={r.lineState} />
                  </TD>
                  <TD className="num">
                    {r.todayMinutes ? formatMinutes(r.todayMinutes) : '—'}
                    {r.extraHours > 0 && (
                      <span className="ml-2">
                        <PlainTag tone="ember">+{r.extraHours.toFixed(1)} ч</PlainTag>
                      </span>
                    )}
                  </TD>
                  <TD>
                    <div className="flex justify-end gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Редактировать"
                        onClick={() => {
                          setEditing(r);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title={r.blocked ? 'Разблокировать' : 'Заблокировать'}
                        onClick={() =>
                          ask({
                            title: r.blocked ? 'Разблокировать оператора?' : 'Заблокировать оператора?',
                            description: r.blocked
                              ? `${r.fullName} снова сможет входить в систему и выходить на линию.`
                              : `${r.fullName} потеряет доступ немедленно. Активная смена будет закрыта автоматически.`,
                            confirmLabel: r.blocked ? 'Разблокировать' : 'Заблокировать',
                            destructive: !r.blocked,
                            onConfirm: () => {
                              block.mutate({ employeeId: r.employeeId, blocked: !r.blocked });
                              close();
                            },
                          })
                        }
                      >
                        {r.blocked ? <LockOpen /> : <Ban />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Удалить"
                        className="hover:bg-danger-dim hover:text-danger"
                        onClick={() =>
                          ask({
                            title: 'Удалить оператора?',
                            description: `${r.fullName} будет удалён из системы. История смен останется в отчётах, доступ отзывается сразу.`,
                            confirmLabel: 'Удалить навсегда',
                            destructive: true,
                            onConfirm: () => {
                              remove.mutate(r.employeeId);
                              close();
                            },
                          })
                        }
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>

      <OperatorDialog
        open={dialogOpen}
        editing={editing}
        pending={create.isPending || update.isPending}
        onOpenChange={setDialogOpen}
        onSubmit={(values) => {
          if (editing) {
            update.mutate(
              { employeeId: editing.employeeId, input: values },
              { onSuccess: () => setDialogOpen(false) },
            );
          } else {
            create.mutate(values, { onSuccess: () => setDialogOpen(false) });
          }
        }}
      />

      <ConfirmDialog
        config={config}
        onOpenChange={(o) => !o && close()}
        pending={block.isPending || remove.isPending}
      />
    </>
  );
}
```

---

## `src/pages/admin/MonitorPage.tsx`

```tsx
import { useState } from 'react';
import { RefreshCw, Radio } from 'lucide-react';
import { useLineStatus } from '@/hooks/useLineStatus';
import { Panel } from '@/components/common/Panel';
import { EmptyState, ErrorState } from '@/components/common/DataState';
import { Avatar } from '@/components/common/Avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatMinutes } from '@/lib/time';
import type { LineState } from '@/types/database';

const FILTERS: { key: 'all' | LineState; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'online', label: 'На линии' },
  { key: 'late', label: 'Опоздания' },
  { key: 'offline', label: 'Offline' },
];

export default function MonitorPage() {
  const q = useLineStatus();
  const [filter, setFilter] = useState<'all' | LineState>('all');

  const rows = (q.data ?? []).filter((r) => {
    if (r.blocked) return false;
    return filter === 'all' || r.line_state === filter;
  });

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <div>
          <div className="eyebrow mb-[3px]">Real-time</div>
          <h3 className="text-[1.0625rem]">Состояние линии</h3>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="inline-flex gap-[2px] rounded-sm border border-line-soft bg-surface-2 p-[3px]">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={cn(
                  'rounded-[7px] px-[13px] py-1.5 text-[0.8125rem] font-medium transition-colors duration-150',
                  filter === f.key ? 'bg-surface-3 text-ink' : 'text-ink-3 hover:text-ink',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <Button variant="secondary" onClick={() => void q.refetch()} disabled={q.isFetching}>
            <RefreshCw className={cn(q.isFetching && 'animate-spin')} />
            Обновить
          </Button>
        </div>
      </div>

      {q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : q.isLoading ? (
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(310px,1fr))]">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-md border border-line-soft bg-surface-1 p-4">
              <div className="skeleton size-8 rounded-[9px]" />
              <div className="flex-1">
                <div className="skeleton mb-[7px] h-3 w-[58%]" />
                <div className="skeleton h-2 w-[40%]" />
              </div>
              <div className="skeleton h-5 w-[46px]" />
            </div>
          ))}
        </div>
      ) : !rows.length ? (
        <Panel>
          <EmptyState
            icon={Radio}
            title="Пусто по этому фильтру"
            text="Ни один оператор не подходит под выбранное состояние линии."
          />
        </Panel>
      ) : (
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(310px,1fr))]">
          {rows.map((r) => (
            <article
              key={r.employee_id}
              className={cn(
                'flex items-center gap-3 rounded-md border bg-surface-1 p-4',
                'transition-[transform,border-color] duration-200 ease-out-quart hover:-translate-y-0.5',
                r.line_state === 'online' && 'border-online/40 bg-gradient-to-b from-[oklch(0.205_0.026_158)] to-surface-1',
                r.line_state === 'late' && 'border-warn/45 bg-gradient-to-b from-[oklch(0.215_0.032_82)] to-surface-1',
                r.line_state === 'offline' && 'border-line-soft hover:border-line',
              )}
            >
              <Avatar name={r.full_name} online={r.line_state === 'online'} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[0.9rem] font-semibold">{r.full_name}</div>
                <div className="mt-0.5 flex items-center gap-2 truncate text-xs text-ink-3">
                  {r.project} <span>·</span> {r.default_schedule}
                </div>
              </div>
              <div className="text-right">
                <div className="num text-[1.0625rem] font-medium">{r.started_label ?? '—'}</div>
                <div className="text-[0.68rem] uppercase tracking-[0.08em] text-ink-3">
                  {r.line_state === 'online'
                    ? formatMinutes(r.today_minutes)
                    : r.line_state === 'late'
                      ? 'не вышел'
                      : 'offline'}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
```

---

## `src/pages/admin/SchedulesPage.tsx`

```tsx
import { useState } from 'react';
import { CalendarX, Check, Download, X } from 'lucide-react';
import { useScheduleFeed, useReviewSchedule, type ScheduleFilters } from '@/hooks/useSchedules';
import { useProjects } from '@/hooks/useEmployees';
import { useLineStatus } from '@/hooks/useLineStatus';
import { Panel } from '@/components/common/Panel';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/common/DataState';
import { ApprovalTag, PlainTag } from '@/components/common/StatusTag';
import { Table, THead, TH, TR, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDate, trimSeconds } from '@/lib/time';
import { REASON_LABEL } from '@/types/domain';

export default function SchedulesPage() {
  const [filters, setFilters] = useState<ScheduleFilters>({});
  const q = useScheduleFeed(filters);
  const review = useReviewSchedule();
  const { data: projects } = useProjects();
  const { data: line } = useLineStatus();

  const selectClass =
    'h-9 rounded-sm border border-line-soft bg-surface-1 px-[11px] text-[0.84rem] ' +
    'transition-colors hover:border-line focus:border-ember focus:outline-none';

  const exportCsv = () => {
    const rows = q.data ?? [];
    const header = ['Дата', 'Сотрудник', 'Проект', 'Смена', 'Доп. часы', 'Причина', 'Комментарий', 'Статус'];
    const body = rows.map((r) => [
      formatDate(r.work_date),
      r.full_name,
      r.project,
      `${trimSeconds(r.planned_start)}-${trimSeconds(r.planned_end)}`,
      r.extra_hours.toFixed(1),
      r.reason ? REASON_LABEL[r.reason] : '',
      r.comment.replaceAll(';', ','),
      r.status,
    ]);
    const csv = [header, ...body].map((line) => line.join(';')).join('\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `phoenix-schedules-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          className={selectClass}
          value={filters.employeeId ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, employeeId: e.target.value || undefined }))}
        >
          <option value="">Все сотрудники</option>
          {line?.map((r) => (
            <option key={r.employee_id} value={r.employee_id}>
              {r.full_name}
            </option>
          ))}
        </select>

        <Input
          type="date"
          className="h-9 w-auto text-[0.84rem]"
          value={filters.date ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, date: e.target.value || undefined }))}
        />

        <select
          className={selectClass}
          value={filters.project ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, project: e.target.value || undefined }))}
        >
          <option value="">Все проекты</option>
          {projects?.map((p) => (
            <option key={p.id} value={p.name}>
              {p.name}
            </option>
          ))}
        </select>

        <Button variant="ghost" size="sm" onClick={() => setFilters({})}>
          Сбросить
        </Button>

        <Button variant="secondary" className="ml-auto" onClick={exportCsv} disabled={!q.data?.length}>
          <Download />
          Экспорт CSV
        </Button>
      </div>

      <Panel>
        {q.isLoading ? (
          <TableSkeleton rows={7} cols={7} />
        ) : q.isError ? (
          <div className="p-5">
            <ErrorState error={q.error} onRetry={() => void q.refetch()} />
          </div>
        ) : !q.data?.length ? (
          <EmptyState
            icon={CalendarX}
            title="Записей нет"
            text="На выбранную дату графики не заполнены. Напомните операторам через Telegram-канал."
          />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Дата</TH>
                <TH>Сотрудник</TH>
                <TH>Проект</TH>
                <TH>Смена</TH>
                <TH>Доп. часы</TH>
                <TH>Комментарий</TH>
                <TH>Статус</TH>
                <TH className="text-right">Решение</TH>
              </tr>
            </THead>
            <tbody>
              {q.data.map((r) => (
                <TR key={r.id}>
                  <TD className="num">{formatDate(r.work_date)}</TD>
                  <TD className="font-medium">{r.full_name}</TD>
                  <TD>
                    <PlainTag>{r.project}</PlainTag>
                  </TD>
                  <TD className="num">
                    {trimSeconds(r.planned_start)} – {trimSeconds(r.planned_end)}
                  </TD>
                  <TD className="num">
                    {r.extra_hours > 0 ? (
                      <PlainTag tone="ember">+{r.extra_hours.toFixed(1)}</PlainTag>
                    ) : (
                      <span className="text-ink-3">0</span>
                    )}
                  </TD>
                  <TD className="max-w-[28ch] truncate text-ink-2">
                    {r.comment || <span className="text-ink-3">—</span>}
                  </TD>
                  <TD>
                    <ApprovalTag status={r.status} />
                  </TD>
                  <TD>
                    {r.status === 'pending' ? (
                      <div className="flex justify-end gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Подтвердить"
                          className="hover:bg-online-dim hover:text-online"
                          onClick={() => review.mutate({ id: r.id, status: 'approved' })}
                        >
                          <Check />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Отклонить"
                          className="hover:bg-danger-dim hover:text-danger"
                          onClick={() => review.mutate({ id: r.id, status: 'rejected' })}
                        >
                          <X />
                        </Button>
                      </div>
                    ) : (
                      <span className="block text-right text-xs text-ink-3">—</span>
                    )}
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

---

## `src/pages/admin/ReportsPage.tsx`

```tsx
import { useState } from 'react';
import { Gauge, PlusCircle, Timer, UserCheck, FileBarChart } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useDashboardStats, useDailySummary, useMonthlyReport } from '@/hooks/useReports';
import { MetricStrip, type Metric } from '@/components/common/MetricStrip';
import { Panel, PanelHead } from '@/components/common/Panel';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/common/DataState';
import { PlainTag } from '@/components/common/StatusTag';
import { Table, THead, TH, TR, TD } from '@/components/ui/table';
import { formatMinutes, monthRange } from '@/lib/time';
import { cn } from '@/lib/utils';

export default function ReportsPage() {
  const [tab, setTab] = useState<'day' | 'month'>('day');
  const stats = useDashboardStats();
  const day = useDailySummary();
  const range = monthRange();
  const month = useMonthlyReport(range);

  const s = stats.data;

  const metrics: Metric[] = [
    {
      label: 'Работали',
      value: s?.worked_today ?? 0,
      unit: `/${s?.total_employees ?? 0}`,
      icon: UserCheck,
      foot: <span>{Math.max(0, (s?.total_employees ?? 0) - (s?.worked_today ?? 0))} отсутствий</span>,
    },
    { label: 'Всего часов', value: s?.hours_today ?? 0, unit: ' ч', icon: Timer, foot: <span>за сутки</span> },
    {
      label: 'Доп. часы',
      value: s?.extra_today ?? 0,
      unit: ' ч',
      icon: PlusCircle,
      foot: <span>сверх основной смены</span>,
    },
    {
      label: 'Среднее на смену',
      value: formatMinutes(s?.avg_minutes ?? 0),
      icon: Gauge,
      foot: <span>по закрытым сменам</span>,
    },
  ];

  const chartData = (day.data ?? []).map((r) => ({
    name: r.full_name.split(' ')[0] ?? r.full_name,
    base: Number(r.worked_hours),
    extra: Number(r.extra_hours),
  }));

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <div>
          <div className="eyebrow mb-[3px]">Аналитика</div>
          <h3 className="text-[1.0625rem]">Отчёты</h3>
        </div>
        <div className="ml-auto inline-flex gap-[2px] rounded-sm border border-line-soft bg-surface-2 p-[3px]">
          {(['day', 'month'] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={cn(
                'rounded-[7px] px-[13px] py-1.5 text-[0.8125rem] font-medium transition-colors duration-150',
                tab === k ? 'bg-surface-3 text-ink' : 'text-ink-3 hover:text-ink',
              )}
            >
              {k === 'day' ? 'За день' : 'За месяц'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'day' ? (
        <>
          <MetricStrip metrics={metrics} loading={stats.isLoading} />
          <Panel>
            <PanelHead title="Часы по сотрудникам, сегодня" />
            <div className="p-5">
              {day.isLoading ? (
                <div className="skeleton h-[220px] w-full rounded-md" />
              ) : !chartData.length ? (
                <EmptyState
                  icon={FileBarChart}
                  title="Данных за сегодня нет"
                  text="Ни одна смена ещё не закрыта. Цифры появятся, как только операторы завершат работу."
                />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke="oklch(0.225 0.012 322)" vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={{ stroke: 'oklch(0.245 0.012 322)' }}
                           tick={{ fill: 'oklch(0.575 0.013 322)', fontSize: 11 }} />
                    <YAxis tickLine={false} axisLine={false} unit="ч"
                           tick={{ fill: 'oklch(0.575 0.013 322)', fontSize: 11 }} />
                    <Tooltip
                      cursor={{ fill: 'oklch(0.225 0.013 322 / .5)' }}
                      contentStyle={{
                        background: 'oklch(0.225 0.013 322)',
                        border: '1px solid oklch(0.315 0.013 322)',
                        borderRadius: 9, fontSize: 12, color: 'oklch(0.955 0.005 322)',
                      }}
                    />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                    <Bar dataKey="base" name="Основные" stackId="h" fill="oklch(0.42 0.10 322)" radius={[0, 0, 4, 4]} />
                    <Bar dataKey="extra" name="Доп." stackId="h" fill="oklch(0.665 0.185 32)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Panel>
        </>
      ) : (
        <Panel>
          <PanelHead
            title={`Период ${range.from.split('-').reverse().join('.')} – ${range.to.split('-').reverse().join('.')}`}
            right={<PlainTag>{month.data?.length ?? 0} сотрудников</PlainTag>}
          />
          {month.isLoading ? (
            <TableSkeleton rows={8} cols={6} />
          ) : month.isError ? (
            <div className="p-5">
              <ErrorState error={month.error} onRetry={() => void month.refetch()} />
            </div>
          ) : !month.data?.length ? (
            <EmptyState icon={FileBarChart} title="Нет данных за месяц" text="За выбранный период смен не зафиксировано." />
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Сотрудник</TH>
                  <TH>Проект</TH>
                  <TH>Смен</TH>
                  <TH>Основные часы</TH>
                  <TH>Доп. часы</TH>
                  <TH>Итого</TH>
                </tr>
              </THead>
              <tbody>
                {month.data.map((r) => (
                  <TR key={r.employee_id}>
                    <TD className="font-medium">{r.full_name}</TD>
                    <TD>
                      <PlainTag>{r.project}</PlainTag>
                    </TD>
                    <TD className="num">{r.shifts_count}</TD>
                    <TD className="num">{Number(r.base_hours).toFixed(1)} ч</TD>
                    <TD className="num">
                      {Number(r.extra_hours) > 0 ? (
                        <PlainTag tone="ember">+{Number(r.extra_hours).toFixed(1)}</PlainTag>
                      ) : (
                        <span className="text-ink-3">0.0</span>
                      )}
                    </TD>
                    <TD className="num font-semibold">{Number(r.total_hours).toFixed(1)} ч</TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>
      )}
    </>
  );
}
```

---

## `src/pages/admin/SettingsPage.tsx`

```tsx
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Send } from 'lucide-react';
import { telegramSettingsSchema, type TelegramSettingsInput } from '@/schemas/settings.schema';
import { useNotificationSettings, useSaveNotificationSettings, useTestTelegram } from '@/hooks/useSettings';
import { Panel, PanelHead } from '@/components/common/Panel';
import { PlainTag } from '@/components/common/StatusTag';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { TableSkeleton } from '@/components/common/DataState';

const PREVIEWS = [
  { time: '08:57', tone: 'plain', text: '🟢 <b>Иван Петров вышел на линию</b>\nПроект: Retail Inbound\nВремя: 08:57' },
  { time: '09:12', tone: 'alert', text: '⚠️ <b>Контроль линии</b>\nОператор: Алексей Гордеев\nНачало смены: 09:00\nСтатус: не вышел' },
  { time: '18:15', tone: 'plain', text: '🔴 <b>Мария Соколова завершила смену</b>\nОтработано: 8 ч 12 мин\nДоп. часы: 2 ч' },
] as const;

export default function SettingsPage() {
  const q = useNotificationSettings();
  const save = useSaveNotificationSettings();
  const test = useTestTelegram();

  const { register, handleSubmit, reset, watch, setValue, formState } = useForm<TelegramSettingsInput>({
    resolver: zodResolver(telegramSettingsSchema),
    defaultValues: {
      telegramEnabled: false, telegramChatId: '', lateThresholdMinutes: 10,
      notifyOnStart: true, notifyOnEnd: true, notifyOnLate: true,
    },
  });

  useEffect(() => {
    if (!q.data) return;
    reset({
      telegramEnabled: q.data.telegram_enabled,
      telegramChatId: q.data.telegram_chat_id ?? '',
      lateThresholdMinutes: q.data.late_threshold_minutes,
      notifyOnStart: q.data.notify_on_start,
      notifyOnEnd: q.data.notify_on_end,
      notifyOnLate: q.data.notify_on_late,
    });
  }, [q.data, reset]);

  const enabled = watch('telegramEnabled');
  const chatId = watch('telegramChatId');

  return (
    <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
      <Panel>
        <PanelHead
          title="Telegram Bot"
          right={
            <PlainTag tone={enabled ? 'ember' : 'neutral'}>
              {enabled ? 'Уведомления включены' : 'Выключено'}
            </PlainTag>
          }
        />

        {q.isLoading ? (
          <TableSkeleton rows={4} cols={3} />
        ) : (
          <form onSubmit={(e) => void handleSubmit((v) => save.mutate(v))(e)} className="p-5">
            <div className="mb-5 flex items-center justify-between rounded-md border border-line-soft bg-surface-2 px-4 py-3">
              <div>
                <div className="text-sm font-medium">Отправлять уведомления</div>
                <p className="text-xs text-ink-3">Глобальный выключатель для всего канала.</p>
              </div>
              <Switch
                checked={enabled}
                onCheckedChange={(v) => setValue('telegramEnabled', v, { shouldDirty: true })}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label className="mb-[7px] block">CHAT_ID</Label>
                <Input placeholder="-1002214887301" {...register('telegramChatId')} />
                {formState.errors.telegramChatId && (
                  <p className="mt-[5px] text-[0.78rem] text-danger">{formState.errors.telegramChatId.message}</p>
                )}
                <p className="mt-[5px] text-xs text-ink-3">
                  BOT_TOKEN здесь не хранится. Он задаётся секретом:{' '}
                  <code className="rounded-xs bg-surface-2 px-1 font-mono text-[0.75rem]">
                    supabase secrets set TELEGRAM_BOT_TOKEN=…
                  </code>
                </p>
              </div>

              <div>
                <Label className="mb-[7px] block">Порог опоздания, мин</Label>
                <Input type="number" min={0} max={120} {...register('lateThresholdMinutes')} />
              </div>
            </div>

            <fieldset className="mt-5 space-y-2">
              <legend className="eyebrow mb-2">События</legend>
              {(
                [
                  ['notifyOnStart', 'Оператор вышел на линию'],
                  ['notifyOnEnd', 'Оператор завершил смену'],
                  ['notifyOnLate', 'Оператор не вышел вовремя'],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-center justify-between rounded-sm border border-line-soft px-3 py-2.5 text-sm transition-colors hover:border-line"
                >
                  {label}
                  <Switch
                    checked={watch(key)}
                    onCheckedChange={(v) => setValue(key, v, { shouldDirty: true })}
                  />
                </label>
              ))}
            </fieldset>

            <div className="mt-5 flex flex-wrap gap-2">
              <Button type="submit" disabled={save.isPending}>
                {save.isPending && <Loader2 className="animate-spin" />}
                Сохранить
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={!chatId || test.isPending}
                onClick={() => test.mutate(chatId)}
              >
                {test.isPending ? <Loader2 className="animate-spin" /> : <Send />}
                Тестовое сообщение
              </Button>
            </div>
          </form>
        )}
      </Panel>

      <Panel>
        <PanelHead title="Предпросмотр уведомлений" />
        <div className="p-5">
          <div className="flex flex-col gap-[10px] rounded-md border border-line-soft bg-bg-deep p-4">
            {PREVIEWS.map((m) => (
              <div key={m.time}>
                <div
                  className={
                    'max-w-[90%] whitespace-pre-line rounded-[4px_14px_14px_14px] px-[13px] py-2.5 text-[0.82rem] leading-relaxed ' +
                    (m.tone === 'alert' ? 'bg-warn-dim text-[oklch(0.92_0.06_82)]' : 'bg-surface-2')
                  }
                  dangerouslySetInnerHTML={{ __html: m.text }}
                />
                <div className="num mt-1 text-right text-[0.68rem] text-ink-3">{m.time}</div>
              </div>
            ))}
          </div>
        </div>
      </Panel>
    </div>
  );
}
```
