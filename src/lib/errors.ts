import { PostgrestError, AuthError } from '@supabase/supabase-js';

const CODE_MESSAGES: Record<string, string> = {
  EMPLOYEE_NOT_FOUND: 'Профиль сотрудника не найден. Обратитесь к администратору.',
  EMPLOYEE_BLOCKED: 'Ваш доступ приостановлен. Свяжитесь с руководителем.',
  SHIFT_ALREADY_OPEN: 'Смена уже открыта. Обновите страницу.',
  NO_OPEN_SHIFT: 'Открытой смены нет, завершать нечего.',
  PAST_DATE_LOCKED: 'Прошедшую дату изменить нельзя. Напишите руководителю.',
  FORBIDDEN: 'Недостаточно прав для этого действия.',
  'Invalid login credentials': 'Неверный email или пароль.',
  'Email not confirmed': 'Учётная запись не активирована. Обратитесь к администратору.',
  'User already registered': 'Пользователь с таким email уже существует.',
};

function normalizeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try { return JSON.stringify(error) || 'Неизвестная ошибка.'; } catch { return 'Неизвестная ошибка.'; }
}

export function humanizeError(error: unknown): string {
  if (!error) return 'Неизвестная ошибка.';
  const message = normalizeError(error);
  if (error instanceof AuthError || error instanceof PostgrestError || error instanceof Error) {
    const key = Object.keys(CODE_MESSAGES).find((candidate) => message.includes(candidate));
    if (key) return CODE_MESSAGES[key] ?? message;
  }
  if (message.includes('Failed to fetch')) return 'Нет связи с сервером. Проверьте интернет.';
  return message;
}
