-- Badge pictures, names, how-to lines, pep lines, and the inference target.
-- Students read badge_settings_live. An empty published field keeps the code default.
-- Counting stays in the practice page. This table does not add or remove badges.

create table public.badge_settings (
  id text primary key,
  title text not null default '',
  english text not null default '',
  detail text not null default '',
  image text not null default '',
  target integer,
  milestones jsonb not null default '[]'::jsonb,
  published jsonb,
  status text not null default 'draft',
  updated_at timestamptz not null default now(),
  constraint badge_settings_id_check check (id in (
    'starter',
    'letters-phrase',
    'match-pro',
    'timed-brave',
    'hard-challenger',
    'all-rounder',
    'unit-done:unit1',
    'unit-done:unit2',
    'unit-done:unit3',
    'unit-done:unit4',
    'unit-done:dictation3',
    'grammar-story',
    'grammar-inference',
    'grammar-join',
    'grammar-boss'
  )),
  constraint badge_settings_target_check check (
    target is null or (id = 'grammar-inference' and target between 1 and 99)
  ),
  constraint badge_settings_milestones_check check (jsonb_typeof(milestones) = 'array'),
  constraint badge_settings_status_check check (status in ('draft', 'published'))
);

create trigger badge_settings_touch
  before update on public.badge_settings
  for each row execute function public.lesson_cards_touch();

alter table public.badge_settings enable row level security;

create policy badge_settings_editor_all
  on public.badge_settings
  for all
  to authenticated
  using (public.is_content_editor())
  with check (public.is_content_editor());

create or replace view public.badge_settings_live
with (security_invoker = false) as
select
  id,
  coalesce(published->>'title', '') as title,
  coalesce(published->>'english', '') as english,
  coalesce(published->>'detail', '') as detail,
  coalesce(published->>'image', '') as image,
  case
    when published->>'target' ~ '^[0-9]+$' then (published->>'target')::integer
    else null
  end as target,
  coalesce(published->'milestones', '[]'::jsonb) as milestones
from public.badge_settings
where status = 'published'
  and published is not null;

revoke all on public.badge_settings from anon, authenticated;
grant select on public.badge_settings_live to anon, authenticated;
grant select, insert, update, delete on public.badge_settings to authenticated;
