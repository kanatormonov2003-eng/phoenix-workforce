# Phoenix Workforce Control — часть 6: Supabase Edge Functions

Создание, удаление операторов и сброс пароля требуют `service_role`-ключа. Он **никогда** не попадает во
фронтенд, поэтому эти операции живут в Edge Functions с обязательной проверкой роли вызывающего.

---

## `supabase/functions/_shared/cors.ts`

```ts
const ALLOWED = (Deno.env.get('ALLOWED_ORIGINS') ?? 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim());

export function corsHeaders(origin: string | null): Record<string, string> {
  const allow = origin && ALLOWED.includes(origin) ? origin : (ALLOWED[0] as string);
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

export function json(body: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  });
}
```

## `supabase/functions/_shared/auth.ts`

```ts
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

export function adminClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
}

/** Проверяет, что вызывающий залогинен и имеет роль admin. Иначе бросает Response. */
export async function requireAdmin(req: Request): Promise<{ id: string }> {
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    throw new Error('UNAUTHORIZED');
  }

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const { data: userData, error } = await userClient.auth.getUser();
  if (error || !userData.user) throw new Error('UNAUTHORIZED');

  const { data: profile } = await adminClient()
    .from('profiles')
    .select('role, is_active')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (!profile || profile.role !== 'admin' || !profile.is_active) {
    throw new Error('FORBIDDEN');
  }
  return { id: userData.user.id };
}

export function statusFor(message: string): number {
  if (message === 'UNAUTHORIZED') return 401;
  if (message === 'FORBIDDEN') return 403;
  return 400;
}
```

---

## `supabase/functions/admin-create-operator/index.ts`

```ts
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
```

---

## `supabase/functions/admin-delete-operator/index.ts`

```ts
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
```

---

## `supabase/functions/admin-reset-password/index.ts`

```ts
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
```

---

## `supabase/functions/telegram-notify/index.ts`

```ts
import { adminClient } from '../_shared/auth.ts';
import { corsHeaders, json } from '../_shared/cors.ts';

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');

interface Payload {
  chat_id?: string;
  text: string;
  log_id?: string;
}

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin) });

  if (!BOT_TOKEN) {
    return json({ error: 'TELEGRAM_BOT_TOKEN не задан' }, 500, origin);
  }

  const body = (await req.json()) as Payload;
  const admin = adminClient();

  let chatId = body.chat_id;
  if (!chatId) {
    const { data } = await admin.from('notification_settings').select('telegram_chat_id').maybeSingle();
    chatId = data?.telegram_chat_id ?? Deno.env.get('TELEGRAM_CHAT_ID') ?? undefined;
  }
  if (!chatId) return json({ error: 'CHAT_ID не настроен' }, 422, origin);

  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: body.text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  });

  const result = (await res.json()) as { ok: boolean; description?: string };

  if (body.log_id) {
    await admin
      .from('notification_log')
      .update({ delivered: result.ok, error: result.ok ? null : (result.description ?? 'unknown') })
      .eq('id', body.log_id);
  }

  if (!result.ok) return json({ error: result.description ?? 'Telegram отклонил запрос' }, 502, origin);
  return json({ ok: true }, 200, origin);
});
```

---

## `supabase/functions/cron-line-watchdog/index.ts`

> Альтернатива pg_cron, если хочется держать логику в Deno. Дёргается по расписанию
> из Supabase Scheduler или внешним cron с заголовком `x-cron-secret`.

```ts
import { adminClient } from '../_shared/auth.ts';
import { json } from '../_shared/cors.ts';

const CRON_SECRET = Deno.env.get('CRON_SECRET');

Deno.serve(async (req) => {
  if (req.headers.get('x-cron-secret') !== CRON_SECRET) {
    return json({ error: 'FORBIDDEN' }, 403, null);
  }

  const admin = adminClient();

  const { data: settings } = await admin.from('notification_settings').select('*').maybeSingle();
  if (!settings?.telegram_enabled || !settings.notify_on_late) {
    return json({ skipped: true }, 200, null);
  }

  const { data: late } = await admin
    .from('v_line_status')
    .select('employee_id, full_name, project, planned_start')
    .eq('line_state', 'late');

  const today = new Date().toISOString().slice(0, 10);
  let sent = 0;

  for (const row of late ?? []) {
    // Дедупликация: одно уведомление на сотрудника в день
    const { data: existing } = await admin
      .from('notification_log')
      .select('id')
      .eq('kind', 'late')
      .eq('employee_id', row.employee_id)
      .gte('created_at', `${today}T00:00:00Z`)
      .maybeSingle();
    if (existing) continue;

    const text =
      `⚠️ <b>Контроль линии</b>\n` +
      `Оператор: ${row.full_name}\n` +
      `Проект: ${row.project}\n` +
      `Начало смены: ${String(row.planned_start).slice(0, 5)}\n` +
      `Статус: не вышел`;

    const { data: log } = await admin
      .from('notification_log')
      .insert({ kind: 'late', employee_id: row.employee_id, payload: { work_date: today, text } })
      .select('id')
      .single();

    await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/telegram-notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({ chat_id: settings.telegram_chat_id, text, log_id: log?.id }),
    });

    sent += 1;
  }

  return json({ checked: late?.length ?? 0, sent }, 200, null);
});
```

---

## Деплой функций

```bash
supabase link --project-ref <PROJECT_REF>

# секреты (никогда не в git)
supabase secrets set TELEGRAM_BOT_TOKEN="7284919233:AAF..."
supabase secrets set TELEGRAM_CHAT_ID="-1002214887301"
supabase secrets set CRON_SECRET="$(openssl rand -hex 24)"
supabase secrets set ALLOWED_ORIGINS="http://localhost:5173,https://phoenix-workforce.vercel.app"

# функции
supabase functions deploy admin-create-operator
supabase functions deploy admin-delete-operator
supabase functions deploy admin-reset-password
supabase functions deploy telegram-notify
supabase functions deploy cron-line-watchdog --no-verify-jwt
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY` и `SUPABASE_SERVICE_ROLE_KEY` подставляются платформой автоматически.

---

## Как получить BOT_TOKEN и CHAT_ID

1. В Telegram: `@BotFather` → `/newbot` → имя и username → получаете `BOT_TOKEN`.
2. Создайте группу или канал контроля, добавьте бота администратором.
3. Напишите в группу любое сообщение и откройте:
   `https://api.telegram.org/bot<BOT_TOKEN>/getUpdates`
4. Скопируйте `result[0].message.chat.id` (для супергрупп начинается с `-100`).
5. Вставьте CHAT_ID на странице **Telegram** в админке и нажмите «Тестовое сообщение».
