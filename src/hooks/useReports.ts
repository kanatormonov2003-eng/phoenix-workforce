import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { todayISO, monthRange } from '@/lib/time';
import type { DashboardStats, DailySummaryRow, MonthlyReportRow } from '@/types/domain';

function parseStats(value: unknown): DashboardStats {
  if (!value || typeof value !== 'object') throw new Error('INVALID_DASHBOARD_STATS');
  const row = value as Record<string, unknown>;
  const number = (key: keyof DashboardStats): number => typeof row[key] === 'number' ? row[key] as number : Number(row[key] ?? 0);
  return { total_employees:number('total_employees'), blocked:number('blocked'), online_now:number('online_now'), worked_today:number('worked_today'), hours_today:number('hours_today'), extra_today:number('extra_today'), avg_minutes:number('avg_minutes'), late_now:number('late_now') };
}
export function useDashboardStats(date:string=todayISO()){return useQuery({queryKey:['dashboard-stats',date],refetchInterval:30_000,queryFn:async():Promise<DashboardStats=>{const {data,error}=await supabase.rpc('admin_dashboard_stats',{p_date:date});if(error)throw error;return parseStats(data);}});}
export function useDailySummary(date:string=todayISO()){return useQuery({queryKey:['daily-summary',date],queryFn:async():Promise<DailySummaryRow[]>=>{const {data,error}=await supabase.from('v_daily_summary').select('*').eq('work_date',date).order('worked_hours',{ascending:false});if(error)throw error;return data ?? [];}});}
export function useMonthlyReport(range=monthRange()){return useQuery({queryKey:['monthly-report',range.from,range.to],queryFn:async():Promise<MonthlyReportRow[]>=>{const {data,error}=await supabase.rpc('admin_monthly_report',{p_from:range.from,p_to:range.to});if(error)throw error;return data ?? [];}});}
