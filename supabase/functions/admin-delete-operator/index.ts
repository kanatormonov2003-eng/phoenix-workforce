import { adminClient, requireAdmin, statusFor } from '../_shared/auth.ts';
import { corsHeaders, json } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin) });
  let actorId: string;
  try { actorId = (await requireAdmin(req)).id; } catch (e) { const msg = (e as Error).message; return json({ error: msg }, statusFor(msg), origin); }
  let body: { employeeId?: string };
  try { body = await req.json(); } catch { return json({ error: 'INVALID_JSON' }, 400, origin); }
  if (!body.employeeId || !/^[0-9a-f-]{36}$/i.test(body.employeeId)) return json({ error: 'INVALID_EMPLOYEE_ID' }, 422, origin);
  const admin = adminClient();
  const { data: employee } = await admin.from('employees').select('id,user_id').eq('id', body.employeeId).is('deleted_at', null).maybeSingle();
  if (!employee) return json({ error: 'NOT_FOUND' }, 404, origin);
  const { error: archiveError } = await admin.from('employees').update({ active: false, blocked_at: new Date().toISOString(), blocked_reason: 'archived', deleted_at: new Date().toISOString() }).eq('id', employee.id);
  if (archiveError) return json({ error: 'ARCHIVE_FAILED' }, 500, origin);
  await admin.from('profiles').update({ is_active: false, deleted_at: new Date().toISOString() }).eq('id', employee.user_id);
  await admin.from('shifts').update({ ended_at: new Date().toISOString(), status: 'auto_closed', closed_by: actorId }).eq('employee_id', employee.id).eq('status', 'online');
  await admin.from('audit_log').insert({ actor_id: actorId, action: 'archive', entity: 'employee', entity_id: employee.id, diff: { reason: 'admin_archive' } });
  const { error } = await admin.auth.admin.updateUserById(employee.user_id, { ban_duration: '876000h' });
  if (error) return json({ error: 'AUTH_ARCHIVE_FAILED' }, 500, origin);
  return json({ ok: true, archived: true }, 200, origin);
});
