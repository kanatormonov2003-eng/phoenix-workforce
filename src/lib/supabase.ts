import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Не заданы VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Скопируйте .env.example в .env.local.',
  );
}

export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: 'phoenix.auth',
    flowType: 'pkce',
  },
  global: { headers: { 'x-application-name': 'phoenix-workforce-control' } },
  realtime: { params: { eventsPerSecond: 5 } },
});
