-- A fun fact photo can remember how it sits in its frame.

alter table public.lesson_cards
  add column if not exists funfact_frame jsonb;

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
  coalesce(published->>'cutout', '') = 'true' as cutout,
  coalesce(published->>'funfact_on', '') = 'true' as funfact_on,
  coalesce(published->>'funfact_text', '') as funfact_text,
  coalesce(published->>'funfact_img', '') as funfact_img,
  published->'funfact_frame' as funfact_frame
from public.lesson_cards
where status = 'published'
  and published is not null;

grant select on public.lesson_cards_live to anon, authenticated;
