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
