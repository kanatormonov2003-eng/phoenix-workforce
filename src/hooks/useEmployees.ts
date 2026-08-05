import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FunctionsResponse, PostgrestResponse, PostgrestSingleResponse } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import type { EmployeeCreateInput, EmployeeUpdateInput } from '@/schemas/employee.schema';
import type { Project } from '@/types/domain';
import type { Database } from '@/types/database';

interface AdminResponse { ok?: boolean; employeeId?: string; userId?: string; email?: string; archived?: boolean; }
type EmployeeUserId = Pick<Database['public']['Tables']['employees']['Row'], 'user_id'>;
type Employee = Database['public']['Tables']['employees']['Row'];
interface AdminRequest { employeeId?: string; password?: string; }

function isFunctionsResponse<T>(value: unknown): value is FunctionsResponse<T> {
  return typeof value === 'object' && value !== null && 'data' in value && 'error' in value;
}

function isPostgrestResponse<T>(value: unknown): value is PostgrestResponse<T> {
  return typeof value === 'object' && value !== null && 'data' in value && 'error' in value;
}

function isPostgrestSingleResponse<T>(value: unknown): value is PostgrestSingleResponse<T> {
  return typeof value === 'object' && value !== null && 'data' in value && 'error' in value;
}

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<Project[]> => {
      const raw: unknown = await supabase.from('projects').select('*').eq('is_active', true).order('name');
      if (!isPostgrestResponse<Project>(raw)) throw new Error('INVALID_PROJECTS_RESPONSE');
      if (raw.error) throw raw.error;
      return raw.data;
    },
  });
}

async function invokeAdmin(fn: string, body: AdminRequest | EmployeeCreateInput): Promise<AdminResponse> {
  const raw: unknown = await supabase.functions.invoke<AdminResponse>(fn, { body });
  if (!isFunctionsResponse<AdminResponse>(raw)) throw new Error('INVALID_FUNCTION_RESPONSE');
  if (raw.error) throw raw.error;
  if (!raw.data) throw new Error('EMPTY_RESPONSE');
  return raw.data;
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
      const employeeRaw: unknown = await supabase.from('employees').select('user_id').eq('id', employeeId).maybeSingle();
      if (!isPostgrestSingleResponse<EmployeeUserId>(employeeRaw)) throw new Error('INVALID_EMPLOYEE_RESPONSE');
      if (employeeRaw.error) throw employeeRaw.error;
      if (!employeeRaw.data) throw new Error('EMPLOYEE_NOT_FOUND');

      const profileRaw: unknown = await supabase.from('profiles').update({ first_name: input.firstName, last_name: input.lastName }).eq('id', employeeRaw.data.user_id);
      if (!isPostgrestResponse<never>(profileRaw)) throw new Error('INVALID_PROFILE_RESPONSE');
      if (profileRaw.error) throw profileRaw.error;

      const employeeUpdateRaw: unknown = await supabase.from('employees').update({
        project_id: input.projectId,
        default_schedule: input.schedule,
        default_start: input.defaultStart,
        default_end: input.defaultEnd,
        phone: input.phone || null,
      }).eq('id', employeeId);
      if (!isPostgrestResponse<never>(employeeUpdateRaw)) throw new Error('INVALID_EMPLOYEE_UPDATE_RESPONSE');
      if (employeeUpdateRaw.error) throw employeeUpdateRaw.error;
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
      const raw: unknown = await supabase.rpc('admin_set_block', { p_employee_id: employeeId, p_blocked: blocked, p_reason: reason ?? null });
      if (!isPostgrestSingleResponse<Employee>(raw)) throw new Error('INVALID_BLOCK_RESPONSE');
      if (raw.error) throw raw.error;
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
