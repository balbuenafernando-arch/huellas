alter table public.pets
  add column if not exists condiciones_especiales text[] default '{}',
  add column if not exists alias text[] default '{}';

alter table public.sightings
  add column if not exists estado_avistamiento text default 'pendiente',
  add column if not exists visto_en timestamp with time zone,
  add column if not exists owner_token text;

update public.sightings
set estado_avistamiento = coalesce(estado_avistamiento, estado, 'pendiente'),
    visto_en = coalesce(visto_en, creado_en);

drop policy if exists "Public delete sightings" on public.sightings;
create policy "Public delete sightings" on public.sightings for delete using (true);
