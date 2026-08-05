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
