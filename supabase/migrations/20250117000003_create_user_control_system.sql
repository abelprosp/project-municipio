-- Migração para criar sistema de controle de usuários e atividades
-- Esta migração cria tabelas para rastrear atividades, tarefas e notificações

-- Tabela para rastrear atividades dos usuários
CREATE TABLE IF NOT EXISTS public.user_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'create', 'update', 'delete', 'view', 'export', etc.
  entity_type TEXT NOT NULL, -- 'project', 'municipality', 'program', 'movement', etc.
  entity_id UUID NOT NULL,
  entity_name TEXT, -- Nome/descrição da entidade para facilitar visualização
  description TEXT NOT NULL, -- Descrição da atividade
  metadata JSONB, -- Dados adicionais da atividade
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para tarefas criadas pelos usuários
CREATE TABLE IF NOT EXISTS public.user_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  related_entity_type TEXT, -- 'project', 'municipality', 'program', etc.
  related_entity_id UUID,
  tags TEXT[], -- Tags para categorizar tarefas
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para notificações
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('task_assigned', 'task_due', 'task_completed', 'activity_mention', 'system_alert', 'project_update')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  related_entity_type TEXT, -- 'project', 'task', 'municipality', etc.
  related_entity_id UUID,
  metadata JSONB, -- Dados adicionais da notificação
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Tabela para configurações de notificação por usuário
CREATE TABLE IF NOT EXISTS public.user_notification_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email_notifications BOOLEAN DEFAULT TRUE,
  push_notifications BOOLEAN DEFAULT TRUE,
  task_reminders BOOLEAN DEFAULT TRUE,
  activity_alerts BOOLEAN DEFAULT TRUE,
  system_alerts BOOLEAN DEFAULT TRUE,
  reminder_frequency TEXT DEFAULT 'daily' CHECK (reminder_frequency IN ('immediate', 'hourly', 'daily', 'weekly')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON public.user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_entity ON public.user_activities(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_created_at ON public.user_activities(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_tasks_created_by ON public.user_tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_user_tasks_assigned_to ON public.user_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_user_tasks_status ON public.user_tasks(status);
CREATE INDEX IF NOT EXISTS idx_user_tasks_due_date ON public.user_tasks(due_date);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON public.user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_is_read ON public.user_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at ON public.user_notifications(created_at DESC);

-- RLS (Row Level Security)
ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notification_settings ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para user_activities
CREATE POLICY "Users can view their own activities" ON public.user_activities
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activities" ON public.user_activities
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all activities" ON public.user_activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Políticas RLS para user_tasks
CREATE POLICY "Users can view tasks assigned to them or created by them" ON public.user_tasks
  FOR SELECT USING (
    auth.uid() = created_by OR auth.uid() = assigned_to OR
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can create tasks" ON public.user_tasks
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update tasks assigned to them or created by them" ON public.user_tasks
  FOR UPDATE USING (
    auth.uid() = created_by OR auth.uid() = assigned_to OR
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Políticas RLS para user_notifications
CREATE POLICY "Users can view their own notifications" ON public.user_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.user_notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON public.user_notifications
  FOR INSERT WITH CHECK (true);

-- Políticas RLS para user_notification_settings
CREATE POLICY "Users can view their own notification settings" ON public.user_notification_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification settings" ON public.user_notification_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification settings" ON public.user_notification_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_user_tasks_updated_at BEFORE UPDATE ON public.user_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_notification_settings_updated_at BEFORE UPDATE ON public.user_notification_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
