import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { generateProjectPdfById } from "@/lib/pdf";
import { FileText, PlusCircle } from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";
import { useUserControl } from "@/hooks/use-user-control";

type AmendmentType = "extra" | "individual" | "rp2" | "outro";
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

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project;
  onSuccess: () => void;
  onOpenActivity?: (project: { id: string }) => void;
  onOpenReport?: (project: { id: string }) => void;
}

export function ProjectDialog({
  open,
  onOpenChange,
  project,
  onSuccess,
  onOpenActivity,
  onOpenReport,
}: ProjectDialogProps) {
  const { toast } = useToast();
  const { permissions } = usePermissions();
  const { logActivity } = useUserControl();
  const [loading, setLoading] = useState(false);
  const [municipalities, setMunicipalities] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const DEFAULT_FORM: Project = {
    municipality_id: "",
    program_id: null,
    year: new Date().getFullYear(),
    proposal_number: "",
    object: "",
    ministry: "",
    parliamentarian: "",
    amendment_type: null,
    transfer_amount: 0,
    counterpart_amount: 0,
    execution_percentage: 0,
    status: "em_criacao",
    start_date: "",
    end_date: "",
    accountability_date: "",
    document_request_date: "",
    document_deadline_date: "",
    notes: "",
  };

  const [formData, setFormData] = useState<Project>(project || DEFAULT_FORM);

  useEffect(() => {
    loadMunicipalities();
    loadPrograms();
  }, []);

  // Sincroniza o formulário quando um projeto é passado para edição
  useEffect(() => {
    if (!open) return; // apenas ao abrir o diálogo
    if (project) {
      // Garantir tipos corretos e preencher valores ausentes
      setFormData({
        ...DEFAULT_FORM,
        ...project,
        municipality_id: project.municipality_id ?? "",
        program_id: project.program_id ?? null,
        year: typeof project.year === "string" ? parseInt(project.year as any) : (project.year ?? new Date().getFullYear()),
        proposal_number: project.proposal_number ?? "",
        object: project.object ?? "",
        ministry: project.ministry ?? "",
        parliamentarian: project.parliamentarian ?? "",
        amendment_type: project.amendment_type ?? null,
        transfer_amount: typeof project.transfer_amount === "string" ? parseFloat(project.transfer_amount as any) : (project.transfer_amount ?? 0),
        counterpart_amount: typeof project.counterpart_amount === "string" ? parseFloat(project.counterpart_amount as any) : (project.counterpart_amount ?? 0),
        execution_percentage: typeof project.execution_percentage === "string" ? parseInt(project.execution_percentage as any) : (project.execution_percentage ?? 0),
        status: project.status ?? "em_criacao",
        start_date: project.start_date ?? "",
        end_date: project.end_date ?? "",
        accountability_date: project.accountability_date ?? "",
        document_request_date: project.document_request_date ?? "",
        document_deadline_date: project.document_deadline_date ?? "",
        notes: project.notes ?? "",
      });
    } else {
      setFormData(DEFAULT_FORM);
    }
  }, [project, open]);

  const loadMunicipalities = async () => {
    const { data } = await supabase
      .from("municipalities")
      .select("id, name")
      .order("name");
    setMunicipalities(data || []);
  };

  const loadPrograms = async () => {
    const { data } = await supabase
      .from("programs")
      .select("id, name")
      .order("name");
    setPrograms(data || []);
  };

  const buildProjectPayload = (data: Project) => {
    return {
      municipality_id: data.municipality_id,
      program_id: data.program_id ?? null,
      year: data.year,
      proposal_number: data.proposal_number,
      object: data.object,
      ministry: data.ministry,
      parliamentarian: data.parliamentarian,
      amendment_type: data.amendment_type,
      transfer_amount: data.transfer_amount,
      counterpart_amount: data.counterpart_amount,
      execution_percentage: data.execution_percentage,
      status: data.status,
      start_date: data.start_date,
      end_date: data.end_date,
      accountability_date: data.accountability_date,
      document_request_date: data.document_request_date ?? null,
      document_deadline_date: data.document_deadline_date ?? null,
      notes: data.notes,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (project?.id) {
        const { error } = await supabase
          .from("projects")
          .update(buildProjectPayload(formData))
          .eq("id", project.id);

        if (error) throw error;

        // Gerar notificações de prazos após atualização
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.rpc("generate_deadline_notifications", { p_user_id: user.id });
          }
        } catch {
          // silencioso
        }

        toast({
          title: "Projeto atualizado",
          description: "As informações foram salvas com sucesso.",
        });

        // Log da atividade
        await logActivity(
          "update",
          "project",
          project.id,
          formData.object || "Projeto",
          `Projeto "${formData.object || 'Sem título'}" foi atualizado`,
          { 
            municipality_id: formData.municipality_id,
            status: formData.status,
            year: formData.year
          }
        );
      } else {
        const { error } = await supabase
          .from("projects")
          .insert([buildProjectPayload(formData)]);

        if (error) throw error;

        // Gerar notificações de prazos após criação
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.rpc("generate_deadline_notifications", { p_user_id: user.id });
          }
        } catch {
          // silencioso
        }

        toast({
          title: "Projeto cadastrado",
          description: "O projeto foi criado com sucesso.",
        });

        // Log da atividade
        await logActivity(
          "create",
          "project",
          "new",
          formData.object || "Projeto",
          `Novo projeto "${formData.object || 'Sem título'}" foi criado`,
          { 
            municipality_id: formData.municipality_id,
            status: formData.status,
            year: formData.year
          }
        );
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!project?.id) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("projects")
        .update({ ...buildProjectPayload(formData), status: "cancelado" })
        .eq("id", project.id);
      if (error) throw error;
      toast({ title: "Projeto arquivado", description: "Status alterado para Cancelado." });
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Erro ao arquivar", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!project?.id) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("projects").delete().eq("id", project.id);
      if (error) throw error;
      toast({ title: "Projeto excluído", description: "O registro foi removido." });
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Erro ao excluir", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {project ? "Editar Projeto" : "Novo Projeto"}
          </DialogTitle>
          <DialogDescription>
            Preencha os dados do convênio/projeto abaixo.
          </DialogDescription>
          {project?.id && (
            <div className="mt-2 flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onOpenActivity?.({ id: project.id! })}
              >
                <PlusCircle className="h-3 w-3 mr-1" /> Atividade
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onOpenReport?.({ id: project.id! })}
              >
                <FileText className="h-3 w-3 mr-1" /> Relatórios
              </Button>
            </div>
          )}
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="municipality_id">Município *</Label>
                <Select
                  value={formData.municipality_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, municipality_id: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um município" />
                  </SelectTrigger>
                  <SelectContent>
                    {municipalities.map((mun) => (
                      <SelectItem key={mun.id} value={mun.id}>
                        {mun.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="year">Ano *</Label>
                  <Input
                    id="year"
                    type="number"
                    value={formData.year}
                    onChange={(e) =>
                      setFormData({ ...formData, year: parseInt(e.target.value) })
                    }
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="proposal_number">Nº Proposta</Label>
                  <Input
                    id="proposal_number"
                    value={formData.proposal_number || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, proposal_number: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="object">Objeto *</Label>
                <Textarea
                  id="object"
                  value={formData.object}
                  onChange={(e) =>
                    setFormData({ ...formData, object: e.target.value })
                  }
                  required
                  rows={2}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="program_id">Programa</Label>
                <Select
                  value={formData.program_id || undefined}
                  onValueChange={(value) =>
                    setFormData({ ...formData, program_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um programa" />
                  </SelectTrigger>
                  <SelectContent>
                    {programs.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="ministry">Ministério/Órgão</Label>
                  <Input
                    id="ministry"
                    value={formData.ministry || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, ministry: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="parliamentarian">Parlamentar</Label>
                  <Input
                    id="parliamentarian"
                    value={formData.parliamentarian || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, parliamentarian: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="amendment_type">Tipo de Emenda</Label>
                <Select
                  value={formData.amendment_type || undefined}
                  onValueChange={(value) =>
                    setFormData({ ...formData, amendment_type: value as AmendmentType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="extra">Extra</SelectItem>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="rp2">RP2</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="transfer_amount">Repasse (R$) *</Label>
                  <Input
                    id="transfer_amount"
                    type="number"
                    step="0.01"
                    value={formData.transfer_amount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        transfer_amount: parseFloat(e.target.value),
                      })
                    }
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="counterpart_amount">Contrapartida (R$) *</Label>
                  <Input
                    id="counterpart_amount"
                    type="number"
                    step="0.01"
                    value={formData.counterpart_amount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        counterpart_amount: parseFloat(e.target.value),
                      })
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="execution_percentage">Execução (%)</Label>
                  <Input
                    id="execution_percentage"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.execution_percentage}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        execution_percentage: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="status">Situação</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      setFormData({ ...formData, status: value as ProjectStatus })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="em_criacao">Em Criação</SelectItem>
                      <SelectItem value="em_elaboracao">Em Elaboração</SelectItem>
                      <SelectItem value="em_analise">Em Análise</SelectItem>
                      <SelectItem value="em_complementacao">Em Complementação</SelectItem>
                      <SelectItem value="solicitado_documentacao">Solicitado Documentação</SelectItem>
                      <SelectItem value="aguardando_documentacao">Aguardando Documentação</SelectItem>
                      <SelectItem value="clausula_suspensiva">
                        Cláusula Suspensiva
                      </SelectItem>
                      <SelectItem value="aprovado">Aprovado</SelectItem>
                      <SelectItem value="em_execucao">Em Execução</SelectItem>
                      <SelectItem value="prestacao_contas">
                        Prestação de Contas
                      </SelectItem>
                      <SelectItem value="concluido">Concluído</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.status === "solicitado_documentacao" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="document_request_date">Data de Envio</Label>
                      <Input
                        id="document_request_date"
                        type="date"
                        value={formData.document_request_date || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, document_request_date: e.target.value })
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="document_deadline_date">Prazo de Atendimento</Label>
                      <Input
                        id="document_deadline_date"
                        type="date"
                        value={formData.document_deadline_date || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, document_deadline_date: e.target.value })
                        }
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="start_date">Início</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, start_date: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="end_date">Fim</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, end_date: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="accountability_date">Prestação</Label>
                  <Input
                    id="accountability_date"
                    type="date"
                    value={formData.accountability_date || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        accountability_date: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={formData.notes || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter className="mt-4 flex items-center justify-between gap-2">
              {project?.id && permissions.canManageProjects && (
                <div className="flex items-center gap-2">
                  <Button type="button" variant="secondary" onClick={handleArchive} disabled={loading}>
                    Arquivar
                  </Button>
                  <Button type="button" variant="destructive" onClick={handleDelete} disabled={loading}>
                    Excluir
                  </Button>
                  <Button type="button" variant="outline" onClick={() => project?.id && generateProjectPdfById(project.id!)} disabled={loading}>
                    Exportar PDF
                  </Button>
                </div>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              {permissions.canManageProjects && (
                <Button type="submit" disabled={loading}>
                  {loading ? "Salvando..." : "Salvar"}
                </Button>
              )}
            </DialogFooter>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
