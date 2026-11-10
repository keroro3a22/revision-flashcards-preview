-- One library for the site and the studio.
-- Revision cards are vocab or grammar. Practice questions are split by mode.

delete from public.lesson_cards where unit_id = 'dictation3';

alter table public.lesson_cards drop constraint lesson_cards_unit_check;
alter table public.lesson_cards
  add constraint lesson_cards_unit_check
  check (unit_id in ('unit1', 'unit2', 'unit3', 'unit4', 'unit5', 'unit6'));

alter table public.lesson_cards
  add column if not exists track text not null default 'vocab',
  add column if not exists pattern text not null default '',
  add column if not exists note_zh text not null default '';

alter table public.lesson_cards drop constraint if exists lesson_cards_track_check;
alter table public.lesson_cards
  add constraint lesson_cards_track_check check (track in ('vocab', 'grammar'));

alter table public.lesson_cards drop constraint lesson_cards_place_key;
alter table public.lesson_cards
  add constraint lesson_cards_place_key
  unique (book, series, term, level, unit_id, track, n);

drop view if exists public.lesson_cards_live;
create view public.lesson_cards_live
with (security_invoker = false) as
select
  book, series, term, level, unit_id, track, n,
  published->>'en' as en,
  published->>'syllables' as syllables,
  published->>'zh' as zh,
  published->>'pos' as pos,
  published->>'ex_en' as ex_en,
  published->>'ex_zh' as ex_zh,
  published->>'adv_en' as adv_en,
  published->>'adv_zh' as adv_zh,
  published->>'highlight' as highlight,
  published->>'audio' as audio,
  published->>'img' as img,
  coalesce(published->>'video', '') as video,
  coalesce(published->>'pattern', '') as pattern,
  coalesce(published->>'note_zh', '') as note_zh
from public.lesson_cards
where status = 'published'
  and published is not null;

grant select on public.lesson_cards_live to anon, authenticated;

create table public.practice_items (
  id bigint generated always as identity primary key,
  book text not null,
  series text not null,
  term text not null,
  level text not null,
  unit_id text not null,
  track text not null,
  mode text not null,
  level_name text not null default 'easy',
  n integer not null check (n > 0),
  prompt text not null default '',
  answer text not null default '',
  explain text not null default '',
  options text not null default '',
  extra jsonb not null default '{}'::jsonb,
  published jsonb,
  status text not null default 'draft',
  updated_at timestamptz not null default now(),
  constraint practice_items_unit_check check (unit_id in ('unit1', 'unit2', 'unit3', 'unit4', 'unit5', 'unit6')),
  constraint practice_items_track_check check (track in ('vocab', 'grammar')),
  constraint practice_items_mode_check check (mode in ('fill', 'letters', 'match', 'timed', 'story', 'chat', 'join', 'boss')),
  constraint practice_items_level_check check (level_name in ('easy', 'hard')),
  constraint practice_items_status_check check (status in ('draft', 'published')),
  constraint practice_items_place_key unique (book, series, term, level, unit_id, track, mode, level_name, n)
);

create trigger practice_items_touch
  before update on public.practice_items
  for each row execute function public.lesson_cards_touch();

alter table public.practice_items enable row level security;

create policy practice_items_editor_all
  on public.practice_items
  for all
  to authenticated
  using (public.is_content_editor())
  with check (public.is_content_editor());

create or replace view public.practice_items_live
with (security_invoker = false) as
select
  book, series, term, level, unit_id, track, mode, level_name, n,
  published
from public.practice_items
where status = 'published'
  and published is not null;

revoke all on public.practice_items from anon, authenticated;
grant select on public.practice_items_live to anon, authenticated;
grant select, insert, update, delete on public.practice_items to authenticated;
grant usage, select on sequence public.practice_items_id_seq to authenticated;
