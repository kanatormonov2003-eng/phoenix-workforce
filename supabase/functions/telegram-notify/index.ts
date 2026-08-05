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
