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
