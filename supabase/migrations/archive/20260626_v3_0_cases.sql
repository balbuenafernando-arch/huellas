-- HUELLA v3.0 - Case-centered architecture
-- Non-destructive migration: keeps existing pets, reports and sightings tables.

create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid references public.pets(id) on delete set null,
  owner_id uuid references auth.users(id) on delete set null,
  source_report_id uuid references public.reports(id) on delete set null,
  status text not null default 'activo' check (status in ('activo', 'en_busqueda', 'bajo_seguimiento', 'encontrado', 'reunido', 'archivado')),
  district text not null,
  summary text,
  latitude decimal,
  longitude decimal,
  priority integer default 0,
  reunited_at timestamp with time zone,
  archived_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.sightings
add column if not exists case_id uuid references public.cases(id) on delete cascade;

alter table public.notifications
add column if not exists case_id uuid references public.cases(id) on delete cascade;

create table if not exists public.case_updates (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references public.cases(id) on delete cascade not null,
  actor_id uuid references auth.users(id) on delete set null,
  kind text not null check (kind in ('caso_creado', 'avistamiento_recibido', 'coincidencia_sugerida', 'comentario', 'cambio_estado', 'mascota_reunida')),
  title text not null,
  body text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now()
);

create table if not exists public.case_comments (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references public.cases(id) on delete cascade not null,
  actor_id uuid references auth.users(id) on delete set null,
  body text not null,
  is_private boolean default false,
  created_at timestamp with time zone default now()
);

create table if not exists public.case_matches (
  id uuid primary key default gen_random_uuid(),
  source_case_id uuid references public.cases(id) on delete cascade not null,
  target_case_id uuid references public.cases(id) on delete cascade not null,
  sighting_id uuid references public.sightings(id) on delete set null,
  score integer not null default 0,
  reasons text[] default '{}',
  status text not null default 'sugerida' check (status in ('sugerida', 'aceptada', 'descartada')),
  created_at timestamp with time zone default now(),
  unique (source_case_id, target_case_id, sighting_id)
);

create index if not exists cases_status_district_idx on public.cases (status, district);
create index if not exists cases_pet_id_idx on public.cases (pet_id);
create index if not exists sightings_case_id_idx on public.sightings (case_id);
create index if not exists case_updates_case_id_created_at_idx on public.case_updates (case_id, created_at desc);
create index if not exists case_matches_source_case_id_idx on public.case_matches (source_case_id);

alter table public.cases enable row level security;
alter table public.case_updates enable row level security;
alter table public.case_comments enable row level security;
alter table public.case_matches enable row level security;

create policy "Public read cases" on public.cases for select using (true);
create policy "Owners insert cases" on public.cases for insert with check (auth.uid() = owner_id);
create policy "Owners update cases" on public.cases for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "Public read case updates" on public.case_updates for select using (true);
create policy "Authenticated insert case updates" on public.case_updates for insert with check (auth.role() = 'authenticated');

create policy "Public read public case comments" on public.case_comments for select using (is_private = false or auth.uid() = actor_id);
create policy "Authenticated insert case comments" on public.case_comments for insert with check (auth.role() = 'authenticated');

create policy "Public read case matches" on public.case_matches for select using (true);
create policy "Authenticated insert case matches" on public.case_matches for insert with check (auth.role() = 'authenticated');
