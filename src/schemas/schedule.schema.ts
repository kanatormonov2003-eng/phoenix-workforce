import { z } from 'zod';

export const dailyScheduleSchema = z
  .object({
    workDate: z.string().min(1, 'Укажите дату'),
    plannedStart: z.string().regex(/^\d{2}:\d{2}$/, 'Формат ЧЧ:ММ'),
    plannedEnd: z.string().regex(/^\d{2}:\d{2}$/, 'Формат ЧЧ:ММ'),
    extraHours: z.coerce.number().min(0, 'Не меньше 0').max(12, 'Не больше 12'),
    reason: z.enum(['replacement', 'peak_load', 'training', 'other']),
    comment: z.string().trim().max(280, 'До 280 символов').default(''),
  })
  .refine((v) => v.plannedEnd !== v.plannedStart, {
    message: 'Конец не может совпадать с началом',
    path: ['plannedEnd'],
  })
  .refine((v) => v.extraHours === 0 || v.comment.length >= 3, {
    message: 'Опишите причину дополнительных часов',
    path: ['comment'],
  });

export type DailyScheduleInput = z.infer<typeof dailyScheduleSchema>;
