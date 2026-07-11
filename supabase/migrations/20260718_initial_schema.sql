-- HUELLA Backend 1.0 - consolidated initial Supabase schema.
-- This is the single canonical migration for rebuilding or repairing the backend.

create extension if not exists "pgcrypto";

grant usage on schema public to anon, authenticated;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

create table if not exists public.pets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  nombre text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pets add column if not exists owner_id uuid references public.profiles(id) on delete cascade;
alter table public.pets add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.pets add column if not exists nombre text;
alter table public.pets add column if not exists alias text;
alter table public.pets add column if not exists especie text;
alter table public.pets add column if not exists tipo text;
alter table public.pets add column if not exists raza text;
alter table public.pets add column if not exists tamano text;
alter table public.pets add column if not exists color text;
alter table public.pets add column if not exists sexo text;
alter table public.pets add column if not exists edad text;
alter table public.pets add column if not exists salud text;
alter table public.pets add column if not exists esterilizado boolean default false;
alter table public.pets add column if not exists placa_medalla text;
alter table public.pets add column if not exists contacto_preferido text default 'whatsapp';
alter table public.pets add column if not exists foto_url text;
alter table public.pets add column if not exists foto_principal text;
alter table public.pets add column if not exists fotos text[] default '{}';
alter table public.pets add column if not exists caracteristicas text[] default '{}';
alter table public.pets add column if not exists caracteristicas_personalizadas text;
alter table public.pets add column if not exists condiciones_especiales text[] default '{}';
alter table public.pets add column if not exists is_public boolean not null default false;
alter table public.pets add column if not exists created_at timestamptz not null default now();
alter table public.pets add column if not exists updated_at timestamptz not null default now();

