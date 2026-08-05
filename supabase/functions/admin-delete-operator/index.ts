import { adminClient, requireAdmin, statusFor } from '../_shared/auth.ts';
import { corsHeaders, json } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin) });

  let actorId: string;
  try {
    actorId = (await requireAdmin(req)).id;
  } catch (e) {
    const msg = (e as Error).message;
    return json({ error: msg }, statusFor(msg), origin);
  }

  const { employeeId } = (await req.json()) as { employeeId: string };
  if (!employeeId) return json({ error: 'employeeId is required' }, 422, origin);

  const admin = adminClient();

  const { data: employee } = await admin
    .from('employees')
    .select('id, user_id, profiles:user_id ( email, role )')
    .eq('id', employeeId)
    .maybeSingle();

  if (!employee) return json({ error: 'NOT_FOUND' }, 404, origin);

  const profile = employee.profiles as unknown as { email: string; role: string } | null;
  if (profile?.role === 'admin') return json({ error: 'CANNOT_DELETE_ADMIN' }, 409, origin);

  // Закрываем открытую смену, чтобы отчёты остались консистентными
  await admin
    .from('shifts')
    .update({ ended_at: new Date().toISOString(), status: 'auto_closed', closed_by: actorId })
    .eq('employee_id', employeeId)
    .eq('status', 'online');

  await admin.from('audit_log').insert({
    actor_id: actorId,
    action: 'delete',
    entity: 'employee',
    entity_id: employeeId,
    diff: { email: profile?.email ?? null },
  });

  // Удаление auth-пользователя каскадом снесёт profile → employee → shifts
  const { error } = await admin.auth.admin.deleteUser(employee.user_id);
  if (error) return json({ error: error.message }, 500, origin);

  return json({ ok: true }, 200, origin);
});
