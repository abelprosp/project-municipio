import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, FileText, PlusCircle, User } from "lucide-react";

type AmendmentType = "extra" | "individual" | "rp2" | "outro";
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

interface Project {
  id?: string;
  municipality_id: string;
  program_id?: string | null;
  year: number;
  proposal_number: string | null;
  object: string;
  ministry: string | null;
  parliamentarian: string | null;
  amendment_type: AmendmentType | null;
  transfer_amount: number;
  counterpart_amount: number;
  execution_percentage: number;
  status: ProjectStatus;
  start_date: string | null;
  end_date: string | null;
  accountability_date: string | null;
  document_request_date?: string | null;
  document_deadline_date?: string | null;
  notes: string | null;
}

interface ProjectInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project | null;
  onEdit?: () => void;
  onOpenActivity?: (project: { id: string }) => void;
  onOpenReport?: (project: { id: string }) => void;
  latestResponsible?: (projectId: string) => string;
}

function formatDate(date: string | null | undefined) {
  if (!date) return "—";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

export function ProjectInfoDialog({
  open,
  onOpenChange,
  project,
  onEdit,
  onOpenActivity,
  onOpenReport,
  latestResponsible,
}: ProjectInfoDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Detalhes do Projeto</DialogTitle>
          {project?.id && (
            <div className="mt-2 flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => onOpenActivity?.({ id: project.id! })}>
                <PlusCircle className="h-3 w-3 mr-1" /> Atividade
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onOpenReport?.({ id: project.id! })}>
                <FileText className="h-3 w-3 mr-1" /> Relatórios
              </Button>
              {onEdit && (
                <Button size="sm" onClick={onEdit}>
                  Editar
                </Button>
              )}
            </div>
          )}
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-xs text-muted-foreground">Objeto</Label>
                <div className="font-medium">{project?.object || "—"}</div>
              </div>
              <div className="text-right">
                <Badge variant="secondary">
                  {project?.status ? STATUS_LABEL[project.status as ProjectStatus] : "—"}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-xs text-muted-foreground">Ano</Label>
                <div className="font-medium">{project?.year ?? "—"}</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Nº Proposta</Label>
                <div className="font-medium">{project?.proposal_number || "—"}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-xs text-muted-foreground">Ministério</Label>
                <div className="font-medium">{project?.ministry || "—"}</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Parlamentar</Label>
                <div className="font-medium">{project?.parliamentarian || "—"}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-xs text-muted-foreground">Tipo de Emenda</Label>
                <div className="font-medium">{project?.amendment_type || "—"}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Repasse</Label>
                  <div className="font-medium">
                    {project ? project.transfer_amount?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Contrapartida</Label>
                  <div className="font-medium">
                    {project ? project.counterpart_amount?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="text-xs text-muted-foreground">Início</Label>
                  <div className="font-medium">{formatDate(project?.start_date)}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="text-xs text-muted-foreground">Término</Label>
                  <div className="font-medium">{formatDate(project?.end_date)}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-xs text-muted-foreground">Prestação de Contas</Label>
                <div className="font-medium">{formatDate(project?.accountability_date)}</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Execução (%)</Label>
                <div className="font-medium">{project?.execution_percentage ?? "—"}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-xs text-muted-foreground">Solicitação de Documentos</Label>
                <div className="font-medium">{formatDate(project?.document_request_date)}</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Prazo de Documentos</Label>
                <div className="font-medium">{formatDate(project?.document_deadline_date)}</div>
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Observações</Label>
              <div className="mt-1 text-sm">{project?.notes || "—"}</div>
            </div>

            {project?.id && latestResponsible && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="text-xs text-muted-foreground">Responsável</Label>
                  <div className="font-medium">{latestResponsible(project.id)}</div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export default ProjectInfoDialog;