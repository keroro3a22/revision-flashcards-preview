create table public.content_settings (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now(),
  constraint content_settings_value_length check (char_length(value) <= 500)
);

create trigger content_settings_touch
  before update on public.content_settings
  for each row execute function public.lesson_cards_touch();

alter table public.content_settings enable row level security;

create policy content_settings_editor_all
  on public.content_settings
  for all
  to authenticated
  using (public.is_content_editor())
  with check (public.is_content_editor());

insert into public.content_settings (key, value)
values ('letter_ignore_words', 'a, an, the, and, or, but, nor, as');

create or replace view public.content_settings_live
with (security_invoker = false) as
select key, value
from public.content_settings;

revoke all on public.content_settings from anon, authenticated;
grant select on public.content_settings_live to anon, authenticated;
grant select, insert, update, delete on public.content_settings to authenticated;
