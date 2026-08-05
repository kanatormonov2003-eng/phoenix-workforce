-- ============================================================================
-- PHOENIX WORKFORCE CONTROL
-- supabase/migrations/20260101000000_phoenix_init.sql
--
-- Полная инициализация: схема, RLS, функции, представления, seed.
-- Применяется через:  supabase db push   (или supabase migration up)
-- ============================================================================

set check_function_bodies = off;

-- ─────────────────────────────────────────────────────────────
-- 0. РАСШИРЕНИЯ
-- ─────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto"  with schema extensions;
create extension if not exists "pg_net"    with schema extensions;   -- HTTP из БД (Telegram)
create extension if not exists "pg_cron"   with schema extensions;   -- watchdog опозданий

-- ─────────────────────────────────────────────────────────────
-- 1. ТИПЫ
-- ─────────────────────────────────────────────────────────────
do $$ begin
  create type public.app_role as enum ('admin', 'operator');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.shift_status as enum ('online', 'closed', 'auto_closed', 'absent');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.approval_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.extra_reason as enum ('replacement', 'peak_load', 'training', 'other');
exception when duplicate_object then null; end $$;

-- ─────────────────────────────────────────────────────────────
-- 2. ТАБЛИЦЫ
-- ─────────────────────────────────────────────────────────────

-- 2.1 Профили (1:1 с auth.users)
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text        not null unique,
  first_name   text        not null default '',
  last_name    text        not null default '',
  full_name    text generated always as (btrim(first_name || ' ' || last_name)) stored,
  role         public.app_role not null default 'operator',
  is_active    boolean     not null default true,
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
comment on table public.profiles is 'Учётные записи. Роль задаётся только администратором.';

-- 2.2 Проекты (линии обслуживания)
create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  name        text        not null unique,
  code        text        not null unique,
  color       text        not null default 'ember',
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now()
);

-- 2.3 Сотрудники (операторы)
create table if not exists public.employees (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null unique references public.profiles(id) on delete cascade,
  project_id        uuid references public.projects(id) on delete set null,
  default_schedule  text        not null default '09:00-18:00',
  default_start     time        not null default '09:00',
  default_end       time        not null default '18:00',
  timezone          text        not null default 'Europe/Moscow',
  phone             text,
  hired_at          date        not null default current_date,
  active            boolean     not null default true,
  blocked_at        timestamptz,
  blocked_reason    text,
  created_by        uuid references public.profiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint employees_schedule_order check (default_end <> default_start)
);
create index if not exists employees_project_idx on public.employees(project_id);
create index if not exists employees_active_idx  on public.employees(active) where active;

-- 2.4 Смены (факт выхода на линию)
create table if not exists public.shifts (
  id            uuid primary key default gen_random_uuid(),
  employee_id   uuid not null references public.employees(id) on delete cascade,
  work_date     date not null default current_date,
  started_at    timestamptz not null default now(),
  ended_at      timestamptz,
  status        public.shift_status not null default 'online',
  total_minutes integer generated always as (
    case when ended_at is null then null
         else greatest(0, (extract(epoch from (ended_at - started_at)) / 60)::int)
    end
  ) stored,
  closed_by     uuid references public.profiles(id) on delete set null,
  note          text,
  created_at    timestamptz not null default now(),
  constraint shifts_time_order check (ended_at is null or ended_at > started_at)
);
create index if not exists shifts_employee_date_idx on public.shifts(employee_id, work_date desc);
create index if not exists shifts_date_idx          on public.shifts(work_date desc);
-- одна открытая смена на сотрудника
create unique index if not exists shifts_one_open_per_employee
  on public.shifts(employee_id) where status = 'online';

