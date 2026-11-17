-- Pictures on the first visit: Pick a book, then Pick a level.
-- Students read onboarding_images_live. An empty published picture keeps the built-in one.
-- The view is owner-backed, like the other live views, so visitors can read the
-- published picture without access to draft rows.

create table public.onboarding_images (
  id text primary key,
  image text not null default '',
  image_frame jsonb,
  published jsonb,
  status text not null default 'draft',
  updated_at timestamptz not null default now(),
  constraint onboarding_images_id_check check (id in (
    'book-longman',
    'book-oxford',
    'level-p1',
    'level-p2',
    'level-p3',
    'level-p4',
    'level-p5',
    'level-p6'
  )),
  constraint onboarding_images_status_check check (status in ('draft', 'published'))
);

create trigger onboarding_images_touch
  before update on public.onboarding_images
  for each row execute function public.lesson_cards_touch();

alter table public.onboarding_images enable row level security;

create policy onboarding_images_editor_all
  on public.onboarding_images
  for all
  to authenticated
  using (public.is_content_editor())
  with check (public.is_content_editor());

create or replace view public.onboarding_images_live
with (security_invoker = false) as
select
  id,
  coalesce(published->>'image', '') as image,
  published->'frame' as frame
from public.onboarding_images
where status = 'published'
  and published is not null;

revoke all on public.onboarding_images from anon, authenticated;
grant select on public.onboarding_images_live to anon, authenticated;
grant select, insert, update, delete on public.onboarding_images to authenticated;
