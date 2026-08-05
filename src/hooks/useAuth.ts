import { useContext } from 'react';
import { AuthContext } from '@/providers/AuthProvider';

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth должен вызываться внутри <AuthProvider>');
  return ctx;
}
