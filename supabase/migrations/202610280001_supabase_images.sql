-- Run once in the existing MICMU Supabase project's SQL Editor.
-- No service-role key or Cloudflare R2 subscription is needed.
begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('micmu-images', 'micmu-images', false, 5242880,
  array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Metadata remains private. Only an approved object's exact key can be read.
create or replace function public.is_approved_media_object(object_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.media_assets
    where object_key = object_name and approved = true
  );
$$;
revoke all on function public.is_approved_media_object(text) from public;
grant execute on function public.is_approved_media_object(text) to anon, authenticated;

drop policy if exists micmu_image_admin on storage.objects;
create policy micmu_image_admin on storage.objects
for all to authenticated
using (bucket_id = 'micmu-images' and public.is_admin())
with check (bucket_id = 'micmu-images' and public.is_admin()
  and name like 'supabase/approved/%');

drop policy if exists micmu_image_approved_read on storage.objects;
create policy micmu_image_approved_read on storage.objects
for select to anon, authenticated
using (bucket_id = 'micmu-images'
  and public.is_approved_media_object(name));

commit;
