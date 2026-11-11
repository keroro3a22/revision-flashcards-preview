-- Grammar practice is several sets. Each set numbers from 1.
-- Sentence fill keeps Easy and Hard as separate rows with the same number.

alter table public.practice_items
  add column if not exists set_no integer not null default 1;

update public.practice_items
set set_no = greatest(coalesce((extra->>'set')::integer, 1), 1)
where extra ? 'set';

alter table public.practice_items drop constraint practice_items_place_key;

update public.practice_items
set n = n + 100000
where track = 'grammar';

with ranked as (
  select id,
    row_number() over (
      partition by book, series, term, level, unit_id, track, mode, level_name, set_no
      order by n
    ) as new_n
  from public.practice_items
  where track = 'grammar'
)
update public.practice_items as item
set n = ranked.new_n
from ranked
where item.id = ranked.id;

alter table public.practice_items
  add constraint practice_items_place_key
  unique (book, series, term, level, unit_id, track, mode, level_name, set_no, n);

drop view if exists public.practice_items_live;
create view public.practice_items_live
with (security_invoker = false) as
select
  book, series, term, level, unit_id, track, mode, level_name, set_no, n,
  published
from public.practice_items
where status = 'published'
  and published is not null;

grant select on public.practice_items_live to anon, authenticated;
