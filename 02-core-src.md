# Phoenix Workforce Control — часть 2: ядро (типы, lib, схемы, провайдеры, хуки)

## `src/types/database.ts`

> Генерируется командой `npm run db:types`. Ниже — зафиксированный результат.

```ts
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type AppRole = 'admin' | 'operator';
export type ShiftStatus = 'online' | 'closed' | 'auto_closed' | 'absent';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type ExtraReason = 'replacement' | 'peak_load' | 'training' | 'other';
export type LineState = 'online' | 'offline' | 'late' | 'blocked';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          first_name: string;
          last_name: string;
          full_name: string;
          role: AppRole;
          is_active: boolean;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & { id: string; email: string };
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
      };
      projects: {
        Row: { id: string; name: string; code: string; color: string; is_active: boolean; created_at: string };
        Insert: { name: string; code: string; color?: string; is_active?: boolean };
        Update: Partial<{ name: string; code: string; color: string; is_active: boolean }>;
      };
      employees: {
        Row: {
          id: string;
          user_id: string;
          project_id: string | null;
          default_schedule: string;
          default_start: string;
          default_end: string;
          timezone: string;
          phone: string | null;
          hired_at: string;
          active: boolean;
          blocked_at: string | null;
          blocked_reason: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['employees']['Row']> & { user_id: string };
        Update: Partial<Database['public']['Tables']['employees']['Row']>;
      };
      shifts: {
        Row: {
          id: string;
          employee_id: string;
          work_date: string;
          started_at: string;
          ended_at: string | null;
          status: ShiftStatus;
          total_minutes: number | null;
          closed_by: string | null;
          note: string | null;
          created_at: string;
        };
        Insert: { employee_id: string; work_date?: string; started_at?: string; status?: ShiftStatus; note?: string };
        Update: Partial<Database['public']['Tables']['shifts']['Row']>;
      };
      additional_hours: {
        Row: {
          id: string;
          employee_id: string;
          work_date: string;
          hours: number;
          reason: ExtraReason;
          comment: string;
          status: ApprovalStatus;
          approved_by: string | null;
          approved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: { employee_id: string; work_date: string; hours: number; reason?: ExtraReason; comment?: string };
        Update: Partial<Database['public']['Tables']['additional_hours']['Row']>;
      };
      daily_schedules: {
        Row: {
          id: string;
          employee_id: string;
          work_date: string;
          planned_start: string;
          planned_end: string;
          extra_hours: number;
          reason: ExtraReason | null;
          comment: string;
          status: ApprovalStatus;
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          employee_id: string; work_date: string; planned_start: string; planned_end: string;
          extra_hours?: number; reason?: ExtraReason | null; comment?: string;
        };
        Update: Partial<Database['public']['Tables']['daily_schedules']['Row']>;
      };
      notification_settings: {
        Row: {
          id: boolean;
          telegram_enabled: boolean;
          telegram_chat_id: string | null;
          late_threshold_minutes: number;
          notify_on_start: boolean;
          notify_on_end: boolean;
          notify_on_late: boolean;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['notification_settings']['Row']>;
        Update: Partial<Database['public']['Tables']['notification_settings']['Row']>;
      };
      notification_log: {
        Row: {
          id: string; kind: string; employee_id: string | null;
          payload: Json; delivered: boolean; error: string | null; created_at: string;
        };
        Insert: never;
        Update: never;
      };
      audit_log: {
        Row: {
          id: string; actor_id: string | null; action: string;
          entity: string; entity_id: string | null; diff: Json; created_at: string;
        };
        Insert: never;
        Update: never;
      };
    };
    Views: {
      v_line_status: {
        Row: {
          employee_id: string;
          user_id: string;
          full_name: string;
          email: string;
          project: string;
          default_schedule: string;
          active: boolean;
          blocked: boolean;
          shift_id: string | null;
          started_at: string | null;
          started_label: string | null;
          line_state: LineState;
          today_minutes: number;
          planned_start: string | null;
          planned_end: string | null;
          extra_hours: number | null;
        };
      };
      v_daily_summary: {
        Row: {
          employee_id: string; work_date: string; full_name: string; project: string;
          first_start: string | null; last_end: string | null;
          worked_hours: number; extra_hours: number; shifts_count: number;
        };
      };
      v_schedule_feed: {
        Row: {
          id: string; work_date: string; employee_id: string; full_name: string; project: string;
          planned_start: string; planned_end: string; extra_hours: number;
          reason: ExtraReason | null; comment: string; status: ApprovalStatus; created_at: string;
        };
      };
    };
    Functions: {
      start_shift: { Args: Record<string, never>; Returns: Database['public']['Tables']['shifts']['Row'] };
      end_shift: { Args: { p_note?: string | null }; Returns: Database['public']['Tables']['shifts']['Row'] };
      save_daily_schedule: {
        Args: {
          p_work_date: string; p_planned_start: string; p_planned_end: string;
          p_extra_hours?: number; p_reason?: ExtraReason | null; p_comment?: string;
        };
        Returns: Database['public']['Tables']['daily_schedules']['Row'];
      };
      admin_set_block: {
        Args: { p_employee_id: string; p_blocked: boolean; p_reason?: string | null };
        Returns: Database['public']['Tables']['employees']['Row'];
      };
      admin_dashboard_stats: { Args: { p_date?: string }; Returns: Json };
      admin_monthly_report: {
        Args: { p_from: string; p_to: string };
        Returns: {
          employee_id: string; full_name: string; project: string;
          shifts_count: number; base_hours: number; extra_hours: number; total_hours: number;
        }[];
      };
      is_admin: { Args: Record<string, never>; Returns: boolean };
      current_employee_id: { Args: Record<string, never>; Returns: string | null };
    };
    Enums: {
      app_role: AppRole;
      shift_status: ShiftStatus;
      approval_status: ApprovalStatus;
      extra_reason: ExtraReason;
    };
  };
}
```

