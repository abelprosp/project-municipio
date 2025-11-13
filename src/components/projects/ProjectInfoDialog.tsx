import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, FileText, PlusCircle, User, Download, Trash2, Upload } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";
import { usePermissions } from "@/hooks/use-permissions";
import { useUserControl } from "@/hooks/use-user-control";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDateLocal } from "@/lib/utils";

type AmendmentType = "extra" | "individual" | "rp2" | "outro";
type ProjectStatus =
  | "em_criacao"
  | "em_elaboracao"
  | "em_analise"
  | "habilitada"
  | "selecionada"
  | "em_complementacao"
  | "solicitado_documentacao"
  | "aguardando_documentacao"
  | "clausula_suspensiva"
  | "aprovado"
  | "em_execucao"
  | "prestacao_contas"
  | "concluido"
  | "arquivada";

const STATUS_LABEL: Record<ProjectStatus, string> = {
  em_criacao: "Em Criação",
  em_elaboracao: "Em Elaboração",
  em_analise: "Em Análise",
  habilitada: "Habilitada",
  selecionada: "Selecionada",
  em_complementacao: "Em Complementação",
  solicitado_documentacao: "Solicitado Documentação",
  aguardando_documentacao: "Aguardando Documentação",
  clausula_suspensiva: "Cláusula Suspensiva",
  aprovado: "Aprovado",
  em_execucao: "Em Execução",
  prestacao_contas: "Prestação de Contas",
  concluido: "Concluído",
  arquivada: "Arquivada",
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
  municipalities?: {
    name: string;
  };
  programs?: {
    name: string;
  } | null;
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
  return formatDateLocal(date, "—");
}

type ProjectDocument = Database["public"]["Tables"]["project_documents"]["Row"];
type ProjectBankYield = Database["public"]["Tables"]["project_bank_yields"]["Row"];
type ProjectReturn = Database["public"]["Tables"]["project_returns"]["Row"];

const ACCEPT_ATTRIBUTE = "*/*";

