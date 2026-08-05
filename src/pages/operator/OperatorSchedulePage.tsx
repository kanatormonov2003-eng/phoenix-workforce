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
