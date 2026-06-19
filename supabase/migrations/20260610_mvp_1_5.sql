alter table public.sightings
  add column if not exists estado_revision text default 'por_revisar';

update public.sightings
set estado_revision = coalesce(estado_revision, 'por_revisar');

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
