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

type AmendmentType = "extra" | "individual" | "rp2" | "outro";
type ProjectStatus = 
  | "em_criacao"
  | "enviado"
  | "em_analise"
  | "clausula_suspensiva"
  | "aprovado"
  | "em_execucao"
  | "prestacao_contas"
  | "concluido"
  | "cancelado";

interface Project {
  id?: string;
  municipality_id: string;
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
  notes: string | null;
}

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project;
  onSuccess: () => void;
}

export function ProjectDialog({
  open,
  onOpenChange,
  project,
  onSuccess,
}: ProjectDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [municipalities, setMunicipalities] = useState<any[]>([]);
  const [formData, setFormData] = useState<Project>(
    project || {
      municipality_id: "",
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
      notes: "",
    }
  );

  useEffect(() => {
    loadMunicipalities();
  }, []);

  const loadMunicipalities = async () => {
    const { data } = await supabase
      .from("municipalities")
      .select("id, name")
      .order("name");
    setMunicipalities(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (project?.id) {
        const { error } = await supabase
          .from("projects")
          .update(formData)
          .eq("id", project.id);

        if (error) throw error;

        toast({
          title: "Projeto atualizado",
          description: "As informações foram salvas com sucesso.",
        });
      } else {
        const { error } = await supabase.from("projects").insert([formData]);

        if (error) throw error;

        toast({
          title: "Projeto cadastrado",
          description: "O projeto foi criado com sucesso.",
        });
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {project ? "Editar Projeto" : "Novo Projeto"}
          </DialogTitle>
          <DialogDescription>
            Preencha os dados do convênio/projeto abaixo.
          </DialogDescription>
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
                      <SelectItem value="enviado">Enviado</SelectItem>
                      <SelectItem value="em_analise">Em Análise</SelectItem>
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
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
