-- Memory match preview stores the crop on extra. The live site reads published.
-- A reframe used to save only extra, so students kept the uncropped picture.

update public.practice_items
set published = jsonb_set(
  jsonb_set(
    published,
    '{img}',
    to_jsonb(coalesce(extra->>'img', published->>'img', '')),
    true
  ),
  '{frame}',
  coalesce(extra->'frame', 'null'::jsonb),
  true
)
where mode = 'match'
  and status = 'published'
  and published is not null
  and (
    coalesce(extra->>'img', '') is distinct from coalesce(published->>'img', '')
    or coalesce(extra->'frame', 'null'::jsonb) is distinct from coalesce(published->'frame', 'null'::jsonb)
  );
