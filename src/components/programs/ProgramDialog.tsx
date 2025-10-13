import { useState } from "react";
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

interface Program {
  id?: string;
  name: string;
  responsible_agency: string | null;
  deadline: string | null;
  status: string;
  notes: string | null;
}

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
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Program>(
    program || {
      name: "",
      responsible_agency: "",
      deadline: "",
      status: "Aberto",
      notes: "",
    }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (program?.id) {
        const { error } = await supabase
          .from("programs")
          .update(formData)
          .eq("id", program.id);

        if (error) throw error;

        toast({
          title: "Programa atualizado",
          description: "As informações foram salvas com sucesso.",
        });
      } else {
        const { error } = await supabase.from("programs").insert([formData]);

        if (error) throw error;

        toast({
          title: "Programa cadastrado",
          description: "O programa foi criado com sucesso.",
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

  const handleArchive = async () => {
    if (!program?.id) return;
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
    } catch (err: any) {
      toast({ title: "Erro ao arquivar", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!program?.id) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("programs").delete().eq("id", program.id);
      if (error) throw error;
      toast({ title: "Programa excluído", description: "O registro foi removido." });
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
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {program ? "Editar Programa" : "Novo Programa"}
          </DialogTitle>
          <DialogDescription>
            Preencha os dados do programa PAC/Transferegov.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
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
          </div>
          <DialogFooter className="flex items-center justify-between gap-2">
            {program?.id && (
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
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
