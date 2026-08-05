-- Queue execution hardening. Only the service role may claim/complete jobs.
create or replace function public.claim_notification_job(p_limit integer default 20)
returns setof public.notification_jobs
language sql security definer set search_path = public
as $$ select * from public.claim_notification_jobs(p_limit) $$;

revoke all on function public.claim_notification_jobs(integer) from public, anon, authenticated;
revoke all on function public.claim_notification_job(integer) from public, anon, authenticated;
revoke all on function public.complete_notification_job(uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.claim_notification_jobs(integer) to service_role;
grant execute on function public.claim_notification_job(integer) to service_role;
grant execute on function public.complete_notification_job(uuid, boolean, text) to service_role;

-- Keep the queue private even when a browser holds an authenticated session.
revoke all on public.notification_jobs from anon, authenticated;
