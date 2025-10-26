import { useState } from "react";
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
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "medium" as const,
    dueDate: "",
    tags: ""
  });

  const stats = getUserStats();

  const handleCreateTask = async () => {
    try {
      await createTask(
        newTask.title,
        newTask.description,
        undefined, // assignedTo - pode ser implementado depois
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
        tags: ""
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
                    {tasks.slice(0, 5).map((task) => (
                      <div key={task.id} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(task.status)}
                          <span className="text-sm font-medium">{task.title}</span>
                          <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                            {task.priority}
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
              {tasks.map((task) => (
                <Card key={task.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusIcon(task.status)}
                          <h4 className="font-medium">{task.title}</h4>
                          <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                            {task.priority}
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
                <Card key={notification.id} className={!notification.is_read ? "border-blue-200 bg-blue-50" : ""}>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <Bell className={`h-4 w-4 mt-1 ${!notification.is_read ? "text-blue-600" : "text-gray-400"}`} />
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
  );
}
