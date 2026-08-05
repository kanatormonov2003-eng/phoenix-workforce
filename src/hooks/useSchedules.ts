import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { safeQuery, safeQuerySingle } from '@/lib/supabase-safe';
import type { DailyScheduleInput } from '@/schemas/schedule.schema';
import type { DailySchedule, ScheduleFeedRow } from '@/types/domain';

export interface ScheduleFilters { employeeId?: string; date?: string; project?: string; }

export function useScheduleFeed(filters: ScheduleFilters) {
  return useQuery({
    queryKey: ['schedule-feed', filters],
    queryFn: async (): Promise<ScheduleFeedRow[]> => {
      let query = supabase.from('v_schedule_feed').select('*').order('work_date', { ascending: false });
      if (filters.employeeId) query = query.eq('employee_id', filters.employeeId);
      if (filters.date) query = query.eq('work_date', filters.date);
      if (filters.project) query = query.eq('project', filters.project);
      return safeQuery<ScheduleFeedRow>(await query.limit(300));
    },
  });
}

export function useSaveDailySchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: DailyScheduleInput): Promise<DailySchedule> => {
      const result = await supabase.rpc('save_daily_schedule', {
        p_work_date: input.workDate, p_planned_start: input.plannedStart, p_planned_end: input.plannedEnd,
        p_extra_hours: input.extraHours, p_reason: input.reason, p_comment: input.comment,
      });
      const data = safeQuerySingle<DailySchedule>(result);
      if (!data) throw new Error('EMPTY_SCHEDULE_RESPONSE');
      return data;
    },
    onSuccess: (_data, input) => {
      toast.success('График сохранён', { description: input.extraHours > 4 ? 'Доп. часы свыше 4 отправлены на подтверждение руководителю.' : `${input.plannedStart} – ${input.plannedEnd}, доп. ${input.extraHours} ч.` });
      void qc.invalidateQueries({ queryKey: ['schedule'] });
      void qc.invalidateQueries({ queryKey: ['schedule-feed'] });
    },
  });
}

export function useReviewSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' }): Promise<void> => {
      const result = await supabase.from('daily_schedules').update({ status, reviewed_at: new Date().toISOString() }).eq('id', id);
      safeQuery<never>(result);
    },
    onSuccess: (_data, value) => {
      toast.success(value.status === 'approved' ? 'График подтверждён' : 'График отклонён');
      void qc.invalidateQueries({ queryKey: ['schedule-feed'] });
    },
  });
}
