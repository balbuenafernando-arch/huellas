-- HUELLA Iteracion 1 - infraestructura Supabase de produccion
-- Migracion no destructiva. Prepara el modelo normalizado nuevo sin eliminar tablas legadas.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) <= 80),
  phone text check (phone is null or char_length(phone) <= 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  nombre text not null check (char_length(nombre) between 1 and 120),
  alias text check (alias is null or char_length(alias) <= 160),
  especie text check (especie is null or char_length(especie) <= 60),
  tipo text check (tipo is null or char_length(tipo) <= 60),
  raza text check (raza is null or char_length(raza) <= 120),
  tamano text check (tamano is null or char_length(tamano) <= 60),
  color text check (color is null or char_length(color) <= 120),
  sexo text check (sexo is null or char_length(sexo) <= 60),
  edad text check (edad is null or char_length(edad) <= 80),
  salud text check (salud is null or char_length(salud) <= 500),
  esterilizado boolean default false,
  placa_medalla text check (placa_medalla is null or char_length(placa_medalla) <= 120),
  contacto_preferido text check (contacto_preferido is null or contacto_preferido in ('whatsapp', 'telefono', 'ambos')),
  foto_url text,
  foto_principal text,
  fotos text[] default '{}',
  caracteristicas text[] default '{}',
  caracteristicas_personalizadas text check (caracteristicas_personalizadas is null or char_length(caracteristicas_personalizadas) <= 500),
  condiciones_especiales text[] default '{}',
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pet_private_details (
  pet_id uuid primary key references public.pets(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  telefono text check (telefono is null or char_length(telefono) <= 40),
  rasgo_privado text check (rasgo_privado is null or char_length(rasgo_privado) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lost_reports (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'reunited', 'archived')),
  district text not null check (char_length(district) between 1 and 120),
  approximate_address text check (approximate_address is null or char_length(approximate_address) <= 240),
  description text check (description is null or char_length(description) <= 2000),
  reward_text text check (reward_text is null or char_length(reward_text) <= 160),
  latitude double precision check (latitude is null or latitude between -90 and 90),
  longitude double precision check (longitude is null or longitude between -180 and 180),
  lost_at timestamptz,
  reunited_at timestamptz,
  views_count integer not null default 0,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.report_private_contacts (
  report_id uuid primary key references public.lost_reports(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  contact_whatsapp text check (contact_whatsapp is null or char_length(contact_whatsapp) <= 40),
  contact_phone text check (contact_phone is null or char_length(contact_phone) <= 40),
  contact_email text check (contact_email is null or char_length(contact_email) <= 160),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pets add column if not exists owner_id uuid references public.profiles(id) on delete cascade;
alter table public.pets add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.pets add column if not exists is_public boolean not null default false;
alter table public.pets add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'pets' and column_name = 'telefono'
  ) or exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'pets' and column_name = 'rasgo_privado'
  ) then
    execute $copy_pet_private$
      insert into public.pet_private_details (pet_id, owner_id, telefono, rasgo_privado)
      select id, owner_id, telefono, rasgo_privado
      from public.pets
      where owner_id is not null
        and (telefono is not null or rasgo_privado is not null)
      on conflict (pet_id) do update
      set telefono = excluded.telefono,
          rasgo_privado = excluded.rasgo_privado,
          updated_at = now()
    $copy_pet_private$;
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'lost_reports' and column_name = 'contact_whatsapp'
  ) then
    execute $copy_report_contacts$
      insert into public.report_private_contacts (report_id, owner_id, contact_whatsapp)
      select id, owner_id, contact_whatsapp
      from public.lost_reports
      where contact_whatsapp is not null
      on conflict (report_id) do update
      set contact_whatsapp = excluded.contact_whatsapp,
          updated_at = now()
    $copy_report_contacts$;
  end if;
end $$;

alter table public.pets drop column if exists telefono;
alter table public.pets drop column if exists rasgo_privado;
alter table public.lost_reports drop column if exists contact_whatsapp;

create table if not exists public.sightings (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.lost_reports(id) on delete cascade,
  pet_id uuid references public.pets(id) on delete set null,
  reporter_id uuid references public.profiles(id) on delete set null,
  especie text check (especie is null or char_length(especie) <= 60),
  tamano text check (tamano is null or char_length(tamano) <= 60),
  color text check (color is null or char_length(color) <= 120),
  district text check (district is null or char_length(district) <= 120),
  distrito text check (distrito is null or char_length(distrito) <= 120),
  approximate_address text check (approximate_address is null or char_length(approximate_address) <= 240),
  ubicacion text check (ubicacion is null or char_length(ubicacion) <= 240),
  description text check (description is null or char_length(description) <= 2000),
  comentario text check (comentario is null or char_length(comentario) <= 2000),
  photo_url text,
  foto text,
  latitude double precision check (latitude is null or latitude between -90 and 90),
  longitude double precision check (longitude is null or longitude between -180 and 180),
  latitud double precision check (latitud is null or latitud between -90 and 90),
  longitud double precision check (longitud is null or longitud between -180 and 180),
  observed_at timestamptz,
  visto_en timestamptz,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'dismissed')),
  estado text default 'pendiente',
  estado_avistamiento text default 'pendiente',
  estado_revision text default 'por_revisar',
  situacion text check (situacion is null or char_length(situacion) <= 80),
  owner_token text check (owner_token is null or char_length(owner_token) <= 160),
  creado_en timestamptz default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sightings add column if not exists report_id uuid;
alter table public.sightings add column if not exists pet_id uuid;
alter table public.sightings add column if not exists reporter_id uuid references public.profiles(id) on delete set null;
alter table public.sightings add column if not exists district text;
alter table public.sightings add column if not exists observed_at timestamptz;
alter table public.sightings add column if not exists latitude double precision;
alter table public.sightings add column if not exists longitude double precision;
alter table public.sightings add column if not exists status text not null default 'pending';
alter table public.sightings add column if not exists updated_at timestamptz not null default now();

create table if not exists public.report_images (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.lost_reports(id) on delete cascade,
  pet_id uuid references public.pets(id) on delete cascade,
  sighting_id uuid references public.sightings(id) on delete cascade,
  owner_id uuid references public.profiles(id) on delete cascade,
  bucket text not null default 'pet-photos',
  storage_path text not null,
  public_url text not null,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  file_size integer not null check (file_size > 0 and file_size <= 5242880),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  constraint report_images_owner_check check (report_id is not null or pet_id is not null or sighting_id is not null)
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.lost_reports(id) on delete cascade,
  sighting_id uuid references public.sightings(id) on delete cascade,
  score numeric not null default 0,
  reasons text[] not null default '{}',
  status text not null default 'suggested' check (status in ('suggested', 'accepted', 'dismissed')),
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  report_id uuid references public.lost_reports(id) on delete cascade,
  type text not null check (char_length(type) between 1 and 80),
  message text not null check (char_length(message) between 1 and 500),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.notifications add column if not exists user_id uuid references public.profiles(id) on delete cascade;
alter table public.notifications add column if not exists report_id uuid references public.lost_reports(id) on delete cascade;
alter table public.notifications add column if not exists type text;
alter table public.notifications add column if not exists message text;
alter table public.notifications add column if not exists read_at timestamptz;
alter table public.notifications add column if not exists created_at timestamptz not null default now();

create table if not exists public.user_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  notify_by_email boolean not null default false,
  notify_by_whatsapp boolean not null default false,
  approximate_location_only boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.moderation_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles(id) on delete set null,
  target_type text not null check (target_type in ('pet', 'lost_report', 'sighting')),
  target_id uuid not null,
  reason text not null check (char_length(reason) between 1 and 80),
  details text check (details is null or char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now()
);

create index if not exists pets_owner_id_idx on public.pets(owner_id);
create index if not exists pets_public_species_idx on public.pets(is_public, especie, tamano);
create index if not exists pet_private_details_owner_id_idx on public.pet_private_details(owner_id);
create index if not exists lost_reports_public_status_district_idx on public.lost_reports(is_public, status, district, created_at desc);
create index if not exists lost_reports_owner_id_idx on public.lost_reports(owner_id);
create index if not exists lost_reports_location_idx on public.lost_reports(latitude, longitude);
create index if not exists lost_reports_lost_at_idx on public.lost_reports(lost_at desc);
create index if not exists report_private_contacts_owner_id_idx on public.report_private_contacts(owner_id);
create index if not exists sightings_report_id_idx on public.sightings(report_id, created_at desc);
create index if not exists sightings_public_lookup_idx on public.sightings(district, observed_at desc);
create index if not exists sightings_location_idx on public.sightings(latitude, longitude);
create index if not exists report_images_report_id_idx on public.report_images(report_id, sort_order);
create unique index if not exists report_images_bucket_storage_path_idx on public.report_images(bucket, storage_path);
create index if not exists matches_report_id_idx on public.matches(report_id, score desc);
create unique index if not exists matches_report_sighting_idx on public.matches(report_id, sighting_id);
create index if not exists notifications_user_id_idx on public.notifications(user_id, read_at, created_at desc);

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

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "pets_select_public_or_owner" on public.pets for select using (is_public or auth.uid() = owner_id or auth.uid() = user_id);
create policy "pets_insert_owner" on public.pets for insert with check (auth.uid() = owner_id or auth.uid() = user_id);
create policy "pets_update_owner" on public.pets for update using (auth.uid() = owner_id or auth.uid() = user_id) with check (auth.uid() = owner_id or auth.uid() = user_id);
create policy "pets_delete_owner" on public.pets for delete using (auth.uid() = owner_id or auth.uid() = user_id);

create policy "pet_private_details_select_owner" on public.pet_private_details for select using (auth.uid() = owner_id);
create policy "pet_private_details_insert_owner" on public.pet_private_details for insert with check (
  auth.uid() = owner_id
  and exists (select 1 from public.pets p where p.id = pet_private_details.pet_id and (p.owner_id = auth.uid() or p.user_id = auth.uid()))
);
create policy "pet_private_details_update_owner" on public.pet_private_details for update using (auth.uid() = owner_id) with check (
  auth.uid() = owner_id
  and exists (select 1 from public.pets p where p.id = pet_private_details.pet_id and (p.owner_id = auth.uid() or p.user_id = auth.uid()))
);
create policy "pet_private_details_delete_owner" on public.pet_private_details for delete using (auth.uid() = owner_id);

create policy "lost_reports_select_public_or_owner" on public.lost_reports for select using (is_public or auth.uid() = owner_id);
create policy "lost_reports_insert_owner" on public.lost_reports for insert with check (auth.uid() = owner_id);
create policy "lost_reports_update_owner" on public.lost_reports for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "lost_reports_delete_owner" on public.lost_reports for delete using (auth.uid() = owner_id);

create policy "report_private_contacts_select_owner" on public.report_private_contacts for select using (auth.uid() = owner_id);
create policy "report_private_contacts_insert_owner" on public.report_private_contacts for insert with check (
  auth.uid() = owner_id
  and exists (select 1 from public.lost_reports lr where lr.id = report_private_contacts.report_id and lr.owner_id = auth.uid())
);
create policy "report_private_contacts_update_owner" on public.report_private_contacts for update using (auth.uid() = owner_id) with check (
  auth.uid() = owner_id
  and exists (select 1 from public.lost_reports lr where lr.id = report_private_contacts.report_id and lr.owner_id = auth.uid())
);
create policy "report_private_contacts_delete_owner" on public.report_private_contacts for delete using (auth.uid() = owner_id);

create policy "sightings_select_public" on public.sightings for select using (true);
create policy "sightings_insert_public_or_auth" on public.sightings for insert with check (
  report_id is null
  or exists (select 1 from public.lost_reports lr where lr.id = sightings.report_id and lr.is_public)
);
create policy "sightings_update_report_owner" on public.sightings for update using (
  exists (select 1 from public.lost_reports lr where lr.id = sightings.report_id and lr.owner_id = auth.uid())
  or reporter_id = auth.uid()
) with check (
  exists (select 1 from public.lost_reports lr where lr.id = sightings.report_id and lr.owner_id = auth.uid())
  or reporter_id = auth.uid()
);
create policy "sightings_delete_reporter_or_report_owner" on public.sightings for delete using (
  exists (select 1 from public.lost_reports lr where lr.id = sightings.report_id and lr.owner_id = auth.uid())
  or reporter_id = auth.uid()
);

create policy "report_images_select_public" on public.report_images for select using (
  auth.uid() = owner_id
  or exists (select 1 from public.lost_reports lr where lr.id = report_images.report_id and (lr.is_public or lr.owner_id = auth.uid()))
  or exists (select 1 from public.pets p where p.id = report_images.pet_id and (p.is_public or p.owner_id = auth.uid() or p.user_id = auth.uid()))
  or exists (
    select 1
    from public.sightings s
    left join public.lost_reports lr on lr.id = s.report_id
    where s.id = report_images.sighting_id
      and (s.report_id is null or lr.is_public or lr.owner_id = auth.uid())
  )
);
create policy "report_images_insert_owner" on public.report_images for insert with check (
  auth.uid() = owner_id
  and (
    (report_id is not null and exists (select 1 from public.lost_reports lr where lr.id = report_images.report_id and lr.owner_id = auth.uid()))
    or (pet_id is not null and exists (select 1 from public.pets p where p.id = report_images.pet_id and (p.owner_id = auth.uid() or p.user_id = auth.uid())))
    or (sighting_id is not null and exists (select 1 from public.sightings s where s.id = report_images.sighting_id and s.reporter_id = auth.uid()))
  )
);
create policy "report_images_delete_owner" on public.report_images for delete using (auth.uid() = owner_id);

create policy "matches_select_report_owner" on public.matches for select using (
  exists (select 1 from public.lost_reports lr where lr.id = matches.report_id and (lr.is_public or lr.owner_id = auth.uid()))
);
create policy "matches_insert_report_owner" on public.matches for insert with check (
  exists (select 1 from public.lost_reports lr where lr.id = matches.report_id and lr.owner_id = auth.uid())
);
create policy "matches_update_report_owner" on public.matches for update using (
  exists (select 1 from public.lost_reports lr where lr.id = matches.report_id and lr.owner_id = auth.uid())
);

create policy "notifications_select_own" on public.notifications for select using (auth.uid() = user_id);
create policy "notifications_update_own" on public.notifications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "user_settings_select_own" on public.user_settings for select using (auth.uid() = user_id);
create policy "user_settings_insert_own" on public.user_settings for insert with check (auth.uid() = user_id);
create policy "user_settings_update_own" on public.user_settings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "moderation_reports_insert_anyone" on public.moderation_reports for insert with check (status = 'open');
create policy "moderation_reports_select_own" on public.moderation_reports for select using (auth.uid() = reporter_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pet-photos', 'pet-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = true,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

create policy "pet_photos_public_read" on storage.objects for select using (bucket_id = 'pet-photos');
create policy "pet_photos_authenticated_upload" on storage.objects for insert with check (bucket_id = 'pet-photos' and auth.role() = 'authenticated');
create policy "pet_photos_owner_update" on storage.objects for update using (bucket_id = 'pet-photos' and owner = auth.uid()) with check (bucket_id = 'pet-photos' and owner = auth.uid());
create policy "pet_photos_owner_delete" on storage.objects for delete using (bucket_id = 'pet-photos' and owner = auth.uid());

create or replace function public.delete_report_image_object()
returns trigger
language plpgsql
security definer
set search_path = public, storage
as $$
begin
  delete from storage.objects
  where bucket_id = old.bucket
    and name = old.storage_path;
  return old;
end;
$$;

drop trigger if exists report_images_delete_object on public.report_images;
create trigger report_images_delete_object
before delete on public.report_images
for each row execute function public.delete_report_image_object();
