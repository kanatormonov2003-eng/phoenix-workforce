import { adminClient, requireAdmin, statusFor } from '../_shared/auth.ts';
import { corsHeaders, json } from '../_shared/cors.ts';
Deno.serve(async (req) => {
  const origin=req.headers.get('Origin');
  if (req.method==='OPTIONS') return new Response('ok',{headers:corsHeaders(origin)});
  try { await requireAdmin(req); } catch(e) { const m=(e as Error).message; return json({error:m},statusFor(m),origin); }
  const token=Deno.env.get('TELEGRAM_BOT_TOKEN'); if(!token) return json({error:'TELEGRAM_NOT_CONFIGURED'},503,origin);
  const {data:s}=await adminClient().from('notification_settings').select('telegram_chat_id').eq('id',true).maybeSingle();
  if(!s?.telegram_chat_id) return json({error:'TELEGRAM_CHAT_NOT_CONFIGURED'},422,origin);
  const c=new AbortController(); const t=setTimeout(()=>c.abort(),8000);
  try { const r=await fetch(`https://api.telegram.org/bot${token}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:s.telegram_chat_id,text:'✅ <b>Phoenix</b>\nТестовое сообщение. Канал работает.',parse_mode:'HTML'}),signal:c.signal}); if(!r.ok) return json({error:'TELEGRAM_SEND_FAILED'},502,origin); return json({ok:true},200,origin); } catch { return json({error:'TELEGRAM_TIMEOUT'},504,origin); } finally { clearTimeout(t); }
});
