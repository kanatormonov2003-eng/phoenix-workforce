import { adminClient, requireAdmin, statusFor } from '../_shared/auth.ts';
import { corsHeaders, json } from '../_shared/cors.ts';

interface Payload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  projectId: string;
  schedule: string;
  defaultStart: string;
  defaultEnd: string;
  phone?: string;
}

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

  const body = (await req.json()) as Payload;

  // ── валидация на сервере, не доверяем клиенту ──
  const errors: string[] = [];
  if (!body.firstName?.trim() || body.firstName.trim().length < 2) errors.push('firstName');
  if (!body.lastName?.trim() || body.lastName.trim().length < 2) errors.push('lastName');
  if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(body.email ?? '')) errors.push('email');
  if ((body.password ?? '').length < 8) errors.push('password');
  if (!body.projectId) errors.push('projectId');
  if (errors.length) return json({ error: 'VALIDATION_FAILED', fields: errors }, 422, origin);

  const admin = adminClient();
  const email = body.email.trim().toLowerCase();

  // 1. Пользователь в auth (сразу подтверждённый, без письма)
  const { data: created, error: authErr } = await admin.auth.admin.createUser({
    email,
    password: body.password,
    email_confirm: true,
    user_metadata: {
      first_name: body.firstName.trim(),
      last_name: body.lastName.trim(),
      role: 'operator',
    },
  });

  if (authErr || !created.user) {
    const duplicate = authErr?.message.includes('already been registered');
    return json({ error: duplicate ? 'EMAIL_TAKEN' : (authErr?.message ?? 'AUTH_ERROR') }, duplicate ? 409 : 500, origin);
  }

  const userId = created.user.id;

  // 2. Профиль (страховка, если триггер не сработал)
  await admin.from('profiles').upsert({
    id: userId,
    email,
    first_name: body.firstName.trim(),
    last_name: body.lastName.trim(),
    role: 'operator',
    is_active: true,
  });

  // 3. Карточка сотрудника
  const { data: employee, error: empErr } = await admin
    .from('employees')
    .insert({
      user_id: userId,
      project_id: body.projectId,
      default_schedule: body.schedule,
      default_start: body.defaultStart,
      default_end: body.defaultEnd,
      phone: body.phone || null,
      created_by: actorId,
    })
    .select()
    .single();

  if (empErr) {
    await admin.auth.admin.deleteUser(userId); // откат
    return json({ error: empErr.message }, 500, origin);
  }

  await admin.from('audit_log').insert({
    actor_id: actorId,
    action: 'create',
    entity: 'employee',
    entity_id: employee.id,
    diff: { email, project_id: body.projectId },
  });

  return json({ employeeId: employee.id, userId, email }, 201, origin);
});
