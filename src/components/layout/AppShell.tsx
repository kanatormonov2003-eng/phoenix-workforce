import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { cn } from '@/lib/utils';

export function AppShell() {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[244px_1fr]">
      <button
        type="button"
        aria-label="Закрыть меню"
        onClick={() => setNavOpen(false)}
        className={cn(
          'fixed inset-0 z-[59] bg-bg-deep/60 transition-opacity duration-300 ease-out-quart lg:hidden',
          navOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />
      <Sidebar open={navOpen} onNavigate={() => setNavOpen(false)} />

      <div className="flex min-w-0 flex-col">
        <Topbar onBurger={() => setNavOpen(true)} />
        <main className="mx-auto w-full max-w-[1420px] animate-fade-up p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
