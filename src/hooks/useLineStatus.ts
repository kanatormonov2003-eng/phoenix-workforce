import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { safeQuery } from '@/lib/supabase-safe';
import { LINE_POLL_MS } from '@/lib/constants';
import type { LineStatusRow } from '@/types/domain';

export function useLineStatus() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['line-status'],
    refetchInterval: LINE_POLL_MS,
    queryFn: async (): Promise<LineStatusRow[]> => {
      const result = await supabase
        .from('v_line_status')
        .select('*')
        .order('line_state', { ascending: true })
        .order('full_name', { ascending: true });
      return safeQuery<LineStatusRow>(result);
    },
  });

  useEffect(() => {
    let mounted = true;
    const setupRealtime = async () => {
      const oldChannel = supabase.getChannels().find((channel) => channel.topic === 'realtime:phoenix-line');
      if (oldChannel) await supabase.removeChannel(oldChannel);
      if (!mounted) return;
      const channel = supabase.channel('phoenix-line').on('postgres_changes', {
        event: '*', schema: 'public', table: 'shifts',
      }, () => {
        void qc.invalidateQueries({ queryKey: ['line-status'] });
        void qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
      }).subscribe();
      return channel;
    };
    const channelPromise = setupRealtime();
    return () => {
      mounted = false;
      void channelPromise.then((channel) => {
        if (channel) void supabase.removeChannel(channel);
      });
    };
  }, [qc]);

  return query;
}
