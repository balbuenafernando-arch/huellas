-- Huella MVP - Supabase schema
create extension if not exists "pgcrypto";

create table if not exists public.pets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  nombre text not null,
  alias text,
  especie text,
  tipo text,
  raza text,
  tamano text,
  color text,
  sexo text,
  edad text,
  salud text,
  esterilizado boolean default false,
  placa_medalla text,
  telefono text,
  contacto_preferido text,
  rasgo_privado text,
  foto_url text,
  descripcion text,
  estado text check (estado in ('perdido', 'encontrado', 'reunido')),
  distrito text,
  direccion text,
  latitud decimal,
  longitud decimal,
  whatsapp text,
  foto_principal text,
  recompensa_ofrecida boolean default false,
  recompensa_monto decimal,
  fotos text[] default '{}',
  caracteristicas text[] default '{}',
  caracteristicas_personalizadas text,
  condiciones_especiales text[] default '{}',
  alias text[] default '{}',
  cerrado_en timestamp with time zone,
  owner_token text,
  fecha_reporte timestamp with time zone default now(),
  created_at timestamp with time zone default now(),
  creado_en timestamp with time zone default now()
);

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
  views_count integer default 0,
  reunited_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  fecha_reporte timestamp with time zone default now()
);

create table if not exists public.sightings (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid references public.pets(id) on delete cascade,
  report_id uuid references public.reports(id) on delete cascade,
  especie text,
  tamano text,
  color text,
  distrito text,
  comentario text not null,
  foto text,
  latitud decimal,
  longitud decimal,
  ubicacion text,
  estado text default 'pendiente' check (estado in ('pendiente', 'confirmado', 'descartado')),
  estado_avistamiento text default 'pendiente' check (estado_avistamiento in ('pendiente', 'confirmado', 'descartado')),
  estado_revision text default 'por_revisar' check (estado_revision in ('por_revisar', 'posible_coincidencia', 'no_era', 'alerta_falsa', 'informacion_enganosa', 'encontrada')),
  situacion text,
  llevaba_placa text,
  nombre_observado text,
  feedback_reportero text,
  visto_en timestamp with time zone,
  owner_token text,
  creado_en timestamp with time zone default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid references public.pets(id) on delete cascade,
  tipo text not null,
  mensaje text not null,
  leido boolean default false,
  creado_en timestamp with time zone default now()
);

create table if not exists public.volunteers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  latitude decimal,
  longitude decimal,
  activo boolean default true,
  created_at timestamp with time zone default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.reports(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  mensaje text not null,
  created_at timestamp with time zone default now()
);

create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('pet', 'sighting')),
  target_id uuid not null,
  motivo text not null check (motivo in ('spam', 'informacion_falsa', 'foto_incorrecta', 'broma')),
  detalle text,
  creado_en timestamp with time zone default now()
);

alter table public.pets enable row level security;
alter table public.reports enable row level security;
alter table public.sightings enable row level security;
alter table public.notifications enable row level security;
alter table public.content_reports enable row level security;

create policy "Public read pets" on public.pets for select using (true);
create policy "Public insert pets" on public.pets for insert with check (true);
create policy "Public update pet status" on public.pets for update using (true) with check (estado in ('perdido', 'encontrado', 'reunido'));
create policy "Public delete pets" on public.pets for delete using (true);

create policy "Public read active reports" on public.reports for select using (estado = 'activo' or auth.uid() = user_id);
create policy "Owners insert reports" on public.reports for insert with check (auth.uid() = user_id);
create policy "Owners update reports" on public.reports for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Owners delete reports" on public.reports for delete using (auth.uid() = user_id);

create policy "Public read sightings" on public.sightings for select using (true);
create policy "Public insert sightings" on public.sightings for insert with check (true);
create policy "Public update sightings" on public.sightings for update using (true) with check (estado in ('pendiente', 'confirmado', 'descartado'));
create policy "Public delete sightings" on public.sightings for delete using (true);

create policy "Public read notifications" on public.notifications for select using (true);
create policy "Public insert notifications" on public.notifications for insert with check (true);
create policy "Public update notifications" on public.notifications for update using (true);

create policy "Public insert content reports" on public.content_reports for insert with check (true);

insert into storage.buckets (id, name, public)
values ('pets', 'pets', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values ('mascotas', 'mascotas', true)
on conflict (id) do update set public = true;

create policy "Public read pet photos" on storage.objects for select using (bucket_id = 'pets');
create policy "Public upload pet photos" on storage.objects for insert with check (bucket_id = 'pets');
create policy "Public read mascotas photos" on storage.objects for select using (bucket_id = 'mascotas');
create policy "Authenticated upload mascotas photos" on storage.objects for insert with check (bucket_id = 'mascotas' and auth.role() = 'authenticated');
