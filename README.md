# Phoenix Workforce Control

Внутренняя система контроля работы операторов колл-центра. Операторы отмечают выход на линию,
заполняют ежедневный график и дополнительные часы. Администратор управляет учётными записями,
видит линию в реальном времени и получает уведомления в Telegram.

**Публичной регистрации нет.** Аккаунты создаёт только администратор.

---

## Стек

| Слой | Технологии |
|---|---|
| Frontend | React 18, TypeScript (strict, без `any`), Vite 6, Tailwind CSS, shadcn/ui, Lucide, React Router 6, React Hook Form, Zod |
| Данные | TanStack Query, Supabase Realtime |
| Backend | Supabase: Auth, PostgreSQL, RLS, Edge Functions (Deno), pg_cron, pg_net |
| Деплой | Frontend → Vercel, Backend → Supabase Cloud |

---

## Роли

**ADMIN** (один главный администратор)
Создание, редактирование, блокировка и удаление операторов · просмотр всех смен · мониторинг линии
в реальном времени · графики и доп. часы · отчёты за день и месяц · настройка Telegram-канала.

**OPERATOR**
Выход на линию и завершение смены · заполнение ежедневного графика и доп. часов · собственная
история смен. Видит **только свои** данные: это гарантировано на уровне БД через RLS, а не UI.

---

## Быстрый старт

### 1. Клонирование и зависимости

```bash
git clone <repo-url> phoenix-workforce-control
cd phoenix-workforce-control
npm install
```

Требуется Node.js 20+ и Supabase CLI (`npm i -g supabase`).

### 2. Проект в Supabase

