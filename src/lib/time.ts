import { format, differenceInSeconds, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { ru } from 'date-fns/locale';

export const todayISO = (): string => format(new Date(), 'yyyy-MM-dd');

export const monthRange = (d = new Date()): { from: string; to: string } => ({
  from: format(startOfMonth(d), 'yyyy-MM-dd'),
  to: format(endOfMonth(d), 'yyyy-MM-dd'),
});

export const formatDate = (iso: string): string => format(parseISO(iso), 'dd.MM.yyyy');

export const formatDateLong = (d: Date = new Date()): string =>
  format(d, 'EEEE, d MMMM', { locale: ru });

export const formatTime = (iso: string): string => format(parseISO(iso), 'HH:mm');

export const formatClock = (d: Date = new Date()): string => format(d, 'HH:mm:ss');

/** 335 → "5 ч 35 мин" */
export function formatMinutes(minutes: number | null | undefined): string {
  if (minutes == null || Number.isNaN(minutes)) return '—';
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (h === 0) return `${rest} мин`;
  return `${h} ч ${String(rest).padStart(2, '0')} мин`;
}

/** 12 345 сек → "03:25:45" */
export function formatElapsed(startedAt: string, now: Date = new Date()): string {
  const s = Math.max(0, differenceInSeconds(now, parseISO(startedAt)));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
}

export function shiftProgress(startedAt: string, plannedHours = 9, now = new Date()): number {
  const s = differenceInSeconds(now, parseISO(startedAt));
  return Math.min(100, Math.max(0, (s / (plannedHours * 3600)) * 100));
}

export function greeting(now: Date = new Date()): string {
  const h = now.getHours();
  if (h < 5) return 'Доброй ночи';
  if (h < 12) return 'Доброе утро';
  if (h < 18) return 'Добрый день';
  return 'Добрый вечер';
}

/** "09:00:00" → "09:00" */
export const trimSeconds = (t: string | null): string => (t ? t.slice(0, 5) : '—');
