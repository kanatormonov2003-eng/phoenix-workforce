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