create table if not exists public.pet_private_details (
  pet_id uuid primary key references public.pets(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  telefono text,
  rasgo_privado text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lost_reports (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid references public.pets(id) on delete cascade,
  owner_id uuid references public.profiles(id) on delete cascade,
  status text not null default 'active',
  district text not null default '',
  approximate_address text,
  description text,
  reward_text text,
  latitude double precision,
  longitude double precision,
  lost_at timestamptz,
  reunited_at timestamptz,
  views_count integer not null default 0,
  is_public boolean not null default true,
  reporter_name text,
  reporter_is_anonymous boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.lost_reports add column if not exists pet_id uuid references public.pets(id) on delete cascade;
alter table public.lost_reports add column if not exists owner_id uuid references public.profiles(id) on delete cascade;
alter table public.lost_reports add column if not exists status text not null default 'active';
alter table public.lost_reports add column if not exists district text not null default '';
alter table public.lost_reports add column if not exists approximate_address text;
alter table public.lost_reports add column if not exists description text;
alter table public.lost_reports add column if not exists reward_text text;
alter table public.lost_reports add column if not exists latitude double precision;
alter table public.lost_reports add column if not exists longitude double precision;
alter table public.lost_reports add column if not exists lost_at timestamptz;
alter table public.lost_reports add column if not exists reunited_at timestamptz;
alter table public.lost_reports add column if not exists views_count integer not null default 0;
alter table public.lost_reports add column if not exists is_public boolean not null default true;
alter table public.lost_reports add column if not exists reporter_name text;
alter table public.lost_reports add column if not exists reporter_is_anonymous boolean not null default false;
alter table public.lost_reports add column if not exists created_at timestamptz not null default now();
alter table public.lost_reports add column if not exists updated_at timestamptz not null default now();

create table if not exists public.report_private_contacts (
  report_id uuid primary key references public.lost_reports(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  contact_whatsapp text,
  contact_phone text,
  contact_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sightings (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.lost_reports(id) on delete cascade,
  pet_id uuid references public.pets(id) on delete set null,
  reporter_id uuid references public.profiles(id) on delete set null,
  reporter_name text,
  reporter_is_anonymous boolean not null default false,
  especie text,
  tamano text,
  color text,
  district text,
  approximate_address text,
  description text,
  photo_url text,
  latitude double precision,
  longitude double precision,
  observed_at timestamptz,
  status text not null default 'pending',
  estado_revision text default 'por_revisar',
  situacion text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sightings add column if not exists report_id uuid references public.lost_reports(id) on delete cascade;
alter table public.sightings add column if not exists pet_id uuid references public.pets(id) on delete set null;
alter table public.sightings add column if not exists reporter_id uuid references public.profiles(id) on delete set null;
alter table public.sightings add column if not exists reporter_name text;
alter table public.sightings add column if not exists reporter_is_anonymous boolean not null default false;
alter table public.sightings add column if not exists especie text;
alter table public.sightings add column if not exists tamano text;
alter table public.sightings add column if not exists color text;
alter table public.sightings add column if not exists district text;
alter table public.sightings add column if not exists approximate_address text;
alter table public.sightings add column if not exists description text;
alter table public.sightings add column if not exists photo_url text;
alter table public.sightings add column if not exists latitude double precision;
alter table public.sightings add column if not exists longitude double precision;
alter table public.sightings add column if not exists observed_at timestamptz;
alter table public.sightings add column if not exists status text not null default 'pending';
alter table public.sightings add column if not exists estado_revision text default 'por_revisar';
alter table public.sightings add column if not exists situacion text;
alter table public.sightings add column if not exists created_at timestamptz not null default now();
alter table public.sightings add column if not exists updated_at timestamptz not null default now();

create table if not exists public.report_images (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.lost_reports(id) on delete cascade,
  pet_id uuid references public.pets(id) on delete cascade,
  sighting_id uuid references public.sightings(id) on delete cascade,
  owner_id uuid references public.profiles(id) on delete cascade,
  bucket text not null default 'pet-photos',
  storage_path text not null,
  public_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.report_images add column if not exists report_id uuid references public.lost_reports(id) on delete cascade;
alter table public.report_images add column if not exists pet_id uuid references public.pets(id) on delete cascade;
alter table public.report_images add column if not exists sighting_id uuid references public.sightings(id) on delete cascade;
alter table public.report_images add column if not exists owner_id uuid references public.profiles(id) on delete cascade;
alter table public.report_images add column if not exists bucket text not null default 'pet-photos';
alter table public.report_images add column if not exists storage_path text;
alter table public.report_images add column if not exists public_url text;
alter table public.report_images add column if not exists sort_order integer not null default 0;
alter table public.report_images add column if not exists created_at timestamptz not null default now();

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.lost_reports(id) on delete cascade,
  sighting_id uuid references public.sightings(id) on delete cascade,
  pet_id uuid references public.pets(id) on delete set null,
  score numeric not null default 0,
  status text not null default 'pending',
  reasons text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.matches add column if not exists report_id uuid references public.lost_reports(id) on delete cascade;
alter table public.matches add column if not exists sighting_id uuid references public.sightings(id) on delete cascade;
alter table public.matches add column if not exists pet_id uuid references public.pets(id) on delete set null;
alter table public.matches add column if not exists score numeric not null default 0;
alter table public.matches add column if not exists status text not null default 'pending';
alter table public.matches add column if not exists reasons text[] not null default '{}';
alter table public.matches add column if not exists created_at timestamptz not null default now();
alter table public.matches add column if not exists updated_at timestamptz not null default now();

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  report_id uuid references public.lost_reports(id) on delete cascade,
  type text not null default 'reporte_actualizado',
  message text not null default 'Caso actualizado',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.notifications add column if not exists user_id uuid references public.profiles(id) on delete cascade;
alter table public.notifications add column if not exists report_id uuid references public.lost_reports(id) on delete cascade;
alter table public.notifications add column if not exists type text not null default 'reporte_actualizado';
alter table public.notifications add column if not exists message text not null default 'Caso actualizado';
alter table public.notifications add column if not exists read_at timestamptz;
alter table public.notifications add column if not exists created_at timestamptz not null default now();

create table if not exists public.user_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  notify_by_email boolean not null default true,
  notify_by_whatsapp boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_settings add column if not exists user_id uuid references public.profiles(id) on delete cascade;
alter table public.user_settings add column if not exists notify_by_email boolean not null default true;
alter table public.user_settings add column if not exists notify_by_whatsapp boolean not null default false;
alter table public.user_settings add column if not exists created_at timestamptz not null default now();
alter table public.user_settings add column if not exists updated_at timestamptz not null default now();

create table if not exists public.moderation_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles(id) on delete set null,
  target_type text not null,
  target_id uuid not null,
  reason text not null,
  details text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

alter table public.moderation_reports add column if not exists reporter_id uuid references public.profiles(id) on delete set null;
alter table public.moderation_reports add column if not exists target_type text;
alter table public.moderation_reports add column if not exists target_id uuid;
alter table public.moderation_reports add column if not exists reason text;
alter table public.moderation_reports add column if not exists details text;
alter table public.moderation_reports add column if not exists status text not null default 'open';
alter table public.moderation_reports add column if not exists created_at timestamptz not null default now();

create table if not exists public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.lost_reports(id) on delete cascade,
  pet_id uuid references public.pets(id) on delete set null,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  requester_id uuid not null references public.profiles(id) on delete cascade,
  requester_name text not null,
  reason text not null,
  message text,
  status text not null default 'pendiente',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.contact_requests add column if not exists report_id uuid references public.lost_reports(id) on delete cascade;
alter table public.contact_requests add column if not exists pet_id uuid references public.pets(id) on delete set null;
alter table public.contact_requests add column if not exists owner_id uuid references public.profiles(id) on delete cascade;
alter table public.contact_requests add column if not exists requester_id uuid references public.profiles(id) on delete cascade;
alter table public.contact_requests add column if not exists requester_name text;
alter table public.contact_requests add column if not exists reason text;
alter table public.contact_requests add column if not exists message text;
alter table public.contact_requests add column if not exists status text not null default 'pendiente';
alter table public.contact_requests add column if not exists created_at timestamptz not null default now();
alter table public.contact_requests add column if not exists updated_at timestamptz not null default now();

create table if not exists public.reunion_stories (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null,
  report_id uuid references public.lost_reports(id) on delete set null,
  pet_id uuid references public.pets(id) on delete set null,
  owner_id uuid references public.profiles(id) on delete set null,
  photo_url text,
  story text,
  reunited_at timestamptz not null default now(),
  search_duration_days integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.reunion_stories add column if not exists case_id uuid;
alter table public.reunion_stories add column if not exists report_id uuid references public.lost_reports(id) on delete set null;
alter table public.reunion_stories add column if not exists pet_id uuid references public.pets(id) on delete set null;
alter table public.reunion_stories add column if not exists owner_id uuid references public.profiles(id) on delete set null;
alter table public.reunion_stories add column if not exists photo_url text;
alter table public.reunion_stories add column if not exists story text;
alter table public.reunion_stories add column if not exists reunited_at timestamptz not null default now();
alter table public.reunion_stories add column if not exists search_duration_days integer;
alter table public.reunion_stories add column if not exists created_at timestamptz not null default now();
alter table public.reunion_stories add column if not exists updated_at timestamptz not null default now();

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  report_id uuid references public.lost_reports(id) on delete cascade,
  pet_id uuid references public.pets(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint favorites_target_check check (report_id is not null or pet_id is not null)
);

alter table public.favorites add column if not exists user_id uuid references public.profiles(id) on delete cascade;
alter table public.favorites add column if not exists report_id uuid references public.lost_reports(id) on delete cascade;
alter table public.favorites add column if not exists pet_id uuid references public.pets(id) on delete cascade;
alter table public.favorites add column if not exists created_at timestamptz not null default now();

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  report_id uuid references public.lost_reports(id) on delete cascade,
  pet_id uuid references public.pets(id) on delete cascade,
  body text not null,
  is_private boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comments_target_check check (report_id is not null or pet_id is not null)
);

alter table public.comments add column if not exists user_id uuid references public.profiles(id) on delete set null;
alter table public.comments add column if not exists report_id uuid references public.lost_reports(id) on delete cascade;
alter table public.comments add column if not exists pet_id uuid references public.pets(id) on delete cascade;
alter table public.comments add column if not exists body text;
alter table public.comments add column if not exists is_private boolean not null default false;
alter table public.comments add column if not exists created_at timestamptz not null default now();
alter table public.comments add column if not exists updated_at timestamptz not null default now();

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  tipo text not null,
  comentario text not null,
  screenshot_url text,
  app_version text,
  created_at timestamptz not null default now()
);

alter table public.feedback add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.feedback add column if not exists tipo text;
alter table public.feedback add column if not exists comentario text;
alter table public.feedback add column if not exists screenshot_url text;
alter table public.feedback add column if not exists app_version text;
alter table public.feedback add column if not exists created_at timestamptz not null default now();

create or replace view public.pet_reports
with (security_invoker = true)
as
select * from public.lost_reports;

create index if not exists pets_owner_id_idx on public.pets(owner_id);
create index if not exists pets_user_id_idx on public.pets(user_id);
create index if not exists pets_public_species_idx on public.pets(is_public, especie, tamano);
create index if not exists pet_private_details_owner_id_idx on public.pet_private_details(owner_id);
create index if not exists lost_reports_owner_id_idx on public.lost_reports(owner_id);
create index if not exists lost_reports_pet_id_idx on public.lost_reports(pet_id);
create index if not exists lost_reports_public_status_district_idx on public.lost_reports(is_public, status, district, created_at desc);
create index if not exists lost_reports_location_idx on public.lost_reports(latitude, longitude);
create index if not exists sightings_report_id_idx on public.sightings(report_id, created_at desc);
create index if not exists sightings_pet_id_idx on public.sightings(pet_id, created_at desc);
create index if not exists sightings_reporter_id_idx on public.sightings(reporter_id, created_at desc);
create index if not exists sightings_location_idx on public.sightings(latitude, longitude);
create index if not exists notifications_user_id_idx on public.notifications(user_id, read_at, created_at desc);
create index if not exists contact_requests_report_id_idx on public.contact_requests(report_id, created_at desc);
create index if not exists contact_requests_owner_status_idx on public.contact_requests(owner_id, status, created_at desc);
create index if not exists contact_requests_requester_idx on public.contact_requests(requester_id, created_at desc);
create unique index if not exists contact_requests_unique_pending_idx on public.contact_requests(report_id, requester_id) where status = 'pendiente';
create unique index if not exists reunion_stories_case_id_idx on public.reunion_stories(case_id);
create index if not exists reunion_stories_report_id_idx on public.reunion_stories(report_id);
create index if not exists matches_report_id_idx on public.matches(report_id, score desc);
create unique index if not exists matches_report_sighting_idx on public.matches(report_id, sighting_id);
create unique index if not exists favorites_user_report_idx on public.favorites(user_id, report_id) where report_id is not null;
create unique index if not exists favorites_user_pet_idx on public.favorites(user_id, pet_id) where pet_id is not null;

alter table public.profiles enable row level security;
alter table public.pets enable row level security;
alter table public.pet_private_details enable row level security;
alter table public.lost_reports enable row level security;
alter table public.report_private_contacts enable row level security;
alter table public.sightings enable row level security;
alter table public.report_images enable row level security;
alter table public.matches enable row level security;
alter table public.notifications enable row level security;
alter table public.user_settings enable row level security;
alter table public.moderation_reports enable row level security;
alter table public.contact_requests enable row level security;
alter table public.reunion_stories enable row level security;
alter table public.favorites enable row level security;
alter table public.comments enable row level security;
alter table public.feedback enable row level security;

grant select on public.pet_reports to anon, authenticated;
grant select on public.profiles to authenticated;
grant insert, update on public.profiles to authenticated;
grant select on public.pets, public.lost_reports, public.sightings, public.report_images, public.matches, public.reunion_stories to anon, authenticated;
grant insert, update, delete on public.pets, public.lost_reports, public.sightings, public.report_images, public.matches, public.reunion_stories to authenticated;
grant select, insert, update, delete on public.pet_private_details, public.report_private_contacts, public.notifications, public.user_settings, public.contact_requests, public.favorites, public.comments to authenticated;
grant insert, select on public.moderation_reports to authenticated;
grant insert on public.feedback to anon, authenticated;
grant select on public.feedback to authenticated;

do $$
declare
  pol record;
begin
  for pol in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'profiles',
        'pets',
        'pet_private_details',
        'lost_reports',
        'report_private_contacts',
        'sightings',
        'report_images',
        'matches',
        'notifications',
        'user_settings',
        'moderation_reports',
        'contact_requests',
        'reunion_stories',
        'favorites',
        'comments',
        'feedback'
      )
  loop
    execute format('drop policy if exists %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  end loop;
end $$;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "pets_select_public_or_owner" on public.pets;
drop policy if exists "pets_insert_owner" on public.pets;
drop policy if exists "pets_update_owner" on public.pets;
drop policy if exists "pets_delete_owner" on public.pets;
create policy "pets_select_public_or_owner" on public.pets for select using (is_public or auth.uid() = owner_id or auth.uid() = user_id);
create policy "pets_insert_owner" on public.pets for insert to authenticated with check (auth.uid() = owner_id and auth.uid() = user_id);
create policy "pets_update_owner" on public.pets for update to authenticated using (auth.uid() = owner_id or auth.uid() = user_id) with check (auth.uid() = owner_id and auth.uid() = user_id);
create policy "pets_delete_owner" on public.pets for delete to authenticated using (auth.uid() = owner_id or auth.uid() = user_id);

drop policy if exists "pet_private_details_select_owner" on public.pet_private_details;
drop policy if exists "pet_private_details_insert_owner" on public.pet_private_details;
drop policy if exists "pet_private_details_update_owner" on public.pet_private_details;
drop policy if exists "pet_private_details_delete_owner" on public.pet_private_details;
create policy "pet_private_details_select_owner" on public.pet_private_details for select to authenticated using (auth.uid() = owner_id);
create policy "pet_private_details_insert_owner" on public.pet_private_details for insert to authenticated with check (auth.uid() = owner_id and exists (select 1 from public.pets p where p.id = pet_private_details.pet_id and (p.owner_id = auth.uid() or p.user_id = auth.uid())));
create policy "pet_private_details_update_owner" on public.pet_private_details for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id and exists (select 1 from public.pets p where p.id = pet_private_details.pet_id and (p.owner_id = auth.uid() or p.user_id = auth.uid())));
create policy "pet_private_details_delete_owner" on public.pet_private_details for delete to authenticated using (auth.uid() = owner_id);

drop policy if exists "lost_reports_select_public_or_owner" on public.lost_reports;
drop policy if exists "lost_reports_insert_owner" on public.lost_reports;
drop policy if exists "lost_reports_update_owner" on public.lost_reports;
drop policy if exists "lost_reports_delete_owner" on public.lost_reports;
create policy "lost_reports_select_public_or_owner" on public.lost_reports for select using (is_public or auth.uid() = owner_id);
create policy "lost_reports_insert_owner" on public.lost_reports for insert to authenticated with check (auth.uid() = owner_id and exists (select 1 from public.pets p where p.id = lost_reports.pet_id and (p.owner_id = auth.uid() or p.user_id = auth.uid())));
create policy "lost_reports_update_owner" on public.lost_reports for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "lost_reports_delete_owner" on public.lost_reports for delete to authenticated using (auth.uid() = owner_id);

drop policy if exists "report_private_contacts_select_owner" on public.report_private_contacts;
drop policy if exists "report_private_contacts_insert_owner" on public.report_private_contacts;
drop policy if exists "report_private_contacts_update_owner" on public.report_private_contacts;
drop policy if exists "report_private_contacts_delete_owner" on public.report_private_contacts;
create policy "report_private_contacts_select_owner" on public.report_private_contacts for select to authenticated using (auth.uid() = owner_id);
create policy "report_private_contacts_insert_owner" on public.report_private_contacts for insert to authenticated with check (auth.uid() = owner_id and exists (select 1 from public.lost_reports lr where lr.id = report_private_contacts.report_id and lr.owner_id = auth.uid()));
create policy "report_private_contacts_update_owner" on public.report_private_contacts for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id and exists (select 1 from public.lost_reports lr where lr.id = report_private_contacts.report_id and lr.owner_id = auth.uid()));
create policy "report_private_contacts_delete_owner" on public.report_private_contacts for delete to authenticated using (auth.uid() = owner_id);

drop policy if exists "sightings_select_public" on public.sightings;
drop policy if exists "sightings_insert_public_or_auth" on public.sightings;
drop policy if exists "sightings_update_report_owner" on public.sightings;
drop policy if exists "sightings_delete_reporter_or_report_owner" on public.sightings;
create policy "sightings_select_public" on public.sightings for select using (true);
create policy "sightings_insert_public_or_auth" on public.sightings for insert to authenticated with check (report_id is null or exists (select 1 from public.lost_reports lr where lr.id = sightings.report_id and lr.is_public));
create policy "sightings_update_report_owner" on public.sightings for update to authenticated using (reporter_id = auth.uid() or exists (select 1 from public.lost_reports lr where lr.id = sightings.report_id and lr.owner_id = auth.uid())) with check (reporter_id = auth.uid() or exists (select 1 from public.lost_reports lr where lr.id = sightings.report_id and lr.owner_id = auth.uid()));
create policy "sightings_delete_reporter_or_report_owner" on public.sightings for delete to authenticated using (reporter_id = auth.uid() or exists (select 1 from public.lost_reports lr where lr.id = sightings.report_id and lr.owner_id = auth.uid()));

drop policy if exists "report_images_select_public" on public.report_images;
drop policy if exists "report_images_insert_owner" on public.report_images;
drop policy if exists "report_images_delete_owner" on public.report_images;
create policy "report_images_select_public" on public.report_images for select using (auth.uid() = owner_id or exists (select 1 from public.lost_reports lr where lr.id = report_images.report_id and (lr.is_public or lr.owner_id = auth.uid())) or exists (select 1 from public.pets p where p.id = report_images.pet_id and (p.is_public or p.owner_id = auth.uid() or p.user_id = auth.uid())));
create policy "report_images_insert_owner" on public.report_images for insert to authenticated with check (auth.uid() = owner_id);
create policy "report_images_delete_owner" on public.report_images for delete to authenticated using (auth.uid() = owner_id);

drop policy if exists "matches_select_report_owner" on public.matches;
drop policy if exists "matches_insert_report_owner" on public.matches;
drop policy if exists "matches_update_report_owner" on public.matches;
create policy "matches_select_report_owner" on public.matches for select using (exists (select 1 from public.lost_reports lr where lr.id = matches.report_id and (lr.is_public or lr.owner_id = auth.uid())));
create policy "matches_insert_report_owner" on public.matches for insert to authenticated with check (exists (select 1 from public.lost_reports lr where lr.id = matches.report_id and lr.owner_id = auth.uid()));
create policy "matches_update_report_owner" on public.matches for update to authenticated using (exists (select 1 from public.lost_reports lr where lr.id = matches.report_id and lr.owner_id = auth.uid())) with check (exists (select 1 from public.lost_reports lr where lr.id = matches.report_id and lr.owner_id = auth.uid()));

drop policy if exists "notifications_select_own" on public.notifications;
drop policy if exists "notifications_insert_own" on public.notifications;
drop policy if exists "notifications_update_own" on public.notifications;
drop policy if exists "notifications_delete_own" on public.notifications;
create policy "notifications_select_own" on public.notifications for select to authenticated using (auth.uid() = user_id);
create policy "notifications_insert_own" on public.notifications for insert to authenticated with check (auth.uid() = user_id);
create policy "notifications_update_own" on public.notifications for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notifications_delete_own" on public.notifications for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "user_settings_select_own" on public.user_settings;
drop policy if exists "user_settings_insert_own" on public.user_settings;
drop policy if exists "user_settings_update_own" on public.user_settings;
create policy "user_settings_select_own" on public.user_settings for select to authenticated using (auth.uid() = user_id);
create policy "user_settings_insert_own" on public.user_settings for insert to authenticated with check (auth.uid() = user_id);
create policy "user_settings_update_own" on public.user_settings for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "moderation_reports_insert_anyone" on public.moderation_reports;
drop policy if exists "moderation_reports_select_own" on public.moderation_reports;
create policy "moderation_reports_insert_anyone" on public.moderation_reports for insert to authenticated with check (status = 'open' and (reporter_id is null or reporter_id = auth.uid()));
create policy "moderation_reports_select_own" on public.moderation_reports for select to authenticated using (auth.uid() = reporter_id);

drop policy if exists "contact_requests_select_participants" on public.contact_requests;
drop policy if exists "contact_requests_insert_requester" on public.contact_requests;
drop policy if exists "contact_requests_update_owner" on public.contact_requests;
create policy "contact_requests_select_participants" on public.contact_requests for select to authenticated using (auth.uid() = owner_id or auth.uid() = requester_id);
create policy "contact_requests_insert_requester" on public.contact_requests for insert to authenticated with check (auth.uid() = requester_id and status = 'pendiente' and exists (select 1 from public.lost_reports report where report.id = contact_requests.report_id and report.owner_id = contact_requests.owner_id and report.status = 'active' and report.is_public = true));
create policy "contact_requests_update_owner" on public.contact_requests for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id and status in ('autorizada', 'rechazada'));

drop policy if exists "reunion_stories_select_public" on public.reunion_stories;
drop policy if exists "reunion_stories_insert_owner" on public.reunion_stories;
drop policy if exists "reunion_stories_update_owner" on public.reunion_stories;
drop policy if exists "reunion_stories_delete_owner" on public.reunion_stories;
create policy "reunion_stories_select_public" on public.reunion_stories for select using (true);
create policy "reunion_stories_insert_owner" on public.reunion_stories for insert to authenticated with check (auth.uid() = owner_id and (report_id is null or exists (select 1 from public.lost_reports report where report.id = reunion_stories.report_id and report.owner_id = auth.uid())));
create policy "reunion_stories_update_owner" on public.reunion_stories for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "reunion_stories_delete_owner" on public.reunion_stories for delete to authenticated using (auth.uid() = owner_id);

drop policy if exists "favorites_select_own" on public.favorites;
drop policy if exists "favorites_insert_own" on public.favorites;
drop policy if exists "favorites_delete_own" on public.favorites;
create policy "favorites_select_own" on public.favorites for select to authenticated using (auth.uid() = user_id);
create policy "favorites_insert_own" on public.favorites for insert to authenticated with check (auth.uid() = user_id);
create policy "favorites_delete_own" on public.favorites for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "comments_select_public_or_owner" on public.comments;
drop policy if exists "comments_insert_own" on public.comments;
drop policy if exists "comments_update_own" on public.comments;
drop policy if exists "comments_delete_own" on public.comments;
create policy "comments_select_public_or_owner" on public.comments for select using (not is_private or auth.uid() = user_id);
create policy "comments_insert_own" on public.comments for insert to authenticated with check (auth.uid() = user_id);
create policy "comments_update_own" on public.comments for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "comments_delete_own" on public.comments for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "feedback_insert_authenticated" on public.feedback;
drop policy if exists "feedback_select_own" on public.feedback;
create policy "feedback_insert_authenticated" on public.feedback for insert with check (auth.uid() = user_id or (tipo = 'Error' and user_id is null));
create policy "feedback_select_own" on public.feedback for select to authenticated using (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pet-photos', 'pet-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = true,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "pet_photos_public_read" on storage.objects;
drop policy if exists "pet_photos_authenticated_upload" on storage.objects;
drop policy if exists "pet_photos_owner_update" on storage.objects;
drop policy if exists "pet_photos_owner_delete" on storage.objects;
create policy "pet_photos_public_read" on storage.objects for select using (bucket_id = 'pet-photos');
create policy "pet_photos_authenticated_upload" on storage.objects for insert to authenticated with check (bucket_id = 'pet-photos');
create policy "pet_photos_owner_update" on storage.objects for update to authenticated using (bucket_id = 'pet-photos' and owner = auth.uid()) with check (bucket_id = 'pet-photos' and owner = auth.uid());
create policy "pet_photos_owner_delete" on storage.objects for delete to authenticated using (bucket_id = 'pet-photos' and owner = auth.uid());

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url, created_at, updated_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    now(),
    now()
  )
  on conflict (id) do update
  set display_name = coalesce(excluded.display_name, public.profiles.display_name),
      avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
      updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function public.handle_new_user_profile();

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
  set display_name = coalesce(excluded.display_name, public.profiles.display_name),
      avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
      updated_at = now();

  return current_user_id;
end;
$$;

grant execute on function public.ensure_current_profile() to authenticated;

insert into public.profiles (id, display_name, avatar_url, created_at, updated_at)
select
  users.id,
  coalesce(users.raw_user_meta_data->>'full_name', users.raw_user_meta_data->>'name', split_part(users.email, '@', 1)),
  users.raw_user_meta_data->>'avatar_url',
  coalesce(users.created_at, now()),
  now()
from auth.users users
on conflict (id) do update
set display_name = coalesce(excluded.display_name, public.profiles.display_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    updated_at = now();
