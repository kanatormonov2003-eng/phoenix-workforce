import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { safeFunctionsInvoke, safeQuery, safeQuerySingle } from '@/lib/supabase-safe';
import type { EmployeeCreateInput, EmployeeUpdateInput } from '@/schemas/employee.schema';
import type { Project } from '@/types/domain';
import type { Database } from '@/types/database';

interface AdminResponse { ok?: boolean; employeeId?: string; userId?: string; email?: string; archived?: boolean; }
type EmployeeUserId = Pick<Database['public']['Tables']['employees']['Row'], 'user_id'>;
type Employee = Database['public']['Tables']['employees']['Row'];
interface AdminRequest { employeeId?: string; password?: string; }

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<Project[]> => {
      const result = await supabase.from('projects').select('*').eq('is_active', true).order('name');
      return safeQuery<Project>(result);
    },
  });
}

async function invokeAdmin(fn: string, body: AdminRequest | EmployeeCreateInput): Promise<AdminResponse> {
  const result = await supabase.functions.invoke<AdminResponse>(fn, { body });
  return safeFunctionsInvoke<AdminResponse>(result);
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: EmployeeCreateInput) => invokeAdmin('admin-create-operator', input),
    onSuccess: (_d, input) => {
      toast.success('Оператор создан', { description: `${input.firstName} ${input.lastName} может входить по ${input.email}.` });
      void qc.invalidateQueries({ queryKey: ['line-status'] });
      void qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
}

export function useUpdateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ employeeId, input }: { employeeId: string; input: EmployeeUpdateInput }) => {
      const employeeResult = await supabase.from('employees').select('user_id').eq('id', employeeId).maybeSingle();
      const employee = safeQuerySingle<EmployeeUserId>(employeeResult);
      if (!employee) throw new Error('EMPLOYEE_NOT_FOUND');

      const profileResult = await supabase.from('profiles').update({ first_name: input.firstName, last_name: input.lastName }).eq('id', employee.user_id);
      safeQuery<never>(profileResult);

      const employeeUpdateResult = await supabase.from('employees').update({
        project_id: input.projectId,
        default_schedule: input.schedule,
        default_start: input.defaultStart,
        default_end: input.defaultEnd,
        phone: input.phone || null,
      }).eq('id', employeeId);
      safeQuery<never>(employeeUpdateResult);
      if (input.password) await invokeAdmin('admin-reset-password', { employeeId, password: input.password });
    },
    onSuccess: () => {
      toast.success('Данные обновлены');
      void qc.invalidateQueries({ queryKey: ['line-status'] });
    },
  });
}

export function useToggleBlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ employeeId, blocked, reason }: { employeeId: string; blocked: boolean; reason?: string }) => {
      const result = await supabase.rpc('admin_set_block', { p_employee_id: employeeId, p_blocked: blocked, p_reason: reason ?? null });
      safeQuerySingle<Employee>(result);
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
      toast.success('Оператор архивирован', { description: 'История смен сохранена в отчётах.' });
      void qc.invalidateQueries({ queryKey: ['line-status'] });
      void qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
}