---

## `src/types/domain.ts`

```ts
import type { Database, AppRole, LineState, ApprovalStatus, ExtraReason } from './database';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Employee = Database['public']['Tables']['employees']['Row'];
export type Shift = Database['public']['Tables']['shifts']['Row'];
export type DailySchedule = Database['public']['Tables']['daily_schedules']['Row'];
export type AdditionalHours = Database['public']['Tables']['additional_hours']['Row'];
export type Project = Database['public']['Tables']['projects']['Row'];
export type NotificationSettings = Database['public']['Tables']['notification_settings']['Row'];

export type LineStatusRow = Database['public']['Views']['v_line_status']['Row'];
export type DailySummaryRow = Database['public']['Views']['v_daily_summary']['Row'];
export type ScheduleFeedRow = Database['public']['Views']['v_schedule_feed']['Row'];
export type MonthlyReportRow = Database['public']['Functions']['admin_monthly_report']['Returns'][number];

export interface DashboardStats {
  total_employees: number;
  blocked: number;
  online_now: number;
  worked_today: number;
  hours_today: number;
  extra_today: number;
  avg_minutes: number;
  late_now: number;
}

export interface SessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: AppRole;
  isActive: boolean;
  employeeId: string | null;
  project: string | null;
  defaultSchedule: string | null;
}

export interface EmployeeListItem {
  employeeId: string;
  userId: string;
  fullName: string;
  email: string;
  project: string;
  schedule: string;
  lineState: LineState;
  startedLabel: string | null;
  todayMinutes: number;
  extraHours: number;
  blocked: boolean;
}

export const REASON_LABEL: Record<ExtraReason, string> = {
  replacement: 'Замена сотрудника',
  peak_load: 'Пиковая нагрузка',
  training: 'Обучение',
  other: 'Другое',
};

export const APPROVAL_LABEL: Record<ApprovalStatus, string> = {
  pending: 'На проверке',
  approved: 'Подтверждён',
  rejected: 'Отклонён',
};

export const LINE_STATE_LABEL: Record<LineState, string> = {
  online: 'На линии',
  offline: 'Не на линии',
  late: 'Опоздание',
  blocked: 'Заблокирован',
};
```

---

## `src/lib/supabase.ts`

```ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Не заданы VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Скопируйте .env.example в .env.local.',
  );
}

export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: 'phoenix.auth',
    flowType: 'pkce',
  },
  global: { headers: { 'x-application-name': 'phoenix-workforce-control' } },
  realtime: { params: { eventsPerSecond: 5 } },
});
```

## `src/vite-env.d.ts`

