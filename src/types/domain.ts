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
