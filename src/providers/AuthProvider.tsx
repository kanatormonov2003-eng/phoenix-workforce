import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { SessionUser } from '@/types/domain';

interface AuthContextValue {
  session: Session | null;
  user: SessionUser | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

async function loadSessionUser(userId: string): Promise<SessionUser | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(
      `id, email, first_name, last_name, full_name, role, is_active,
       employees:employees!employees_user_id_fkey (
         id, default_schedule, active, blocked_at,
         projects:project_id ( name )
       )`,
    )
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) return null;

  const emp = Array.isArray(data.employees) ? data.employees[0] : data.employees;
  const project = emp?.projects as { name: string } | null | undefined;

  return {
    id: data.id,
    email: data.email,
    firstName: data.first_name,
    lastName: data.last_name,
    fullName: data.full_name,
    role: data.role,
    isActive: data.is_active && (emp ? emp.active && !emp.blocked_at : true),
    employeeId: emp?.id ?? null,
    project: project?.name ?? null,
    defaultSchedule: emp?.default_schedule ?? null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const hydrate = useCallback(async (s: Session | null) => {
    setSession(s);
    if (!s?.user) {
      setUser(null);
      setLoading(false);
      return;
    }
    setUser(await loadSessionUser(s.user.id));
    setLoading(false);
  }, []);

  useEffect(() => {
    let alive = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (alive) void hydrate(data.session);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (!alive) return;
      if (event === 'TOKEN_REFRESHED') {
        setSession(s);
        return;
      }
      void hydrate(s);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [hydrate]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  const refresh = useCallback(async () => {
    if (session?.user) setUser(await loadSessionUser(session.user.id));
  }, [session]);

  const value = useMemo<AuthContextValue>(
    () => ({ session, user, loading, isAdmin: user?.role === 'admin', signIn, signOut, refresh }),
    [session, user, loading, signIn, signOut, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
