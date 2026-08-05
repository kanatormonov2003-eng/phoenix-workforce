import { adminClient, requireAdmin, statusFor } from '../_shared/auth.ts';
import { corsHeaders, json } from '../_shared/cors.ts';

function escapeHtml(value: string): string { return value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'); }
Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin) });
  try { await requireAdmin(req); } catch (e) { const msg=(e as Error).message; return json({ error: msg }, statusFor(msg), origin); }
  const token = Deno.env.get('TELEGRAM_BOT_TOKEN');
  if (!token) return json({ error: 'TELEGRAM_NOT_CONFIGURED' }, 503, origin);
  const admin = adminClient();
  const { data: settings } = await admin.from('notification_settings').select('telegram_chat_id').eq('id', true).maybeSingle();
  if (!settings?.telegram_chat_id) return json({ error: 'TELEGRAM_CHAT_NOT_CONFIGURED' }, 422, origin);
  const text = '✅ <b>Phoenix</b>\nТестовое сообщение. Канал работает.';
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ chat_id: settings.telegram_chat_id, text: escapeHtml(text), parse_mode:'HTML', disable_web_page_preview:true }), signal: controller.signal });
    const result = await res.json() as { ok?: boolean };
    if (!res.ok || !result.ok) return json({ error:'TELEGRAM_SEND_FAILED' }, 502, origin);
    return json({ ok:true }, 200, origin);
  } catch { return json({ error:'TELEGRAM_TIMEOUT' }, 504, origin); } finally { clearTimeout(timer); }
});
