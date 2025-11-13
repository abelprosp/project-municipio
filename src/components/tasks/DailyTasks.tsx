import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { formatDateLocal } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";
type TaskPriority = "low" | "medium" | "high" | "urgent";

interface UserTask {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  created_by: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

interface CategorizedTasks {
  today: UserTask[];
  upcoming: UserTask[];
  overdue: UserTask[];
}

const formatDate = (date: string | null) => formatDateLocal(date, "—");

const normalizeDate = (date: Date) => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized.getTime();
};

const ONE_DAY = 24 * 60 * 60 * 1000;

const categorizeTasks = (
  tasks: UserTask[],
  options: { upcomingDays: number; overdueDays: number }
): CategorizedTasks => {
  const today = normalizeDate(new Date());
  const upcomingLimit =
    options.upcomingDays > 0
      ? normalizeDate(new Date(Date.now() + options.upcomingDays * ONE_DAY))
      : null;
  const overdueCutoff =
    options.overdueDays > 0
      ? normalizeDate(new Date(Date.now() - options.overdueDays * ONE_DAY))
      : null;

  const buckets: CategorizedTasks = {
    today: [],
    upcoming: [],
    overdue: [],
  };

  tasks.forEach((task) => {
    if (!task.due_date) return;
    const due = normalizeDate(new Date(task.due_date));

    if (overdueCutoff !== null && due < overdueCutoff) {
      // ignorar tarefas muito antigas
      return;
    }

    if (due === today) {
      buckets.today.push(task);
      return;
    }

    if (due < today) {
      buckets.overdue.push(task);
      return;
    }

    if (upcomingLimit !== null && due <= upcomingLimit) {
      buckets.upcoming.push(task);
    } else if (upcomingLimit === null && due > today && due <= today) {
      // no-op, manter vazio quando intervalo 0
    } else if (upcomingLimit === null && due > today) {
      // quando não queremos mostrar futuros, ignorar
    } else if (upcomingLimit !== null && due > upcomingLimit) {
      // ignore tasks beyond range
    }
  });

  const sortByDue = (list: UserTask[]) =>
    list
      .slice()
      .sort(
        (a, b) =>
          new Date(a.due_date || "").getTime() - new Date(b.due_date || "").getTime()
      );

  return {
    today: sortByDue(buckets.today),
    upcoming: sortByDue(buckets.upcoming),
    overdue: sortByDue(buckets.overdue),
  };
};

