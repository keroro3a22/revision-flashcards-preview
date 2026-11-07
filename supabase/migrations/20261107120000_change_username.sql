-- Let a signed-in learner change the username that is also their login id.
-- The email stays on learners.localhost. A session flag allows this one update.

create or replace function private.keep_login_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is distinct from old.email then
    if pg_catalog.current_setting('revision.allow_username_change', true) is distinct from 'on' then
      raise exception 'login id cannot be changed';
    end if;
    if lower(new.email) !~ '^[a-z][a-z0-9_]{2,19}@learners\.localhost$' then
      raise exception 'invalid username';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.change_username(new_username text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  clean text := lower(pg_catalog.btrim(coalesce(new_username, '')));
begin
  if uid is null then
    raise exception 'sign in required';
  end if;
  if clean !~ '^[a-z][a-z0-9_]{2,19}$' then
    raise exception 'invalid username';
  end if;
  if exists (
    select 1 from public.profiles
    where username = clean and id <> uid
  ) then
    raise exception 'username taken';
  end if;
  perform pg_catalog.set_config('revision.allow_username_change', 'on', true);
  update public.profiles
  set username = clean
  where id = uid;
  update auth.users
  set
    email = clean || '@learners.localhost',
    raw_user_meta_data = pg_catalog.jsonb_set(
      coalesce(raw_user_meta_data, '{}'::jsonb),
      '{username}',
      pg_catalog.to_jsonb(clean),
      true
    )
  where id = uid;
  return clean;
end;
$$;

revoke all on function public.change_username(text) from public, anon, authenticated;
grant execute on function public.change_username(text) to authenticated;