export function ProjectInfoDialog({
  open,
  onOpenChange,
  project,
  onEdit,
  onOpenActivity,
  onOpenReport,
  latestResponsible,
}: ProjectInfoDialogProps) {
  const { permissions } = usePermissions();
  const { logActivity } = useUserControl();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [bankYields, setBankYields] = useState<ProjectBankYield[]>([]);
  const [returnsData, setReturnsData] = useState<ProjectReturn[]>([]);
  const [bankYieldDialogOpen, setBankYieldDialogOpen] = useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [bankYieldForm, setBankYieldForm] = useState({ date: "", amount: "", description: "" });
  const [returnForm, setReturnForm] = useState({ date: "", amount: "", description: "" });
  const [savingBankYield, setSavingBankYield] = useState(false);
  const [savingReturn, setSavingReturn] = useState(false);

  useEffect(() => {
    if (project?.id) {
      loadDocuments(project.id);
      loadBankYields(project.id);
      loadReturns(project.id);
    } else {
      setDocuments([]);
      setBankYields([]);
      setReturnsData([]);
    }
  }, [project?.id]);

  const loadDocuments = async (projectId: string) => {
    const { data } = await supabase
      .from("project_documents")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    setDocuments(data ?? []);
  };

  const loadBankYields = async (projectId: string) => {
    const { data } = await supabase
      .from("project_bank_yields")
      .select("*")
      .eq("project_id", projectId)
      .order("event_date", { ascending: false })
      .order("created_at", { ascending: false });
    setBankYields(data ?? []);
  };

  const loadReturns = async (projectId: string) => {
    const { data } = await supabase
      .from("project_returns")
      .select("*")
      .eq("project_id", projectId)
      .order("event_date", { ascending: false })
      .order("created_at", { ascending: false });
    setReturnsData(data ?? []);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!project?.id) return;
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const filePath = `project_${project.id}/${Date.now()}_${file.name}`;
      const { data: uploadRes, error: uploadErr } = await supabase.storage
        .from("project-docs")
        .upload(filePath, file, { cacheControl: "3600", upsert: false });
      if (uploadErr) throw uploadErr;

      const { data: { user } } = await supabase.auth.getUser();
      const { error: insertErr } = await supabase
        .from("project_documents")
        .insert({
          project_id: project.id,
          name: file.name,
          path: uploadRes?.path || filePath,
          size: file.size,
          content_type: file.type,
          uploaded_by: user?.id || null,
        });
      if (insertErr) throw insertErr;
      await loadDocuments(project.id);
      await logActivity(
        "upload_document",
        "project",
        project.id,
        project.object || "Projeto",
        `Documento "${file.name}" enviado`
      );
    } catch (error: unknown) {
      toast({
        title: "Erro ao enviar documento",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = async (doc: ProjectDocument) => {
    if (!project?.id) return;
    try {
      await supabase.storage.from("project-docs").remove([doc.path]);
      await supabase.from("project_documents").delete().eq("id", doc.id);
      await loadDocuments(project.id);
      await logActivity(
        "delete_document",
        "project",
        project.id,
        project.object || "Projeto",
        `Documento "${doc.name}" removido`
      );
    } catch (error: unknown) {
      toast({
        title: "Erro ao remover documento",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    }
  };

  const getPublicUrl = (path: string) => {
    const { data } = supabase.storage.from("project-docs").getPublicUrl(path);
    return data.publicUrl;
  };

  const formatCurrency = (value: number | string | null | undefined) => {
    if (value === null || value === undefined) return "—";
    const normalized = typeof value === "string" ? parseFloat(value) : value;
    if (Number.isNaN(normalized)) return "—";
    return normalized.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const getErrorMessage = (error: unknown) =>
    error instanceof Error ? error.message : String(error);

  const parseAmount = (value: string) => {
    if (!value) return NaN;
    const normalized = value.replace(",", ".");
    return parseFloat(normalized);
  };

  const handleSaveBankYield = async () => {
    if (!project?.id) return;
    if (!bankYieldForm.date || !bankYieldForm.amount) {
      toast({
        title: "Campos obrigatórios",
        description: "Informe a data e o valor do rendimento.",
        variant: "destructive",
      });
      return;
    }

    const amount = parseAmount(bankYieldForm.amount);
    if (!Number.isFinite(amount)) {
      toast({
        title: "Valor inválido",
        description: "Digite um valor numérico válido.",
        variant: "destructive",
      });
      return;
    }

    setSavingBankYield(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("project_bank_yields").insert({
        project_id: project.id,
        event_date: bankYieldForm.date,
        amount,
        description: bankYieldForm.description.trim() || null,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
      await loadBankYields(project.id);
      await logActivity(
        "add_bank_yield",
        "project",
        project.id,
        project.object || "Projeto",
        `Rendimento bancário registrado (${formatCurrency(amount)})`,
      );
      toast({
        title: "Rendimento registrado",
        description: "Entrada adicionada com sucesso.",
      });
      setBankYieldForm({ date: "", amount: "", description: "" });
      setBankYieldDialogOpen(false);
    } catch (error: unknown) {
      toast({
        title: "Erro ao salvar",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setSavingBankYield(false);
    }
  };

  const handleDeleteBankYield = async (entry: ProjectBankYield) => {
    if (!project?.id) return;
    try {
      const { error } = await supabase.from("project_bank_yields").delete().eq("id", entry.id);
      if (error) throw error;
      await loadBankYields(project.id);
      await logActivity(
        "delete_bank_yield",
        "project",
        project.id,
        project.object || "Projeto",
        `Rendimento bancário removido (${formatCurrency(entry.amount)})`,
      );
      toast({
        title: "Rendimento removido",
        description: "Registro excluído com sucesso.",
      });
    } catch (error: unknown) {
      toast({
        title: "Erro ao remover",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  const handleSaveReturn = async () => {
    if (!project?.id) return;
    if (!returnForm.date || !returnForm.amount) {
      toast({
        title: "Campos obrigatórios",
        description: "Informe a data e o valor da devolução.",
        variant: "destructive",
      });
      return;
    }

    const amount = parseAmount(returnForm.amount);
    if (!Number.isFinite(amount)) {
      toast({
        title: "Valor inválido",
        description: "Digite um valor numérico válido.",
        variant: "destructive",
      });
      return;
    }

    setSavingReturn(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("project_returns").insert({
        project_id: project.id,
        event_date: returnForm.date,
        amount,
        description: returnForm.description.trim() || null,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
      await loadReturns(project.id);
      await logActivity(
        "add_project_return",
        "project",
        project.id,
        project.object || "Projeto",
        `Devolução registrada (${formatCurrency(amount)})`,
      );
      toast({
        title: "Devolução registrada",
        description: "Entrada adicionada com sucesso.",
      });
      setReturnForm({ date: "", amount: "", description: "" });
      setReturnDialogOpen(false);
    } catch (error: unknown) {
      toast({
        title: "Erro ao salvar",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setSavingReturn(false);
    }
  };

  const handleDeleteReturn = async (entry: ProjectReturn) => {
    if (!project?.id) return;
    try {
      const { error } = await supabase.from("project_returns").delete().eq("id", entry.id);
      if (error) throw error;
      await loadReturns(project.id);
      await logActivity(
        "delete_project_return",
        "project",
        project.id,
        project.object || "Projeto",
        `Devolução removida (${formatCurrency(entry.amount)})`,
      );
      toast({
        title: "Devolução removida",
        description: "Registro excluído com sucesso.",
      });
    } catch (error: unknown) {
      toast({
        title: "Erro ao remover",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    }
  };
  
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
              {onEdit && permissions.canManageProjects && (
                <Button size="sm" onClick={onEdit}>
                  Editar
                </Button>
              )}
            </div>
          )}
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Resumo</TabsTrigger>
            <TabsTrigger value="documents">Documentos</TabsTrigger>
            <TabsTrigger value="bank_yields">Rendimento bancário</TabsTrigger>
            <TabsTrigger value="returns">Devolução</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
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
                    <Label className="text-xs text-muted-foreground">Município</Label>
                    <div className="font-medium">{project?.municipalities?.name || "—"}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Programa</Label>
                    <div className="font-medium">{project?.programs?.name || "—"}</div>
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
                    <div className="font-medium">{project?.execution_percentage !== undefined && project?.execution_percentage !== null ? `${Number(project.execution_percentage).toFixed(2)}%` : "—"}</div>
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
          </TabsContent>

          <TabsContent value="documents">
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-4">
                {project?.id ? (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-xs text-muted-foreground">Documentos anexados</Label>
                        <p className="text-xs text-muted-foreground">
                          Envie comprovantes, contratos e outros arquivos relacionados ao projeto.
                        </p>
                      </div>
                      {permissions.canManageProjects && (
                        <div>
                          <input
                            id={`upload-doc-${project.id}`}
                            type="file"
                            accept={ACCEPT_ATTRIBUTE}
                            onChange={handleUpload}
                            className="hidden"
                          />
                          <Button
                            size="sm"
                            disabled={uploading}
                            onClick={() => document.getElementById(`upload-doc-${project.id}`)?.click()}
                          >
                            <Upload className="h-3 w-3 mr-1" /> {uploading ? "Enviando..." : "Adicionar"}
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      {documents.length === 0 && (
                        <div className="text-sm text-muted-foreground">Nenhum documento enviado.</div>
                      )}
                      {documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between border rounded p-2">
                          <div className="text-sm">
                            <div className="font-medium">{doc.name}</div>
                            <div className="text-xs text-muted-foreground">{new Date(doc.created_at).toLocaleString("pt-BR")}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <a href={getPublicUrl(doc.path)} target="_blank" rel="noreferrer">
                              <Button size="sm" variant="outline">
                                <Download className="h-3 w-3 mr-1" /> Baixar
                              </Button>
                            </a>
                            {permissions.canManageProjects && (
                              <Button size="sm" variant="destructive" onClick={() => handleDelete(doc)}>
                                <Trash2 className="h-3 w-3 mr-1" /> Excluir
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Cadastre o projeto para começar a enviar documentos.
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="bank_yields">
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs text-muted-foreground">Rendimentos registrados</Label>
                    <p className="text-xs text-muted-foreground">
                      Controle os valores obtidos com aplicações financeiras do projeto.
                    </p>
                  </div>
                  {permissions.canManageProjects && (
                    <Button size="sm" onClick={() => setBankYieldDialogOpen(true)}>
                      <PlusCircle className="h-3 w-3 mr-1" /> Adicionar
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  {bankYields.length === 0 && (
                    <div className="text-sm text-muted-foreground">Nenhum rendimento registrado.</div>
                  )}
                  {bankYields.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between border rounded p-2">
                      <div className="text-sm space-y-1">
                        <div className="font-medium">{formatCurrency(entry.amount)}</div>
                        <div className="text-xs text-muted-foreground">
                          Data: {formatDate(entry.event_date)} • {entry.description || "Sem descrição"}
                        </div>
                      </div>
                      {permissions.canManageProjects && (
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteBankYield(entry)}>
                          <Trash2 className="h-3 w-3 mr-1" /> Excluir
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="returns">
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs text-muted-foreground">Devoluções registradas</Label>
                    <p className="text-xs text-muted-foreground">
                      Registre devoluções de recursos ao concedente ou ao tesouro.
                    </p>
                  </div>
                  {permissions.canManageProjects && (
                    <Button size="sm" onClick={() => setReturnDialogOpen(true)}>
                      <PlusCircle className="h-3 w-3 mr-1" /> Adicionar
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  {returnsData.length === 0 && (
                    <div className="text-sm text-muted-foreground">Nenhuma devolução registrada.</div>
                  )}
                  {returnsData.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between border rounded p-2">
                      <div className="text-sm space-y-1">
                        <div className="font-medium">{formatCurrency(entry.amount)}</div>
                        <div className="text-xs text-muted-foreground">
                          Data: {formatDate(entry.event_date)} • {entry.description || "Sem descrição"}
                        </div>
                      </div>
                      {permissions.canManageProjects && (
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteReturn(entry)}>
                          <Trash2 className="h-3 w-3 mr-1" /> Excluir
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
        <Dialog
          open={bankYieldDialogOpen}
          onOpenChange={(open) => {
            setBankYieldDialogOpen(open);
            if (!open) setBankYieldForm({ date: "", amount: "", description: "" });
          }}
        >
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle>Novo rendimento bancário</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="bank-yield-date">Data</Label>
                <Input
                  id="bank-yield-date"
                  type="date"
                  value={bankYieldForm.date}
                  onChange={(e) => setBankYieldForm((prev) => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="bank-yield-amount">Valor (R$)</Label>
                <Input
                  id="bank-yield-amount"
                  type="number"
                  step="0.01"
                  value={bankYieldForm.amount}
                  onChange={(e) => setBankYieldForm((prev) => ({ ...prev, amount: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="bank-yield-description">Descrição</Label>
                <Textarea
                  id="bank-yield-description"
                  rows={3}
                  value={bankYieldForm.description}
                  onChange={(e) => setBankYieldForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Ex.: rendimento da aplicação bancária"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setBankYieldDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveBankYield} disabled={savingBankYield}>
                  {savingBankYield ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog
          open={returnDialogOpen}
          onOpenChange={(open) => {
            setReturnDialogOpen(open);
            if (!open) setReturnForm({ date: "", amount: "", description: "" });
          }}
        >
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle>Nova devolução</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="return-date">Data</Label>
                <Input
                  id="return-date"
                  type="date"
                  value={returnForm.date}
                  onChange={(e) => setReturnForm((prev) => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="return-amount">Valor (R$)</Label>
                <Input
                  id="return-amount"
                  type="number"
                  step="0.01"
                  value={returnForm.amount}
                  onChange={(e) => setReturnForm((prev) => ({ ...prev, amount: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="return-description">Descrição</Label>
                <Textarea
                  id="return-description"
                  rows={3}
                  value={returnForm.description}
                  onChange={(e) => setReturnForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Detalhes sobre a devolução"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setReturnDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveReturn} disabled={savingReturn}>
                  {savingReturn ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}

export default ProjectInfoDialog;