-- 2.5 Дополнительные часы
create table if not exists public.additional_hours (
  id           uuid primary key default gen_random_uuid(),
  employee_id  uuid not null references public.employees(id) on delete cascade,
  work_date    date not null default current_date,
  hours        numeric(4,2) not null,
  reason       public.extra_reason not null default 'other',
  comment      text not null default '',
  status       public.approval_status not null default 'pending',
  approved_by  uuid references public.profiles(id) on delete set null,
  approved_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint additional_hours_range check (hours >= 0 and hours <= 12)
);
create index if not exists additional_hours_emp_date_idx on public.additional_hours(employee_id, work_date desc);
create unique index if not exists additional_hours_unique_day
  on public.additional_hours(employee_id, work_date);

-- 2.6 Ежедневный график, который заполняет оператор
create table if not exists public.daily_schedules (
  id             uuid primary key default gen_random_uuid(),
  employee_id    uuid not null references public.employees(id) on delete cascade,
  work_date      date not null,
  planned_start  time not null,
  planned_end    time not null,
  extra_hours    numeric(4,2) not null default 0,
  reason         public.extra_reason,
  comment        text not null default '',
  status         public.approval_status not null default 'approved',
  reviewed_by    uuid references public.profiles(id) on delete set null,
  reviewed_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint daily_schedules_order check (planned_end <> planned_start),
  constraint daily_schedules_extra check (extra_hours >= 0 and extra_hours <= 12),
  unique (employee_id, work_date)
);
create index if not exists daily_schedules_date_idx on public.daily_schedules(work_date desc);

-- 2.7 Настройки уведомлений (singleton)
create table if not exists public.notification_settings (
  id                     boolean primary key default true,
  telegram_enabled       boolean not null default false,
  telegram_chat_id       text,
  late_threshold_minutes integer not null default 10,
  notify_on_start        boolean not null default true,
  notify_on_end          boolean not null default true,
  notify_on_late         boolean not null default true,
  updated_by             uuid references public.profiles(id) on delete set null,
  updated_at             timestamptz not null default now(),
  constraint notification_settings_singleton check (id)
);
comment on column public.notification_settings.telegram_chat_id is
  'BOT_TOKEN здесь НЕ хранится: он лежит в Supabase Vault / secret TELEGRAM_BOT_TOKEN.';

-- 2.8 Журнал уведомлений
create table if not exists public.notification_log (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null,
  employee_id uuid references public.employees(id) on delete set null,
  payload     jsonb not null default '{}'::jsonb,
  delivered   boolean not null default false,
  error       text,
  created_at  timestamptz not null default now()
);
create index if not exists notification_log_created_idx on public.notification_log(created_at desc);
create unique index if not exists notification_log_dedupe
  on public.notification_log(kind, employee_id, (payload->>'work_date'))
  where kind = 'late';

-- 2.9 Аудит действий администратора
create table if not exists public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references public.profiles(id) on delete set null,
  action      text not null,
  entity      text not null,
  entity_id   uuid,
  diff        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists audit_log_created_idx on public.audit_log(created_at desc);

-- ─────────────────────────────────────────────────────────────
-- 3. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
-- ─────────────────────────────────────────────────────────────

-- Роль текущего пользователя без рекурсии RLS
create or replace function public.current_role()
returns public.app_role
language sql stable security definer set search_path = public
as $$ select role from public.profiles where id = auth.uid() $$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$ select coalesce((select role = 'admin' and is_active from public.profiles where id = auth.uid()), false) $$;

create or replace function public.current_employee_id()
returns uuid
language sql stable security definer set search_path = public
as $$ select id from public.employees where user_id = auth.uid() $$;

-- updated_at
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

