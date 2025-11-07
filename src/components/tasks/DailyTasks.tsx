import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { formatDateLocal } from "@/lib/utils";

type ProjectStatus =
  | "em_criacao"
  | "em_elaboracao"
  | "em_analise"
  | "em_complementacao"
  | "solicitado_documentacao"
  | "aguardando_documentacao"
  | "clausula_suspensiva"
  | "aprovado"
  | "em_execucao"
  | "prestacao_contas"
  | "concluido"
  | "cancelado";

interface RawProject {
  id: string;
  object: string;
  status: ProjectStatus;
  municipalities?: { name: string } | null;
  programs?: { name: string; status: string; deadline: string | null } | null;
}

interface TaskItem {
  project_id: string;
  municipality: string;
  program: string;
  due_date: string | null;
  status: ProjectStatus;
  object: string;
}

const formatDate = (date: string | null) => formatDateLocal(date);

const isSameDay = (isoDate?: string | null) => {
  if (!isoDate) return false;
  const d = new Date(isoDate);
  const t = new Date();
  return (
    d.getFullYear() === t.getFullYear() &&
    d.getMonth() === t.getMonth() &&
    d.getDate() === t.getDate()
  );
};

const isWithinNextDays = (isoDate?: string | null, days = 7) => {
  if (!isoDate) return false;
  const d = new Date(isoDate);
  const today = new Date();
  const limit = new Date();
  limit.setDate(today.getDate() + days);
  // normalizar horas
  d.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  limit.setHours(0, 0, 0, 0);
  return d > today && d <= limit;
};

export const DailyTasks = () => {
  const [loading, setLoading] = useState(true);
  const [todayTasks, setTodayTasks] = useState<TaskItem[]>([]);
  const [nextTasks, setNextTasks] = useState<TaskItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("projects")
        .select(
          "id, object, status, municipalities(name), programs(name, status, deadline)"
        );
      if (error) throw error;

      const projects = (data || []) as RawProject[];
      // Programas abertos + municípios que faltam enviar documentos
      const pendingStatuses: ProjectStatus[] = [
        "solicitado_documentacao",
        "aguardando_documentacao",
        "em_complementacao",
      ];

      const filtered = projects.filter(
        (p) => p.programs?.status === "Aberto" && pendingStatuses.includes(p.status)
      );

      const items: TaskItem[] = filtered.map((p) => ({
        project_id: p.id,
        municipality: p.municipalities?.name || "—",
        program: p.programs?.name || "—",
        // Usamos prazo do programa como "atendimento previsto"; quando a coluna
        // document_deadline_date estiver disponível, podemos substituir aqui.
        due_date: p.programs?.deadline || null,
        status: p.status,
        object: p.object,
      }));

      // Sempre ordenar por menor prazo (ordem padrão obrigatória)
      const sortByDue = (arr: TaskItem[]) =>
        arr
          .slice()
          .sort((a, b) => {
            const aDue = a.due_date ? new Date(a.due_date).getTime() : Infinity;
            const bDue = b.due_date ? new Date(b.due_date).getTime() : Infinity;
            return aDue - bDue;
          });

      setTodayTasks(sortByDue(items.filter((i) => isSameDay(i.due_date))));
      setNextTasks(sortByDue(items.filter((i) => isWithinNextDays(i.due_date, 7))));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const statusLabel = (status: ProjectStatus) => {
    const labels: Record<ProjectStatus, string> = {
      em_criacao: "Em Criação",
      em_elaboracao: "Em Elaboração",
      em_analise: "Em Análise",
      em_complementacao: "Em Complementação",
      solicitado_documentacao: "Solicitado Documentação",
      aguardando_documentacao: "Aguardando Documentação",
      clausula_suspensiva: "Cláusula Suspensiva",
      aprovado: "Aprovado",
      em_execucao: "Em Execução",
      prestacao_contas: "Prestação de Contas",
      concluido: "Concluído",
      cancelado: "Cancelado",
    };
    return labels[status];
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
        <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Atividades do Dia
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
          ) : todayTasks.length === 0 ? (
            <div className="text-sm text-muted-foreground">Sem atividades previstas para hoje.</div>
          ) : (
            <div className="space-y-3">
              {todayTasks.map((t) => (
                <div key={t.project_id} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">
                      {t.municipality} — {t.program}
                    </div>
                    <div className="text-sm text-muted-foreground">{t.object}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">{statusLabel(t.status)}</Badge>
                    <span className="text-sm font-medium">{formatDate(t.due_date)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Próximos 7 dias
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Carregando...</div>
          ) : error ? (
            <div className="text-sm text-destructive">{error}</div>
          ) : nextTasks.length === 0 ? (
            <div className="text-sm text-muted-foreground">Sem atividades previstas.</div>
          ) : (
            <div className="space-y-3">
              {nextTasks.map((t) => (
                <div key={t.project_id} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">
                      {t.municipality} — {t.program}
                    </div>
                    <div className="text-sm text-muted-foreground">{t.object}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">{statusLabel(t.status)}</Badge>
                    <span className="text-sm font-medium">{formatDate(t.due_date)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DailyTasks;