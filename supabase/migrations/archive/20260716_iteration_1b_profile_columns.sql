-- Hotfix Iteration 1B: align existing profiles tables with the profile RPC.
-- Some deployed databases already had public.profiles, so create table if not exists
-- did not add columns later used by triggers/RPCs.

alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

create or replace function public.ensure_current_profile()
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Not authenticated' using errcode = '28000';
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
