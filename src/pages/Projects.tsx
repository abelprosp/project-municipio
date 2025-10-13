import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, LayoutList, KanbanSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ProjectDialog } from "@/components/projects/ProjectDialog";
import { KanbanBoard } from "@/components/projects/KanbanBoard";

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
}

const Projects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | undefined>(undefined);
  const [viewMode, setViewMode] = useState<"lista" | "kanban">("lista");
  const { toast } = useToast();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select(`
          *,
          municipalities (
            name
          )
        `)
        .order("created_at", { ascending: false });

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

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      em_criacao: "secondary",
      enviado: "outline",
      em_analise: "outline",
      clausula_suspensiva: "destructive",
      aprovado: "default",
      em_execucao: "default",
      prestacao_contas: "secondary",
      concluido: "default",
      cancelado: "destructive",
    };

    const labels: Record<string, string> = {
      em_criacao: "Em Criação",
      enviado: "Enviado",
      em_analise: "Em Análise",
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Projetos</h2>
          <p className="text-muted-foreground">Gerencie todos os projetos e convênios</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={viewMode === "lista" ? "default" : "outline"} onClick={() => setViewMode("lista")}>
            <LayoutList className="mr-2 h-4 w-4" /> Lista
          </Button>
          <Button variant={viewMode === "kanban" ? "default" : "outline"} onClick={() => setViewMode("kanban")}>
            <KanbanSquare className="mr-2 h-4 w-4" /> Kanban
          </Button>
          <Button onClick={() => { setSelectedProject(undefined); setDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Projeto
          </Button>
        </div>
      </div>

      {viewMode === "kanban" ? (
        <KanbanBoard />
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">Nenhum projeto cadastrado ainda</p>
            <Button onClick={() => { setSelectedProject(undefined); setDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              Cadastrar Primeiro Projeto
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => { setSelectedProject(project); setDialogOpen(true); }}
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
                    <p className="font-semibold">{project.execution_percentage}%</p>
                  </div>
                </div>
                {project.ministry && (
                  <p className="text-sm text-muted-foreground mt-4">
                    Ministério: {project.ministry}
                  </p>
                )}
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
    </div>
  );
};

export default Projects;