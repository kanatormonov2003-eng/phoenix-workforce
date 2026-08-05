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
