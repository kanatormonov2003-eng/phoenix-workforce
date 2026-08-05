-- Production security hardening: least-privilege RLS, soft delete, queue, RPC guards.

alter table public.profiles add column if not exists deleted_at timestamptz;
alter table public.employees add column if not exists deleted_at timestamptz;

create table if not exists public.notification_jobs (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (length(kind) between 1 and 64),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','processing','delivered','failed')),
  attempts integer not null default 0 check (attempts >= 0),
  next_attempt_at timestamptz not null default now(),
  locked_at timestamptz,
  delivered_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);
create index if not exists notification_jobs_ready_idx on public.notification_jobs(status, next_attempt_at);

alter table public.notification_jobs enable row level security;

-- Remove broad policies. Operators must use controlled RPCs.
drop policy if exists profiles_self_update on public.profiles;
drop policy if exists profiles_admin_write on public.profiles;
drop policy if exists employees_admin_write on public.employees;
drop policy if exists shifts_self_insert on public.shifts;
drop policy if exists shifts_self_update on public.shifts;
drop policy if exists extra_self_rw on public.additional_hours;
drop policy if exists sched_self_rw on public.daily_schedules;
drop policy if exists notif_admin_only on public.notification_settings;
drop policy if exists notif_log_admin on public.notification_log;
drop policy if exists audit_admin on public.audit_log;

create policy profiles_admin_write on public.profiles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy employees_admin_write on public.employees for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy shifts_admin_write on public.shifts for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy additional_hours_self_read on public.additional_hours for select to authenticated
  using (employee_id = public.current_employee_id() or public.is_admin());
create policy additional_hours_self_insert on public.additional_hours for insert to authenticated
  with check (employee_id = public.current_employee_id() and status = 'pending' and approved_by is null and approved_at is null);
create policy additional_hours_admin_write on public.additional_hours for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy schedules_self_read on public.daily_schedules for select to authenticated
  using (employee_id = public.current_employee_id() or public.is_admin());
create policy schedules_self_insert on public.daily_schedules for insert to authenticated
  with check (employee_id = public.current_employee_id() and status = 'approved' and reviewed_by is null and reviewed_at is null);
create policy schedules_self_update on public.daily_schedules for update to authenticated
  using (employee_id = public.current_employee_id())
  with check (employee_id = public.current_employee_id() and status = 'approved' and reviewed_by is null and reviewed_at is null);
create policy schedules_admin_write on public.daily_schedules for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy notification_settings_admin on public.notification_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy notification_log_admin_read on public.notification_log for select to authenticated
  using (public.is_admin());
create policy audit_admin_read on public.audit_log for select to authenticated
  using (public.is_admin());

create or replace function public.admin_guard() returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
end $$;

create or replace function public.start_shift()
returns public.shifts language plpgsql security definer set search_path = public as $$
declare emp public.employees; row_s public.shifts;
begin
  select e.* into emp from public.employees e join public.profiles p on p.id=e.user_id
  where e.user_id=auth.uid() and e.deleted_at is null for update;
  if emp.id is null then raise exception 'EMPLOYEE_NOT_FOUND' using errcode='P0002'; end if;
  if not emp.active or emp.blocked_at is not null then raise exception 'EMPLOYEE_BLOCKED' using errcode='P0001'; end if;
  insert into public.shifts(employee_id, work_date, started_at, status)
  values(emp.id, (now() at time zone emp.timezone)::date, now(), 'online')
  on conflict (employee_id) where status='online' do nothing returning * into row_s;
  if row_s.id is null then raise exception 'SHIFT_ALREADY_OPEN' using errcode='P0001'; end if;
  perform public.enqueue_notification('shift_started', emp.id, jsonb_build_object('at',to_char(now() at time zone emp.timezone,'HH24:MI')));
  return row_s;
end $$;

create or replace function public.end_shift(p_note text default null)
returns public.shifts language plpgsql security definer set search_path = public as $$
declare emp public.employees; row_s public.shifts;
begin
  select e.* into emp from public.employees e where e.user_id=auth.uid() and e.deleted_at is null for update;
  if emp.id is null then raise exception 'EMPLOYEE_NOT_FOUND' using errcode='P0002'; end if;
  update public.shifts set ended_at=now(), status='closed', note=left(coalesce(p_note,note),1000), closed_by=auth.uid()
  where employee_id=emp.id and status='online' returning * into row_s;
  if row_s.id is null then raise exception 'NO_OPEN_SHIFT' using errcode='P0002'; end if;
  perform public.enqueue_notification('shift_ended', emp.id, jsonb_build_object('minutes',row_s.total_minutes,'at',to_char(now() at time zone emp.timezone,'HH24:MI')));
  return row_s;
