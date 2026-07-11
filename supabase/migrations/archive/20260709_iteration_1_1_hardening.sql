-- HUELLA Iteracion 1.1 - hardening de politicas legadas
-- Refuerza proyectos que hayan ejecutado migraciones previas con politicas publicas amplias.

do $$
begin
  if to_regclass('public.pets') is not null then
    execute 'drop policy if exists "Public insert pets" on public.pets';
    execute 'drop policy if exists "Public update pet status" on public.pets';
    execute 'drop policy if exists "Public delete pets" on public.pets';
    execute 'drop policy if exists "Pets insert own" on public.pets';
    execute 'drop policy if exists "Pets update own" on public.pets';
    execute 'drop policy if exists "Pets delete own" on public.pets';
    execute 'create policy "Pets insert own" on public.pets for insert with check (auth.uid() = user_id or auth.uid() = owner_id)';
    execute 'create policy "Pets update own" on public.pets for update using (auth.uid() = user_id or auth.uid() = owner_id) with check (auth.uid() = user_id or auth.uid() = owner_id)';
    execute 'create policy "Pets delete own" on public.pets for delete using (auth.uid() = user_id or auth.uid() = owner_id)';
  end if;
end $$;

do $$
begin
  if to_regclass('public.sightings') is not null then
    execute 'drop policy if exists "Public update sightings" on public.sightings';
    execute 'drop policy if exists "Public delete sightings" on public.sightings';
    execute 'drop policy if exists "Sightings update reporter_or_report_owner" on public.sightings';
    execute 'drop policy if exists "Sightings delete reporter_or_report_owner" on public.sightings';
    execute 'create policy "Sightings update reporter_or_report_owner" on public.sightings for update using (
      reporter_id = auth.uid()
      or exists (select 1 from public.lost_reports lr where lr.id = sightings.report_id and lr.owner_id = auth.uid())
    ) with check (
      reporter_id = auth.uid()
      or exists (select 1 from public.lost_reports lr where lr.id = sightings.report_id and lr.owner_id = auth.uid())
    )';
    execute 'create policy "Sightings delete reporter_or_report_owner" on public.sightings for delete using (
      reporter_id = auth.uid()
      or exists (select 1 from public.lost_reports lr where lr.id = sightings.report_id and lr.owner_id = auth.uid())
    )';
  end if;
end $$;

do $$
begin
  if to_regclass('public.notifications') is not null then
    execute 'drop policy if exists "Public read notifications" on public.notifications';
    execute 'drop policy if exists "Public insert notifications" on public.notifications';
    execute 'drop policy if exists "Public update notifications" on public.notifications';
    execute 'drop policy if exists "Notifications read owner" on public.notifications';
    execute 'drop policy if exists "Notifications update owner" on public.notifications';
    execute 'create policy "Notifications read owner" on public.notifications for select using (user_id = auth.uid())';
    execute 'create policy "Notifications update owner" on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid())';
  end if;
end $$;

do $$
begin
  if to_regclass('public.content_reports') is not null then
    execute 'drop policy if exists "Public insert content reports" on public.content_reports';
    execute 'drop policy if exists "Content reports insert public" on public.content_reports';
    execute 'create policy "Content reports insert public" on public.content_reports for insert with check (
      char_length(motivo) between 1 and 80
      and (detalle is null or char_length(detalle) <= 1000)
    )';
  end if;
end $$;

do $$
begin
  if to_regclass('public.volunteers') is not null then
    execute 'alter table public.volunteers enable row level security';
  end if;
  if to_regclass('public.messages') is not null then
    execute 'alter table public.messages enable row level security';
  end if;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pet-photos', 'pet-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = true,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];