```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_APP_NAME: string;
  readonly VITE_DEFAULT_TIMEZONE: string;
  readonly VITE_LINE_POLL_MS: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

---

## `src/lib/utils.ts`

```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export function generatePassword(length = 14): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$%';
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms = 250) {
  let t: ReturnType<typeof setTimeout>;
  return (...args: A) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
```

## `src/lib/time.ts`

```ts
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
```

## `src/lib/errors.ts`

```ts
import { PostgrestError, AuthError } from '@supabase/supabase-js';

const CODE_MESSAGES: Record<string, string> = {
  EMPLOYEE_NOT_FOUND: 'Профиль сотрудника не найден. Обратитесь к администратору.',
  EMPLOYEE_BLOCKED: 'Ваш доступ приостановлен. Свяжитесь с руководителем.',
  SHIFT_ALREADY_OPEN: 'Смена уже открыта. Обновите страницу.',
  NO_OPEN_SHIFT: 'Открытой смены нет, завершать нечего.',
  PAST_DATE_LOCKED: 'Прошедшую дату изменить нельзя. Напишите руководителю.',
  FORBIDDEN: 'Недостаточно прав для этого действия.',
  'Invalid login credentials': 'Неверный email или пароль.',
  'Email not confirmed': 'Учётная запись не активирована. Обратитесь к администратору.',
  'User already registered': 'Пользователь с таким email уже существует.',
};

export function humanizeError(error: unknown): string {
  if (!error) return 'Неизвестная ошибка.';

  if (error instanceof AuthError || error instanceof PostgrestError) {
    const key = Object.keys(CODE_MESSAGES).find((k) => error.message.includes(k));
    if (key) return CODE_MESSAGES[key] as string;
  }
  if (error instanceof Error) {
    const key = Object.keys(CODE_MESSAGES).find((k) => error.message.includes(k));
    if (key) return CODE_MESSAGES[key] as string;
    if (error.message.includes('Failed to fetch')) return 'Нет связи с сервером. Проверьте интернет.';
    return error.message;
  }
  return String(error);
}
```

## `src/lib/constants.ts`

```ts
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
```

---

## `src/schemas/auth.schema.ts`

```ts
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, 'Введите email').email('Некорректный email'),
  password: z.string().min(8, 'Минимум 8 символов'),
});

export type LoginInput = z.infer<typeof loginSchema>;
```

## `src/schemas/employee.schema.ts`

```ts
import { z } from 'zod';

export const employeeCreateSchema = z.object({
  firstName: z.string().trim().min(2, 'Укажите имя').max(40),
  lastName: z.string().trim().min(2, 'Укажите фамилию').max(40),
  email: z.string().trim().toLowerCase().email('Некорректный email'),
  password: z
    .string()
    .min(8, 'Минимум 8 символов')
    .regex(/[a-zA-Zа-яА-Я]/, 'Добавьте буквы')
    .regex(/\d/, 'Добавьте цифру'),
  projectId: z.string().uuid('Выберите проект'),
  schedule: z.string().min(3, 'Укажите график'),
  defaultStart: z.string().regex(/^\d{2}:\d{2}$/, 'Формат ЧЧ:ММ'),
  defaultEnd: z.string().regex(/^\d{2}:\d{2}$/, 'Формат ЧЧ:ММ'),
  phone: z.string().trim().max(20).optional().or(z.literal('')),
});

export const employeeUpdateSchema = employeeCreateSchema
  .omit({ password: true })
  .extend({ password: z.string().min(8).optional().or(z.literal('')) });

export type EmployeeCreateInput = z.infer<typeof employeeCreateSchema>;
export type EmployeeUpdateInput = z.infer<typeof employeeUpdateSchema>;
```

## `src/schemas/schedule.schema.ts`

```ts
import { z } from 'zod';

export const dailyScheduleSchema = z
  .object({
    workDate: z.string().min(1, 'Укажите дату'),
    plannedStart: z.string().regex(/^\d{2}:\d{2}$/, 'Формат ЧЧ:ММ'),
    plannedEnd: z.string().regex(/^\d{2}:\d{2}$/, 'Формат ЧЧ:ММ'),
    extraHours: z.coerce.number().min(0, 'Не меньше 0').max(12, 'Не больше 12'),
    reason: z.enum(['replacement', 'peak_load', 'training', 'other']),
    comment: z.string().trim().max(280, 'До 280 символов').default(''),
  })
  .refine((v) => v.plannedEnd !== v.plannedStart, {
    message: 'Конец не может совпадать с началом',
    path: ['plannedEnd'],
  })
  .refine((v) => v.extraHours === 0 || v.comment.length >= 3, {
    message: 'Опишите причину дополнительных часов',
    path: ['comment'],
  });

