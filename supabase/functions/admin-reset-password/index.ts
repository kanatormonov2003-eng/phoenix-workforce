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

  const { employeeId, password } = (await req.json()) as { employeeId: string; password: string };
  if (!employeeId || (password ?? '').length < 8) return json({ error: 'VALIDATION_FAILED' }, 422, origin);

  const admin = adminClient();
  const { data: employee } = await admin.from('employees').select('user_id').eq('id', employeeId).maybeSingle();
  if (!employee) return json({ error: 'NOT_FOUND' }, 404, origin);

  const { error } = await admin.auth.admin.updateUserById(employee.user_id, { password });
  if (error) return json({ error: error.message }, 500, origin);

  // Все активные сессии оператора становятся недействительными
  await admin.auth.admin.signOut(employee.user_id, 'global');

  await admin.from('audit_log').insert({
    actor_id: actorId,
    action: 'reset_password',
    entity: 'employee',
    entity_id: employeeId,
  });

  return json({ ok: true }, 200, origin);
});
