-- Durable notification queue worker support.

alter table public.notification_jobs drop constraint if exists notification_jobs_status_check;
alter table public.notification_jobs add constraint notification_jobs_status_check
  check (status in ('pending','processing','delivered','failed','dead'));
alter table public.notification_jobs add column if not exists processed_at timestamptz;
create index if not exists notification_jobs_claim_idx
  on public.notification_jobs(status, next_attempt_at, locked_at);

create or replace function public.claim_notification_jobs(p_limit integer default 20)
returns setof public.notification_jobs
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_limit < 1 or p_limit > 100 then
    raise exception 'INVALID_LIMIT' using errcode = '22023';
  end if;

  return query
  with candidates as (
    select id
    from public.notification_jobs
    where (status = 'pending' and next_attempt_at <= now())
       or (status = 'processing' and locked_at < now() - interval '10 minutes')
    order by next_attempt_at, created_at
    for update skip locked
    limit p_limit
  )
  update public.notification_jobs j
     set status = 'processing',
         attempts = j.attempts + 1,
         locked_at = now(),
         last_error = null
    from candidates c
   where j.id = c.id
  returning j.*;
end;
$$;

create or replace function public.complete_notification_job(
  p_id uuid,
  p_success boolean,
  p_error text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempts integer;
  v_delay interval;
begin
  select attempts into v_attempts
  from public.notification_jobs
  where id = p_id
  for update;

  if not found then
    raise exception 'JOB_NOT_FOUND' using errcode = 'P0002';
  end if;

  if p_success then
    update public.notification_jobs
       set status = 'delivered', processed_at = now(), delivered_at = now(),
           locked_at = null, last_error = null
     where id = p_id;
    return;
  end if;

  if v_attempts >= 5 then
    update public.notification_jobs
       set status = 'dead', processed_at = now(), locked_at = null,
           last_error = left(coalesce(p_error, 'DELIVERY_FAILED'), 2000)
     where id = p_id;
    return;
  end if;

  v_delay := case v_attempts
    when 1 then interval '1 minute'
    when 2 then interval '5 minutes'
    when 3 then interval '15 minutes'
    when 4 then interval '1 hour'
    else interval '1 hour'
  end;

  update public.notification_jobs
     set status = 'pending', next_attempt_at = now() + v_delay,
         locked_at = null, last_error = left(coalesce(p_error, 'DELIVERY_FAILED'), 2000)
   where id = p_id;
end;
$$;

revoke all on function public.claim_notification_jobs(integer) from public, anon, authenticated;
revoke all on function public.complete_notification_job(uuid, boolean, text) from public, anon, authenticated;
-- Edge workers use the service role, which bypasses RLS and function grants.

select cron.schedule('phoenix-telegram-worker', '*/1 * * * *', $$select 1$$)
where not exists (select 1 from cron.job where jobname = 'phoenix-telegram-worker');