export const DailyTasks = () => {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<UserTask[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"open" | "all" | "completed">("open");
  const [upcomingDays, setUpcomingDays] = useState<number>(30);
  const [overdueDays, setOverdueDays] = useState<number>(14);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setTasks([]);
        return;
      }

      const { data, error: tasksError } = await supabase
        .from("user_tasks")
        .select("*")
        .or(`created_by.eq.${user.id},assigned_to.eq.${user.id}`)
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (tasksError) throw tasksError;

      setTasks((data as Database["public"]["Tables"]["user_tasks"]["Row"][] | null) ?? []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setUpdatingTaskId(null);
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (statusFilter === "open") {
        return task.status === "pending" || task.status === "in_progress";
      }
      if (statusFilter === "completed") {
        return task.status === "completed";
      }
      return true; // "all"
    });
  }, [tasks, statusFilter]);

  const categorized = useMemo(
    () => categorizeTasks(filteredTasks, { upcomingDays, overdueDays }),
    [filteredTasks, upcomingDays, overdueDays]
  );

  const archivedTasks = useMemo(() => {
    return tasks
      .filter((task) => task.status === "cancelled")
      .sort(
        (a, b) =>
          new Date(
            b.completed_at || b.updated_at || b.due_date || b.created_at
          ).getTime() -
          new Date(
            a.completed_at || a.updated_at || a.due_date || a.created_at
          ).getTime()
      )
      .slice(0, 5);
  }, [tasks]);

  const statusLabel = (status: TaskStatus) => {
    switch (status) {
      case "pending":
        return "Pendente";
      case "in_progress":
        return "Em andamento";
      case "completed":
        return "Concluída";
      case "cancelled":
        return "Arquivada";
    }
  };

  const priorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case "urgent":
        return "destructive";
      case "high":
        return "default";
      case "medium":
        return "secondary";
      default:
        return "outline";
    }
  };

  const handleArchiveTask = async (task: UserTask) => {
    if (updatingTaskId) return;
    const confirmed = window.confirm(
      `Deseja marcar a tarefa "${task.title}" como concluída/arquivada?`
    );
    if (!confirmed) return;

    try {
      setUpdatingTaskId(task.id);
      const { error: updateError } = await supabase
        .from("user_tasks")
        .update({
          status: "cancelled",
          completed_at: new Date().toISOString(),
        })
        .eq("id", task.id);

      if (updateError) throw updateError;
      await load();
    } catch (err: any) {
      setUpdatingTaskId(null);
      setError(err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="grid gap-1">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Mostrar
            </Label>
            <Select
              value={statusFilter}
              onValueChange={(value: "open" | "all" | "completed") => setStatusFilter(value)}
            >
              <SelectTrigger className="h-8 w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Somente pendentes</SelectItem>
                <SelectItem value="completed">Somente concluídas</SelectItem>
                <SelectItem value="all">Todas as tarefas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Intervalo futuro
            </Label>
            <Select
              value={String(upcomingDays)}
              onValueChange={(value) => setUpcomingDays(Number(value))}
            >
              <SelectTrigger className="h-8 w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Somente hoje</SelectItem>
                <SelectItem value="7">Próximos 7 dias</SelectItem>
                <SelectItem value="30">Próximos 30 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Vencidas até
            </Label>
            <Select
              value={String(overdueDays)}
              onValueChange={(value) => setOverdueDays(Number(value))}
            >
              <SelectTrigger className="h-8 w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="14">Últimos 14 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          {filteredTasks.length} tarefa(s) dentro dos critérios
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              Atividades vencidas
              <Button
                variant="ghost"
                size="icon"
                onClick={load}
                disabled={loading}
                className="h-6 w-6"
                title="Atualizar"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Carregando...</div>
            ) : error ? (
              <div className="text-sm text-destructive">{error}</div>
            ) : categorized.overdue.length === 0 ? (
              <div className="text-sm text-muted-foreground">Nenhuma atividade vencida no intervalo selecionado.</div>
            ) : (
              <div className="space-y-3">
                {categorized.overdue.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    statusLabel={statusLabel}
                    priorityBadge={priorityBadge}
                    onArchive={handleArchiveTask}
                    loading={updatingTaskId === task.id}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              Atividades do dia
              <Button
                variant="ghost"
                size="icon"
                onClick={load}
                disabled={loading}
                className="h-6 w-6"
                title="Atualizar"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Carregando...</div>
            ) : error ? (
              <div className="text-sm text-destructive">{error}</div>
            ) : categorized.today.length === 0 ? (
              <div className="text-sm text-muted-foreground">Sem atividades programadas para hoje.</div>
            ) : (
              <div className="space-y-3">
                {categorized.today.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    statusLabel={statusLabel}
                    priorityBadge={priorityBadge}
                    onArchive={handleArchiveTask}
                    loading={updatingTaskId === task.id}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-1 md:col-span-2 xl:col-span-1">
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              Próximos dias
              <Button
                variant="ghost"
                size="icon"
                onClick={load}
                disabled={loading}
                className="h-6 w-6"
                title="Atualizar"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Carregando...</div>
            ) : error ? (
              <div className="text-sm text-destructive">{error}</div>
            ) : categorized.upcoming.length === 0 ? (
              <div className="text-sm text-muted-foreground">Sem atividades previstas para os próximos dias.</div>
            ) : (
              <div className="space-y-3">
                {categorized.upcoming.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    statusLabel={statusLabel}
                    priorityBadge={priorityBadge}
                    onArchive={handleArchiveTask}
                    loading={updatingTaskId === task.id}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {archivedTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base md:text-lg">Concluídas recentemente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {archivedTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-start justify-between gap-3 border rounded-md p-3 bg-muted/40"
              >
                <div className="space-y-1">
                  <span className="font-medium text-sm md:text-base line-through text-muted-foreground">
                    {task.title}
                  </span>
                  {task.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 max-w-[260px]">
                      {task.description}
                    </p>
                  )}
                </div>
                <div className="text-xs text-muted-foreground text-right">
                  Arquivada em{" "}
                  {formatDate(
                    task.completed_at || task.updated_at || task.due_date || task.created_at
                  )}
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Tarefas arquivadas antigas continuam disponíveis na aba “Tarefas”.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DailyTasks;

interface TaskRowProps {
  task: UserTask;
  statusLabel: (status: TaskStatus) => string;
  priorityBadge: (priority: TaskPriority) => "destructive" | "default" | "secondary" | "outline";
  onArchive?: (task: UserTask) => Promise<void>;
  loading?: boolean;
}

const TaskRow = ({ task, statusLabel, priorityBadge, onArchive, loading }: TaskRowProps) => {
  const canArchive =
    onArchive && (task.status === "pending" || task.status === "in_progress");
  return (
    <div className="flex items-start justify-between gap-3 border rounded-md p-3">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm md:text-base">{task.title}</span>
          <Badge variant={priorityBadge(task.priority)} className="text-[11px] uppercase tracking-wide">
            {task.priority === "urgent"
              ? "Urgente"
              : task.priority === "high"
              ? "Alta"
              : task.priority === "medium"
              ? "Média"
              : "Baixa"}
          </Badge>
        </div>
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 max-w-[260px]">{task.description}</p>
        )}
      </div>
      <div className="flex flex-col items-end gap-2 min-w-[120px]">
        <Badge variant="secondary">{statusLabel(task.status)}</Badge>
        <span className="text-xs text-muted-foreground">{formatDate(task.due_date)}</span>
        {canArchive && (
          <Button
            size="sm"
            variant="ghost"
            className="text-xs h-7"
            onClick={() => onArchive?.(task)}
            disabled={loading}
          >
            {loading ? "Atualizando..." : "Concluir"}
          </Button>
        )}
      </div>
    </div>
  );
};