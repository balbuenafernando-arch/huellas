alter table public.sightings
  add column if not exists llevaba_placa text,
  add column if not exists nombre_observado text;

do $$
begin
  alter table public.sightings drop constraint if exists sightings_estado_revision_check;
  alter table public.sightings
    add constraint sightings_estado_revision_check
    check (estado_revision in ('por_revisar', 'posible_coincidencia', 'no_era', 'alerta_falsa', 'informacion_enganosa', 'encontrada'));
end $$;

create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('pet', 'sighting')),
  target_id uuid not null,
  motivo text not null check (motivo in ('no_es_mascota', 'spam', 'informacion_falsa', 'contenido_ofensivo', 'otro')),
  detalle text,
  creado_en timestamp with time zone default now()
);

alter table public.content_reports enable row level security;

drop policy if exists "Public insert content reports" on public.content_reports;
create policy "Public insert content reports" on public.content_reports for insert with check (true);
