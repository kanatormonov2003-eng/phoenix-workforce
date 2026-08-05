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
