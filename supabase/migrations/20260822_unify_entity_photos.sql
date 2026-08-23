-- Canonical image model for every photo-bearing Beta 1 entity.
-- photo_urls is the source of truth; legacy scalar columns remain readable during rollout.

alter table public.pets add column if not exists photo_urls text[] not null default '{}';
alter table public.lost_reports add column if not exists photo_urls text[] not null default '{}';
alter table public.sightings add column if not exists photo_urls text[] not null default '{}';
alter table public.reunion_stories add column if not exists photo_urls text[] not null default '{}';
alter table public.feedback add column if not exists photo_urls text[] not null default '{}';

update public.pets
set photo_urls = coalesce((select array_agg(distinct value) from unnest(coalesce(fotos, '{}') || array_remove(array[foto_principal, foto_url], null)) value), '{}')
where cardinality(photo_urls) = 0;

update public.lost_reports
set photo_urls = case when pet_id is null then '{}'::text[] else coalesce((select p.photo_urls from public.pets p where p.id = lost_reports.pet_id), '{}') end
where cardinality(photo_urls) = 0;

update public.sightings set photo_urls = array[photo_url] where cardinality(photo_urls) = 0 and photo_url is not null;
update public.reunion_stories set photo_urls = array[photo_url] where cardinality(photo_urls) = 0 and photo_url is not null;
update public.feedback set photo_urls = array[screenshot_url] where cardinality(photo_urls) = 0 and screenshot_url is not null;

-- Consolidate the former polymorphic image table before removing the parallel model.
update public.pets p
set photo_urls = coalesce((select array_agg(ri.public_url order by ri.sort_order, ri.created_at) from public.report_images ri where ri.pet_id = p.id), p.photo_urls)
where exists (select 1 from public.report_images ri where ri.pet_id = p.id);

update public.lost_reports r
set photo_urls = coalesce((select array_agg(ri.public_url order by ri.sort_order, ri.created_at) from public.report_images ri where ri.report_id = r.id), r.photo_urls)
where exists (select 1 from public.report_images ri where ri.report_id = r.id);

update public.sightings s
set photo_urls = coalesce((select array_agg(ri.public_url order by ri.sort_order, ri.created_at) from public.report_images ri where ri.sighting_id = s.id), s.photo_urls)
where exists (select 1 from public.report_images ri where ri.sighting_id = s.id);

update public.pets set photo_urls = photo_urls[1:3] where cardinality(photo_urls) > 3;
update public.lost_reports set photo_urls = photo_urls[1:3] where cardinality(photo_urls) > 3;
update public.sightings set photo_urls = photo_urls[1:3] where cardinality(photo_urls) > 3;
update public.reunion_stories set photo_urls = photo_urls[1:3] where cardinality(photo_urls) > 3;
update public.feedback set photo_urls = photo_urls[1:3] where cardinality(photo_urls) > 3;

alter table public.pets drop constraint if exists pets_photo_urls_max_three;
alter table public.pets add constraint pets_photo_urls_max_three check (cardinality(photo_urls) <= 3);
alter table public.lost_reports drop constraint if exists lost_reports_photo_urls_max_three;
alter table public.lost_reports add constraint lost_reports_photo_urls_max_three check (cardinality(photo_urls) <= 3);
alter table public.sightings drop constraint if exists sightings_photo_urls_max_three;
alter table public.sightings add constraint sightings_photo_urls_max_three check (cardinality(photo_urls) <= 3);
alter table public.reunion_stories drop constraint if exists reunion_stories_photo_urls_max_three;
alter table public.reunion_stories add constraint reunion_stories_photo_urls_max_three check (cardinality(photo_urls) <= 3);
alter table public.feedback drop constraint if exists feedback_photo_urls_max_three;
alter table public.feedback add constraint feedback_photo_urls_max_three check (cardinality(photo_urls) <= 3);

comment on column public.pets.photo_urls is 'Canonical ordered image URLs, maximum 3';
comment on column public.lost_reports.photo_urls is 'Canonical ordered image URLs, maximum 3';
comment on column public.sightings.photo_urls is 'Canonical ordered image URLs, maximum 3';
comment on column public.reunion_stories.photo_urls is 'Canonical ordered image URLs, maximum 3';
comment on column public.feedback.photo_urls is 'Canonical ordered image URLs, maximum 3';

drop table if exists public.report_images;
