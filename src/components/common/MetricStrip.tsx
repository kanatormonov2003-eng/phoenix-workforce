import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Metric {
  label: string;
  value: string | number;
  unit?: string;
  foot?: React.ReactNode;
  icon: LucideIcon;
  accent?: boolean;
}

export function MetricStrip({ metrics, loading }: { metrics: Metric[]; loading?: boolean }) {
  return (
    <div className="mb-6 grid grid-cols-1 overflow-hidden rounded-lg border border-line-soft bg-gradient-to-b from-surface-1 to-[oklch(0.165_0.011_322)] sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((m, i) => (
        <div
          key={m.label}
          className={cn(
            'relative border-b border-line-soft px-5 pb-4 pt-5 last:border-b-0',
            'sm:border-b-0 sm:[&:nth-child(-n+2)]:border-b xl:[&:nth-child(-n+2)]:border-b-0',
            'sm:odd:border-r xl:border-r xl:last:border-r-0',
            i === metrics.length - 1 && 'sm:border-r-0',
          )}
        >
          <div className="mb-3 flex items-center gap-[7px]">
            <m.icon className="size-[14px] text-ink-3" />
            <span className="eyebrow">{m.label}</span>
          </div>

          {loading ? (
            <div className="skeleton h-9 w-24" />
          ) : (
            <div className={cn('num text-[2.375rem] font-medium leading-none', m.accent && 'text-online')}>
              {m.value}
              {m.unit && <small className="ml-[3px] text-[0.95rem] font-normal tracking-normal text-ink-3">{m.unit}</small>}
            </div>
          )}

          {m.foot && <div className="mt-[10px] flex items-center gap-[6px] text-[0.78rem] text-ink-3">{m.foot}</div>}
        </div>
      ))}
    </div>
  );
}

export function Delta({ value, suffix = '' }: { value: number; suffix?: string }) {
  const up = value >= 0;
  return (
    <span
      className={cn(
        'num rounded-xs px-[6px] py-px text-[0.74rem]',
        up ? 'bg-online-dim text-online' : 'bg-danger-dim text-danger',
      )}
    >
      {up ? '+' : ''}
      {value}
      {suffix}
    </span>
  );
}
