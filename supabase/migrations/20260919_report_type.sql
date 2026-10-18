-- Keep historical provenance unknown until it can be verified per record.
-- Apply before deploying clients that write report_type.
begin;

alter table public.lost_reports
  add column if not exists report_type text;

alter table public.lost_reports
  add constraint lost_reports_report_type_check
  check (report_type in ('lost', 'found'));

comment on column public.lost_reports.report_type is
  'lost = owner reports a missing pet; found = citizen reports a pet seen. NULL = historical report not yet classified.';

-- New sightings only: no historical fan-out. Keep the existing trigger for
-- sightings directly attached to a lost report unchanged.
create function public.notify_new_sighting_for_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_type text;
  candidate record;
begin
  if new.reporter_id is null or nullif(btrim(new.especie), '') is null then
    return new;
  end if;

  if new.report_id is not null then
    select r.report_type into source_type
    from public.lost_reports r where r.id = new.report_id;
    -- Linked loss reports are handled by sightings_notify_case_owner.
    -- Historical unclassified sources are not guessed to be found reports.
    if source_type is distinct from 'found' then
      return new;
    end if;
  end if;

  for candidate in
    select r.id as report_id, r.owner_id, p.nombre as pet_name
    from public.lost_reports r
    join public.pets p on p.id = r.pet_id
    where r.report_type = 'lost'
      and r.status = 'active'
      and lower(btrim(p.especie)) = lower(btrim(new.especie))
      and r.owner_id is distinct from new.reporter_id
  loop
    insert into public.notifications(id, user_id, report_id, type, message)
    values (
      md5('huella:review:' || candidate.report_id::text || ':' || new.id::text)::uuid,
      candidate.owner_id,
      candidate.report_id,
      'nuevo_avistamiento_para_revisar',
      'Hay un nuevo reporte que podría ayudarte en la búsqueda de ' ||
        coalesce(nullif(candidate.pet_name, ''), 'tu mascota') || '.'
    ) on conflict (id) do nothing;
  end loop;

  return new;
end;
$$;

revoke all on function public.notify_new_sighting_for_review()
  from public, anon, authenticated;

create trigger sightings_notify_for_review
  after insert on public.sightings
  for each row execute function public.notify_new_sighting_for_review();

commit;
