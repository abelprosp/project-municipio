# Instruções para Configurar o Sistema de Controle de Usuários

## 📋 Migrações Necessárias

Para que o sistema de controle de usuários funcione corretamente, você precisa executar as seguintes migrações no Supabase SQL Editor:

### 1. Migração do Sistema de Controle de Usuários
**Arquivo**: `supabase/migrations/20250117000003_create_user_control_system.sql`

Esta migração cria:
- Tabela `user_activities` - Registra atividades dos usuários
- Tabela `user_tasks` - Sistema de tarefas pessoais
- Tabela `user_notifications` - Notificações em tempo real
- Tabela `user_notification_settings` - Configurações de notificação
- Políticas RLS (Row Level Security)
- Índices para performance

### 2. Migração da Tabela de Perfis
**Arquivo**: `supabase/migrations/20250117000004_create_profiles_table.sql`

Esta migração cria:
- Tabela `profiles` - Informações adicionais dos usuários
- Trigger para criar perfil automaticamente
- Políticas RLS

## 🚀 Como Executar

1. **Acesse o Supabase Dashboard**
   - Vá para [supabase.com](https://supabase.com)
   - Faça login na sua conta
   - Selecione seu projeto

2. **Abra o SQL Editor**
   - No menu lateral, clique em "SQL Editor"
   - Clique em "New query"

3. **Execute as Migrações**
   - Copie o conteúdo do arquivo `20250117000003_create_user_control_system.sql`
   - Cole no editor SQL
   - Clique em "Run" para executar
   - Repita o processo para `20250117000004_create_profiles_table.sql`

## ✅ Verificação

Após executar as migrações, você deve ver as seguintes tabelas no Supabase:
- `user_activities`
- `user_tasks`
- `user_notifications`
- `user_notification_settings`
- `profiles`

## 🔧 Configuração de Usuário Admin

Para testar as funcionalidades, você precisa ter um usuário com role de admin:

1. **Crie um usuário** através do sistema de autenticação
2. **Execute o SQL** para dar permissão de admin:

```sql
-- Substitua 'SEU_EMAIL@exemplo.com' pelo email do usuário
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE email = 'SEU_EMAIL@exemplo.com'
ON CONFLICT (user_id, role) DO NOTHING;
```

## 🎯 Funcionalidades Disponíveis

Após a configuração, você terá acesso a:

### Página de Controle do Usuário (`/user-control`)
- **Aba Perfil**: Editar informações pessoais
- **Aba Segurança**: Alterar senha com validação
- **Aba Atividade**: Estatísticas do usuário

### Sistema de Atividades
- Log automático de todas as ações do usuário
- Histórico completo de atividades
- Notificações em tempo real

### Sistema de Tarefas
- Criar tarefas pessoais
- Definir prioridades e prazos
- Acompanhar progresso

### Sistema de Notificações
- Notificações personalizáveis
- Configurações por tipo
- Histórico de notificações

## 🔍 Botões de Criação

Os botões de criar município, projetos e programas estão funcionando normalmente e aparecem baseados nas permissões do usuário:

- **Admin**: Pode criar tudo
- **Gestor Municipal**: Pode criar projetos
- **Visualizador**: Apenas visualiza

## 🆘 Problemas Comuns

### Botões não aparecem
- Verifique se o usuário tem as permissões corretas
- Confirme se as tabelas `user_roles` e `profiles` foram criadas
- Verifique se o usuário está logado

### Erro de permissão
- Execute as migrações RLS
- Verifique se o usuário tem role atribuído
- Confirme se as políticas RLS estão ativas

### Página de controle não carrega
- Verifique se todas as migrações foram executadas
- Confirme se o usuário tem perfil criado
- Verifique os logs do console do navegador
