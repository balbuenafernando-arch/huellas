alter table public.sightings
  add column if not exists report_id uuid references public.reports(id) on delete cascade;
