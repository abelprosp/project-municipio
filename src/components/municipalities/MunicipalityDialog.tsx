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
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/use-permissions";
import { useUserControl } from "@/hooks/use-user-control";

interface Municipality {
  id?: string;
  name: string;
  state: string;
  cnpj: string | null;
  address: string | null;
  manager: string | null;
  email: string | null;
  phone: string | null;
  notes?: string | null;
  receives_projects?: boolean;
}

interface MunicipalityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  municipality?: Municipality;
  onSuccess: () => void;
}

export function MunicipalityDialog({
  open,
  onOpenChange,
  municipality,
  onSuccess,
}: MunicipalityDialogProps) {
  const { toast } = useToast();
  const { permissions } = usePermissions();
  const { logActivity } = useUserControl();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Municipality>(
    municipality || {
      name: "",
      state: "",
      cnpj: "",
      address: "",
      manager: "",
      email: "",
      phone: "",
      notes: "",
      receives_projects: true,
    }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (municipality?.id) {
        const { error } = await supabase
          .from("municipalities")
          .update(formData)
          .eq("id", municipality.id);

        if (error) throw error;

        toast({
          title: "Município atualizado",
          description: "As informações foram salvas com sucesso.",
        });
        await logActivity(
          "update",
          "municipality",
          municipality.id,
          formData.name || "Município",
          `Município "${formData.name}" atualizado`
        );
      } else {
        const { error } = await supabase
          .from("municipalities")
          .insert([formData]);

        if (error) throw error;

        toast({
          title: "Município cadastrado",
          description: "O município foi criado com sucesso.",
        });
        // Não temos o ID imediatamente sem select returning; logaremos com nome
        await logActivity(
          "create",
          "municipality",
          "new",
          formData.name || "Município",
          `Município "${formData.name}" criado`
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
    if (!municipality?.id) return;
    setLoading(true);
    try {
      const archivedNotePrefix = "[Arquivado] ";
      const newNotes = `${archivedNotePrefix}${formData.notes || ""}`;
      const { error } = await supabase
        .from("municipalities")
        .update({ ...formData, notes: newNotes })
        .eq("id", municipality.id);
      if (error) throw error;
      toast({ title: "Município arquivado", description: "Marcado como arquivado nas observações." });
      onSuccess();
      onOpenChange(false);
      await logActivity(
        "archive",
        "municipality",
        municipality.id,
        formData.name || "Município",
        `Município "${formData.name}" arquivado`
      );
    } catch (err: any) {
      toast({ title: "Erro ao arquivar", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!municipality?.id) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("municipalities").delete().eq("id", municipality.id);
      if (error) throw error;
      toast({ title: "Município excluído", description: "O registro foi removido." });
      onSuccess();
      onOpenChange(false);
      await logActivity(
        "delete",
        "municipality",
        municipality.id,
        formData.name || "Município",
        `Município "${formData.name}" excluído`
      );
    } catch (err: any) {
      toast({ title: "Erro ao excluir", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
          <DialogTitle>
            {municipality ? "Editar Município" : "Novo Município"}
          </DialogTitle>
          <DialogDescription>
            Preencha os dados do município abaixo.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 min-h-0 px-6 h-full">
          <form onSubmit={handleSubmit} id="municipality-form">
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
              <Label htmlFor="state">UF *</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) =>
                  setFormData({ ...formData, state: e.target.value })
                }
                maxLength={2}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input
                id="cnpj"
                value={formData.cnpj || ""}
                onChange={(e) =>
                  setFormData({ ...formData, cnpj: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address">Endereço</Label>
              <Input
                id="address"
                value={formData.address || ""}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="manager">Gestor Responsável</Label>
              <Input
                id="manager"
                value={formData.manager || ""}
                onChange={(e) =>
                  setFormData({ ...formData, manager: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ""}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={formData.phone || ""}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
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
            <div className="flex items-center gap-3">
              <input
                id="receives_projects"
                type="checkbox"
                className="h-4 w-4"
                checked={formData.receives_projects ?? true}
                onChange={(e) =>
                  setFormData({ ...formData, receives_projects: e.target.checked })
                }
              />
              <Label htmlFor="receives_projects">Recebe Projetos</Label>
            </div>
            </div>
          </form>
        </ScrollArea>
        <DialogFooter className="flex items-center justify-between gap-2 px-6 py-4 border-t flex-shrink-0">
          {municipality?.id && permissions.canManageMunicipalities && (
            <div className="flex items-center gap-2">
              <Button type="button" variant="secondary" onClick={handleArchive} disabled={loading}>
                Arquivar
              </Button>
              <Button type="button" variant="destructive" onClick={handleDelete} disabled={loading}>
                Excluir
              </Button>
            </div>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            {permissions.canManageMunicipalities && (
              <Button type="submit" form="municipality-form" disabled={loading}>
                {loading ? "Salvando..." : "Salvar"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
