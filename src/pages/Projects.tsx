import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, LayoutList, KanbanSquare, FileText, History, Table as TableIcon, Activity, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ProjectDialog } from "@/components/projects/ProjectDialog";
import { KanbanBoard } from "@/components/projects/KanbanBoard";
import { ProjectsTable } from "@/components/projects/ProjectsTable";
import MunicipalityInfoDialog from "@/components/municipalities/MunicipalityInfoDialog";
import ProjectInfoDialog from "@/components/projects/ProjectInfoDialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { generateProjectsListPdf, generateProjectPdfById } from "@/lib/pdf";
import { exportProjectsToCsv, exportMovementsToCsv } from "@/lib/export";
import { usePermissions } from "@/hooks/use-permissions";

interface Project {
  id: string;
  year: number;
  proposal_number: string | null;
  object: string;
  ministry: string | null;
  status: string;
  transfer_amount: number;
  counterpart_amount: number;
  execution_percentage: number;
  municipality_id: string;
  municipalities: {
    name: string;
  };
  programs?: {
    name: string;
  } | null;
}

const Projects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | undefined>(undefined);
  const [viewMode, setViewMode] = useState<"lista" | "kanban" | "tabela">("lista");
  const [municipalities, setMunicipalities] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    municipality_id: "",
    program_id: "",
    ministry: "",
    status: "",
    from_date: "",
    to_date: "",
  });
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [activeProject, setActiveProject] = useState<any | null>(null);
  const [movements, setMovements] = useState<any[]>([]);
  const [historyFrom, setHistoryFrom] = useState<string>("");
  const [historyTo, setHistoryTo] = useState<string>("");
  const [activityForm, setActivityForm] = useState({ description: "", responsible: "", date: new Date().toISOString().slice(0, 10) });
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const [detailProject, setDetailProject] = useState<any | null>(null);
  const [munInfoOpen, setMunInfoOpen] = useState(false);
  const [detailMunicipality, setDetailMunicipality] = useState<any | null>(null);
  const [latestResponsibleMap, setLatestResponsibleMap] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const { permissions } = usePermissions();

  useEffect(() => {
    loadOptions();
    loadProjects();
  }, []);

  useEffect(() => {
    // Recarregar projetos quando filtros mudarem
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const loadOptions = async () => {
    try {
      const [{ data: muns }, { data: progs }] = await Promise.all([
        supabase.from("municipalities").select("id, name").order("name"),
        supabase.from("programs").select("id, name").order("name"),
      ]);
      setMunicipalities(muns || []);
      setPrograms(progs || []);
    } catch (error) {
      // silencioso
    }
  };

  const openInfoDialog = async (project: any) => {
    try {
      // Buscar dados completos do projeto, incluindo campos adicionais
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", project.id)
        .single();
      if (error) throw error;
      setDetailProject(data);

      // Buscar último responsável (movimentação mais recente)
      const { data: lastMov } = await supabase
        .from("movements")
        .select("responsible, date")
        .eq("project_id", project.id)
        .order("date", { ascending: false })
        .limit(1);
      const responsible = (lastMov && lastMov[0]?.responsible) || "—";
      setLatestResponsibleMap((m) => ({ ...m, [project.id]: responsible }));

      setInfoDialogOpen(true);
    } catch (err: any) {
      toast({ title: "Erro ao abrir detalhes", description: err.message, variant: "destructive" });
    }
  };

  const latestResponsible = (projectId: string) => latestResponsibleMap[projectId] || "—";

  const loadProjects = async () => {
    try {
      let query = supabase
        .from("projects")
        .select(`*, municipalities(name), programs(name)`) // usa FKs
        .order("created_at", { ascending: false });

      if (filters.municipality_id) {
        query = query.eq("municipality_id", filters.municipality_id);
      }
      if (filters.program_id) {
        query = query.eq("program_id", filters.program_id);
      }
      if (filters.ministry) {
        query = query.ilike("ministry", `%${filters.ministry}%`);
      }
      if (filters.status) {
        query = query.eq("status", filters.status);
      }
      if (filters.from_date) {
        query = query.gte("created_at", `${filters.from_date}T00:00:00.000Z`);
      }
      if (filters.to_date) {
        query = query.lte("created_at", `${filters.to_date}T23:59:59.999Z`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setProjects(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar projetos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openHistory = async (project: any) => {
    setActiveProject(project);
    setHistoryDialogOpen(true);
    try {
      let query = supabase
        .from("movements")
        .select("*")
        .eq("project_id", project.id)
        .order("date", { ascending: false });
      if (historyFrom) {
        const fromIso = `${historyFrom}T00:00:00.000Z`;
        query = query.gte("date", fromIso);
      }
      if (historyTo) {
        const toIso = `${historyTo}T23:59:59.999Z`;
        query = query.lte("date", toIso);
      }
      const { data, error } = await query;
      if (error) throw error;
      setMovements(data || []);
    } catch (err: any) {
      toast({ title: "Erro ao carregar histórico", description: err.message, variant: "destructive" });
    }
  };

  const openMunicipalityInfo = async (project: any) => {
    try {
      const { data, error } = await supabase
        .from("municipalities")
        .select("*")
        .eq("id", project.municipality_id)
        .single();
      if (error) throw error;
      setDetailMunicipality(data);
      setMunInfoOpen(true);
    } catch (err: any) {
      toast({ title: "Erro ao abrir município", description: err.message, variant: "destructive" });
    }
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
      setActivityForm({ description: "", responsible: "", date: new Date().toISOString().slice(0, 10) });
      await openHistory(activeProject);
    } catch (err: any) {
      toast({ title: "Erro ao salvar atividade", description: err.message, variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      em_criacao: "secondary",
      em_elaboracao: "outline",
      em_analise: "outline",
      em_complementacao: "outline",
      solicitado_documentacao: "outline",
      aguardando_documentacao: "outline",
      clausula_suspensiva: "destructive",
      aprovado: "default",
      em_execucao: "default",
      prestacao_contas: "secondary",
      concluido: "default",
      cancelado: "destructive",
    };

    const labels: Record<string, string> = {
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

    return (
      <Badge variant={variants[status] || "default"}>
        {labels[status] || status}
      </Badge>
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Carregando projetos...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Projetos</h2>
          <p className="text-sm md:text-base text-muted-foreground">Gerencie todos os projetos e convênios</p>
        </div>
        <div className="flex items-center gap-1 md:gap-2 flex-wrap">
          <Button size="sm" variant={viewMode === "lista" ? "default" : "outline"} onClick={() => setViewMode("lista")}>
            <LayoutList className="h-3 w-3 md:h-4 md:w-4 md:mr-2" /> 
            <span className="hidden sm:inline">Lista</span>
          </Button>
          <Button size="sm" variant={viewMode === "kanban" ? "default" : "outline"} onClick={() => setViewMode("kanban")}>
            <KanbanSquare className="h-3 w-3 md:h-4 md:w-4 md:mr-2" /> 
            <span className="hidden sm:inline">Kanban</span>
          </Button>
          <Button size="sm" variant={viewMode === "tabela" ? "default" : "outline"} onClick={() => setViewMode("tabela")}>
            <TableIcon className="h-3 w-3 md:h-4 md:w-4 md:mr-2" /> 
            <span className="hidden sm:inline">Tabela</span>
          </Button>
          <Button
            size="sm"
            variant={filters.status === "em_execucao" ? "default" : "outline"}
            onClick={() =>
              setFilters((f) => ({ ...f, status: f.status === "em_execucao" ? "" : "em_execucao" }))
            }
          >
            <Activity className="h-3 w-3 md:h-4 md:w-4 md:mr-2" /> 
            <span className="hidden sm:inline">Execução</span>
          </Button>
          {permissions.canManageProjects && (
            <Button size="sm" onClick={() => { setSelectedProject(undefined); setDialogOpen(true); }}>
              <Plus className="h-3 w-3 md:h-4 md:w-4 md:mr-2" />
              <span className="hidden sm:inline">Novo </span>Projeto
            </Button>
          )}
        </div>
      </div>

      {/* Filtros */}
      {(viewMode === "lista" || viewMode === "tabela") && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <div className="grid gap-2">
            <Label htmlFor="filter_municipality">Município</Label>
            <Select
              value={filters.municipality_id || undefined}
              onValueChange={(value) =>
                setFilters((f) => ({ ...f, municipality_id: value === "__all__" ? "" : value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                {municipalities.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="filter_program">Programa</Label>
            <Select
              value={filters.program_id || undefined}
              onValueChange={(value) =>
                setFilters((f) => ({ ...f, program_id: value === "__all__" ? "" : value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                {programs.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="filter_ministry">Ministério</Label>
            <Input
              id="filter_ministry"
              placeholder="Digite para filtrar"
              value={filters.ministry}
              onChange={(e) => setFilters((f) => ({ ...f, ministry: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="filter_status">Status</Label>
            <Select
              value={filters.status || undefined}
              onValueChange={(value) =>
                setFilters((f) => ({ ...f, status: value === "__all__" ? "" : value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                <SelectItem value="em_criacao">Em Criação</SelectItem>
                <SelectItem value="em_elaboracao">Em Elaboração</SelectItem>
                <SelectItem value="em_analise">Em Análise</SelectItem>
                <SelectItem value="em_complementacao">Em Complementação</SelectItem>
                <SelectItem value="solicitado_documentacao">Solicitado Documentação</SelectItem>
                <SelectItem value="aguardando_documentacao">Aguardando Documentação</SelectItem>
                <SelectItem value="clausula_suspensiva">Cláusula Suspensiva</SelectItem>
                <SelectItem value="aprovado">Aprovado</SelectItem>
                <SelectItem value="em_execucao">Em Execução</SelectItem>
                <SelectItem value="prestacao_contas">Prestação de Contas</SelectItem>
                <SelectItem value="concluido">Concluído</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="filter_from">De (criado em)</Label>
            <Input
              id="filter_from"
              type="date"
              value={filters.from_date}
              onChange={(e) => setFilters((f) => ({ ...f, from_date: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="filter_to">Até (criado em)</Label>
            <Input
              id="filter_to"
              type="date"
              value={filters.to_date}
              onChange={(e) => setFilters((f) => ({ ...f, to_date: e.target.value }))}
            />
          </div>
          <div className="md:col-span-4 flex items-center justify-end">
            <Button variant="outline" onClick={() => setFilters({ municipality_id: "", program_id: "", ministry: "", status: "", from_date: "", to_date: "" })}>
              Limpar filtros
            </Button>
            <Button className="ml-2" variant="default" onClick={() => generateProjectsListPdf(projects)}>
              <FileText className="mr-2 h-4 w-4" /> Exportar lista (PDF)
            </Button>
            <Button className="ml-2" variant="outline" onClick={() => exportProjectsToCsv(projects)}>
              Exportar lista (Excel)
            </Button>
          </div>
        </div>
      )}

      {viewMode === "kanban" ? (
        <KanbanBoard />
      ) : viewMode === "tabela" ? (
        <ProjectsTable
          projects={projects}
          onEdit={(project) => { setSelectedProject(project); setDialogOpen(true); }}
          onOpenHistory={(project) => openHistory(project)}
          onGeneratePdf={(projectId) => generateProjectPdfById(projectId)}
          onOpenMunicipality={(project) => openMunicipalityInfo(project)}
        />
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">Nenhum projeto cadastrado ainda</p>
            {permissions.canManageProjects && (
              <Button onClick={() => { setSelectedProject(undefined); setDialogOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" />
                Cadastrar Primeiro Projeto
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => openInfoDialog(project)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="mb-2">{project.object}</CardTitle>
                    <CardDescription>
                      {project.municipalities.name} • {project.year}
                      {project.proposal_number && ` • Proposta: ${project.proposal_number}`}
                    </CardDescription>
                  </div>
                  {getStatusBadge(project.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Repasse</p>
                    <p className="font-semibold">{formatCurrency(project.transfer_amount)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Contrapartida</p>
                    <p className="font-semibold">{formatCurrency(project.counterpart_amount)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total</p>
                    <p className="font-semibold">
                      {formatCurrency(project.transfer_amount + project.counterpart_amount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Execução</p>
                    <p className="font-semibold">{Number(project.execution_percentage ?? 0).toFixed(2)}%</p>
                  </div>
                </div>
                {project.programs?.name && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Programa: {project.programs.name}
                  </p>
                )}
                {project.ministry && (
                  <p className="text-sm text-muted-foreground mt-4">
                    Ministério: {project.ministry}
                  </p>
                )}
                <div className="mt-4 flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => openHistory(project)}>
                    <History className="mr-1 h-3 w-3" /> Histórico
                  </Button>
                  <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); openMunicipalityInfo(project); }}>
                    <Building2 className="mr-1 h-3 w-3" /> Município
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => generateProjectPdfById(project.id)}>
                    <FileText className="mr-1 h-3 w-3" /> Relatório (PDF)
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ProjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        project={selectedProject}
        onSuccess={loadProjects}
      />

      {/* Dialog: Detalhes do projeto (somente leitura) */}
      <ProjectInfoDialog
        open={infoDialogOpen}
        onOpenChange={setInfoDialogOpen}
        project={detailProject}
        latestResponsible={latestResponsible}
        onOpenActivity={(p) => {
          const proj = { id: p.id };
          // Reutiliza o diálogo de histórico para registrar atividade
          const original = projects.find((x) => x.id === p.id) || detailProject;
          if (original) openHistory(original);
        }}
        onOpenReport={(p) => {
          const original = projects.find((x) => x.id === p.id) || detailProject;
          if (original) openHistory(original);
        }}
        onEdit={() => {
          if (!detailProject) return;
          setSelectedProject(detailProject);
          setInfoDialogOpen(false);
          setDialogOpen(true);
        }}
      />
      {/* Dialog: Histórico do projeto */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Histórico do projeto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="grid gap-1">
                <Label>De</Label>
                <Input type="date" value={historyFrom} onChange={(e) => setHistoryFrom(e.target.value)} />
              </div>
              <div className="grid gap-1">
                <Label>Até</Label>
                <Input type="date" value={historyTo} onChange={(e) => setHistoryTo(e.target.value)} />
              </div>
              <div className="md:col-span-2 flex items-end gap-2">
                <Button variant="outline" onClick={() => { setHistoryFrom(""); setHistoryTo(""); activeProject && openHistory(activeProject); }}>Limpar</Button>
                <Button onClick={() => activeProject && openHistory(activeProject)}>Aplicar</Button>
                <Button variant="ghost" onClick={() => {
                  if (!activeProject) return;
                  const fromIso = historyFrom ? `${historyFrom}T00:00:00.000Z` : undefined;
                  const toIso = historyTo ? `${historyTo}T23:59:59.999Z` : undefined;
                  generateProjectPdfById(activeProject.id, { from: fromIso, to: toIso });
                }}>Exportar atividades (PDF)</Button>
              </div>
            </div>
            {(!movements || movements.length === 0) && (
              <div className="text-sm text-muted-foreground">Nenhuma atividade registrada</div>
            )}
            {(movements || []).map((m) => (
              <div key={m.id} className="rounded-md border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{m.stage}</span>
                  <span className="text-muted-foreground">{new Intl.DateTimeFormat("pt-BR").format(new Date(m.date))}</span>
                </div>
                <div className="mt-1">{m.description}</div>
                <div className="mt-1 text-muted-foreground">Responsável: {m.responsible || "—"}</div>
              </div>
            ))}

            <div className="grid gap-2">
              <Label htmlFor="desc">Nova atividade</Label>
              <Textarea id="desc" rows={3} value={activityForm.description} onChange={(e) => setActivityForm((f) => ({ ...f, description: e.target.value }))} />
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Responsável" value={activityForm.responsible} onChange={(e) => setActivityForm((f) => ({ ...f, responsible: e.target.value }))} />
                <Input type="date" value={activityForm.date} onChange={(e) => setActivityForm((f) => ({ ...f, date: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
                <Button onClick={saveActivity}>Salvar atividade</Button>
                <Button variant="outline" onClick={() => exportMovementsToCsv(movements)}>Exportar atividades (Excel)</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Informações do município */}
      <MunicipalityInfoDialog
        open={munInfoOpen}
        onOpenChange={setMunInfoOpen}
        municipality={detailMunicipality ?? undefined}
        onEdit={() => {
          // Se desejar, poderíamos abrir a tela de municípios para editar
          setMunInfoOpen(false);
        }}
      />
    </div>
  );
};

export default Projects;