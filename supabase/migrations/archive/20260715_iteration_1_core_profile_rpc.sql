-- Iteration 1 core stabilization: authenticated clients use this RPC to ensure
-- the profile row exists without requiring direct table access during runtime.

create or replace function public.ensure_current_profile()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'No authenticated user found'
      using errcode = '28000',
            detail = 'auth.uid() returned null',
            hint = 'Sign in before creating pets, reports or sightings.';
  end if;

  insert into public.profiles (id, display_name, avatar_url, created_at, updated_at)
  select
    auth_users.id,
    coalesce(auth_users.raw_user_meta_data->>'full_name', auth_users.raw_user_meta_data->>'name', split_part(auth_users.email, '@', 1)),
    auth_users.raw_user_meta_data->>'avatar_url',
    coalesce(auth_users.created_at, now()),
    now()
  from auth.users auth_users
  where auth_users.id = current_user_id
  on conflict (id) do update
  set
    display_name = coalesce(excluded.display_name, public.profiles.display_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    updated_at = now();

  return current_user_id;
end;
$$;

grant execute on function public.ensure_current_profile() to authenticated;
