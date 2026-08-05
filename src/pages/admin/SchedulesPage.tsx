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
