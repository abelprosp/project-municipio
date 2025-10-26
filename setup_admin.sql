-- Script Simplificado para Configurar Admin
-- Execute este SQL no Supabase SQL Editor

-- 1. Ver usuários existentes
SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC LIMIT 5;

-- 2. Para tornar um usuário existente admin (SUBSTITUA O EMAIL):
-- Exemplo: WHERE email = 'seuemail@gmail.com'
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE email = 'SEU_EMAIL_AQUI@exemplo.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- 3. Verificar se funcionou:
SELECT 
  u.email,
  ur.role
FROM auth.users u
JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email = 'SEU_EMAIL_AQUI@exemplo.com';

-- 4. Se não aparecer nada, significa que o email não existe
-- Verifique todos os usuários:
SELECT email FROM auth.users ORDER BY created_at DESC;
