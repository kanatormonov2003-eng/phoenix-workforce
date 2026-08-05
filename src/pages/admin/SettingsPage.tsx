import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Send } from 'lucide-react';
import { telegramSettingsSchema, type TelegramSettingsInput } from '@/schemas/settings.schema';
import { useNotificationSettings, useSaveNotificationSettings, useTestTelegram } from '@/hooks/useSettings';
import { Panel, PanelHead } from '@/components/common/Panel';
import { PlainTag } from '@/components/common/StatusTag';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { TableSkeleton } from '@/components/common/DataState';

const PREVIEWS = [
  { time: '08:57', tone: 'plain', text: '🟢 <b>Иван Петров вышел на линию</b>\nПроект: Retail Inbound\nВремя: 08:57' },
  { time: '09:12', tone: 'alert', text: '⚠️ <b>Контроль линии</b>\nОператор: Алексей Гордеев\nНачало смены: 09:00\nСтатус: не вышел' },
  { time: '18:15', tone: 'plain', text: '🔴 <b>Мария Соколова завершила смену</b>\nОтработано: 8 ч 12 мин\nДоп. часы: 2 ч' },
] as const;

export default function SettingsPage() {
  const q = useNotificationSettings();
  const save = useSaveNotificationSettings();
  const test = useTestTelegram();

  const { register, handleSubmit, reset, watch, setValue, formState } = useForm<TelegramSettingsInput>({
    resolver: zodResolver(telegramSettingsSchema),
    defaultValues: {
      telegramEnabled: false, telegramChatId: '', lateThresholdMinutes: 10,
      notifyOnStart: true, notifyOnEnd: true, notifyOnLate: true,
    },
  });

  useEffect(() => {
    if (!q.data) return;
    reset({
      telegramEnabled: q.data.telegram_enabled,
      telegramChatId: q.data.telegram_chat_id ?? '',
      lateThresholdMinutes: q.data.late_threshold_minutes,
      notifyOnStart: q.data.notify_on_start,
      notifyOnEnd: q.data.notify_on_end,
      notifyOnLate: q.data.notify_on_late,
    });
  }, [q.data, reset]);

  const enabled = watch('telegramEnabled');
  const chatId = watch('telegramChatId');

  return (
    <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
      <Panel>
        <PanelHead
          title="Telegram Bot"
          right={
            <PlainTag tone={enabled ? 'ember' : 'neutral'}>
              {enabled ? 'Уведомления включены' : 'Выключено'}
            </PlainTag>
          }
        />

        {q.isLoading ? (
          <TableSkeleton rows={4} cols={3} />
        ) : (
          <form onSubmit={(e) => void handleSubmit((v) => save.mutate(v))(e)} className="p-5">
            <div className="mb-5 flex items-center justify-between rounded-md border border-line-soft bg-surface-2 px-4 py-3">
              <div>
                <div className="text-sm font-medium">Отправлять уведомления</div>
                <p className="text-xs text-ink-3">Глобальный выключатель для всего канала.</p>
              </div>
              <Switch
                checked={enabled}
                onCheckedChange={(v) => setValue('telegramEnabled', v, { shouldDirty: true })}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label className="mb-[7px] block">CHAT_ID</Label>
                <Input placeholder="-1002214887301" {...register('telegramChatId')} />
                {formState.errors.telegramChatId && (
                  <p className="mt-[5px] text-[0.78rem] text-danger">{formState.errors.telegramChatId.message}</p>
                )}
                <p className="mt-[5px] text-xs text-ink-3">
                  BOT_TOKEN здесь не хранится. Он задаётся секретом:{' '}
                  <code className="rounded-xs bg-surface-2 px-1 font-mono text-[0.75rem]">
                    supabase secrets set TELEGRAM_BOT_TOKEN=…
                  </code>
                </p>
              </div>

              <div>
                <Label className="mb-[7px] block">Порог опоздания, мин</Label>
                <Input type="number" min={0} max={120} {...register('lateThresholdMinutes')} />
              </div>
            </div>

            <fieldset className="mt-5 space-y-2">
              <legend className="eyebrow mb-2">События</legend>
              {(
                [
                  ['notifyOnStart', 'Оператор вышел на линию'],
                  ['notifyOnEnd', 'Оператор завершил смену'],
                  ['notifyOnLate', 'Оператор не вышел вовремя'],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-center justify-between rounded-sm border border-line-soft px-3 py-2.5 text-sm transition-colors hover:border-line"
                >
                  {label}
                  <Switch
                    checked={watch(key)}
                    onCheckedChange={(v) => setValue(key, v, { shouldDirty: true })}
                  />
                </label>
              ))}
            </fieldset>

            <div className="mt-5 flex flex-wrap gap-2">
              <Button type="submit" disabled={save.isPending}>
                {save.isPending && <Loader2 className="animate-spin" />}
                Сохранить
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={!chatId || test.isPending}
                onClick={() => test.mutate(chatId)}
              >
                {test.isPending ? <Loader2 className="animate-spin" /> : <Send />}
                Тестовое сообщение
              </Button>
            </div>
          </form>
        )}
      </Panel>

      <Panel>
        <PanelHead title="Предпросмотр уведомлений" />
        <div className="p-5">
          <div className="flex flex-col gap-[10px] rounded-md border border-line-soft bg-bg-deep p-4">
            {PREVIEWS.map((m) => (
              <div key={m.time}>
                <div
                  className={
                    'max-w-[90%] whitespace-pre-line rounded-[4px_14px_14px_14px] px-[13px] py-2.5 text-[0.82rem] leading-relaxed ' +
                    (m.tone === 'alert' ? 'bg-warn-dim text-[oklch(0.92_0.06_82)]' : 'bg-surface-2')
                  }
                  dangerouslySetInnerHTML={{ __html: m.text }}
                />
                <div className="num mt-1 text-right text-[0.68rem] text-ink-3">{m.time}</div>
              </div>
            ))}
          </div>
        </div>
      </Panel>
    </div>
  );
}
