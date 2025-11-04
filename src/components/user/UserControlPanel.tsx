import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Activity, 
  Bell, 
  CheckSquare, 
  Clock, 
  Plus, 
  Settings, 
  User, 
  Calendar,
  AlertCircle,
  CheckCircle,
  XCircle,
  PlayCircle
} from "lucide-react";
import { useUserControl, UserTask, UserNotification } from "@/hooks/use-user-control";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface UserControlPanelProps {
  className?: string;
}

export function UserControlPanel({ className }: UserControlPanelProps) {
  const {
    activities,
    tasks,
    notifications,
    notificationSettings,
    loading,
    createTask,
    updateTask,
    markNotificationAsRead,
    updateNotificationSettings,
    getUserStats
  } = useUserControl();

  const [newTaskDialogOpen, setNewTaskDialogOpen] = useState(false);
  const [editTaskDialogOpen, setEditTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<UserTask | null>(null);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [taskStatusFilter, setTaskStatusFilter] = useState<'all' | 'in_progress' | 'completed'>('all');
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "medium" as const,
    dueDate: "",
    tags: "",
    assignedTo: ""
  });

  const [users, setUsers] = useState<{ id: string; name: string; email: string }[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("profiles").select("id, name, email").order("name");
      setUsers(data || []);
    })();
  }, []);

  const stats = getUserStats();

  type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
  type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
  interface EditFormState {
    title: string;
    description: string;
    priority: TaskPriority;
    status: TaskStatus;
    dueDate: string;
    tags: string;
    assignedTo?: string;
  }

  const [editForm, setEditForm] = useState<EditFormState>({
    title: "",
    description: "",
    priority: "medium",
    status: "pending",
    dueDate: "",
    tags: "",
    assignedTo: ""
  });

  const openEditTask = (task: UserTask) => {
    setEditingTask(task);
    setEditForm({
      title: task.title,
      description: task.description || "",
      priority: task.priority,
      status: task.status,
      dueDate: task.due_date ? task.due_date.substring(0, 10) : "",
      tags: (task.tags || []).join(", "),
      assignedTo: task.assigned_to || ""
    });
    setEditTaskDialogOpen(true);
  };

  const handleSaveTask = async () => {
    if (!editingTask) return;
    try {
      const updates: any = {
        title: editForm.title,
        description: editForm.description,
        priority: editForm.priority,
        status: editForm.status,
        due_date: editForm.dueDate ? new Date(editForm.dueDate).toISOString() : null,
        tags: editForm.tags ? editForm.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
        assigned_to: editForm.assignedTo || null
      };
      await updateTask(editingTask.id, updates);
      setEditTaskDialogOpen(false);
      setEditingTask(null);
    } catch (error) {
      console.error("Erro ao salvar tarefa:", error);
    }
  };

  const handleCreateTask = async () => {
    try {
      await createTask(
        newTask.title,
        newTask.description,
        newTask.assignedTo || undefined,
        newTask.priority,
        newTask.dueDate || undefined,
        undefined, // relatedEntityType
        undefined, // relatedEntityId
        newTask.tags ? newTask.tags.split(",").map(tag => tag.trim()) : []
      );
      
      setNewTask({
        title: "",
        description: "",
        priority: "medium",
        dueDate: "",
        tags: "",
        assignedTo: ""
      });
      setNewTaskDialogOpen(false);
    } catch (error) {
      console.error("Erro ao criar tarefa:", error);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, status: UserTask['status']) => {
    try {
      await updateTask(taskId, { status });
    } catch (error) {
      console.error("Erro ao atualizar tarefa:", error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'Urgente';
      case 'high': return 'Alta';
      case 'medium': return 'Média';
      case 'low': return 'Baixa';
      default: return priority;
    }
  };

  const compareByDueAndPriority = (a: UserTask, b: UserTask) => {
    const priorityRank: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
    // 1) Prioridade (menor rank = mais urgente)
    const prA = priorityRank[a.priority] ?? 99;
    const prB = priorityRank[b.priority] ?? 99;
    if (prA !== prB) return prA - prB;

    // 2) Vencimento: primeiro vencidas (overdue), depois mais próximas
    const now = Date.now();
    const dueA = a.due_date ? new Date(a.due_date).getTime() : Infinity;
    const dueB = b.due_date ? new Date(b.due_date).getTime() : Infinity;

    const overdueA = dueA < now ? 1 : 0;
    const overdueB = dueB < now ? 1 : 0;
    if (overdueA !== overdueB) return overdueB - overdueA; // 1 antes de 0 (overdue primeiro)

    if (dueA !== dueB) return dueA - dueB; // mais próximo primeiro

    // 3) Desempate por criação (mais antigo primeiro)
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in_progress': return <PlayCircle className="h-4 w-4 text-blue-600" />;
      case 'cancelled': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Carregando...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Painel de Controle
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="tasks">Tarefas</TabsTrigger>
            <TabsTrigger value="activities">Atividades</TabsTrigger>
            <TabsTrigger value="notifications">Notificações</TabsTrigger>
          </TabsList>

          {/* Visão Geral */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-muted-foreground">Atividades</span>
                  </div>
                  <div className="text-2xl font-bold">{stats.totalActivities}</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-muted-foreground">Tarefas</span>
                  </div>
                  <div className="text-2xl font-bold">{stats.totalTasks}</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-orange-600" />
                    <span className="text-sm text-muted-foreground">Pendentes</span>
                  </div>
                  <div className="text-2xl font-bold">{stats.pendingTasks}</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-purple-600" />
                    <span className="text-sm text-muted-foreground">Notificações</span>
                  </div>
                  <div className="text-2xl font-bold">{stats.unreadNotifications}</div>
                </CardContent>
              </Card>
            </div>

            {/* Tarefas Recentes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tarefas Recentes</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-48">
                  <div className="space-y-2">
                    {tasks
                      .slice()
                      .sort(compareByDueAndPriority)
                      .slice(0, 5)
                      .map((task) => (
                      <div key={task.id} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(task.status)}
                          <span className="text-sm font-medium">{task.title}</span>
                          <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                            {getPriorityLabel(task.priority)}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(task.created_at), { 
                            addSuffix: true, 
                            locale: ptBR 
                          })}
                        </span>
                      </div>
                    ))}
                    {tasks.length === 0 && (
                      <div className="text-center text-muted-foreground py-4">
                        Nenhuma tarefa encontrada
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tarefas */}
          <TabsContent value="tasks" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Minhas Tarefas</h3>
              <Dialog open={newTaskDialogOpen} onOpenChange={setNewTaskDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Tarefa
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nova Tarefa</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="task-title">Título</Label>
                      <Input
                        id="task-title"
                        value={newTask.title}
                        onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Digite o título da tarefa"
                      />
                    </div>
                    <div>
                      <Label htmlFor="task-description">Descrição</Label>
                      <Textarea
                        id="task-description"
                        value={newTask.description}
                        onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Descreva a tarefa"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="task-priority">Prioridade</Label>
                        <Select
                          value={newTask.priority}
                          onValueChange={(value: any) => setNewTask(prev => ({ ...prev, priority: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Baixa</SelectItem>
                            <SelectItem value="medium">Média</SelectItem>
                            <SelectItem value="high">Alta</SelectItem>
                            <SelectItem value="urgent">Urgente</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="task-due-date">Data de Vencimento</Label>
                        <Input
                          id="task-due-date"
                          type="date"
                          value={newTask.dueDate}
                          onChange={(e) => setNewTask(prev => ({ ...prev, dueDate: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="task-assigned">Responsável (opcional)</Label>
                        <Select
                          value={newTask.assignedTo || undefined}
                          onValueChange={(value: any) => setNewTask(prev => ({ ...prev, assignedTo: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um usuário" />
                          </SelectTrigger>
                          <SelectContent>
                            {users.map(u => (
                              <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="task-tags">Tags (separadas por vírgula)</Label>
                      <Input
                        id="task-tags"
                        value={newTask.tags}
                        onChange={(e) => setNewTask(prev => ({ ...prev, tags: e.target.value }))}
                        placeholder="ex: projeto, urgente, revisão"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setNewTaskDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleCreateTask}>
                        Criar Tarefa
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Filtro:</span>
                  <Button size="sm" variant={taskStatusFilter === 'all' ? 'default' : 'outline'} onClick={() => setTaskStatusFilter('all')}>Todas</Button>
                  <Button size="sm" variant={taskStatusFilter === 'in_progress' ? 'default' : 'outline'} onClick={() => setTaskStatusFilter('in_progress')}>Em andamento</Button>
                  <Button size="sm" variant={taskStatusFilter === 'completed' ? 'default' : 'outline'} onClick={() => setTaskStatusFilter('completed')}>Concluídas</Button>
                </div>
              </div>
              {tasks
                .filter(t => taskStatusFilter === 'all' ? true : t.status === taskStatusFilter)
                .slice()
                .sort(compareByDueAndPriority)
                .map((task) => (
                <Card key={task.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusIcon(task.status)}
                          <h4 className="font-medium">{task.title}</h4>
                          <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                            {getPriorityLabel(task.priority)}
                          </Badge>
                        </div>
                        {task.description && (
                          <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Criada: {formatDistanceToNow(new Date(task.created_at), { addSuffix: true, locale: ptBR })}</span>
                          {task.due_date && (
                            <span>Vence: {formatDistanceToNow(new Date(task.due_date), { addSuffix: true, locale: ptBR })}</span>
                          )}
                        </div>
                        {task.tags.length > 0 && (
                          <div className="flex gap-1 mt-2">
                            {task.tags.map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        {task.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateTaskStatus(task.id, 'in_progress')}
                          >
                            Iniciar
                          </Button>
                        )}
                        {task.status === 'in_progress' && (
                          <Button
                            size="sm"
                            onClick={() => handleUpdateTaskStatus(task.id, 'completed')}
                          >
                            Concluir
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => openEditTask(task)}>
                          Editar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {tasks.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  <CheckSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma tarefa encontrada</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Atividades */}
          <TabsContent value="activities" className="space-y-4">
            <h3 className="text-lg font-semibold">Histórico de Atividades</h3>
            <ScrollArea className="h-96">
              <div className="space-y-2">
                {activities.map((activity) => (
                  <Card key={activity.id}>
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <Activity className="h-4 w-4 text-blue-600 mt-1" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{activity.description}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <span>{activity.activity_type}</span>
                            <span>•</span>
                            <span>{activity.entity_type}</span>
                            <span>•</span>
                            <span>{formatDistanceToNow(new Date(activity.created_at), { addSuffix: true, locale: ptBR })}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {activities.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma atividade registrada</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Notificações */}
          <TabsContent value="notifications" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Notificações</h3>
              <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Settings className="h-4 w-4 mr-2" />
                    Configurações
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Configurações de Notificação</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    {notificationSettings && (
                      <>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="email-notifications"
                            checked={notificationSettings.email_notifications}
                            onCheckedChange={(checked) => 
                              updateNotificationSettings({ email_notifications: checked as boolean })
                            }
                          />
                          <Label htmlFor="email-notifications">Notificações por email</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="push-notifications"
                            checked={notificationSettings.push_notifications}
                            onCheckedChange={(checked) => 
                              updateNotificationSettings({ push_notifications: checked as boolean })
                            }
                          />
                          <Label htmlFor="push-notifications">Notificações push</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="task-reminders"
                            checked={notificationSettings.task_reminders}
                            onCheckedChange={(checked) => 
                              updateNotificationSettings({ task_reminders: checked as boolean })
                            }
                          />
                          <Label htmlFor="task-reminders">Lembretes de tarefas</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="activity-alerts"
                            checked={notificationSettings.activity_alerts}
                            onCheckedChange={(checked) => 
                              updateNotificationSettings({ activity_alerts: checked as boolean })
                            }
                          />
                          <Label htmlFor="activity-alerts">Alertas de atividade</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="system-alerts"
                            checked={notificationSettings.system_alerts}
                            onCheckedChange={(checked) => 
                              updateNotificationSettings({ system_alerts: checked as boolean })
                            }
                          />
                          <Label htmlFor="system-alerts">Alertas do sistema</Label>
                        </div>
                      </>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-2">
              {notifications.map((notification) => (
                <Card key={notification.id} className={!notification.is_read ? "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20" : ""}>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <Bell className={`h-4 w-4 mt-1 ${!notification.is_read ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-gray-500"}`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium">{notification.title}</h4>
                          {!notification.is_read && (
                            <Badge variant="secondary" className="text-xs">Nova</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                          <span>{formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: ptBR })}</span>
                          {!notification.is_read && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => markNotificationAsRead(notification.id)}
                              className="text-xs h-6 px-2"
                            >
                              Marcar como lida
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {notifications.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma notificação encontrada</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>

    {/* Dialogo de Edição de Tarefa */}
    <Dialog open={editTaskDialogOpen} onOpenChange={setEditTaskDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Tarefa</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="edit-title">Título</Label>
            <Input id="edit-title" value={editForm.title} onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="edit-description">Descrição</Label>
            <Textarea id="edit-description" value={editForm.description} onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-priority">Prioridade</Label>
              <Select value={editForm.priority} onValueChange={(value: any) => setEditForm(prev => ({ ...prev, priority: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-status">Status</Label>
              <Select value={editForm.status} onValueChange={(value: any) => setEditForm(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="in_progress">Em andamento</SelectItem>
                  <SelectItem value="completed">Concluída</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-due-date">Data de vencimento</Label>
              <Input id="edit-due-date" type="date" value={editForm.dueDate} onChange={(e) => setEditForm(prev => ({ ...prev, dueDate: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="edit-tags">Tags (vírgula)</Label>
              <Input id="edit-tags" value={editForm.tags} onChange={(e) => setEditForm(prev => ({ ...prev, tags: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label htmlFor="edit-assigned">Responsável (opcional)</Label>
            <Select value={editForm.assignedTo || undefined} onValueChange={(value: any) => setEditForm(prev => ({ ...prev, assignedTo: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um usuário" />
              </SelectTrigger>
              <SelectContent>
                {users.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditTaskDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveTask}>Salvar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
