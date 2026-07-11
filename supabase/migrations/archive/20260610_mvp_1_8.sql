alter table public.sightings
  alter column pet_id drop not null,
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
