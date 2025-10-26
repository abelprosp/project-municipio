-- Script para configurar usuário admin
-- Execute este script no Supabase SQL Editor após criar um usuário

-- 1. Primeiro, verifique se o usuário existe
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;

-- 2. Substitua 'SEU_EMAIL@exemplo.com' pelo email do usuário que você quer tornar admin
-- e execute o comando abaixo:

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE email = 'SEU_EMAIL@exemplo.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- 3. Verifique se o role foi atribuído corretamente
SELECT 
  u.email,
  ur.role,
  ur.created_at
FROM auth.users u
JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email = 'SEU_EMAIL@exemplo.com';

-- 4. Se você quiser criar um usuário de teste, execute:
-- (Substitua os valores pelos seus dados)

-- INSERT INTO auth.users (
--   id,
--   email,
--   encrypted_password,
--   email_confirmed_at,
--   created_at,
--   updated_at,
--   raw_user_meta_data,
--   raw_app_meta_data,
--   is_super_admin,
--   last_sign_in_at,
--   aud,
--   role
-- ) VALUES (
--   gen_random_uuid(),
--   'admin@teste.com',
--   crypt('123456', gen_salt('bf')),
--   NOW(),
--   NOW(),
--   NOW(),
--   '{"full_name": "Admin Teste"}',
--   '{"provider": "email", "providers": ["email"]}',
--   false,
--   NOW(),
--   'authenticated',
--   'authenticated'
-- );

-- 5. Para atribuir role ao usuário de teste:
-- INSERT INTO public.user_roles (user_id, role)
-- SELECT id, 'admin'::public.app_role
-- FROM auth.users
-- WHERE email = 'admin@teste.com'
-- ON CONFLICT (user_id, role) DO NOTHING;
