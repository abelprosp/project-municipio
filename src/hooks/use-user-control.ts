import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface UserActivity {
  id: string;
  user_id: string;
  activity_type: string;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  description: string;
  metadata: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface UserTask {
  id: string;
  created_by: string;
  assigned_to?: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  due_date?: string;
  completed_at?: string;
  related_entity_type?: string;
  related_entity_id?: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface UserNotification {
  id: string;
  user_id: string;
  type: 'task_assigned' | 'task_due' | 'task_completed' | 'activity_mention' | 'system_alert' | 'project_update';
  title: string;
  message: string;
  is_read: boolean;
  related_entity_type?: string;
  related_entity_id?: string;
  metadata: any;
  created_at: string;
  read_at?: string;
}

export interface NotificationSettings {
  id: string;
  user_id: string;
  email_notifications: boolean;
  push_notifications: boolean;
  task_reminders: boolean;
  activity_alerts: boolean;
  system_alerts: boolean;
  reminder_frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  created_at: string;
  updated_at: string;
}

export function useUserControl() {
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [tasks, setTasks] = useState<UserTask[]>([]);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Carregar dados do usuário
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [activitiesRes, tasksRes, notificationsRes, settingsRes] = await Promise.all([
        supabase
          .from("user_activities")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50),
        
        supabase
          .from("user_tasks")
          .select("*")
          .or(`created_by.eq.${user.id},assigned_to.eq.${user.id}`)
          .order("created_at", { ascending: false }),
        
        supabase
          .from("user_notifications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20),
        
        supabase
          .from("user_notification_settings")
          .select("*")
          .eq("user_id", user.id)
          .single()
      ]);

      setActivities(activitiesRes.data || []);
      setTasks(tasksRes.data || []);
      setNotifications(notificationsRes.data || []);
      setNotificationSettings(settingsRes.data);
    } catch (error) {
      console.error("Erro ao carregar dados do usuário:", error);
    } finally {
      setLoading(false);
    }
  };

  // Registrar atividade do usuário
  const logActivity = async (
    activityType: string,
    entityType: string,
    entityId: string,
    entityName: string,
    description: string,
    metadata?: any
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("user_activities")
        .insert({
          user_id: user.id,
          activity_type: activityType,
          entity_type: entityType,
          entity_id: entityId,
          entity_name: entityName,
          description,
          metadata: metadata || {},
          ip_address: null, // Seria preenchido pelo backend
          user_agent: navigator.userAgent
        })
        .select()
        .single();

      if (error) throw error;

      // Atualizar estado local
      setActivities(prev => [data, ...prev.slice(0, 49)]);

      // Criar notificação se necessário
      await createNotification(
        'activity_mention',
        'Atividade Registrada',
        description,
        entityType,
        entityId
      );

    } catch (error) {
      console.error("Erro ao registrar atividade:", error);
    }
  };

  // Criar tarefa
  const createTask = async (
    title: string,
    description: string,
    assignedTo?: string,
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium',
    dueDate?: string,
    relatedEntityType?: string,
    relatedEntityId?: string,
    tags: string[] = []
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("user_tasks")
        .insert({
          created_by: user.id,
          assigned_to: assignedTo,
          title,
          description,
          priority,
          due_date: dueDate,
          related_entity_type: relatedEntityType,
          related_entity_id: relatedEntityId,
          tags
        })
        .select()
        .single();

      if (error) throw error;

      // Atualizar estado local
      setTasks(prev => [data, ...prev]);

      // Criar notificação para o usuário atribuído
      if (assignedTo && assignedTo !== user.id) {
        await createNotification(
          'task_assigned',
          'Nova Tarefa Atribuída',
          `Você recebeu uma nova tarefa: ${title}`,
          'task',
          data.id,
          { task_title: title, created_by: user.id }
        );
      }

      return data;
    } catch (error) {
      console.error("Erro ao criar tarefa:", error);
      throw error;
    }
  };

  // Atualizar tarefa
  const updateTask = async (
    taskId: string,
    updates: Partial<UserTask>
  ) => {
    try {
      const { data, error } = await supabase
        .from("user_tasks")
        .update(updates)
        .eq("id", taskId)
        .select()
        .single();

      if (error) throw error;

      // Atualizar estado local
      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, ...data } : task
      ));

      // Criar notificação se a tarefa foi completada
      if (updates.status === 'completed') {
        await createNotification(
          'task_completed',
          'Tarefa Concluída',
          `A tarefa "${data.title}" foi concluída`,
          'task',
          taskId
        );
      }

      return data;
    } catch (error) {
      console.error("Erro ao atualizar tarefa:", error);
      throw error;
    }
  };

  // Criar notificação
  const createNotification = async (
    type: UserNotification['type'],
    title: string,
    message: string,
    relatedEntityType?: string,
    relatedEntityId?: string,
    metadata?: any
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("user_notifications")
        .insert({
          user_id: user.id,
          type,
          title,
          message,
          related_entity_type: relatedEntityType,
          related_entity_id: relatedEntityId,
          metadata: metadata || {}
        })
        .select()
        .single();

      if (error) throw error;

      // Atualizar estado local
      setNotifications(prev => [data, ...prev.slice(0, 19)]);

      return data;
    } catch (error) {
      console.error("Erro ao criar notificação:", error);
    }
  };

  // Marcar notificação como lida
  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("user_notifications")
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq("id", notificationId);

      if (error) throw error;

      // Atualizar estado local
      setNotifications(prev => prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, is_read: true, read_at: new Date().toISOString() }
          : notification
      ));
    } catch (error) {
      console.error("Erro ao marcar notificação como lida:", error);
    }
  };

  // Atualizar configurações de notificação
  const updateNotificationSettings = async (settings: Partial<NotificationSettings>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("user_notification_settings")
        .upsert({
          user_id: user.id,
          ...settings
        })
        .select()
        .single();

      if (error) throw error;

      setNotificationSettings(data);
      return data;
    } catch (error) {
      console.error("Erro ao atualizar configurações:", error);
      throw error;
    }
  };

  // Obter estatísticas do usuário
  const getUserStats = () => {
    const totalActivities = activities.length;
    const totalTasks = tasks.length;
    const pendingTasks = tasks.filter(task => task.status === 'pending').length;
    const completedTasks = tasks.filter(task => task.status === 'completed').length;
    const unreadNotifications = notifications.filter(notification => !notification.is_read).length;

    return {
      totalActivities,
      totalTasks,
      pendingTasks,
      completedTasks,
      unreadNotifications
    };
  };

  return {
    activities,
    tasks,
    notifications,
    notificationSettings,
    loading,
    logActivity,
    createTask,
    updateTask,
    createNotification,
    markNotificationAsRead,
    updateNotificationSettings,
    getUserStats,
    loadUserData
  };
}
