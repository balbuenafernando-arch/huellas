-- HUELLA stabilization: public reporter labels for timeline and reports.

alter table public.lost_reports
  add column if not exists reporter_name text check (reporter_name is null or char_length(reporter_name) <= 120),
  add column if not exists reporter_is_anonymous boolean not null default false;

alter table public.sightings
  add column if not exists reporter_name text check (reporter_name is null or char_length(reporter_name) <= 120),
  add column if not exists reporter_is_anonymous boolean not null default false;
