import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { humanizeError } from '@/lib/errors';

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 20_000,
            retry: (count, err) => count < 2 && !String(err).includes('FORBIDDEN'),
            refetchOnWindowFocus: true,
          },
          mutations: {
            onError: (err) => toast.error('Не получилось', { description: humanizeError(err) }),
          },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
