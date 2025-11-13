import { useState, useRef, useEffect } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/use-permissions";
import { validateDate } from "@/lib/utils";

interface Program {
  id?: string;
  name: string;
  responsible_agency: string | null;
  deadline: string | null;
  status: string;
  notes: string | null;
  excluded_municipalities: string[];
}

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

interface ProgramDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  program?: Program;
  onSuccess: () => void;
}

export function ProgramDialog({
  open,
  onOpenChange,
  program,
  onSuccess,
}: ProgramDialogProps) {
  const { toast } = useToast();
  const { permissions } = usePermissions();
  const [loading, setLoading] = useState(false);
  const isSubmittingRef = useRef(false);
  const [municipalities, setMunicipalities] = useState<{ id: string; name: string }[]>([]);
  const [formData, setFormData] = useState<Program>(
    program || {
      name: "",
      responsible_agency: "",
      deadline: "",
      status: "Aberto",
      notes: "",
      excluded_municipalities: [],
    }
  );

  useEffect(() => {
    const fetchMunicipalities = async () => {
      const { data } = await supabase
        .from("municipalities")
        .select("id, name")
        .eq("receives_projects", true)
        .order("name");
      setMunicipalities(data ?? []);
    };
    fetchMunicipalities();
  }, []);

  useEffect(() => {
    if (program) {
      setFormData({
        name: program.name,
        responsible_agency: program.responsible_agency,
        deadline: program.deadline,
        status: program.status,
        notes: program.notes,
        id: program.id,
        excluded_municipalities: program.excluded_municipalities || [],
      });
    } else {
      setFormData({
        name: "",
        responsible_agency: "",
        deadline: "",
        status: "Aberto",
        notes: "",
        excluded_municipalities: [],
      });
    }
  }, [program, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Proteção contra múltiplas submissões
    if (loading || isSubmittingRef.current) {
      return;
    }
    
    // Validações
    if (formData.deadline && !validateDate(formData.deadline, true)) {
      toast({
        title: "Erro de validação",
        description: "Data inválida. Verifique o prazo final digitado.",
        variant: "destructive",
      });
      return;
    }
    
    isSubmittingRef.current = true;
    setLoading(true);

    try {
      if (program?.id) {
        const { error } = await supabase
          .from("programs")
          .update(formData)
          .eq("id", program.id);

        if (error) throw error;

        const warnings: string[] = [];
        const nameChanged = program.name !== formData.name;
        const agencyChanged = program.responsible_agency !== formData.responsible_agency;

        if (nameChanged || agencyChanged) {
          const projectUpdates: Record<string, any> = {};
          if (nameChanged) {
            projectUpdates.object = `Pendente — ${formData.name}`;
          }
          if (agencyChanged) {
            projectUpdates.ministry = formData.responsible_agency;
          }

          if (Object.keys(projectUpdates).length > 0) {
            const { error: pendingUpdateError } = await supabase
              .from("projects")
              .update(projectUpdates)
              .eq("program_id", program.id)
              .eq("status", "em_criacao")
              .ilike("object", "Pendente —%");

            if (pendingUpdateError) {
              warnings.push(`Pendências não foram atualizadas automaticamente: ${pendingUpdateError.message}`);
            }
          }
        }

        const previousExcluded = new Set(program.excluded_municipalities || []);
        const currentExcluded = new Set(formData.excluded_municipalities || []);

        const newlyExcluded = Array.from(currentExcluded).filter((id) => !previousExcluded.has(id));
        const newlyIncluded = Array.from(previousExcluded).filter((id) => !currentExcluded.has(id));

        if (newlyExcluded.length > 0) {
          const { error: deleteError } = await supabase
            .from("projects")
            .delete()
            .eq("program_id", program.id)
            .eq("status", "em_criacao")
            .ilike("object", "Pendente —%")
            .in("municipality_id", newlyExcluded);

          if (deleteError) {
            warnings.push(`Não foi possível remover todas as pendências dos municípios excluídos: ${deleteError.message}`);
          }
        }

        if (newlyIncluded.length > 0) {
          const year = new Date().getFullYear();

          for (const municipalityId of newlyIncluded) {
            const { data: existing, error: existingError } = await supabase
              .from("projects")
              .select("id")
              .eq("program_id", program.id)
              .eq("municipality_id", municipalityId)
              .eq("year", year)
              .limit(1);

            if (existingError) {
              warnings.push(`Falha ao verificar pendências para o município selecionado: ${existingError.message}`);
              continue;
            }

            if (existing && existing.length > 0) {
              continue;
            }

            const { error: insertError } = await supabase.from("projects").insert({
              municipality_id: municipalityId,
              program_id: program.id,
              year,
              object: `Pendente — ${formData.name}`,
              ministry: formData.responsible_agency,
              transfer_amount: 0,
              counterpart_amount: 0,
              execution_percentage: 0,
              status: "em_criacao",
              start_date: null,
              end_date: null,
              accountability_date: null,
              final_deadline: null,
              notes: "Criado automaticamente após atualização das pendências do programa",
            });

            if (insertError) {
              warnings.push(`Não foi possível recriar pendência para um município incluído: ${insertError.message}`);
            }
          }
        }

        toast({
          title: "Programa atualizado",
          description: warnings.length === 0
            ? "As informações foram salvas com sucesso."
            : "Programa atualizado com avisos. Verifique as pendências.",
        });

        if (warnings.length > 0) {
          toast({
            title: "Avisos ao atualizar programa",
            description: warnings.join(" "),
            variant: "destructive",
          });
        }
      } else {
        const { data: createdPrograms, error } = await supabase
          .from("programs")
          .insert([formData])
          .select("id, name, responsible_agency");

        if (error) throw error;

        const newProgram = createdPrograms?.[0];
        if (newProgram) {
          const fetchedMunicipalities =
            municipalities.length > 0
              ? municipalities
              : (await supabase
                  .from("municipalities")
                  .select("id, name")
                  .eq("receives_projects", true)).data || [];
          
          const year = new Date().getFullYear();
          
          // Verificar projetos existentes para evitar duplicatas
          const { data: existingProjects } = await supabase
            .from("projects")
            .select("municipality_id")
            .eq("program_id", newProgram.id)
            .eq("year", year);
          
          const existingMunicipalityIds = new Set(
            (existingProjects || []).map(p => p.municipality_id)
          );
          
          // Criar apenas para municípios que ainda não têm projeto deste programa/ano
          const excluded = new Set(formData.excluded_municipalities || []);

          const pendingProjects = fetchedMunicipalities
            .filter((m) => !existingMunicipalityIds.has(m.id) && !excluded.has(m.id))
            .map((m) => ({
              municipality_id: m.id,
              program_id: newProgram.id,
              year,
              object: `Pendente — ${newProgram.name}`,
              ministry: newProgram.responsible_agency,
              transfer_amount: 0,
              counterpart_amount: 0,
              execution_percentage: 0,
              status: "em_criacao",
              start_date: null,
              end_date: null,
              accountability_date: null,
              final_deadline: null,
              notes: "Criado automaticamente para acompanhamento do programa",
            }));

          if (pendingProjects.length > 0) {
            const { error: projErr } = await supabase
              .from("projects")
              .insert(pendingProjects);
            if (projErr) {
              toast({
                title: "Aviso",
                description: `Programa criado, mas houve erro ao criar algumas pendências: ${projErr.message}`,
                variant: "destructive",
              });
            }
          }

          // Notificação sobre criação do programa e pendências geradas
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              await supabase
                .from("notifications")
                .insert({
                  user_id: user.id,
                  title: "Programa cadastrado",
                  message: `"${formData.name}" criado. ${pendingProjects.length > 0 ? `Pendências geradas para ${pendingProjects.length} municípios.` : "Nenhuma pendência criada (já existem projetos para todos os municípios)."}`,
                  link: "/programs",
                  type: "success",
                });
            }
          } catch {
            // silencioso
          }
        }

        toast({
          title: "Programa cadastrado",
          description: "O programa foi criado com sucesso.",
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      toast({
        title: "Erro ao salvar",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  const handleArchive = async () => {
    if (!program?.id || loading) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("programs")
        .update({ ...formData, status: "Arquivado" })
        .eq("id", program.id);
      if (error) throw error;
      toast({ title: "Programa arquivado", description: "Status alterado para Arquivado." });
      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      toast({
        title: "Erro ao arquivar",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!program?.id || loading) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("programs").delete().eq("id", program.id);
      if (error) throw error;
      toast({ title: "Programa excluído", description: "O registro foi removido." });
      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      toast({
        title: "Erro ao excluir",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle>
            {program ? "Editar Programa" : "Novo Programa"}
          </DialogTitle>
          <DialogDescription>
            Preencha os dados do programa PAC/Transferegov.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="responsible_agency">Órgão Responsável</Label>
              <Input
                id="responsible_agency"
                value={formData.responsible_agency || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    responsible_agency: e.target.value,
                  })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="deadline">Prazo Final</Label>
              <Input
                id="deadline"
                type="date"
                value={formData.deadline || ""}
                onChange={(e) =>
                  setFormData({ ...formData, deadline: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Aberto">Aberto</SelectItem>
                  <SelectItem value="Finalizado">Finalizado</SelectItem>
                </SelectContent>
              </Select>
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
            <div className="grid gap-2">
              <Label>Municípios sem pendência automática</Label>
              <ScrollArea className="h-48 border rounded">
                <div className="p-3 space-y-2">
                  {municipalities.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum município disponível.</p>
                  ) : (
                    municipalities.map((municipality) => {
                      const checked = formData.excluded_municipalities?.includes(municipality.id);
                      return (
                        <label
                          key={municipality.id}
                          htmlFor={`exclude-${municipality.id}`}
                          className="flex items-center gap-2 text-sm"
                        >
                          <Checkbox
                            id={`exclude-${municipality.id}`}
                            checked={!!checked}
                            onCheckedChange={(value) => {
                              setFormData((prev) => {
                                const current = new Set(prev.excluded_municipalities || []);
                                if (value === true) {
                                  current.add(municipality.id);
                                } else if (value === false) {
                                  current.delete(municipality.id);
                                }
                                return {
                                  ...prev,
                                  excluded_municipalities: Array.from(current),
                                };
                              });
                            }}
                          />
                          {municipality.name}
                        </label>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
              <p className="text-xs text-muted-foreground">
                Os municípios marcados não terão projetos pendentes criados automaticamente para este programa.
              </p>
            </div>
          </div>
          <DialogFooter className="flex items-center justify-between gap-2">
            {program?.id && permissions.canManagePrograms && (
              <div className="flex items-center gap-2">
                <Button type="button" variant="secondary" onClick={handleArchive} disabled={loading}>
                  Arquivar
                </Button>
                <Button type="button" variant="destructive" onClick={handleDelete} disabled={loading}>
                  Excluir
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
            {permissions.canManagePrograms && (
              <Button type="submit" disabled={loading}>
                {loading ? "Salvando..." : "Salvar"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
