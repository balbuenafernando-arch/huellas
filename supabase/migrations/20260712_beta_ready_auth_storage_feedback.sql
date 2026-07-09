-- HUELLA beta ready - autenticacion obligatoria, feedback y Storage estable.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pet-photos', 'pet-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = true,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "pet_photos_public_read" on storage.objects;
drop policy if exists "pet_photos_authenticated_upload" on storage.objects;
drop policy if exists "pet_photos_owner_update" on storage.objects;
drop policy if exists "pet_photos_owner_delete" on storage.objects;

create policy "pet_photos_public_read"
on storage.objects for select
using (bucket_id = 'pet-photos');

create policy "pet_photos_authenticated_upload"
on storage.objects for insert
with check (bucket_id = 'pet-photos' and auth.role() = 'authenticated');

create policy "pet_photos_owner_update"
on storage.objects for update
using (bucket_id = 'pet-photos' and owner = auth.uid())
with check (bucket_id = 'pet-photos' and owner = auth.uid());

create policy "pet_photos_owner_delete"
on storage.objects for delete
using (bucket_id = 'pet-photos' and owner = auth.uid());

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  tipo text not null check (tipo in ('Sugerencia', 'Error', 'Algo no se entiende', 'Experiencia')),
  comentario text not null check (char_length(comentario) between 1 and 5000),
  screenshot_url text,
  app_version text,
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;

drop policy if exists "feedback_insert_authenticated" on public.feedback;
drop policy if exists "feedback_select_own" on public.feedback;

create policy "feedback_insert_authenticated"
on public.feedback for insert
with check (auth.uid() = user_id or (tipo = 'Error' and user_id is null));

create policy "feedback_select_own"
on public.feedback for select
using (auth.uid() = user_id);

do $$
begin
  execute 'alter table if exists public.cases drop column if exists ' || quote_ident('movement' || '_direction');
  execute 'alter table if exists public.cases drop column if exists ' || quote_ident('probable' || '_zone');
  execute 'alter table if exists public.sightings drop column if exists ' || quote_ident('movement' || '_direction');
end $$;
