import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { safeQuery, safeQuerySingle } from '@/lib/supabase-safe';
import { todayISO, formatTime, formatMinutes } from '@/lib/time';
import type { Shift, DailySchedule } from '@/types/domain';

export function useCurrentShift(employeeId: string | null) {
  return useQuery({
    queryKey: ['shift', 'current', employeeId],
    enabled: Boolean(employeeId),
    refetchInterval: 30_000,
    queryFn: async (): Promise<Shift | null> => {
      const result = await supabase.from('shifts').select('*').eq('employee_id', employeeId ?? '').eq('status', 'online').maybeSingle();
      return safeQuerySingle<Shift>(result);
    },
  });
}

export function useTodaySchedule(employeeId: string | null) {
  return useQuery({
    queryKey: ['schedule', 'today', employeeId],
    enabled: Boolean(employeeId),
    queryFn: async (): Promise<DailySchedule | null> => {
      const result = await supabase.from('daily_schedules').select('*').eq('employee_id', employeeId ?? '').eq('work_date', todayISO()).maybeSingle();
      return safeQuerySingle<DailySchedule>(result);
    },
  });
}

export function useShiftHistory(employeeId: string | null, limit = 30) {
  return useQuery({
    queryKey: ['shift', 'history', employeeId, limit],
    enabled: Boolean(employeeId),
    queryFn: async (): Promise<Shift[]> => {
      const result = await supabase.from('shifts').select('*').eq('employee_id', employeeId ?? '').order('work_date', { ascending: false }).order('started_at', { ascending: false }).limit(limit);
      return safeQuery<Shift>(result);
    },
  });
}

export function useStartShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<Shift> => {
      const result = await supabase.rpc('start_shift');
      const shift = safeQuerySingle<Shift>(result);
      if (!shift) throw new Error('EMPTY_SHIFT_RESPONSE');
      return shift;
    },
    onSuccess: (shift) => {
      toast.success('Вы на линии', { description: `Смена началась в ${formatTime(shift.started_at)}. Руководитель уведомлён.` });
      void qc.invalidateQueries({ queryKey: ['shift'] });
      void qc.invalidateQueries({ queryKey: ['line-status'] });
    },
  });
}

export function useEndShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (note?: string): Promise<Shift> => {
      const result = await supabase.rpc('end_shift', { p_note: note ?? null });
      const shift = safeQuerySingle<Shift>(result);
      if (!shift) throw new Error('EMPTY_SHIFT_RESPONSE');
      return shift;
    },
    onSuccess: (shift) => {
      toast.success('Смена закрыта', { description: `Записано ${formatMinutes(shift.total_minutes)}. Итог ушёл в отчёт.` });
      void qc.invalidateQueries({ queryKey: ['shift'] });
      void qc.invalidateQueries({ queryKey: ['line-status'] });
    },
  });
}
