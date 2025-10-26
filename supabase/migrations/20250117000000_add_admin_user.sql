-- Script para adicionar um usuário admin para testes
-- Execute este script no Supabase SQL Editor após criar um usuário

-- Substitua 'USER_ID_AQUI' pelo ID do usuário que você quer tornar admin
-- Você pode encontrar o ID do usuário na tabela auth.users

-- Exemplo de uso:
-- INSERT INTO public.user_roles (user_id, role) 
-- VALUES ('USER_ID_AQUI', 'admin');

-- Para encontrar o ID do usuário atual:
-- SELECT id, email FROM auth.users WHERE email = 'seu-email@exemplo.com';

-- Para verificar se o usuário tem permissões de admin:
-- SELECT ur.role, u.email 
-- FROM public.user_roles ur 
-- JOIN auth.users u ON ur.user_id = u.id 
-- WHERE u.email = 'seu-email@exemplo.com';