end $$;

create or replace function public.admin_dashboard_stats(p_date date default current_date)
returns jsonb language plpgsql stable security definer set search_path=public as $$
begin perform public.admin_guard(); return (select jsonb_build_object(
  'total_employees',(select count(*) from public.employees where active and deleted_at is null),
  'blocked',(select count(*) from public.employees where not active and deleted_at is null),
  'online_now',(select count(*) from public.shifts where status='online'),
  'worked_today',(select count(distinct employee_id) from public.shifts where work_date=p_date),
  'hours_today',coalesce((select round(sum(total_minutes)::numeric/60,1) from public.shifts where work_date=p_date and total_minutes is not null),0),
  'extra_today',coalesce((select sum(hours) from public.additional_hours where work_date=p_date and status<>'rejected'),0),
  'avg_minutes',coalesce((select round(avg(total_minutes)) from public.shifts where work_date=p_date and total_minutes is not null),0),
  'late_now',(select count(*) from public.v_line_status where line_state='late'))); end $$;

create or replace function public.admin_monthly_report(p_from date,p_to date)
returns table(employee_id uuid,full_name text,project text,shifts_count bigint,base_hours numeric,extra_hours numeric,total_hours numeric)
language plpgsql stable security definer set search_path=public as $$
begin
  perform public.admin_guard();
  return query select e.id,p.full_name,coalesce(pr.name,'—'),count(distinct s.id),coalesce(round(sum(s.total_minutes)::numeric/60,1),0),
    coalesce((select sum(ah.hours) from public.additional_hours ah where ah.employee_id=e.id and ah.work_date between p_from and p_to and ah.status<>'rejected'),0),
    coalesce(round(sum(s.total_minutes)::numeric/60,1),0)+coalesce((select sum(ah.hours) from public.additional_hours ah where ah.employee_id=e.id and ah.work_date between p_from and p_to and ah.status<>'rejected'),0)
  from public.employees e join public.profiles p on p.id=e.user_id left join public.projects pr on pr.id=e.project_id left join public.shifts s on s.employee_id=e.id and s.work_date between p_from and p_to and s.total_minutes is not null
  where e.deleted_at is null group by e.id,p.full_name,pr.name order by 7 desc;
end $$;

create or replace function public.admin_set_block(p_employee_id uuid,p_blocked boolean,p_reason text default null)
returns public.employees language plpgsql security definer set search_path=public as $$
declare row_e public.employees;
begin
  perform public.admin_guard();
  update public.employees set blocked_at=case when p_blocked then now() else null end, blocked_reason=case when p_blocked then left(p_reason,500) else null end, active=not p_blocked where id=p_employee_id and deleted_at is null returning * into row_e;
  if row_e.id is null then raise exception 'EMPLOYEE_NOT_FOUND' using errcode='P0002'; end if;
  update public.profiles set is_active=not p_blocked where id=row_e.user_id;
  if p_blocked then update public.shifts set ended_at=now(),status='auto_closed',closed_by=auth.uid() where employee_id=p_employee_id and status='online'; end if;
  insert into public.audit_log(actor_id,action,entity,entity_id,diff) values(auth.uid(),case when p_blocked then 'block' else 'unblock' end,'employee',p_employee_id,jsonb_build_object('reason',p_reason));
  return row_e;
end $$;

create or replace function public.enqueue_notification(p_kind text,p_employee_id uuid,p_payload jsonb)
returns void language plpgsql security definer set search_path=public as $$
declare st public.notification_settings;
begin
  select * into st from public.notification_settings where id=true;
  if st is null or not st.telegram_enabled or st.telegram_chat_id is null then return; end if;
  if p_kind='shift_started' and not st.notify_on_start then return; end if;
  if p_kind='shift_ended' and not st.notify_on_end then return; end if;
  if p_kind='late' and not st.notify_on_late then return; end if;
  insert into public.notification_jobs(kind,payload) values(p_kind,p_payload||jsonb_build_object('employee_id',p_employee_id,'chat_id',st.telegram_chat_id));
end $$;

revoke all on public.notification_jobs from anon, authenticated;
revoke execute on function public.admin_guard() from public, anon, authenticated;
revoke execute on function public.enqueue_notification(text,uuid,jsonb) from anon, authenticated;
grant execute on function public.start_shift() to authenticated;
grant execute on function public.end_shift(text) to authenticated;
grant execute on function public.admin_dashboard_stats(date) to authenticated;
grant execute on function public.admin_monthly_report(date,date) to authenticated;
grant execute on function public.admin_set_block(uuid,boolean,text) to authenticated;
