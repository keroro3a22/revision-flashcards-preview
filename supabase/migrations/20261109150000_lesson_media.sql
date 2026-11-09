insert into storage.buckets (id, name, public)
values ('lesson-media', 'lesson-media', true)
on conflict (id) do update set public = true;

drop policy if exists lesson_media_read on storage.objects;
drop policy if exists lesson_media_insert on storage.objects;
drop policy if exists lesson_media_update on storage.objects;
drop policy if exists lesson_media_delete on storage.objects;

create policy lesson_media_read
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'lesson-media');

create policy lesson_media_insert
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'lesson-media' and public.is_content_editor());

create policy lesson_media_update
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'lesson-media' and public.is_content_editor())
  with check (bucket_id = 'lesson-media' and public.is_content_editor());

create policy lesson_media_delete
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'lesson-media' and public.is_content_editor());