do $$
declare t text;
begin
  foreach t in array array['profiles','employees','additional_hours','daily_schedules'] loop
    execute format('drop trigger if exists trg_touch_%1$s on public.%1$s', t);
    execute format('create trigger trg_touch_%1$s before update on public.%1$s
                    for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

-- Профиль создаётся автоматически при создании auth-пользователя
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, first_name, last_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    coalesce((new.raw_user_meta_data->>'role')::public.app_role, 'operator')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- 4. БИЗНЕС-ФУНКЦИИ (RPC)
-- ─────────────────────────────────────────────────────────────

-- 4.1 Выйти на линию
create or replace function public.start_shift()
returns public.shifts
language plpgsql security definer set search_path = public
as $$
declare
  emp   public.employees;
  row_s public.shifts;
begin
  select e.* into emp
  from public.employees e
  join public.profiles p on p.id = e.user_id
  where e.user_id = auth.uid();

  if emp.id is null then
    raise exception 'EMPLOYEE_NOT_FOUND' using errcode = 'P0002';
  end if;
  if not emp.active or emp.blocked_at is not null then
    raise exception 'EMPLOYEE_BLOCKED' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.shifts where employee_id = emp.id and status = 'online') then
    raise exception 'SHIFT_ALREADY_OPEN' using errcode = 'P0001';
  end if;

  insert into public.shifts (employee_id, work_date, started_at, status)
  values (emp.id, (now() at time zone emp.timezone)::date, now(), 'online')
  returning * into row_s;

  perform public.enqueue_notification('shift_started', emp.id,
    jsonb_build_object('at', to_char(now() at time zone emp.timezone, 'HH24:MI')));

  return row_s;
end $$;

-- 4.2 Завершить смену
create or replace function public.end_shift(p_note text default null)
returns public.shifts
language plpgsql security definer set search_path = public
as $$
declare
  emp   public.employees;
  row_s public.shifts;
begin
  select * into emp from public.employees where user_id = auth.uid();
  if emp.id is null then
    raise exception 'EMPLOYEE_NOT_FOUND' using errcode = 'P0002';
  end if;

  update public.shifts
     set ended_at = now(), status = 'closed', note = coalesce(p_note, note), closed_by = auth.uid()
   where employee_id = emp.id and status = 'online'
  returning * into row_s;

  if row_s.id is null then
    raise exception 'NO_OPEN_SHIFT' using errcode = 'P0002';
  end if;

  perform public.enqueue_notification('shift_ended', emp.id,
    jsonb_build_object('minutes', row_s.total_minutes,
                       'at', to_char(now() at time zone emp.timezone, 'HH24:MI')));

  return row_s;
end $$;

-- 4.3 Заполнить график на день (upsert)
create or replace function public.save_daily_schedule(
  p_work_date     date,
  p_planned_start time,
  p_planned_end   time,
  p_extra_hours   numeric default 0,
  p_reason        public.extra_reason default null,
  p_comment       text default ''
)
returns public.daily_schedules
language plpgsql security definer set search_path = public
as $$
declare
  emp public.employees;
  row_d public.daily_schedules;
begin
  select * into emp from public.employees where user_id = auth.uid();
  if emp.id is null then raise exception 'EMPLOYEE_NOT_FOUND' using errcode = 'P0002'; end if;
  if p_work_date < current_date then raise exception 'PAST_DATE_LOCKED' using errcode = 'P0001'; end if;

  insert into public.daily_schedules
    (employee_id, work_date, planned_start, planned_end, extra_hours, reason, comment, status)
  values
    (emp.id, p_work_date, p_planned_start, p_planned_end, coalesce(p_extra_hours,0), p_reason,
     coalesce(p_comment,''), case when coalesce(p_extra_hours,0) > 4 then 'pending' else 'approved' end)
  on conflict (employee_id, work_date) do update
     set planned_start = excluded.planned_start,
         planned_end   = excluded.planned_end,
         extra_hours   = excluded.extra_hours,
         reason        = excluded.reason,
         comment       = excluded.comment,
         status        = excluded.status,
         reviewed_by   = null,
         reviewed_at   = null
  returning * into row_d;

  if row_d.extra_hours > 0 then
    insert into public.additional_hours (employee_id, work_date, hours, reason, comment, status)
    values (emp.id, p_work_date, row_d.extra_hours, coalesce(p_reason,'other'), coalesce(p_comment,''), row_d.status)
    on conflict (employee_id, work_date) do update
       set hours = excluded.hours, reason = excluded.reason,
           comment = excluded.comment, status = excluded.status;
  else
    delete from public.additional_hours where employee_id = emp.id and work_date = p_work_date;
  end if;

  return row_d;
