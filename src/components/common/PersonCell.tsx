import { Avatar } from './Avatar';

export function PersonCell({ name, email, online }: { name: string; email: string; online?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-[11px]">
      <Avatar name={name} online={online} />
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{name}</div>
        <div className="truncate text-xs text-ink-3">{email}</div>
      </div>
    </div>
  );
}
