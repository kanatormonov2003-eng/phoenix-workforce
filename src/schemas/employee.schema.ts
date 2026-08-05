import { z } from 'zod';

export const employeeCreateSchema = z.object({
  firstName: z.string().trim().min(2, 'Укажите имя').max(40),
  lastName: z.string().trim().min(2, 'Укажите фамилию').max(40),
  email: z.string().trim().toLowerCase().email('Некорректный email'),
  password: z
    .string()
    .min(8, 'Минимум 8 символов')
    .regex(/[a-zA-Zа-яА-Я]/, 'Добавьте буквы')
    .regex(/\d/, 'Добавьте цифру'),
  projectId: z.string().uuid('Выберите проект'),
  schedule: z.string().min(3, 'Укажите график'),
  defaultStart: z.string().regex(/^\d{2}:\d{2}$/, 'Формат ЧЧ:ММ'),
  defaultEnd: z.string().regex(/^\d{2}:\d{2}$/, 'Формат ЧЧ:ММ'),
  phone: z.string().trim().max(20).optional().or(z.literal('')),
});

export const employeeUpdateSchema = employeeCreateSchema
  .omit({ password: true })
  .extend({ password: z.string().min(8).optional().or(z.literal('')) });

export type EmployeeCreateInput = z.infer<typeof employeeCreateSchema>;
export type EmployeeUpdateInput = z.infer<typeof employeeUpdateSchema>;
