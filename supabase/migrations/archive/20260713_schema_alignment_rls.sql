-- HUELLA hotfix - alinea el esquema usado por la app y repara RLS de registros propios.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) <= 80),
  phone text check (phone is null or char_length(phone) <= 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, created_at, updated_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    now(),
    now()
  )
  on conflict (id) do update
  set display_name = coalesce(excluded.display_name, public.profiles.display_name),
      updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

insert into public.profiles (id, display_name, created_at, updated_at)
select id, coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email, '@', 1)), now(), now()
from auth.users
on conflict (id) do nothing;

create table if not exists public.pets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  nombre text not null check (char_length(nombre) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pets add column if not exists owner_id uuid references public.profiles(id) on delete cascade;
alter table public.pets add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.pets add column if not exists alias text check (alias is null or char_length(alias) <= 160);
alter table public.pets add column if not exists especie text check (especie is null or char_length(especie) <= 60);
alter table public.pets add column if not exists tipo text check (tipo is null or char_length(tipo) <= 60);
alter table public.pets add column if not exists raza text check (raza is null or char_length(raza) <= 120);
alter table public.pets add column if not exists tamano text check (tamano is null or char_length(tamano) <= 60);
alter table public.pets add column if not exists color text check (color is null or char_length(color) <= 120);
alter table public.pets add column if not exists sexo text check (sexo is null or char_length(sexo) <= 60);
alter table public.pets add column if not exists edad text check (edad is null or char_length(edad) <= 80);
alter table public.pets add column if not exists salud text check (salud is null or char_length(salud) <= 500);
alter table public.pets add column if not exists esterilizado boolean default false;
alter table public.pets add column if not exists placa_medalla text check (placa_medalla is null or char_length(placa_medalla) <= 120);
alter table public.pets add column if not exists contacto_preferido text check (contacto_preferido is null or contacto_preferido in ('whatsapp', 'telefono', 'ambos'));
alter table public.pets add column if not exists foto_url text;
alter table public.pets add column if not exists foto_principal text;
alter table public.pets add column if not exists fotos text[] default '{}';
alter table public.pets add column if not exists caracteristicas text[] default '{}';
alter table public.pets add column if not exists caracteristicas_personalizadas text check (caracteristicas_personalizadas is null or char_length(caracteristicas_personalizadas) <= 500);
alter table public.pets add column if not exists condiciones_especiales text[] default '{}';
alter table public.pets add column if not exists is_public boolean not null default false;
alter table public.pets add column if not exists updated_at timestamptz not null default now();

create table if not exists public.pet_private_details (
  pet_id uuid primary key references public.pets(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  telefono text check (telefono is null or char_length(telefono) <= 40),
  rasgo_privado text check (rasgo_privado is null or char_length(rasgo_privado) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'pets' and column_name = 'telefono') then
    execute 'insert into public.pet_private_details (pet_id, owner_id, telefono, updated_at)
      select id, coalesce(owner_id, user_id), telefono, now()
      from public.pets
      where telefono is not null and coalesce(owner_id, user_id) is not null
      on conflict (pet_id) do update set telefono = excluded.telefono, updated_at = now()';
    execute 'alter table public.pets drop column if exists telefono';
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'pets' and column_name = 'rasgo_privado') then
    execute 'insert into public.pet_private_details (pet_id, owner_id, rasgo_privado, updated_at)
      select id, coalesce(owner_id, user_id), rasgo_privado, now()
      from public.pets
      where rasgo_privado is not null and coalesce(owner_id, user_id) is not null
      on conflict (pet_id) do update set rasgo_privado = excluded.rasgo_privado, updated_at = now()';
    execute 'alter table public.pets drop column if exists rasgo_privado';
  end if;
end $$;

create table if not exists public.lost_reports (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid references public.pets(id) on delete cascade,
  owner_id uuid references public.profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'reunited', 'archived')),
  district text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.lost_reports add column if not exists pet_id uuid references public.pets(id) on delete cascade;
alter table public.lost_reports add column if not exists owner_id uuid references public.profiles(id) on delete cascade;
alter table public.lost_reports add column if not exists status text not null default 'active' check (status in ('active', 'reunited', 'archived'));
alter table public.lost_reports add column if not exists district text not null default '';
alter table public.lost_reports add column if not exists approximate_address text check (approximate_address is null or char_length(approximate_address) <= 240);
alter table public.lost_reports add column if not exists description text check (description is null or char_length(description) <= 2000);
alter table public.lost_reports add column if not exists reward_text text check (reward_text is null or char_length(reward_text) <= 160);
alter table public.lost_reports add column if not exists latitude double precision check (latitude is null or latitude between -90 and 90);
alter table public.lost_reports add column if not exists longitude double precision check (longitude is null or longitude between -180 and 180);
alter table public.lost_reports add column if not exists lost_at timestamptz;
alter table public.lost_reports add column if not exists reunited_at timestamptz;
alter table public.lost_reports add column if not exists views_count integer not null default 0;
alter table public.lost_reports add column if not exists is_public boolean not null default true;
alter table public.lost_reports add column if not exists updated_at timestamptz not null default now();

create table if not exists public.report_private_contacts (
  report_id uuid primary key references public.lost_reports(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  contact_whatsapp text check (contact_whatsapp is null or char_length(contact_whatsapp) <= 40),
  contact_phone text check (contact_phone is null or char_length(contact_phone) <= 40),
  contact_email text check (contact_email is null or char_length(contact_email) <= 160),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create index if not exists pets_owner_id_idx on public.pets(owner_id);
create index if not exists pets_user_id_idx on public.pets(user_id);
create index if not exists pet_private_details_owner_id_idx on public.pet_private_details(owner_id);
create index if not exists lost_reports_owner_id_idx on public.lost_reports(owner_id);
create index if not exists lost_reports_pet_id_idx on public.lost_reports(pet_id);
create index if not exists notifications_user_id_idx on public.notifications(user_id, read_at, created_at desc);

alter table public.profiles enable row level security;
alter table public.pets enable row level security;
alter table public.pet_private_details enable row level security;
alter table public.lost_reports enable row level security;
alter table public.report_private_contacts enable row level security;
alter table public.notifications enable row level security;

do $$
declare pol record;
begin
  for pol in select schemaname, tablename, policyname from pg_policies where schemaname = 'public' and tablename in ('profiles', 'pets', 'pet_private_details', 'lost_reports', 'report_private_contacts', 'notifications')
  loop
    execute format('drop policy if exists %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  end loop;
end $$;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "pets_select_public_or_owner" on public.pets for select using (is_public or auth.uid() = owner_id or auth.uid() = user_id);
create policy "pets_insert_owner" on public.pets for insert with check (auth.uid() = owner_id and auth.uid() = user_id);
create policy "pets_update_owner" on public.pets for update using (auth.uid() = owner_id or auth.uid() = user_id) with check (auth.uid() = owner_id and auth.uid() = user_id);
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

create policy "notifications_select_own" on public.notifications for select using (auth.uid() = user_id);
create policy "notifications_insert_own" on public.notifications for insert with check (auth.uid() = user_id);
create policy "notifications_update_own" on public.notifications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notifications_delete_own" on public.notifications for delete using (auth.uid() = user_id);
