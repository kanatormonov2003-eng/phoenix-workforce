import { createContext } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { SessionUser } from '@/types/domain';

export interface AuthContextValue {
  session: Session | null;
  user: SessionUser | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
