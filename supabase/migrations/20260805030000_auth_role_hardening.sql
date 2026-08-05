-- Never trust client metadata for privileged role assignment.
-- New accounts are operators; admins are promoted through an authenticated admin-only process.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, first_name, last_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    'operator'
  )
  on conflict (id) do nothing;
  return new;
end
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
