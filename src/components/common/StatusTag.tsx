import { cn } from '@/lib/utils';
import { LINE_STATE_LABEL, APPROVAL_LABEL } from '@/types/domain';
import type { LineState, ApprovalStatus } from '@/types/database';

const LINE_STYLES: Record<LineState, string> = {
  online: 'bg-online-dim text-online border-online/40',
  offline: 'bg-surface-2 text-ink-3 border-line-soft',
  late: 'bg-warn-dim text-warn border-warn/40',
  blocked: 'bg-danger-dim text-danger border-danger/40',
};

const APPROVAL_STYLES: Record<ApprovalStatus, string> = {
  approved: 'bg-online-dim text-online border-online/40',
  pending: 'bg-warn-dim text-warn border-warn/40',
  rejected: 'bg-danger-dim text-danger border-danger/40',
};

const base =
  'inline-flex items-center gap-[6px] whitespace-nowrap rounded-xs border px-[9px] py-[3px] text-[0.74rem] font-medium';

export function LineTag({ state }: { state: LineState }) {
  return (
    <span className={cn(base, LINE_STYLES[state])}>
      <span
        className={cn('size-[6px] rounded-full bg-current', state === 'online' && 'animate-pulse-ring')}
      />
      {LINE_STATE_LABEL[state]}
    </span>
  );
}

export function ApprovalTag({ status }: { status: ApprovalStatus }) {
  return (
    <span className={cn(base, APPROVAL_STYLES[status])}>
      <span className="size-[6px] rounded-full bg-current" />
      {APPROVAL_LABEL[status]}
    </span>
  );
}

export function PlainTag({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'ember' }) {
  return (
    <span
      className={cn(
        base,
        tone === 'ember'
          ? 'border-ember-dim bg-ember-ghost text-ember-hi'
          : 'border-line-soft bg-surface-2 text-ink-2',
      )}
    >
      {children}
    </span>
  );
}
