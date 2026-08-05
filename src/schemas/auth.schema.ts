import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, 'Введите email').email('Некорректный email'),
  password: z.string().min(8, 'Минимум 8 символов'),
});

export type LoginInput = z.infer<typeof loginSchema>;
