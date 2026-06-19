alter table public.reports
  add column if not exists views_count integer default 0,
  add column if not exists reunited_at timestamp with time zone;

alter table public.sightings
  add column if not exists situacion text,
  add column if not exists feedback_reportero text;
