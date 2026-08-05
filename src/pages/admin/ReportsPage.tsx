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