end $$;

-- 4.4 Блокировка сотрудника (только admin)
create or replace function public.admin_set_block(p_employee_id uuid, p_blocked boolean, p_reason text default null)
returns public.employees
language plpgsql security definer set search_path = public
as $$
declare row_e public.employees;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN' using errcode = '42501'; end if;

  update public.employees
     set blocked_at = case when p_blocked then now() else null end,
         blocked_reason = case when p_blocked then p_reason else null end,
         active = not p_blocked
   where id = p_employee_id
  returning * into row_e;

  update public.profiles set is_active = not p_blocked where id = row_e.user_id;

  -- активная смена закрывается принудительно
  if p_blocked then
    update public.shifts
       set ended_at = now(), status = 'auto_closed', closed_by = auth.uid()
     where employee_id = p_employee_id and status = 'online';
  end if;

  insert into public.audit_log (actor_id, action, entity, entity_id, diff)
  values (auth.uid(), case when p_blocked then 'block' else 'unblock' end,
          'employee', p_employee_id, jsonb_build_object('reason', p_reason));

  return row_e;
end $$;

-- 4.5 Метрики дашборда
create or replace function public.admin_dashboard_stats(p_date date default current_date)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'total_employees', (select count(*) from public.employees where active),
    'blocked',         (select count(*) from public.employees where not active),
    'online_now',      (select count(*) from public.shifts where status = 'online'),
    'worked_today',    (select count(distinct employee_id) from public.shifts where work_date = p_date),
    'hours_today',     coalesce((select round(sum(total_minutes)::numeric / 60, 1)
                                 from public.shifts where work_date = p_date and total_minutes is not null), 0),
    'extra_today',     coalesce((select sum(hours) from public.additional_hours
                                 where work_date = p_date and status <> 'rejected'), 0),
    'avg_minutes',     coalesce((select round(avg(total_minutes))
                                 from public.shifts where work_date = p_date and total_minutes is not null), 0),
    'late_now',        (select count(*) from public.v_line_status where line_state = 'late')
  )
$$;

-- 4.6 Месячный отчёт
create or replace function public.admin_monthly_report(p_from date, p_to date)
returns table (
  employee_id uuid, full_name text, project text,
  shifts_count bigint, base_hours numeric, extra_hours numeric, total_hours numeric
)
language sql stable security definer set search_path = public
as $$
  select
    e.id,
    p.full_name,
    coalesce(pr.name, '—'),
    count(distinct s.id),
    coalesce(round(sum(s.total_minutes)::numeric / 60, 1), 0),
    coalesce((select sum(ah.hours) from public.additional_hours ah
               where ah.employee_id = e.id and ah.work_date between p_from and p_to
                 and ah.status <> 'rejected'), 0),
    coalesce(round(sum(s.total_minutes)::numeric / 60, 1), 0)
      + coalesce((select sum(ah.hours) from public.additional_hours ah
                   where ah.employee_id = e.id and ah.work_date between p_from and p_to
                     and ah.status <> 'rejected'), 0)
  from public.employees e
  join public.profiles p on p.id = e.user_id
  left join public.projects pr on pr.id = e.project_id
  left join public.shifts s on s.employee_id = e.id
        and s.work_date between p_from and p_to and s.total_minutes is not null
  group by e.id, p.full_name, pr.name
  order by 7 desc;
$$;

-- ─────────────────────────────────────────────────────────────
-- 5. ПРЕДСТАВЛЕНИЯ
-- ─────────────────────────────────────────────────────────────

