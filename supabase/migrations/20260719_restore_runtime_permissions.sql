-- HUELLA recovery: restore runtime RLS/grants after frontend rollback.
-- Cause: fc63b6a6 consolidated the backend into a new master migration and
-- archived the incremental permission hotfixes that existing Supabase projects
-- needed to avoid 42501 during authenticated reads/inserts.

grant usage on schema public to anon, authenticated;

alter table public.profiles enable row level security;
alter table public.pets enable row level security;
alter table public.pet_private_details enable row level security;
alter table public.lost_reports enable row level security;
alter table public.report_private_contacts enable row level security;
alter table public.sightings enable row level security;
alter table public.notifications enable row level security;

grant select on public.profiles to authenticated;
grant insert, update on public.profiles to authenticated;

grant select on public.pets, public.lost_reports, public.sightings to anon, authenticated;
grant insert, update, delete on public.pets, public.lost_reports, public.sightings to authenticated;

grant select, insert, update, delete on public.pet_private_details, public.report_private_contacts, public.notifications to authenticated;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "pets_select_public_or_owner" on public.pets;
drop policy if exists "pets_insert_owner" on public.pets;
drop policy if exists "pets_update_owner" on public.pets;
drop policy if exists "pets_delete_owner" on public.pets;
create policy "pets_select_public_or_owner" on public.pets for select using (is_public or auth.uid() = owner_id or auth.uid() = user_id);
create policy "pets_insert_owner" on public.pets for insert to authenticated with check (auth.uid() = owner_id and auth.uid() = user_id);
create policy "pets_update_owner" on public.pets for update to authenticated using (auth.uid() = owner_id or auth.uid() = user_id) with check (auth.uid() = owner_id and auth.uid() = user_id);
create policy "pets_delete_owner" on public.pets for delete to authenticated using (auth.uid() = owner_id or auth.uid() = user_id);

drop policy if exists "pet_private_details_select_owner" on public.pet_private_details;
drop policy if exists "pet_private_details_insert_owner" on public.pet_private_details;
drop policy if exists "pet_private_details_update_owner" on public.pet_private_details;
drop policy if exists "pet_private_details_delete_owner" on public.pet_private_details;
create policy "pet_private_details_select_owner" on public.pet_private_details for select to authenticated using (auth.uid() = owner_id);
create policy "pet_private_details_insert_owner" on public.pet_private_details for insert to authenticated with check (
  auth.uid() = owner_id
  and exists (
    select 1 from public.pets p
    where p.id = pet_private_details.pet_id
      and (p.owner_id = auth.uid() or p.user_id = auth.uid())
  )
);
create policy "pet_private_details_update_owner" on public.pet_private_details for update to authenticated using (auth.uid() = owner_id) with check (
  auth.uid() = owner_id
  and exists (
    select 1 from public.pets p
    where p.id = pet_private_details.pet_id
      and (p.owner_id = auth.uid() or p.user_id = auth.uid())
  )
);
create policy "pet_private_details_delete_owner" on public.pet_private_details for delete to authenticated using (auth.uid() = owner_id);

drop policy if exists "lost_reports_select_public_or_owner" on public.lost_reports;
drop policy if exists "lost_reports_insert_owner" on public.lost_reports;
drop policy if exists "lost_reports_update_owner" on public.lost_reports;
drop policy if exists "lost_reports_delete_owner" on public.lost_reports;
create policy "lost_reports_select_public_or_owner" on public.lost_reports for select using (is_public or auth.uid() = owner_id);
create policy "lost_reports_insert_owner" on public.lost_reports for insert to authenticated with check (
  auth.uid() = owner_id
  and exists (
    select 1 from public.pets p
    where p.id = lost_reports.pet_id
      and (p.owner_id = auth.uid() or p.user_id = auth.uid())
  )
);
create policy "lost_reports_update_owner" on public.lost_reports for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "lost_reports_delete_owner" on public.lost_reports for delete to authenticated using (auth.uid() = owner_id);

drop policy if exists "report_private_contacts_select_owner" on public.report_private_contacts;
drop policy if exists "report_private_contacts_insert_owner" on public.report_private_contacts;
drop policy if exists "report_private_contacts_update_owner" on public.report_private_contacts;
drop policy if exists "report_private_contacts_delete_owner" on public.report_private_contacts;
create policy "report_private_contacts_select_owner" on public.report_private_contacts for select to authenticated using (auth.uid() = owner_id);
create policy "report_private_contacts_insert_owner" on public.report_private_contacts for insert to authenticated with check (
  auth.uid() = owner_id
  and exists (
    select 1 from public.lost_reports lr
    where lr.id = report_private_contacts.report_id
      and lr.owner_id = auth.uid()
  )
);
create policy "report_private_contacts_update_owner" on public.report_private_contacts for update to authenticated using (auth.uid() = owner_id) with check (
  auth.uid() = owner_id
  and exists (
    select 1 from public.lost_reports lr
    where lr.id = report_private_contacts.report_id
      and lr.owner_id = auth.uid()
  )
);
create policy "report_private_contacts_delete_owner" on public.report_private_contacts for delete to authenticated using (auth.uid() = owner_id);

drop policy if exists "sightings_select_public" on public.sightings;
drop policy if exists "sightings_insert_public_or_auth" on public.sightings;
drop policy if exists "sightings_update_report_owner" on public.sightings;
drop policy if exists "sightings_delete_reporter_or_report_owner" on public.sightings;
create policy "sightings_select_public" on public.sightings for select using (true);
create policy "sightings_insert_public_or_auth" on public.sightings for insert to authenticated with check (
  report_id is null
  or exists (
    select 1 from public.lost_reports lr
    where lr.id = sightings.report_id
      and lr.is_public
  )
);
create policy "sightings_update_report_owner" on public.sightings for update to authenticated using (
  reporter_id = auth.uid()
  or exists (
    select 1 from public.lost_reports lr
    where lr.id = sightings.report_id
      and lr.owner_id = auth.uid()
  )
) with check (
  reporter_id = auth.uid()
  or exists (
    select 1 from public.lost_reports lr
    where lr.id = sightings.report_id
      and lr.owner_id = auth.uid()
  )
);
create policy "sightings_delete_reporter_or_report_owner" on public.sightings for delete to authenticated using (
  reporter_id = auth.uid()
  or exists (
    select 1 from public.lost_reports lr
    where lr.id = sightings.report_id
      and lr.owner_id = auth.uid()
  )
);

drop policy if exists "notifications_select_own" on public.notifications;
drop policy if exists "notifications_insert_own" on public.notifications;
drop policy if exists "notifications_update_own" on public.notifications;
drop policy if exists "notifications_delete_own" on public.notifications;
create policy "notifications_select_own" on public.notifications for select to authenticated using (auth.uid() = user_id);
create policy "notifications_insert_own" on public.notifications for insert to authenticated with check (auth.uid() = user_id);
create policy "notifications_update_own" on public.notifications for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notifications_delete_own" on public.notifications for delete to authenticated using (auth.uid() = user_id);
