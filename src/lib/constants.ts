export const APP_NAME = import.meta.env.VITE_APP_NAME || 'Phoenix Workforce Control';
export const LINE_POLL_MS = Number(import.meta.env.VITE_LINE_POLL_MS ?? 15000);
export const DEFAULT_TZ = import.meta.env.VITE_DEFAULT_TIMEZONE || 'Europe/Moscow';

export const SCHEDULE_PRESETS = [
  '09:00-18:00',
  '10:00-19:00',
  '12:00-21:00',
  '08:00-20:00',
  'Плавающий',
] as const;

export const ROUTES = {
  login: '/login',
  blocked: '/blocked',
  operator: { home: '/', schedule: '/schedule', history: '/history' },
  admin: {
    dashboard: '/admin',
    operators: '/admin/operators',
    monitor: '/admin/monitor',
    schedules: '/admin/schedules',
    reports: '/admin/reports',
    settings: '/admin/settings',
  },
} as const;