-- Состояние линии в реальном времени
create or replace view public.v_line_status
with (security_invoker = on) as
select
  e.id                       as employee_id,
  p.id                       as user_id,
  p.full_name,
  p.email,
  coalesce(pr.name, '—')     as project,
  e.default_schedule,
  e.active,
  e.blocked_at is not null   as blocked,
  s.id                       as shift_id,
  s.started_at,
  to_char(s.started_at at time zone e.timezone, 'HH24:MI') as started_label,
  case
    when e.blocked_at is not null then 'blocked'
    when s.id is not null then 'online'
    when ds.planned_start is not null
     and (now() at time zone e.timezone)::time
         > ds.planned_start + make_interval(mins => ns.late_threshold_minutes)
     and (now() at time zone e.timezone)::time < ds.planned_end
      then 'late'
    else 'offline'
  end as line_state,
  coalesce(
    (select round(sum(x.total_minutes)::numeric, 0)
       from public.shifts x
      where x.employee_id = e.id and x.work_date = current_date and x.total_minutes is not null),
    0
  ) + coalesce(extract(epoch from (now() - s.started_at)) / 60, 0)::numeric as today_minutes,
  ds.planned_start,
  ds.planned_end,
  ds.extra_hours
from public.employees e
join public.profiles p  on p.id = e.user_id
left join public.projects pr on pr.id = e.project_id
left join public.shifts s    on s.employee_id = e.id and s.status = 'online'
left join public.daily_schedules ds on ds.employee_id = e.id and ds.work_date = current_date
cross join lateral (select coalesce((select late_threshold_minutes from public.notification_settings where id), 10) as late_threshold_minutes) ns;

-- Дневная сводка по сотруднику
create or replace view public.v_daily_summary
with (security_invoker = on) as
select
  s.employee_id,
  s.work_date,
  p.full_name,
  coalesce(pr.name, '—') as project,
  min(s.started_at)      as first_start,
  max(s.ended_at)        as last_end,
  coalesce(round(sum(s.total_minutes)::numeric / 60, 2), 0) as worked_hours,
  coalesce(max(ah.hours), 0) as extra_hours,
  count(*) as shifts_count
from public.shifts s
join public.employees e on e.id = s.employee_id
join public.profiles p  on p.id = e.user_id
left join public.projects pr on pr.id = e.project_id
left join public.additional_hours ah
       on ah.employee_id = s.employee_id and ah.work_date = s.work_date and ah.status <> 'rejected'
group by s.employee_id, s.work_date, p.full_name, pr.name;

-- Плоский список графиков для админки
create or replace view public.v_schedule_feed
with (security_invoker = on) as
select
  ds.id, ds.work_date, ds.employee_id,
  p.full_name, coalesce(pr.name,'—') as project,
  ds.planned_start, ds.planned_end, ds.extra_hours,
  ds.reason, ds.comment, ds.status, ds.created_at
from public.daily_schedules ds
join public.employees e on e.id = ds.employee_id
join public.profiles p  on p.id = e.user_id
left join public.projects pr on pr.id = e.project_id;

-- ─────────────────────────────────────────────────────────────
-- 6. TELEGRAM: очередь + отправка через pg_net
-- ─────────────────────────────────────────────────────────────
create or replace function public.enqueue_notification(p_kind text, p_employee_id uuid, p_payload jsonb)
returns void
language plpgsql security definer set search_path = public, extensions
as $$
declare
  st  public.notification_settings;
  emp record;
  txt text;
  fn_url text := current_setting('app.settings.edge_url', true);
