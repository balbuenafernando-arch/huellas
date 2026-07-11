-- HUELLA Iteracion 3.4 - contacto seguro y reencuentros persistentes
--
-- Esta migracion asume que las migraciones anteriores ya crearon:
-- profiles, pets, lost_reports, sightings, matches y notifications.
-- No recrea ni altera tablas base ajenas a esta iteracion.

create extension if not exists "pgcrypto";

do $$
begin
  if to_regclass('public.profiles') is null then
    raise exception 'Missing required table public.profiles. Run previous migrations first.';
  end if;

  if to_regclass('public.pets') is null then
    raise exception 'Missing required table public.pets. Run previous migrations first.';
  end if;

  if to_regclass('public.lost_reports') is null then
    raise exception 'Missing required table public.lost_reports. Run previous migrations first.';
  end if;

  if to_regclass('public.sightings') is null then
    raise exception 'Missing required table public.sightings. Run previous migrations first.';
  end if;

  if to_regclass('public.matches') is null then
    raise exception 'Missing required table public.matches. Run previous migrations first.';
  end if;

  if to_regclass('public.notifications') is null then
    raise exception 'Missing required table public.notifications. Run previous migrations first.';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'lost_reports' and column_name = 'id'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'lost_reports' and column_name = 'owner_id'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'lost_reports' and column_name = 'pet_id'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'lost_reports' and column_name = 'status'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'lost_reports' and column_name = 'is_public'
  ) then
    raise exception 'public.lost_reports does not match the expected schema for Iteracion 3.4.';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'notifications' and column_name = 'user_id'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'notifications' and column_name = 'report_id'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'notifications' and column_name = 'type'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'notifications' and column_name = 'message'
  ) then
    raise exception 'public.notifications does not match the expected schema for Iteracion 3.4.';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'sightings' and column_name = 'report_id'
  ) then
    raise exception 'public.sightings.report_id is required for Iteracion 3.4.';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'matches' and column_name = 'report_id'
  ) then
    raise exception 'public.matches.report_id is required for Iteracion 3.4.';
  end if;
end $$;

create table if not exists public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.lost_reports(id) on delete cascade,
  pet_id uuid references public.pets(id) on delete set null,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  requester_id uuid not null references public.profiles(id) on delete cascade,
  requester_name text not null check (char_length(requester_name) between 1 and 80),
  reason text not null check (reason in ('vista', 'resguardada', 'siguiendo', 'fotografias', 'informacion')),
  message text check (message is null or char_length(message) <= 200),
  status text not null default 'pendiente' check (status in ('pendiente', 'autorizada', 'rechazada')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contact_requests_not_owner check (owner_id <> requester_id)
);

