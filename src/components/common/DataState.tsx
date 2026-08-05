import type { LucideIcon } from 'lucide-react';
import { AlertOctagon, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { humanizeError } from '@/lib/errors';

export function EmptyState({
  icon: Icon,
  title,
  text,
  action,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-5 py-8 text-center">
      <div className="grid size-[52px] place-items-center rounded-[15px] border border-line-soft bg-surface-2 text-ink-3">
        <Icon className="size-[22px]" />
      </div>
      <h5 className="text-[0.95rem] font-semibold">{title}</h5>
      <p className="max-w-[38ch] text-[0.84rem] text-ink-3">{text}</p>
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="flex items-start gap-[11px] rounded-md border border-danger/45 bg-danger-dim p-4">
      <AlertOctagon className="mt-px size-[17px] flex-none text-danger" />
      <div className="min-w-0 flex-1">
        <strong className="mb-0.5 block text-sm text-[oklch(0.88_0.08_28)]">Не удалось загрузить данные</strong>
        <p className="text-[0.82rem] text-[oklch(0.76_0.05_28)]">{humanizeError(error)}</p>
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <RefreshCw className="size-[14px]" />
          Ещё раз
        </Button>
      )}
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div role="status" aria-label="Загрузка">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-3 border-b border-line-soft px-5 py-[13px] last:border-b-0">
          <div className="skeleton size-8 rounded-[9px]" />
          {Array.from({ length: cols - 1 }).map((__, c) => (
            <div key={c} className="skeleton h-3" style={{ width: `${[34, 18, 14, 20, 12][c] ?? 15}%` }} />
          ))}
        </div>
      ))}
    </div>
  );
}
