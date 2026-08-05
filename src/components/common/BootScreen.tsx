import { Flame } from 'lucide-react';

export function BootScreen() {
  return (
    <div className="grid min-h-dvh place-items-center bg-bg-deep">
      <div className="flex flex-col items-center gap-4">
        <div className="grid size-11 animate-pulse place-items-center rounded-md bg-ember">
          <Flame className="size-6 text-bg-deep" />
        </div>
        <p className="text-sm text-ink-3">Проверяем доступ…</p>
      </div>
    </div>
  );
}
