import { cn, initials } from '@/lib/utils';

export function Avatar({
  name,
  online,
  size = 'md',
}: {
  name: string;
  online?: boolean;
  size?: 'sm' | 'md';
}) {
  return (
    <div
      className={cn(
        'grid flex-none place-items-center rounded-[9px] font-bold tracking-[0.02em]',
        size === 'sm' ? 'size-7 text-[0.68rem]' : 'size-8 text-[0.75rem]',
        online ? 'bg-online-dim text-online' : 'bg-surface-3 text-ink-2',
      )}
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}
