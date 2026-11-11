-- A revision photo can remember how it sits in the live card frame.

alter table public.lesson_cards
  add column if not exists img_frame jsonb;

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
  published->>'highlight_adv' as highlight_adv,
  published->>'audio' as audio,
  published->>'img' as img,
  published->'img_frame' as img_frame,
  coalesce(published->>'video', '') as video,
  coalesce(published->>'pattern', '') as pattern,
  coalesce(published->>'note_zh', '') as note_zh,
  coalesce(published->>'cutout', '') = 'true' as cutout
from public.lesson_cards
where status = 'published'
  and published is not null;

grant select on public.lesson_cards_live to anon, authenticated;
