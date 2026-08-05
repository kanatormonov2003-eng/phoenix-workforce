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
