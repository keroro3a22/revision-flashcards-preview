-- Each example sentence stores its own highlight.
-- highlight stays the Sample / Example phrase.
-- highlight_adv is the Advanced example phrase.
-- A blank highlight_adv keeps the old behaviour: both sentences use highlight.
-- Draft rows keep highlight_adv on this table while published is null.
-- Students read highlight_adv from the published snapshot, not from draft columns.

alter table public.lesson_cards
  add column if not exists highlight_adv text not null default '';

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
  coalesce(published->>'highlight_adv', '') as highlight_adv,
  published->>'audio' as audio,
  published->>'img' as img,
  coalesce(published->>'video', '') as video,
  coalesce(published->>'pattern', '') as pattern,
  coalesce(published->>'note_zh', '') as note_zh,
  coalesce(published->>'cutout', '') = 'true' as cutout
from public.lesson_cards
where status = 'published'
  and published is not null;

grant select on public.lesson_cards_live to anon, authenticated;

notify pgrst, 'reload schema';