Создайте проект на [supabase.com](https://supabase.com), затем:

```bash
supabase link --project-ref <PROJECT_REF>
supabase db push          # применит миграцию 20260101000000_phoenix_init.sql
```

Отключите публичную регистрацию: **Authentication → Providers → Email → Enable Signup = OFF**.
Там же выключите «Enable email confirmations» (аккаунты подтверждает админ при создании) и
«Secure email change».

### 3. Переменные окружения

```bash
cp .env.example .env.local
```

Заполните из **Project Settings → API**:

```bash
VITE_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon public key>
```

`service_role` ключ во фронтенд **не попадает никогда**.

### 4. Первый администратор

Supabase Dashboard → **Authentication → Users → Add user**:
email `admin@phoenix.io`, пароль, **Auto Confirm User = ON**.

Затем в SQL Editor:

```sql
update public.profiles
   set role = 'admin', first_name = 'Дмитрий', last_name = 'Кравцов'
 where email = 'admin@phoenix.io';
```

### 5. Edge Functions

```bash
supabase secrets set TELEGRAM_BOT_TOKEN="<токен от @BotFather>"
supabase secrets set ALLOWED_ORIGINS="http://localhost:5173,https://<ваш-домен>.vercel.app"
supabase secrets set CRON_SECRET="$(openssl rand -hex 24)"

supabase functions deploy admin-create-operator
supabase functions deploy admin-delete-operator
supabase functions deploy admin-reset-password
supabase functions deploy telegram-notify
supabase functions deploy cron-line-watchdog --no-verify-jwt
```

### 6. Запуск

```bash
npm run dev       # http://localhost:5173
```

Войдите админом → **Операторы → Создать оператора**. Логин и пароль передайте сотруднику лично.

---

## Скрипты

| Команда | Что делает |
|---|---|
| `npm run dev` | Дев-сервер Vite |
| `npm run build` | Проверка типов + продакшен-сборка в `dist/` |
| `npm run preview` | Локальный просмотр собранного бандла |
| `npm run lint` | ESLint, ноль предупреждений допустимо |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:push` | Применить миграции к связанному проекту |
| `npm run db:types` | Перегенерировать `src/types/database.ts` из схемы |

---

## Деплой на Vercel

### Через панель

1. **Add New → Project**, импортируйте репозиторий.
2. Framework Preset: **Vite** (определится автоматически).
   Build Command `npm run build`, Output Directory `dist`.
3. **Environment Variables** (для Production, Preview и Development):

   | Ключ | Значение |
   |---|---|
   | `VITE_SUPABASE_URL` | `https://<PROJECT_REF>.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | anon public key |
   | `VITE_APP_NAME` | `Phoenix Workforce Control` |
   | `VITE_DEFAULT_TIMEZONE` | `Europe/Moscow` |
   | `VITE_LINE_POLL_MS` | `15000` |

4. **Deploy**.

### Через CLI

```bash
npm i -g vercel
vercel link
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel --prod
```

### После первого деплоя

1. Supabase → **Authentication → URL Configuration**: в `Site URL` и `Redirect URLs`
   добавьте боевой домен.
2. Обновите CORS Edge Functions:
   ```bash
   supabase secrets set ALLOWED_ORIGINS="https://phoenix-workforce.vercel.app"
   ```
3. `vercel.json` уже отдаёт SPA-rewrite, security-заголовки и `X-Robots-Tag: noindex`:
   система не должна попадать в поиск.

---

## Модель данных

```
auth.users ──1:1── profiles ──1:1── employees ──1:N── shifts
                                          │
                                          ├──1:N── daily_schedules
                                          └──1:N── additional_hours

projects ──1:N── employees
notification_settings (singleton) · notification_log · audit_log
```

Представления: `v_line_status` (состояние линии сейчас), `v_daily_summary` (сводка за день),
`v_schedule_feed` (плоский список графиков для админки).

RPC: `start_shift`, `end_shift`, `save_daily_schedule`, `admin_set_block`,
`admin_dashboard_stats`, `admin_monthly_report`.

---

## Безопасность

RLS включён и **форсирован** (`force row level security`) на всех таблицах с данными сотрудников.

| Правило | Как обеспечено |
|---|---|
| Оператор видит только свои смены, графики и доп. часы | Политики через `current_employee_id()` |
| Оператор не может прочитать чужие профили | `profiles_self_read`: `id = auth.uid() or is_admin()` |
| Оператор не может повысить себе роль | `with check` в `profiles_self_update` сравнивает роль с текущей |
| Только админ управляет пользователями | Edge Functions + `requireAdmin()` + политики `is_admin()` |
| Проверка роли на бэкенде, а не в UI | `is_admin()` — `security definer` функция, читается из БД |
| Никакой саморегистрации | `enable_signup = false` в Supabase Auth |
| Нет публичного восстановления пароля | Сброс только через `admin-reset-password` |
| `service_role` не утекает | Живёт исключительно в секретах Edge Functions |
| Блокировка мгновенна | `admin_set_block` закрывает активную смену и снимает `is_active` |
| Действия админа фиксируются | `audit_log`: создание, удаление, блокировка, сброс пароля |

Рекомендуется дополнительно включить в Supabase: Leaked Password Protection,
минимальную длину пароля 8+, MFA для админа.

---

## Автоматика

| Задача | Расписание | Что делает |
|---|---|---|
| `phoenix-late-watchdog` | каждые 5 мин | Ищет операторов, не вышедших на линию после порога опоздания, шлёт `⚠️ Контроль линии` в Telegram (одно уведомление на человека в день) |
| `phoenix-auto-close` | ежедневно в 04:00 | Закрывает забытые смены длиннее 14 часов со статусом `auto_closed` |

Уведомления о выходе на линию и завершении смены отправляются синхронно из `start_shift` / `end_shift`.

---

## Что уже реализовано

**Интерфейс:** тёмная тема (плум-чёрные поверхности, ember-акцент), sticky-топбар с живыми часами,
адаптив под desktop / tablet / mobile (сайдбар превращается в drawer, таблицы в стопку карточек),
loading-скелетоны вместо спиннеров, empty states с подсказкой к действию, error states с повтором,
toast-уведомления, подтверждение перед удалением и блокировкой, страница 404, страница
заблокированного доступа, `prefers-reduced-motion`.

**Оператор:** приветствие по времени суток, статус линии, живой таймер смены, прогресс по графику,
кнопки выхода на линию и завершения, форма ежедневного графика с валидацией Zod, история смен
за неделю и месяц.

**Админ:** метрики (сотрудники, онлайн, часы, доп. часы), блок «требуют внимания» с опозданиями и
зависшими сменами, график загрузки по часам, таблица операторов с поиском и фильтрами, CRUD
операторов с генератором паролей, мониторинг линии в реальном времени через Supabase Realtime,
лента графиков с подтверждением и экспортом CSV, отчёты за день и за месяц, настройка Telegram
с тестовой отправкой и предпросмотром сообщений.

---

## Структура ответа проекта

| Файл | Содержимое |
|---|---|
| `01-project-config.md` | Дерево проекта, `package.json`, Vite, TypeScript, Tailwind, `index.css`, `index.html`, `vercel.json`, `.env.example`, ESLint, `supabase/config.toml` |
| `20260101000000_phoenix_init.sql` | Полная миграция: типы, таблицы, индексы, RPC, представления, RLS, cron, seed |
| `02-core-src.md` | Типы БД и домена, Supabase-клиент, утилиты времени и ошибок, Zod-схемы, `AuthProvider`, `QueryProvider`, все хуки |
| `03-shell-and-components.md` | `main.tsx`, роутинг с ролевыми гардами, `AppShell`, `Sidebar`, `Topbar`, общие компоненты, страницы входа / 404 / блокировки, кастомные UI-примитивы |
| `04-operator-cabinet.md` | `ShiftConsole`, главная оператора, форма графика, история смен |
| `05-admin-panel.md` | Дашборд, операторы, диалог создания, мониторинг, графики, отчёты, Telegram |
| `06-edge-functions.md` | Deno-функции: создание, удаление, сброс пароля, Telegram, watchdog |
| `phoenix-workforce-control-prototype.html` | Рабочий визуальный прототип всех экранов в одном файле |

---

## Лицензия

Внутренний продукт. Распространение вне организации не предполагается.
