import { z } from 'zod';

export const telegramSettingsSchema = z.object({
  telegramEnabled: z.boolean(),
  telegramChatId: z
    .string()
    .trim()
    .regex(/^-?\d{5,20}$/, 'CHAT_ID: число, может начинаться с минуса')
    .or(z.literal('')),
  lateThresholdMinutes: z.coerce.number().int().min(0).max(120),
  notifyOnStart: z.boolean(),
  notifyOnEnd: z.boolean(),
  notifyOnLate: z.boolean(),
});

export type TelegramSettingsInput = z.infer<typeof telegramSettingsSchema>;