begin
  select * into st from public.notification_settings where id;
  if st is null or not st.telegram_enabled or st.telegram_chat_id is null then
    return;
  end if;
  if p_kind = 'shift_started' and not st.notify_on_start then return; end if;
  if p_kind = 'shift_ended'   and not st.notify_on_end   then return; end if;
  if p_kind = 'late'          and not st.notify_on_late  then return; end if;

  select p.full_name, coalesce(pr.name,'—') as project
    into emp
  from public.employees e
  join public.profiles p on p.id = e.user_id
  left join public.projects pr on pr.id = e.project_id
  where e.id = p_employee_id;

  txt := case p_kind
    when 'shift_started' then format(E'🟢 <b>%s вышел на линию</b>\nПроект: %s\nВремя: %s',
                                     emp.full_name, emp.project, p_payload->>'at')
    when 'shift_ended'   then format(E'🔴 <b>%s завершил смену</b>\nОтработано: %s мин\nВремя: %s',
                                     emp.full_name, p_payload->>'minutes', p_payload->>'at')
    when 'late'          then format(E'⚠️ <b>Контроль линии</b>\nОператор: %s\nНачало смены: %s\nСтатус: не вышел',
                                     emp.full_name, p_payload->>'planned_start')
    else format('Phoenix: %s', p_kind)
  end;

  insert into public.notification_log (kind, employee_id, payload)
  values (p_kind, p_employee_id, p_payload || jsonb_build_object('text', txt))
  on conflict do nothing;

  if fn_url is not null then
    perform extensions.net.http_post(
      url     := fn_url || '/telegram-notify',
      headers := jsonb_build_object(
                   'Content-Type', 'application/json',
                   'Authorization', 'Bearer ' || coalesce(current_setting('app.settings.service_key', true), '')),
      body    := jsonb_build_object('chat_id', st.telegram_chat_id, 'text', txt)
    );
  end if;
end $$;

-- Watchdog: кто не вышел на смену
create or replace function public.check_late_operators()
returns integer
language plpgsql security definer set search_path = public
as $$
declare r record; n integer := 0;
begin
  for r in
    select employee_id, planned_start
    from public.v_line_status
    where line_state = 'late'
  loop
    perform public.enqueue_notification('late', r.employee_id,
      jsonb_build_object('planned_start', to_char(r.planned_start, 'HH24:MI'),
                         'work_date', current_date::text));
    n := n + 1;
  end loop;
  return n;
end $$;

-- Автозакрытие забытых смен в 04:00
create or replace function public.auto_close_stale_shifts()
returns integer
language plpgsql security definer set search_path = public
as $$
declare n integer;
begin
  with upd as (
    update public.shifts
       set ended_at = started_at + interval '12 hours', status = 'auto_closed'
     where status = 'online' and started_at < now() - interval '14 hours'
    returning 1
  ) select count(*) into n from upd;
  return n;
end $$;

select cron.schedule('phoenix-late-watchdog', '*/5 * * * *', $$select public.check_late_operators()$$)
where not exists (select 1 from cron.job where jobname = 'phoenix-late-watchdog');

select cron.schedule('phoenix-auto-close', '0 4 * * *', $$select public.auto_close_stale_shifts()$$)
where not exists (select 1 from cron.job where jobname = 'phoenix-auto-close');

-- ─────────────────────────────────────────────────────────────
-- 7. ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────
alter table public.profiles              enable row level security;
alter table public.projects              enable row level security;
alter table public.employees             enable row level security;
alter table public.shifts                enable row level security;
alter table public.additional_hours      enable row level security;
alter table public.daily_schedules       enable row level security;
alter table public.notification_settings enable row level security;
alter table public.notification_log      enable row level security;
alter table public.audit_log             enable row level security;

alter table public.profiles              force row level security;
alter table public.employees             force row level security;
alter table public.shifts                force row level security;
alter table public.additional_hours      force row level security;
alter table public.daily_schedules       force row level security;

-- profiles ------------------------------------------------------
drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (
    -- обычный пользователь не может поднять себе роль
    (public.is_admin()) or (id = auth.uid() and role = public.current_role())
  );

drop policy if exists profiles_admin_write on public.profiles;
create policy profiles_admin_write on public.profiles
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- projects ------------------------------------------------------
drop policy if exists projects_read on public.projects;
create policy projects_read on public.projects
  for select to authenticated using (true);

