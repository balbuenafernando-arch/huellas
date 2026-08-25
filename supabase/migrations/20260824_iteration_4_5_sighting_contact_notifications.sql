create table if not exists public.sighting_private_contacts (
  sighting_id uuid primary key references public.sightings(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  phone text check (phone is null or char_length(phone) <= 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sighting_private_contacts enable row level security;
grant select, insert, update, delete on public.sighting_private_contacts to authenticated;

drop policy if exists "sighting_private_contacts_participants_select" on public.sighting_private_contacts;
drop policy if exists "sighting_private_contacts_reporter_insert" on public.sighting_private_contacts;
drop policy if exists "sighting_private_contacts_reporter_update" on public.sighting_private_contacts;

create policy "sighting_private_contacts_participants_select" on public.sighting_private_contacts
for select to authenticated using (
  auth.uid() = reporter_id or exists (
    select 1
    from public.sightings s
    join public.lost_reports r on r.id = s.report_id
    where s.id = sighting_id and r.owner_id = auth.uid()
  )
);

create policy "sighting_private_contacts_reporter_insert" on public.sighting_private_contacts
for insert to authenticated with check (auth.uid() = reporter_id);

create policy "sighting_private_contacts_reporter_update" on public.sighting_private_contacts
for update to authenticated using (auth.uid() = reporter_id) with check (auth.uid() = reporter_id);

create or replace function public.notify_case_owner_on_sighting()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_owner uuid;
  pet_name text;
begin
  select r.owner_id, p.nombre into target_owner, pet_name
  from public.lost_reports r
  left join public.pets p on p.id = r.pet_id
  where r.id = new.report_id;

  if target_owner is not null and target_owner is distinct from new.reporter_id then
    insert into public.notifications(user_id, report_id, type, message)
    values (
      target_owner,
      new.report_id,
      'nuevo_avistamiento',
      coalesce(nullif(new.reporter_name, ''), 'Una persona') ||
      ' reportó un avistamiento' ||
      case when pet_name is null then '.' else ' de ' || pet_name || '.' end
    );
  end if;
  return new;
end;
$$;

drop trigger if exists sightings_notify_case_owner on public.sightings;
create trigger sightings_notify_case_owner
after insert on public.sightings
for each row execute function public.notify_case_owner_on_sighting();

create or replace function public.notify_contact_request_participant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.owner_id is distinct from new.requester_id then
    insert into public.notifications(user_id, report_id, type, message)
    values (
      new.owner_id,
      new.report_id,
      'contact_request',
      coalesce(nullif(new.requester_name, ''), 'Una persona') || ' quiere contactarte porque indicó: ' || coalesce(new.reason, 'tiene información') || '.'
    );
  elsif tg_op = 'UPDATE' and old.status is distinct from new.status then
    insert into public.notifications(user_id, report_id, type, message)
    values (
      new.requester_id,
      new.report_id,
      'contact_' || new.status,
      case new.status
        when 'autorizada' then 'El propietario autorizó compartir su contacto.'
        when 'rechazada' then 'El propietario rechazó la solicitud de contacto.'
        else 'Tu solicitud de contacto cambió de estado.'
      end
    );
  end if;
  return new;
end;
$$;

drop trigger if exists contact_requests_notify_participants on public.contact_requests;
create trigger contact_requests_notify_participants
after insert or update of status on public.contact_requests
for each row execute function public.notify_contact_request_participant();
