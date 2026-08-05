import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { safeQuery, safeQuerySingle } from '@/lib/supabase-safe';
import { todayISO, monthRange } from '@/lib/time';
import type { DashboardStats, DailySummaryRow, MonthlyReportRow } from '@/types/domain';
import type { Database } from '@/types/database';

type Json = Database['public']['Tables']['notification_jobs']['Row']['payload'];

function parseStats(value: unknown): DashboardStats {
  if (!value || typeof value !== 'object') throw new Error('INVALID_DASHBOARD_STATS');
  const row = value as Record<string, unknown>;
  const number = (key: keyof DashboardStats): number => {
    const raw = row[key];
    return typeof raw === 'number' ? raw : Number(raw ?? 0);
  };
  return {
    total_employees: number('total_employees'), blocked: number('blocked'), online_now: number('online_now'),
    worked_today: number('worked_today'), hours_today: number('hours_today'), extra_today: number('extra_today'),
    avg_minutes: number('avg_minutes'), late_now: number('late_now'),
  };
}

export function useDashboardStats(date: string = todayISO()) {
  return useQuery({
    queryKey: ['dashboard-stats', date],
    refetchInterval: 30_000,
    queryFn: async (): Promise<DashboardStats> => {
      const result = await supabase.rpc('admin_dashboard_stats', { p_date: date });
      return parseStats(safeQuerySingle<Json>(result));
    },
  });
}

export function useDailySummary(date: string = todayISO()) {
  return useQuery({
    queryKey: ['daily-summary', date],
    queryFn: async (): Promise<DailySummaryRow[]> => {
      const result = await supabase.from('v_daily_summary').select('*').eq('work_date', date).order('worked_hours', { ascending: false });
      return safeQuery<DailySummaryRow>(result);
    },
  });
}

export function useMonthlyReport(range = monthRange()) {
  return useQuery({
    queryKey: ['monthly-report', range.from, range.to],
    queryFn: async (): Promise<MonthlyReportRow[]> => {
      const result = await supabase.rpc('admin_monthly_report', { p_from: range.from, p_to: range.to });
      return safeQuery<MonthlyReportRow>(result);
    },
  });
}
