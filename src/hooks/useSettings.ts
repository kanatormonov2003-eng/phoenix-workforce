import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FunctionsResponse, PostgrestResponse, PostgrestSingleResponse } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import type { TelegramSettingsInput } from '@/schemas/settings.schema';
import type { Database } from '@/types/database';

type NotificationSettings = Database['public']['Tables']['notification_settings']['Row'];
interface TelegramTestResponse { ok: boolean; }

function isFunctionsResponse<T>(value: unknown): value is FunctionsResponse<T> {
  return typeof value === 'object' && value !== null && 'data' in value && 'error' in value;
}

function isPostgrestResponse<T>(value: unknown): value is PostgrestResponse<T> {
  return typeof value === 'object' && value !== null && 'data' in value && 'error' in value;
}

function isPostgrestSingleResponse<T>(value: unknown): value is PostgrestSingleResponse<T> {
  return typeof value === 'object' && value !== null && 'data' in value && 'error' in value;
}

export function useNotificationSettings() {
  return useQuery({
    queryKey: ['notification-settings'],
    queryFn: async (): Promise<NotificationSettings | null> => {
      const raw: unknown = await supabase.from('notification_settings').select('*').maybeSingle();
      if (!isPostgrestSingleResponse<NotificationSettings>(raw)) throw new Error('INVALID_SETTINGS_RESPONSE');
      if (raw.error) throw raw.error;
      return raw.data;
    },
  });
}

export function useSaveNotificationSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TelegramSettingsInput): Promise<void> => {
      const raw: unknown = await supabase.from('notification_settings').upsert({
        id: true,
        telegram_enabled: input.telegramEnabled,
        telegram_chat_id: input.telegramChatId || null,
        late_threshold_minutes: input.lateThresholdMinutes,
        notify_on_start: input.notifyOnStart,
        notify_on_end: input.notifyOnEnd,
        notify_on_late: input.notifyOnLate,
        updated_at: new Date().toISOString(),
      }).select('*').maybeSingle();
      if (!isPostgrestSingleResponse<NotificationSettings>(raw)) throw new Error('INVALID_SETTINGS_UPDATE_RESPONSE');
      if (raw.error) throw raw.error;
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
      const raw: unknown = await supabase.functions.invoke<TelegramTestResponse>('telegram-test', { body: {} });
      if (!isFunctionsResponse<TelegramTestResponse>(raw)) throw new Error('INVALID_FUNCTION_RESPONSE');
      if (raw.error) throw raw.error;
      if (!raw.data?.ok) throw new Error('TELEGRAM_TEST_FAILED');
    },
    onSuccess: () => toast.success('Тестовое сообщение отправлено'),
  });
}