export type DailyScheduleInput = z.infer<typeof dailyScheduleSchema>;
```

## `src/schemas/settings.schema.ts`

```ts
import { z } from 'zod';

export const telegramSettingsSchema = z.object({
  telegramEnabled: z.boolean(),
  telegramChatId: z
    .string()
    .trim()
    .regex(/^-?\d{5,20}$/, 'CHAT_ID: число, может начинаться с минуса')
    .or(z.literal('')),
  lateThresholdMinutes: z.coerce.number().int().min(0).max(120),
  notifyOnStart: z.boolean(),
  notifyOnEnd: z.boolean(),
  notifyOnLate: z.boolean(),
});

export type TelegramSettingsInput = z.infer<typeof telegramSettingsSchema>;
```

---

## `src/providers/AuthProvider.tsx`

```tsx
import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { SessionUser } from '@/types/domain';

interface AuthContextValue {
  session: Session | null;
  user: SessionUser | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

async function loadSessionUser(userId: string): Promise<SessionUser | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(
      `id, email, first_name, last_name, full_name, role, is_active,
       employees:employees!employees_user_id_fkey (
         id, default_schedule, active, blocked_at,
         projects:project_id ( name )
       )`,
    )
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) return null;

  const emp = Array.isArray(data.employees) ? data.employees[0] : data.employees;
  const project = emp?.projects as { name: string } | null | undefined;

  return {
    id: data.id,
    email: data.email,
    firstName: data.first_name,
    lastName: data.last_name,
    fullName: data.full_name,
    role: data.role,
    isActive: data.is_active && (emp ? emp.active && !emp.blocked_at : true),
    employeeId: emp?.id ?? null,
    project: project?.name ?? null,
    defaultSchedule: emp?.default_schedule ?? null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const hydrate = useCallback(async (s: Session | null) => {
    setSession(s);
    if (!s?.user) {
      setUser(null);
      setLoading(false);
      return;
    }
    setUser(await loadSessionUser(s.user.id));
    setLoading(false);
  }, []);

  useEffect(() => {
    let alive = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (alive) void hydrate(data.session);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (!alive) return;
      if (event === 'TOKEN_REFRESHED') {
        setSession(s);
        return;
      }
      void hydrate(s);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [hydrate]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  const refresh = useCallback(async () => {
    if (session?.user) setUser(await loadSessionUser(session.user.id));
  }, [session]);

  const value = useMemo<AuthContextValue>(
    () => ({ session, user, loading, isAdmin: user?.role === 'admin', signIn, signOut, refresh }),
    [session, user, loading, signIn, signOut, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
```

## `src/providers/QueryProvider.tsx`

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { humanizeError } from '@/lib/errors';

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 20_000,
            retry: (count, err) => count < 2 && !String(err).includes('FORBIDDEN'),
            refetchOnWindowFocus: true,
          },
          mutations: {
            onError: (err) => toast.error('Не получилось', { description: humanizeError(err) }),
          },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
```

---

## `src/hooks/useAuth.ts`

```ts
import { useContext } from 'react';
import { AuthContext } from '@/providers/AuthProvider';

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth должен вызываться внутри <AuthProvider>');
  return ctx;
}
```

## `src/hooks/useShift.ts`

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { todayISO, formatTime, formatMinutes } from '@/lib/time';
import type { Shift, DailySchedule } from '@/types/domain';

export function useCurrentShift(employeeId: string | null) {
  return useQuery({
    queryKey: ['shift', 'current', employeeId],
    enabled: Boolean(employeeId),
    refetchInterval: 30_000,
    queryFn: async (): Promise<Shift | null> => {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('employee_id', employeeId as string)
        .eq('status', 'online')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useTodaySchedule(employeeId: string | null) {
  return useQuery({
    queryKey: ['schedule', 'today', employeeId],
    enabled: Boolean(employeeId),
    queryFn: async (): Promise<DailySchedule | null> => {
      const { data, error } = await supabase
        .from('daily_schedules')
        .select('*')
        .eq('employee_id', employeeId as string)
        .eq('work_date', todayISO())
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useShiftHistory(employeeId: string | null, limit = 30) {
  return useQuery({
    queryKey: ['shift', 'history', employeeId, limit],
    enabled: Boolean(employeeId),
    queryFn: async (): Promise<Shift[]> => {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('employee_id', employeeId as string)
        .order('work_date', { ascending: false })
        .order('started_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useStartShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('start_shift');
      if (error) throw error;
      return data as Shift;
    },
    onSuccess: (shift) => {
      toast.success('Вы на линии', {
        description: `Смена началась в ${formatTime(shift.started_at)}. Руководитель уведомлён.`,
      });
      void qc.invalidateQueries({ queryKey: ['shift'] });
      void qc.invalidateQueries({ queryKey: ['line-status'] });
    },
  });
}

export function useEndShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (note?: string) => {
      const { data, error } = await supabase.rpc('end_shift', { p_note: note ?? null });
      if (error) throw error;
      return data as Shift;
    },
    onSuccess: (shift) => {
      toast.success('Смена закрыта', {
        description: `Записано ${formatMinutes(shift.total_minutes)}. Итог ушёл в отчёт.`,
      });
      void qc.invalidateQueries({ queryKey: ['shift'] });
      void qc.invalidateQueries({ queryKey: ['line-status'] });
    },
  });
}
```

## `src/hooks/useLineStatus.ts`

```ts
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { LINE_POLL_MS } from '@/lib/constants';
import type { LineStatusRow } from '@/types/domain';

export function useLineStatus() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['line-status'],
    refetchInterval: LINE_POLL_MS,
    queryFn: async (): Promise<LineStatusRow[]> => {
      const { data, error } = await supabase
        .from('v_line_status')
        .select('*')
        .order('line_state', { ascending: true })
        .order('full_name', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Realtime: любое изменение смен мгновенно обновляет монитор
  useEffect(() => {
    const channel = supabase
      .channel('phoenix-line')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts' }, () => {
        void qc.invalidateQueries({ queryKey: ['line-status'] });
        void qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc]);

  return query;
}
```

## `src/hooks/useEmployees.ts`

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import type { EmployeeCreateInput, EmployeeUpdateInput } from '@/schemas/employee.schema';
import type { Project } from '@/types/domain';

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<Project[]> => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
  });
}

async function invokeAdmin<T>(fn: string, body: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(fn, { body });
  if (error) throw error;
  return data as T;
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: EmployeeCreateInput) => invokeAdmin('admin-create-operator', input),
    onSuccess: (_d, input) => {
      toast.success('Оператор создан', {
        description: `${input.firstName} ${input.lastName} может входить по ${input.email}.`,
      });
      void qc.invalidateQueries({ queryKey: ['line-status'] });
      void qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
}

export function useUpdateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ employeeId, input }: { employeeId: string; input: EmployeeUpdateInput }) => {
      const { error: pErr } = await supabase
        .from('profiles')
        .update({ first_name: input.firstName, last_name: input.lastName })
        .eq('id', (await getUserIdByEmployee(employeeId)) ?? '');
      if (pErr) throw pErr;

      const { error } = await supabase
        .from('employees')
        .update({
          project_id: input.projectId,
          default_schedule: input.schedule,
          default_start: input.defaultStart,
          default_end: input.defaultEnd,
          phone: input.phone || null,
        })
        .eq('id', employeeId);
      if (error) throw error;

      if (input.password) {
        await invokeAdmin('admin-reset-password', { employeeId, password: input.password });
      }
    },
    onSuccess: () => {
      toast.success('Данные обновлены');
      void qc.invalidateQueries({ queryKey: ['line-status'] });
    },
  });
}

async function getUserIdByEmployee(employeeId: string): Promise<string | null> {
  const { data } = await supabase.from('employees').select('user_id').eq('id', employeeId).maybeSingle();
  return data?.user_id ?? null;
}

export function useToggleBlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ employeeId, blocked, reason }: { employeeId: string; blocked: boolean; reason?: string }) => {
      const { error } = await supabase.rpc('admin_set_block', {
        p_employee_id: employeeId,
        p_blocked: blocked,
        p_reason: reason ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast[v.blocked ? 'warning' : 'success'](v.blocked ? 'Доступ отозван' : 'Доступ восстановлен');
      void qc.invalidateQueries({ queryKey: ['line-status'] });
      void qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
}

export function useDeleteEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (employeeId: string) => invokeAdmin('admin-delete-operator', { employeeId }),
    onSuccess: () => {
      toast.success('Оператор удалён', { description: 'История смен сохранена в отчётах.' });
      void qc.invalidateQueries({ queryKey: ['line-status'] });
      void qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
}
```

## `src/hooks/useSchedules.ts`

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import type { DailyScheduleInput } from '@/schemas/schedule.schema';
import type { ScheduleFeedRow } from '@/types/domain';

export interface ScheduleFilters {
  employeeId?: string;
  date?: string;
  project?: string;
}

export function useScheduleFeed(filters: ScheduleFilters) {
  return useQuery({
    queryKey: ['schedule-feed', filters],
    queryFn: async (): Promise<ScheduleFeedRow[]> => {
      let q = supabase.from('v_schedule_feed').select('*').order('work_date', { ascending: false });
      if (filters.employeeId) q = q.eq('employee_id', filters.employeeId);
      if (filters.date) q = q.eq('work_date', filters.date);
      if (filters.project) q = q.eq('project', filters.project);
      const { data, error } = await q.limit(300);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSaveDailySchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: DailyScheduleInput) => {
      const { data, error } = await supabase.rpc('save_daily_schedule', {
        p_work_date: input.workDate,
        p_planned_start: input.plannedStart,
        p_planned_end: input.plannedEnd,
        p_extra_hours: input.extraHours,
        p_reason: input.reason,
        p_comment: input.comment,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, input) => {
      toast.success('График сохранён', {
        description:
          input.extraHours > 4
            ? 'Доп. часы свыше 4 отправлены на подтверждение руководителю.'
            : `${input.plannedStart} – ${input.plannedEnd}, доп. ${input.extraHours} ч.`,
      });
      void qc.invalidateQueries({ queryKey: ['schedule'] });
      void qc.invalidateQueries({ queryKey: ['schedule-feed'] });
    },
  });
}

export function useReviewSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => {
      const { error } = await supabase
        .from('daily_schedules')
        .update({ status, reviewed_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast.success(v.status === 'approved' ? 'График подтверждён' : 'График отклонён');
      void qc.invalidateQueries({ queryKey: ['schedule-feed'] });
    },
  });
}
```

## `src/hooks/useReports.ts`

```ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { todayISO, monthRange } from '@/lib/time';
import type { DashboardStats, DailySummaryRow, MonthlyReportRow } from '@/types/domain';

export function useDashboardStats(date: string = todayISO()) {
  return useQuery({
    queryKey: ['dashboard-stats', date],
    refetchInterval: 30_000,
    queryFn: async (): Promise<DashboardStats> => {
      const { data, error } = await supabase.rpc('admin_dashboard_stats', { p_date: date });
      if (error) throw error;
      return data as unknown as DashboardStats;
    },
  });
}

export function useDailySummary(date: string = todayISO()) {
  return useQuery({
    queryKey: ['daily-summary', date],
    queryFn: async (): Promise<DailySummaryRow[]> => {
      const { data, error } = await supabase
        .from('v_daily_summary')
        .select('*')
        .eq('work_date', date)
        .order('worked_hours', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMonthlyReport(range = monthRange()) {
  return useQuery({
    queryKey: ['monthly-report', range.from, range.to],
    queryFn: async (): Promise<MonthlyReportRow[]> => {
      const { data, error } = await supabase.rpc('admin_monthly_report', {
        p_from: range.from,
        p_to: range.to,
      });
      if (error) throw error;
      return data ?? [];
    },
  });
}
```

## `src/hooks/useSettings.ts`

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import type { TelegramSettingsInput } from '@/schemas/settings.schema';
import type { NotificationSettings } from '@/types/domain';

export function useNotificationSettings() {
  return useQuery({
    queryKey: ['notification-settings'],
    queryFn: async (): Promise<NotificationSettings | null> => {
      const { data, error } = await supabase.from('notification_settings').select('*').maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveNotificationSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TelegramSettingsInput) => {
      const { error } = await supabase.from('notification_settings').upsert({
        id: true,
        telegram_enabled: input.telegramEnabled,
        telegram_chat_id: input.telegramChatId || null,
        late_threshold_minutes: input.lateThresholdMinutes,
        notify_on_start: input.notifyOnStart,
        notify_on_end: input.notifyOnEnd,
        notify_on_late: input.notifyOnLate,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Настройки сохранены');
      void qc.invalidateQueries({ queryKey: ['notification-settings'] });
    },
  });
}

export function useTestTelegram() {
  return useMutation({
    mutationFn: async (chatId: string) => {
      const { error } = await supabase.functions.invoke('telegram-notify', {
        body: { chat_id: chatId, text: '✅ <b>Phoenix</b>\nТестовое сообщение. Канал работает.' },
      });
      if (error) throw error;
    },
    onSuccess: () => toast.success('Тестовое сообщение отправлено'),
  });
}
```
