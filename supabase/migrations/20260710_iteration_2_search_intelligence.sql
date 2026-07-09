-- HUELLA Iteracion 2 - inteligencia de busqueda y geolocalizacion
-- Extiende la arquitectura centrada en casos sin duplicar mascotas, reportes ni avistamientos.

alter table public.cases
  add column if not exists last_sighting_at timestamptz,
  add column if not exists last_activity_at timestamptz default now(),
  add column if not exists probable_zone jsonb default '{}'::jsonb,
  add column if not exists movement_direction text,
  add column if not exists search_radius_km integer default 10 check (search_radius_km in (1, 3, 5, 10, 20)),
  add column if not exists urgency text default 'normal' check (urgency in ('normal', 'alta')),
  add column if not exists follower_count integer not null default 0 check (follower_count >= 0);

alter table public.case_matches
  add column if not exists percentage integer not null default 0 check (percentage between 0 and 100),
  add column if not exists level text not null default 'baja' check (level in ('alta', 'media', 'baja')),
  add column if not exists distance_km numeric,
  add column if not exists algorithm_version text not null default 'v2-attributes-distance-time';

alter table public.sightings
  add column if not exists movement_direction text,
  add column if not exists structured_action text check (
    structured_action is null
    or structured_action in ('solo_la_vi', 'la_tengo_conmigo', 'herida', 'siguiendo', 'otra_mascota')
  );

create table if not exists public.case_followers (
  case_id uuid references public.cases(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (case_id, user_id)
);

create table if not exists public.allies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 160),
  ally_type text not null check (ally_type in ('veterinaria', 'municipalidad', 'albergue', 'rescatista', 'asociacion', 'tienda')),
  district text not null check (char_length(district) between 1 and 120),
  latitude double precision check (latitude is null or latitude between -90 and 90),
  longitude double precision check (longitude is null or longitude between -180 and 180),
  phone text check (phone is null or char_length(phone) <= 40),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists cases_active_geo_idx on public.cases(status, latitude, longitude, updated_at desc);
create index if not exists cases_last_activity_idx on public.cases(last_activity_at desc);
create index if not exists cases_last_sighting_idx on public.cases(last_sighting_at desc);
create index if not exists sightings_case_geo_time_idx on public.sightings(case_id, latitude, longitude, observed_at desc);
create index if not exists case_matches_probability_idx on public.case_matches(level, percentage desc, created_at desc);
create index if not exists allies_geo_idx on public.allies(is_active, ally_type, district, latitude, longitude);

alter table public.case_followers enable row level security;
alter table public.allies enable row level security;

create policy "case_followers_select_own" on public.case_followers for select using (auth.uid() = user_id);
create policy "case_followers_insert_own" on public.case_followers for insert with check (auth.uid() = user_id);
create policy "case_followers_delete_own" on public.case_followers for delete using (auth.uid() = user_id);

create policy "allies_public_read_active" on public.allies for select using (is_active);
