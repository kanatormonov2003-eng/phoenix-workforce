import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FunctionsResponse, PostgrestSingleResponse } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import type { TelegramSettingsInput } from '@/schemas/settings.schema';
import type { Database } from '@/types/database';

type NotificationSettings = Database['public']['Tables']['notification_settings']['Row'];
interface TelegramTestResponse { ok: boolean; }

export function useNotificationSettings() {
  return useQuery({
    queryKey: ['notification-settings'],
    queryFn: async (): Promise<NotificationSettings | null> => {
      const result: PostgrestSingleResponse<NotificationSettings> = await supabase
        .from('notification_settings')
        .select('*')
        .maybeSingle();
      if (result.error) throw result.error;
      return result.data;
    },
  });
}

export function useSaveNotificationSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TelegramSettingsInput): Promise<void> => {
      const result: PostgrestSingleResponse<NotificationSettings> = await supabase.from('notification_settings').upsert({
        id: true,
        telegram_enabled: input.telegramEnabled,
        telegram_chat_id: input.telegramChatId || null,
        late_threshold_minutes: input.lateThresholdMinutes,
        notify_on_start: input.notifyOnStart,
        notify_on_end: input.notifyOnEnd,
        notify_on_late: input.notifyOnLate,
        updated_at: new Date().toISOString(),
      }).select('*').maybeSingle();
      if (result.error) throw result.error;
    },
    onSuccess: () => {
      toast.success('Настройки сохранены');
      void qc.invalidateQueries({ queryKey: ['notification-settings'] });
    },
  });
}

export function useTestTelegram() {
  return useMutation({
    mutationFn: async (_ignoredChatId?: string): Promise<void> => {
      const result: FunctionsResponse<TelegramTestResponse> = await supabase.functions.invoke<TelegramTestResponse>('telegram-test', { body: {} });
      if (result.error) throw result.error;
      if (!result.data?.ok) throw new Error('TELEGRAM_TEST_FAILED');
    },
    onSuccess: () => toast.success('Тестовое сообщение отправлено'),
  });
}
