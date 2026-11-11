delete from private.content_editors
where user_id in (
  select id from public.profiles
  where username = 'keroroa22'
);

create or replace function private.claim_session()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  sid uuid := nullif((select auth.jwt() ->> 'session_id'), '')::uuid;
begin
  if uid is null or sid is null then
    return false;
  end if;
  if not exists (
    select 1
    from auth.sessions as s
    where s.id = sid
      and s.user_id = uid
  ) then
    return false;
  end if;
  if exists (
    select 1
    from private.content_editors as e
    where e.user_id = uid
  ) then
    return true;
  end if;
  delete from auth.sessions as s
  where s.user_id = uid
    and s.id <> sid;
  return true;
end;
$$;
