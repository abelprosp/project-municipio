import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { FolderKanban, CalendarDays, User } from "lucide-react";
import { ProjectDialog } from "@/components/projects/ProjectDialog";
import ProjectInfoDialog from "@/components/projects/ProjectInfoDialog";

type ProjectStatus =
  | "em_criacao"
  | "enviado"
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

interface Project {
  id: string;
  object: string;
  status: ProjectStatus;
  end_date: string | null;
  municipalities: { name: string };
  programs?: { name: string; status: string } | null;
}

interface Movement {
  id: string;
  project_id: string;
  description: string;
  stage: ProjectStatus;
  responsible: string | null;
  date: string;
}

const STATUS_LABEL: Record<ProjectStatus, string> = {
  em_criacao: "Em Criação",
  enviado: "Enviado",
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

const BOARD_COLUMNS: ProjectStatus[] = [
  "em_criacao",
  "enviado",
  "em_analise",
  "em_complementacao",
  "solicitado_documentacao",
  "aguardando_documentacao",
  "clausula_suspensiva",
  "aprovado",
  "em_execucao",
  "prestacao_contas",
  "concluido",
];

export function KanbanBoard() {
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any | undefined>(undefined);
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const [detailProject, setDetailProject] = useState<any | undefined>(undefined);
  const [activityForm, setActivityForm] = useState({
    description: "",
    responsible: "",
    date: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => {
    loadProjectsAndMovements();
  }, []);

  const loadProjectsAndMovements = async () => {
    try {
      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .select(`*, municipalities(name), programs(name, status)`) // relies on FK relations
        .order("created_at", { ascending: false });

      if (projectError) throw projectError;
      const casted = (projectData || []) as any[];
      const normalized: Project[] = casted.map((p) => ({
        id: p.id,
        object: p.object,
        status: p.status,
        end_date: p.end_date,
        municipalities: p.municipalities,
        programs: p.programs ?? null,
      }));
      setProjects(normalized);

      const ids = normalized.map((p) => p.id);
      if (ids.length > 0) {
        const { data: movementsData, error: movementsError } = await supabase
          .from("movements")
          .select("*")
          .in("project_id", ids)
          .order("date", { ascending: false });

        if (movementsError) throw movementsError;
        setMovements((movementsData || []) as Movement[]);
      } else {
        setMovements([]);
      }
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const movementsByProject = useMemo(() => {
    const map = new Map<string, Movement[]>();
    for (const m of movements) {
      const arr = map.get(m.project_id) || [];
      arr.push(m);
      map.set(m.project_id, arr);
    }
    return map;
  }, [movements]);

  const latestResponsible = (projectId: string) => {
    const arr = movementsByProject.get(projectId) || [];
    return arr[0]?.responsible || "—";
  };

  const formatDate = (date?: string | null) => {
    if (!date) return "—";
    try {
      return new Intl.DateTimeFormat("pt-BR").format(new Date(date));
    } catch {
      return date;
    }
  };

  const onDragStart = (id: string) => setDraggedId(id);

  const onDropTo = async (newStatus: ProjectStatus) => {
    if (!draggedId) return;
    const project = projects.find((p) => p.id === draggedId);
    if (!project || project.status === newStatus) {
      setDraggedId(null);
      return;
    }
    try {
      const { error } = await supabase
        .from("projects")
        .update({ status: newStatus })
        .eq("id", draggedId);

      if (error) throw error;

      // Record movement for acompanhamento (com created_by)
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("movements").insert({
        project_id: draggedId,
        stage: newStatus,
        description: `Status atualizado para ${STATUS_LABEL[newStatus]}`,
        responsible: null,
        date: new Date().toISOString(),
        created_by: user ? user.id : null,
      });

      // Notificação de mudança de status
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from("notifications")
            .insert({
              user_id: user.id,
              title: "Status atualizado",
              message: `Projeto movido para ${STATUS_LABEL[newStatus]}.`,
              link: "/projects",
              type: "info",
            });
        }
      } catch {
        // silencioso
      }

      setProjects((prev) => prev.map((p) => (p.id === draggedId ? { ...p, status: newStatus } : p)));
      // Refresh movements list
      const { data: newMovements } = await supabase
        .from("movements")
        .select("*")
        .eq("project_id", draggedId)
        .order("date", { ascending: false });
      setMovements((prev) => {
        const others = prev.filter((m) => m.project_id !== draggedId);
        return [...others, ...((newMovements || []) as Movement[])];
      });
      toast({ title: "Projeto movido", description: "Status atualizado com sucesso." });
    } catch (err: any) {
      toast({ title: "Erro ao mover projeto", description: err.message, variant: "destructive" });
    } finally {
      setDraggedId(null);
    }
  };

  const daysUntil = (date?: string | null) => {
    if (!date) return null;
    try {
      const target = new Date(date).getTime();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diff = Math.floor((target - today.getTime()) / (1000 * 60 * 60 * 24));
      return diff;
    } catch {
      return null;
    }
  };

  const dueBadge = (date?: string | null) => {
    const d = daysUntil(date);
    if (d === null) return { variant: "secondary" as const, label: "Sem prazo" };
    if (d < 0) return { variant: "destructive" as const, label: `Vencido há ${Math.abs(d)}d` };
    if (d <= 7) return { variant: "outline" as const, label: `Vence em ${d}d` };
    return { variant: "default" as const, label: `Em ${d}d` };
  };

  const openActivityDialog = (project: Project) => {
    setActiveProject(project);
    setActivityForm({ description: "", responsible: "", date: new Date().toISOString().slice(0, 10) });
    setActivityDialogOpen(true);
  };

  const saveActivity = async () => {
    if (!activeProject) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("movements").insert({
        project_id: activeProject.id,
        stage: activeProject.status,
        description: activityForm.description,
        responsible: activityForm.responsible || null,
        date: new Date(activityForm.date).toISOString(),
        created_by: user ? user.id : null,
      });
      if (error) throw error;

      toast({ title: "Atividade registrada", description: "Acompanhamento atualizado." });
      setActivityDialogOpen(false);
      await loadProjectsAndMovements();
    } catch (err: any) {
      toast({ title: "Erro ao salvar atividade", description: err.message, variant: "destructive" });
    }
  };

  const openReportDialog = (project: Project) => {
    setActiveProject(project);
    setReportDialogOpen(true);
  };

  const openEditDialog = async (project: Project) => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", project.id)
        .single();
      if (error) throw error;
      setSelectedProject(data);
      setEditDialogOpen(true);
    } catch (err: any) {
      toast({ title: "Erro ao abrir edição", description: err.message, variant: "destructive" });
    }
  };

  const openInfoDialog = async (project: Project) => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", project.id)
        .single();
      if (error) throw error;
      setDetailProject(data);
      setInfoDialogOpen(true);
    } catch (err: any) {
      toast({ title: "Erro ao abrir detalhes", description: err.message, variant: "destructive" });
    }
  };

  const projectsByColumn = useMemo(() => {
    const map: Record<ProjectStatus, Project[]> = {
      em_criacao: [],
      enviado: [],
      em_analise: [],
      em_complementacao: [],
      solicitado_documentacao: [],
      aguardando_documentacao: [],
      clausula_suspensiva: [],
      aprovado: [],
      em_execucao: [],
      prestacao_contas: [],
      concluido: [],
      cancelado: [],
    };
    for (const p of projects) {
      if (map[p.status]) map[p.status].push(p);
    }
    return map;
  }, [projects]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <FolderKanban className="h-5 w-5" /> Kanban de Projetos
        </h3>
        <Button variant="outline" onClick={loadProjectsAndMovements}>Atualizar</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {BOARD_COLUMNS.map((status) => (
          <div
            key={status}
            className="rounded-lg border bg-muted/30 flex flex-col"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDropTo(status)}
          >
            <div className="sticky top-0 z-10 p-3 border-b bg-muted/60 backdrop-blur">
              <span className="text-sm font-medium">{STATUS_LABEL[status]}</span>
              <Badge variant="secondary" className="ml-2 rounded-full px-2">
                {(projectsByColumn[status] || []).length}
              </Badge>
            </div>
            <div className="p-3 space-y-3 min-h-[140px] overflow-y-auto max-h-[70vh]">
              {(projectsByColumn[status] || []).map((project) => (
                <Card
                  key={project.id}
                  draggable
                  onDragStart={() => onDragStart(project.id)}
                  onClick={() => openInfoDialog(project)}
                  className="shadow-sm hover:shadow-md transition-shadow"
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-sm line-clamp-2">{project.object}</CardTitle>
                      <div className="text-right">
                        {project.programs?.status === "Aberto" && (
                          <Badge className="text-xs">Programa aberto</Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {project.municipalities?.name}
                      {project.programs?.name && (
                        <span className="ml-1">• Programa: {project.programs.name}</span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Prazo</span>
                        <span className="font-medium ml-1">{formatDate(project.end_date)}</span>
                      </div>
                      <div className="flex items-center gap-1 justify-end">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Responsável</span>
                        <span className="font-medium ml-1">{latestResponsible(project.id)}</span>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <Badge variant={dueBadge(project.end_date).variant} className="text-xs">
                        {dueBadge(project.end_date).label}
                      </Badge>
                    </div>

                    {/* Ações removidas do card: serão exibidas dentro do modal de edição */}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Dialog: Add Activity */}
      <Dialog open={activityDialogOpen} onOpenChange={setActivityDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar atividade</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                rows={3}
                value={activityForm.description}
                onChange={(e) => setActivityForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="responsible">Responsável</Label>
                <Input
                  id="responsible"
                  value={activityForm.responsible}
                  onChange={(e) => setActivityForm((f) => ({ ...f, responsible: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="date">Data</Label>
                <Input
                  id="date"
                  type="date"
                  value={activityForm.date}
                  onChange={(e) => setActivityForm((f) => ({ ...f, date: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={saveActivity}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Reports */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Relatório do projeto</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[340px] pr-3">
            <div className="space-y-4">
              {activeProject && (movementsByProject.get(activeProject.id) || []).length === 0 && (
                <div className="text-sm text-muted-foreground">Nenhuma atividade registrada</div>
              )}
              {activeProject && (movementsByProject.get(activeProject.id) || []).map((m) => (
                <div key={m.id} className="rounded-md border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{STATUS_LABEL[m.stage]}</span>
                    <span className="text-muted-foreground">{formatDate(m.date)}</span>
                  </div>
                  <div className="mt-1">{m.description}</div>
                  <div className="mt-1 text-muted-foreground">Responsável: {m.responsible || "—"}</div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Dialog: Edit project (full) */}
      <ProjectDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        project={selectedProject}
        onSuccess={loadProjectsAndMovements}
        onOpenActivity={(p) => openActivityDialog(p as any)}
        onOpenReport={(p) => openReportDialog(p as any)}
      />

      <ProjectInfoDialog
        open={infoDialogOpen}
        onOpenChange={setInfoDialogOpen}
        project={detailProject}
        latestResponsible={(id) => latestResponsible(id)}
        onOpenActivity={(p) => openActivityDialog(p as any)}
        onOpenReport={(p) => openReportDialog(p as any)}
        onEdit={() => {
          if (!detailProject?.id) return;
          setSelectedProject(detailProject);
          setInfoDialogOpen(false);
          setEditDialogOpen(true);
        }}
      />
    </div>
  );
}