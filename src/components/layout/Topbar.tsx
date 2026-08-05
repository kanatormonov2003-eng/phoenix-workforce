import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { formatClock, formatDateLong } from '@/lib/time';

const TITLES: Record<string, [string, string]> = {
  '/': ['Линия', 'Ваш рабочий статус'],
  '/schedule': ['Мой график', 'Заполните смену на день'],
  '/history': ['История смен', 'Только ваши записи'],
  '/admin': ['Дашборд', formatDateLong()],
  '/admin/operators': ['Операторы', 'Управление учётными записями'],
  '/admin/monitor': ['Мониторинг линии', 'Обновление в реальном времени'],
  '/admin/schedules': ['Графики', 'Заявки операторов на смены'],
  '/admin/reports': ['Отчёты', 'Сводка по часам и нагрузке'],
  '/admin/settings': ['Telegram', 'Канал уведомлений о линии'],
};

export function Topbar({ onBurger }: { onBurger: () => void }) {
  const { pathname } = useLocation();
  const [clock, setClock] = useState(formatClock());
  const [title, sub] = TITLES[pathname] ?? ['Phoenix', ''];

  useEffect(() => {
    const id = setInterval(() => setClock(formatClock()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    document.title = `${title} · Phoenix`;
  }, [title]);

  return (
    <header className="sticky top-0 z-40 flex items-center gap-4 border-b border-line-soft bg-bg/[0.82] px-4 py-3 backdrop-blur-[14px] backdrop-saturate-150 md:px-6 md:py-4">
      <button
        type="button"
        onClick={onBurger}
        aria-label="Открыть меню"
        className="grid size-[30px] place-items-center rounded-xs text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink lg:hidden"
      >
        <Menu className="size-[19px]" />
      </button>

      <div className="min-w-0">
        <h2 className="truncate text-[1.0625rem] font-semibold">{title}</h2>
        <p className="-mt-0.5 truncate text-[0.78rem] text-ink-3 first-letter:uppercase">{sub}</p>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <span className="inline-flex items-center gap-[7px] text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-online">
          <span className="size-[7px] animate-pulse-ring rounded-full bg-online" />
          Live
        </span>
        <span className="num hidden text-sm text-ink-2 sm:inline">{clock}</span>
      </div>
    </header>
  );
}
