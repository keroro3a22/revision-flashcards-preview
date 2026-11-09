insert into private.content_editors (user_id)
select id from public.profiles
where username = 'cynthiasumyi'
on conflict (user_id) do nothing;
