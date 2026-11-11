-- A page photo can remember the same crop as a lesson picture.

alter table public.site_pages
  add column if not exists image_frame jsonb;

drop view if exists public.site_pages_live;
create view public.site_pages_live
with (security_invoker = false) as
select
  book, series, term, level, unit_id, slot,
  coalesce(published->>'label', '') as label,
  coalesce(published->>'note', '') as note,
  coalesce(published->>'image', '') as image,
  published->'frame' as frame
from public.site_pages
where status = 'published'
  and published is not null;

grant select on public.site_pages_live to anon, authenticated;
