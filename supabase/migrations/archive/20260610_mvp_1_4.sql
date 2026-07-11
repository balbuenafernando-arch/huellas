alter table public.pets
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists especie text,
  add column if not exists color text,
  add column if not exists sexo text,
  add column if not exists edad text,
  add column if not exists foto_url text,
  add column if not exists created_at timestamp with time zone default now();

alter table public.pets
  alter column tipo drop not null,
  alter column descripcion drop not null,
  alter column estado drop not null,
  alter column distrito drop not null,
  alter column direccion drop not null,
  alter column latitud drop not null,
  alter column longitud drop not null,
  alter column whatsapp drop not null;

drop policy if exists "Owners insert registered pets" on public.pets;
create policy "Owners insert registered pets" on public.pets for insert with check (auth.uid() = user_id or user_id is null);

drop policy if exists "Owners update registered pets" on public.pets;
create policy "Owners update registered pets" on public.pets for update using (auth.uid() = user_id or user_id is null) with check (auth.uid() = user_id or user_id is null);

drop policy if exists "Owners delete registered pets" on public.pets;
create policy "Owners delete registered pets" on public.pets for delete using (auth.uid() = user_id);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  pet_id uuid references public.pets(id) on delete set null,
  tipo_reporte text not null check (tipo_reporte in ('perdido', 'encontrado')),
  estado text not null default 'activo' check (estado in ('activo', 'reunido')),
  distrito text not null,
  descripcion text not null,
  foto_url text,
  whatsapp text,
  latitude decimal,
  longitude decimal,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  fecha_reporte timestamp with time zone default now()
);

alter table public.reports enable row level security;

drop policy if exists "Public read active reports" on public.reports;
create policy "Public read active reports" on public.reports for select using (estado = 'activo' or auth.uid() = user_id);

drop policy if exists "Owners insert reports" on public.reports;
create policy "Owners insert reports" on public.reports for insert with check (auth.uid() = user_id);

drop policy if exists "Owners update reports" on public.reports;
create policy "Owners update reports" on public.reports for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Owners delete reports" on public.reports;
create policy "Owners delete reports" on public.reports for delete using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('mascotas', 'mascotas', true)
on conflict (id) do update set public = true;

drop policy if exists "Public read mascotas photos" on storage.objects;
create policy "Public read mascotas photos" on storage.objects for select using (bucket_id = 'mascotas');

drop policy if exists "Authenticated upload mascotas photos" on storage.objects;
create policy "Authenticated upload mascotas photos" on storage.objects for insert with check (bucket_id = 'mascotas' and auth.role() = 'authenticated');
