alter table public.pets
  add column if not exists recompensa_ofrecida boolean default false,
  add column if not exists recompensa_monto decimal,
  add column if not exists fotos text[] default '{}',
  add column if not exists caracteristicas text[] default '{}',
  add column if not exists caracteristicas_personalizadas text,
  add column if not exists condiciones_especiales text[] default '{}',
  add column if not exists alias text[] default '{}',
  add column if not exists cerrado_en timestamp with time zone,
  add column if not exists owner_token text;

alter table public.sightings
  add column if not exists ubicacion text,
  add column if not exists estado text default 'pendiente',
  add column if not exists estado_avistamiento text default 'pendiente',
  add column if not exists visto_en timestamp with time zone,
  add column if not exists owner_token text;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid references public.pets(id) on delete cascade,
  tipo text not null,
  mensaje text not null,
  leido boolean default false,
  creado_en timestamp with time zone default now()
);

alter table public.notifications enable row level security;

drop policy if exists "Public update sightings" on public.sightings;
create policy "Public update sightings" on public.sightings for update using (true) with check (estado in ('pendiente', 'confirmado', 'descartado'));

drop policy if exists "Public delete sightings" on public.sightings;
create policy "Public delete sightings" on public.sightings for delete using (true);

drop policy if exists "Public delete pets" on public.pets;
create policy "Public delete pets" on public.pets for delete using (true);

drop policy if exists "Public read notifications" on public.notifications;
create policy "Public read notifications" on public.notifications for select using (true);

drop policy if exists "Public insert notifications" on public.notifications;
create policy "Public insert notifications" on public.notifications for insert with check (true);

drop policy if exists "Public update notifications" on public.notifications;
create policy "Public update notifications" on public.notifications for update using (true);
