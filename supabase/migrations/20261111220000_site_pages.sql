-- Editable unit titles, door pictures, and the Get started lines.
-- Students read site_pages_live. An empty published field keeps the code default.

create table public.site_pages (
  id bigint generated always as identity primary key,
  book text not null,
  series text not null,
  term text not null,
  level text not null,
  unit_id text not null,
  slot text not null,
  label text not null default '',
  note text not null default '',
  image text not null default '',
  published jsonb,
  status text not null default 'draft',
  updated_at timestamptz not null default now(),
  constraint site_pages_book_check check (book in ('oxford', 'longman')),
  constraint site_pages_series_check check (
    (book = 'oxford' and series = 'oxford')
    or (book = 'longman' and series in ('mypearson-express', 'elect'))
  ),
  constraint site_pages_term_check check (term in ('first', 'second')),
  constraint site_pages_level_check check (level in ('p1', 'p2', 'p3', 'p4', 'p5', 'p6')),
  constraint site_pages_unit_check check (unit_id in ('home', 'unit1', 'unit2', 'unit3', 'unit4', 'unit5', 'unit6')),
  constraint site_pages_slot_check check (slot in (
    'title', 'revision-vocab', 'revision-grammar', 'practice-vocab', 'practice-grammar',
    'hero', 'hear', 'see', 'read'
  )),
  constraint site_pages_slot_place check (
    (unit_id = 'home' and slot in ('hero', 'hear', 'see', 'read'))
    or (unit_id <> 'home' and slot in ('title', 'revision-vocab', 'revision-grammar', 'practice-vocab', 'practice-grammar'))
  ),
  constraint site_pages_status_check check (status in ('draft', 'published')),
  constraint site_pages_place_key unique (book, series, term, level, unit_id, slot)
);

create index site_pages_lookup
  on public.site_pages (book, series, term, level, unit_id, status);

create trigger site_pages_touch
  before update on public.site_pages
  for each row execute function public.lesson_cards_touch();

alter table public.site_pages enable row level security;

create policy site_pages_editor_all
  on public.site_pages
  for all
  to authenticated
  using (public.is_content_editor())
  with check (public.is_content_editor());

create or replace view public.site_pages_live
with (security_invoker = false) as
select
  book, series, term, level, unit_id, slot,
  coalesce(published->>'label', '') as label,
  coalesce(published->>'note', '') as note,
  coalesce(published->>'image', '') as image
from public.site_pages
where status = 'published'
  and published is not null;

revoke all on public.site_pages from anon, authenticated;
grant select on public.site_pages_live to anon, authenticated;
grant select, insert, update, delete on public.site_pages to authenticated;
grant usage, select on sequence public.site_pages_id_seq to authenticated;

insert into public.site_pages (
  book, series, term, level, unit_id, slot, label, note, image, status, published
)
select
  'oxford', 'oxford', 'first', 'p6', unit_id, slot, label, note, image, 'published',
  jsonb_build_object('label', label, 'note', note, 'image', image)
from (values
  ('unit1', 'title', 'For a good cause', 'Charity verbs. adopt a pet, donate money, walkathon.', ''),
  ('unit1', 'revision-vocab', 'Vocab', 'Open the word cards.', 'covers/unit1.jpg'),
  ('unit1', 'revision-grammar', 'Grammar', 'Open the grammar cards.', 'practice/grammar/illust/u1_09_fair.jpg'),
  ('unit1', 'practice-vocab', 'Vocab', 'Open the quizzes.', 'unit1/thumb_08.jpg'),
  ('unit1', 'practice-grammar', 'Grammar', 'Open the grammar games.', 'practice/grammar/illust/u1_09_fair.jpg'),
  ('unit2', 'title', 'Lend a helping hand', 'Natural disasters and how we help. drought, flood, rescue.', ''),
  ('unit2', 'revision-vocab', 'Vocab', 'Open the word cards.', 'covers/unit2.jpg'),
  ('unit2', 'revision-grammar', 'Grammar', 'Open the grammar cards.', 'practice/grammar/illust/u2_06_typhoon.jpg'),
  ('unit2', 'practice-vocab', 'Vocab', 'Open the quizzes.', 'unit2/thumb_09.jpg'),
  ('unit2', 'practice-grammar', 'Grammar', 'Open the grammar games.', 'practice/grammar/illust/u2_06_typhoon.jpg'),
  ('unit3', 'title', 'Junior Super Chef', 'Kitchen verbs. beat, grate, simmer, and more for cooking class.', ''),
  ('unit3', 'revision-vocab', 'Vocab', 'Open the word cards.', 'covers/unit3.jpg'),
  ('unit3', 'revision-grammar', 'Grammar', 'Open the grammar cards.', 'unit3/thumb_06.jpg'),
  ('unit3', 'practice-vocab', 'Vocab', 'Open the quizzes.', 'unit3/thumb_04.jpg'),
  ('unit3', 'practice-grammar', 'Grammar', 'Open the grammar games.', 'unit3/thumb_06.jpg'),
  ('unit4', 'title', 'Film magic', 'Genres and cinema words. action film, comedy, fantasy, musical.', ''),
  ('unit4', 'revision-vocab', 'Vocab', 'Open the word cards.', 'covers/unit4.jpg'),
  ('unit4', 'revision-grammar', 'Grammar', 'Open the grammar cards.', 'practice/grammar/illust/u4_sparkly_finale.jpg'),
  ('unit4', 'practice-vocab', 'Vocab', 'Open the quizzes.', 'unit4/thumb_10.jpg'),
  ('unit4', 'practice-grammar', 'Grammar', 'Open the grammar games.', 'practice/grammar/illust/u4_sparkly_finale.jpg'),
  ('unit5', 'title', 'The Land of Kangaroos', 'Travelling activities. snowboarding, a kangaroo, a cruise, and more.', ''),
  ('unit5', 'revision-vocab', 'Vocab', 'Open the word cards.', 'covers/unit5.jpg'),
  ('unit5', 'revision-grammar', 'Grammar', 'Open the grammar cards.', 'unit5/thumb_17.png'),
  ('unit5', 'practice-vocab', 'Vocab', 'Open the quizzes.', 'unit5/thumb_09.png'),
  ('unit5', 'practice-grammar', 'Grammar', 'Open the grammar games.', 'unit5/thumb_17.png'),
  ('unit6', 'title', 'International Week', 'Countries and culture. China, a kimono, a carnival, and more.', ''),
  ('unit6', 'revision-vocab', 'Vocab', 'Open the word cards.', 'covers/unit6.jpg'),
  ('unit6', 'revision-grammar', 'Grammar', 'Open the grammar cards.', 'unit6/thumb_20.png'),
  ('unit6', 'practice-vocab', 'Vocab', 'Open the quizzes.', 'unit6/thumb_10.png'),
  ('unit6', 'practice-grammar', 'Grammar', 'Open the grammar games.', 'unit6/thumb_20.png'),
  ('home', 'hero', 'English Revision', 'Flashcards, games, quizzes', ''),
  ('home', 'hear', 'Hear it', 'Tap Play on a card. Practise the word aloud with the syllable breaks.', 'covers/unit4.jpg'),
  ('home', 'see', 'See it', 'Look at the picture for the word. Tap it to enlarge and notice the scene.', 'unit3/thumb_01.jpg'),
  ('home', 'read', 'Read it', 'Read a textbook sentence and a Form 1 sentence. Traditional Chinese is under each one.', 'unit1/thumb_01.jpg')
) as seed(unit_id, slot, label, note, image);
