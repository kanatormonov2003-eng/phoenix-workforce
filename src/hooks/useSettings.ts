import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import type { TelegramSettingsInput } from '@/schemas/settings.schema';
import type { NotificationSettings } from '@/types/domain';

export function useNotificationSettings(){ return useQuery({queryKey:['notification-settings'],queryFn:async():Promise<NotificationSettings|null>=>{const {data,error}=await supabase.from('notification_settings').select('*').maybeSingle();if(error)throw error;return data;}}); }
export function useSaveNotificationSettings(){const qc=useQueryClient();return useMutation({mutationFn:async(input:TelegramSettingsInput):Promise<void>=>{const {error}=await supabase.from('notification_settings').upsert({id:true,telegram_enabled:input.telegramEnabled,telegram_chat_id:input.telegramChatId||null,late_threshold_minutes:input.lateThresholdMinutes,notify_on_start:input.notifyOnStart,notify_on_end:input.notifyOnEnd,notify_on_late:input.notifyOnLate,updated_at:new Date().toISOString()});if(error)throw error;},onSuccess:()=>{toast.success('Настройки сохранены');void qc.invalidateQueries({queryKey:['notification-settings']});}});}
export function useTestTelegram(){return useMutation({mutationFn:async():Promise<void>=>{const {error}=await supabase.functions.invoke('telegram-test',{body:{}});if(error)throw error;},onSuccess:()=>toast.success('Тестовое сообщение отправлено')});}
