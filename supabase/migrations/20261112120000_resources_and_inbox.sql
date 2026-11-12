-- Paid papers for one book, series, level, and term.
-- Students can read the title and price. The file stays in the private inbox.

create table public.resources (
  id bigint generated always as identity primary key,
  book text not null,
  series text not null,
  term text not null,
  level text not null,
  title text not null default '',
  kind text not null default 'mock-test',
  price numeric(8, 2) not null default 0,
  note text not null default '',
  file_path text not null default '',
  published jsonb,
  status text not null default 'draft',
  updated_at timestamptz not null default now(),
  constraint resources_book_check check (book in ('oxford', 'longman')),
  constraint resources_series_check check (
    (book = 'oxford' and series = 'oxford')
    or (book = 'longman' and series in ('mypearson-express', 'elect'))
  ),
  constraint resources_term_check check (term in ('first', 'second')),
  constraint resources_level_check check (level in ('p1', 'p2', 'p3', 'p4', 'p5', 'p6')),
  constraint resources_kind_check check (kind in ('mock-test', 'practice-paper')),
  constraint resources_status_check check (status in ('draft', 'published')),
  constraint resources_price_check check (price >= 0)
);

create index resources_lookup
  on public.resources (book, series, term, level, status);

create trigger resources_touch
  before update on public.resources
  for each row execute function public.lesson_cards_touch();

alter table public.resources enable row level security;

create policy resources_editor_all
  on public.resources
  for all
  to authenticated
  using (public.is_content_editor())
  with check (public.is_content_editor());

create or replace view public.resources_live
with (security_invoker = false) as
select
  id, book, series, term, level,
  coalesce(published->>'title', '') as title,
  coalesce(published->>'kind', 'mock-test') as kind,
  coalesce((published->>'price')::numeric, 0) as price,
  coalesce(published->>'note', '') as note
from public.resources
where status = 'published'
  and published is not null;

revoke all on public.resources from anon, authenticated;
grant select on public.resources_live to anon, authenticated;
grant select, insert, update, delete on public.resources to authenticated;
grant usage, select on sequence public.resources_id_seq to authenticated;

insert into storage.buckets (id, name, public)
values ('lesson-inbox', 'lesson-inbox', false)
on conflict (id) do update set public = false;

drop policy if exists lesson_inbox_read on storage.objects;
drop policy if exists lesson_inbox_insert on storage.objects;
drop policy if exists lesson_inbox_update on storage.objects;
drop policy if exists lesson_inbox_delete on storage.objects;

create policy lesson_inbox_read
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'lesson-inbox' and public.is_content_editor());

create policy lesson_inbox_insert
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'lesson-inbox' and public.is_content_editor());

create policy lesson_inbox_update
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'lesson-inbox' and public.is_content_editor())
  with check (bucket_id = 'lesson-inbox' and public.is_content_editor());

create policy lesson_inbox_delete
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'lesson-inbox' and public.is_content_editor());
