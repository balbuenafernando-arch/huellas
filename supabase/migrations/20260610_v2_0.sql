alter table public.pets
  add column if not exists alias text,
  add column if not exists tamano text,
  add column if not exists salud text,
  add column if not exists esterilizado boolean default false,
  add column if not exists placa_medalla text,
  add column if not exists telefono text,
  add column if not exists contacto_preferido text,
  add column if not exists rasgo_privado text;

alter table public.sightings
  add column if not exists especie text,
  add column if not exists tamano text,
  add column if not exists color text,
  add column if not exists distrito text;

do $$
begin
  alter table public.content_reports drop constraint if exists content_reports_motivo_check;
  alter table public.content_reports
    add constraint content_reports_motivo_check
    check (motivo in ('spam', 'informacion_falsa', 'foto_incorrecta', 'broma'));
end $$;