drop policy if exists projects_admin_write on public.projects;
create policy projects_admin_write on public.projects
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- employees -----------------------------------------------------
drop policy if exists employees_self_read on public.employees;
create policy employees_self_read on public.employees
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists employees_admin_write on public.employees;
create policy employees_admin_write on public.employees
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- shifts --------------------------------------------------------
drop policy if exists shifts_self_read on public.shifts;
create policy shifts_self_read on public.shifts
  for select to authenticated
  using (employee_id = public.current_employee_id() or public.is_admin());

drop policy if exists shifts_self_insert on public.shifts;
create policy shifts_self_insert on public.shifts
  for insert to authenticated
  with check (employee_id = public.current_employee_id() or public.is_admin());

drop policy if exists shifts_self_update on public.shifts;
create policy shifts_self_update on public.shifts
  for update to authenticated
  using (employee_id = public.current_employee_id() or public.is_admin())
  with check (employee_id = public.current_employee_id() or public.is_admin());

drop policy if exists shifts_admin_delete on public.shifts;
create policy shifts_admin_delete on public.shifts
  for delete to authenticated using (public.is_admin());

-- additional_hours ----------------------------------------------
drop policy if exists extra_self_rw on public.additional_hours;
create policy extra_self_rw on public.additional_hours
  for all to authenticated
  using (employee_id = public.current_employee_id() or public.is_admin())
  with check (employee_id = public.current_employee_id() or public.is_admin());

-- daily_schedules -----------------------------------------------
drop policy if exists sched_self_rw on public.daily_schedules;
create policy sched_self_rw on public.daily_schedules
  for all to authenticated
  using (employee_id = public.current_employee_id() or public.is_admin())
  with check (employee_id = public.current_employee_id() or public.is_admin());

-- notification_settings / log / audit ---------------------------
drop policy if exists notif_admin_only on public.notification_settings;
create policy notif_admin_only on public.notification_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists notif_log_admin on public.notification_log;
create policy notif_log_admin on public.notification_log
  for select to authenticated using (public.is_admin());

drop policy if exists audit_admin on public.audit_log;
create policy audit_admin on public.audit_log
  for select to authenticated using (public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- 8. ГРАНТЫ
-- ─────────────────────────────────────────────────────────────
revoke all on all functions in schema public from anon;

grant execute on function public.start_shift()                     to authenticated;
grant execute on function public.end_shift(text)                   to authenticated;
grant execute on function public.save_daily_schedule(date, time, time, numeric, public.extra_reason, text) to authenticated;
grant execute on function public.admin_set_block(uuid, boolean, text)   to authenticated;
grant execute on function public.admin_dashboard_stats(date)       to authenticated;
grant execute on function public.admin_monthly_report(date, date)  to authenticated;
grant execute on function public.is_admin()                        to authenticated;
grant execute on function public.current_employee_id()             to authenticated;

grant select on public.v_line_status, public.v_daily_summary, public.v_schedule_feed to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 9. SEED
-- ─────────────────────────────────────────────────────────────
insert into public.notification_settings (id) values (true) on conflict (id) do nothing;

insert into public.projects (name, code) values
  ('Retail Inbound',     'RTL'),
  ('Fintech Support',    'FIN'),
  ('Logistics Outbound', 'LOG')
on conflict (name) do nothing;

-- ============================================================================
-- КАК СОЗДАТЬ ПЕРВОГО АДМИНА
--
-- 1) Supabase Dashboard → Authentication → Users → Add user
--    email: admin@phoenix.io, пароль свой, Auto Confirm User = ON
-- 2) Выполнить в SQL Editor:
--
--    update public.profiles
--       set role = 'admin', first_name = 'Дмитрий', last_name = 'Кравцов'
--     where email = 'admin@phoenix.io';
--
-- 3) Опционально прописать настройки для pg_net:
--
--    alter database postgres set app.settings.edge_url    = 'https://<PROJECT_REF>.supabase.co/functions/v1';
--    alter database postgres set app.settings.service_key = '<SERVICE_ROLE_KEY>';
-- ============================================================================
