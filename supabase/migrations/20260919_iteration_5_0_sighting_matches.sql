-- Iteration 5.0: private owner decisions, independent of legacy matching/contact.
-- Apply manually only after confirming the target project's schema.
-- No row means "por revisar"; this migration does not backfill candidates.
begin;

create table public.sighting_matches (
  report_id uuid not null references public.lost_reports(id) on delete cascade,
  sighting_id uuid not null references public.sightings(id) on delete cascade,
  decision text not null check (decision in ('podria_ser', 'descartado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (report_id, sighting_id)
);

-- The composite primary key guarantees UNIQUE (report_id, sighting_id).
-- Support the reverse foreign key when a sighting is deleted.
create index sighting_matches_sighting_id_idx
  on public.sighting_matches (sighting_id);

alter table public.sighting_matches enable row level security;

-- Clear possible default grants; allow clients to change only the decision.
revoke all on table public.sighting_matches from public, anon, authenticated;
grant select, delete on table public.sighting_matches to authenticated;
grant insert (report_id, sighting_id, decision)
  on public.sighting_matches to authenticated;
grant update (decision) on public.sighting_matches to authenticated;

-- Applies to SELECT/INSERT/UPDATE/DELETE. Both old and new rows must belong
-- to the authenticated report owner; authorship of a sighting grants nothing.
create policy sighting_matches_owner_only
  on public.sighting_matches
  for all
  to authenticated
  using (
    exists (
      select 1 from public.lost_reports lr
      where lr.id = sighting_matches.report_id
        and lr.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.lost_reports lr
      where lr.id = sighting_matches.report_id
        and lr.owner_id = (select auth.uid())
    )
  );

create function public.touch_sighting_match_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.touch_sighting_match_updated_at()
  from public, anon, authenticated;

create trigger sighting_matches_touch_updated_at
  before update on public.sighting_matches
  for each row execute function public.touch_sighting_match_updated_at();

commit;