create table if not exists public.reunion_stories (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null,
  report_id uuid references public.lost_reports(id) on delete set null,
  pet_id uuid references public.pets(id) on delete set null,
  owner_id uuid references public.profiles(id) on delete set null,
  photo_url text,
  story text check (story is null or char_length(story) <= 200),
  reunited_at timestamptz not null default now(),
  search_duration_days integer check (search_duration_days is null or search_duration_days >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contact_requests_report_id_idx
  on public.contact_requests(report_id, created_at desc);

create index if not exists contact_requests_owner_status_idx
  on public.contact_requests(owner_id, status, created_at desc);

create index if not exists contact_requests_requester_idx
  on public.contact_requests(requester_id, created_at desc);

create unique index if not exists contact_requests_unique_pending_idx
  on public.contact_requests(report_id, requester_id)
  where status = 'pendiente';

create unique index if not exists reunion_stories_case_id_idx
  on public.reunion_stories(case_id);

create index if not exists reunion_stories_report_id_idx
  on public.reunion_stories(report_id);

create index if not exists reunion_stories_reunited_at_idx
  on public.reunion_stories(reunited_at desc);

create index if not exists reunion_stories_owner_id_idx
  on public.reunion_stories(owner_id);

alter table public.contact_requests enable row level security;
alter table public.reunion_stories enable row level security;

drop policy if exists "contact_requests_select_participants" on public.contact_requests;
create policy "contact_requests_select_participants" on public.contact_requests
for select using (auth.uid() = owner_id or auth.uid() = requester_id);

drop policy if exists "contact_requests_insert_requester" on public.contact_requests;
create policy "contact_requests_insert_requester" on public.contact_requests
for insert with check (
  auth.uid() = requester_id
  and status = 'pendiente'
  and exists (
    select 1
    from public.lost_reports report
    where report.id = contact_requests.report_id
      and report.pet_id = contact_requests.pet_id
      and report.owner_id = contact_requests.owner_id
      and report.status = 'active'
      and report.is_public = true
  )
);

drop policy if exists "contact_requests_update_owner" on public.contact_requests;
create policy "contact_requests_update_owner" on public.contact_requests
for update using (auth.uid() = owner_id)
with check (
  auth.uid() = owner_id
  and status in ('autorizada', 'rechazada')
);

drop policy if exists "reunion_stories_select_public" on public.reunion_stories;
create policy "reunion_stories_select_public" on public.reunion_stories
for select using (true);

drop policy if exists "reunion_stories_insert_owner" on public.reunion_stories;
create policy "reunion_stories_insert_owner" on public.reunion_stories
for insert with check (
  auth.uid() = owner_id
  and (
    report_id is null
    or exists (
      select 1
      from public.lost_reports report
      where report.id = reunion_stories.report_id
        and report.owner_id = auth.uid()
    )
  )
);

drop policy if exists "reunion_stories_update_owner" on public.reunion_stories;
create policy "reunion_stories_update_owner" on public.reunion_stories
for update using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "reunion_stories_delete_owner" on public.reunion_stories;
create policy "reunion_stories_delete_owner" on public.reunion_stories
for delete using (auth.uid() = owner_id);

create or replace function public.set_iteration_3_4_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists contact_requests_set_updated_at on public.contact_requests;
create trigger contact_requests_set_updated_at
before update on public.contact_requests
for each row execute function public.set_iteration_3_4_updated_at();

drop trigger if exists reunion_stories_set_updated_at on public.reunion_stories;
create trigger reunion_stories_set_updated_at
before update on public.reunion_stories
for each row execute function public.set_iteration_3_4_updated_at();

create or replace function public.prevent_contact_request_identity_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.report_id is distinct from new.report_id
    or old.pet_id is distinct from new.pet_id
    or old.owner_id is distinct from new.owner_id
    or old.requester_id is distinct from new.requester_id
    or old.requester_name is distinct from new.requester_name
    or old.reason is distinct from new.reason
    or old.message is distinct from new.message
    or old.created_at is distinct from new.created_at then
    raise exception 'contact request identity fields cannot be changed';
  end if;

  return new;
end;
$$;

drop trigger if exists contact_requests_prevent_identity_change on public.contact_requests;
create trigger contact_requests_prevent_identity_change
before update on public.contact_requests
for each row execute function public.prevent_contact_request_identity_change();

create or replace function public.notify_contact_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, report_id, type, message)
  values (
    new.owner_id,
    new.report_id,
    'contact_request',
    coalesce(new.requester_name, 'Una persona') || ' quiere contactarte. Motivo: ' ||
      case new.reason
        when 'vista' then 'La vi.'
        when 'resguardada' then 'La tengo resguardada.'
        when 'siguiendo' then 'La estoy siguiendo.'
        when 'fotografias' then 'Tengo fotografias.'
        else 'Tengo informacion importante.'
      end
  );

  return new;
end;
$$;

drop trigger if exists contact_requests_notify_owner on public.contact_requests;
create trigger contact_requests_notify_owner
after insert on public.contact_requests
for each row execute function public.notify_contact_request();

create or replace function public.notify_contact_request_decision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status is not distinct from new.status then
    return new;
  end if;

  if new.status in ('autorizada', 'rechazada') then
    insert into public.notifications (user_id, report_id, type, message)
    values (
      new.requester_id,
      new.report_id,
      case when new.status = 'autorizada' then 'contact_authorized' else 'contact_rejected' end,
      case when new.status = 'autorizada'
        then 'El dueno autorizo compartir su contacto.'
        else 'El dueno no autorizo compartir su contacto.'
      end
    );
  end if;

  return new;
end;
$$;

drop trigger if exists contact_requests_notify_decision on public.contact_requests;
create trigger contact_requests_notify_decision
after update of status on public.contact_requests
for each row execute function public.notify_contact_request_decision();

create or replace function public.notify_lost_report_reunion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status is distinct from new.status and new.status = 'reunited' then
    insert into public.notifications (user_id, report_id, type, message)
    values (new.owner_id, new.id, 'report_reunited', 'Mascota reunida.');
  end if;

  return new;
end;
$$;

drop trigger if exists lost_reports_notify_reunion on public.lost_reports;
create trigger lost_reports_notify_reunion
after update of status on public.lost_reports
for each row execute function public.notify_lost_report_reunion();

create or replace function public.notify_sighting_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  report_owner uuid;
begin
  if new.report_id is null then
    return new;
  end if;

  select owner_id into report_owner
  from public.lost_reports
  where id = new.report_id;

  if report_owner is not null then
    insert into public.notifications (user_id, report_id, type, message)
    values (report_owner, new.report_id, 'new_sighting', 'Nuevo avistamiento recibido.');
  end if;

  return new;
end;
$$;

drop trigger if exists sightings_notify_owner on public.sightings;
create trigger sightings_notify_owner
after insert on public.sightings
for each row execute function public.notify_sighting_insert();

create or replace function public.notify_match_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  report_owner uuid;
begin
  if new.report_id is null then
    return new;
  end if;

  select owner_id into report_owner
  from public.lost_reports
  where id = new.report_id;

  if report_owner is not null then
    insert into public.notifications (user_id, report_id, type, message)
    values (report_owner, new.report_id, 'new_match', 'Nueva coincidencia posible.');
  end if;

  return new;
end;
$$;

drop trigger if exists matches_notify_owner on public.matches;
create trigger matches_notify_owner
after insert on public.matches
for each row execute function public.notify_match_insert();
