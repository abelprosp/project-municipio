-- Criação de usuários de teste: Marciano e Cristiano
-- OBS: Requer permissões para usar a função auth.create_user (ambiente local do Supabase)

begin;

-- Marciano
select
  auth.create_user(
    email => 'marciano@example.com',
    password => 'Teste@12345',
    email_confirm => true,
    data => jsonb_build_object('full_name', 'Marciano')
  );

insert into public.profiles (id, full_name)
select u.id, coalesce(u.raw_user_meta_data->>'full_name','Marciano')
from auth.users u
where u.email = 'marciano@example.com'
on conflict (id) do update set full_name = excluded.full_name;

-- Cristiano
select
  auth.create_user(
    email => 'cristiano@example.com',
    password => 'Teste@12345',
    email_confirm => true,
    data => jsonb_build_object('full_name', 'Cristiano')
  );

insert into public.profiles (id, full_name)
select u.id, coalesce(u.raw_user_meta_data->>'full_name','Cristiano')
from auth.users u
where u.email = 'cristiano@example.com'
on conflict (id) do update set full_name = excluded.full_name;

commit;


