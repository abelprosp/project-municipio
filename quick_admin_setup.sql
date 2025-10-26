-- Script rápido para configurar usuário admin
-- Execute este SQL no Supabase SQL Editor

-- 1. Ver usuários existentes
SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC LIMIT 5;

-- 2. Para tornar um usuário existente admin, substitua o email abaixo:
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE email = 'SEU_EMAIL_AQUI@exemplo.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- 3. Verificar se funcionou:
SELECT 
  u.email,
  ur.role,
  u.created_at
FROM auth.users u
JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email = 'SEU_EMAIL_AQUI@exemplo.com';

-- 4. Se não tiver usuário, crie um temporário (substitua os valores):
-- INSERT INTO auth.users (
--   id,
--   email,
--   encrypted_password,
--   email_confirmed_at,
--   created_at,
--   updated_at,
--   raw_user_meta_data,
--   raw_app_meta_data,
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
--   'authenticated',
--   'authenticated'
-- );

-- 5. Depois torne o usuário de teste admin:
-- INSERT INTO public.user_roles (user_id, role)
-- SELECT id, 'admin'::public.app_role
-- FROM auth.users
-- WHERE email = 'admin@teste.com'
-- ON CONFLICT (user_id, role) DO NOTHING;
