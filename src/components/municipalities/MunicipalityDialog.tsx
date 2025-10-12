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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Municipality {
  id?: string;
  name: string;
  state: string;
  manager: string | null;
  email: string | null;
  phone: string | null;
  notes?: string | null;
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
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Municipality>(
    municipality || {
      name: "",
      state: "",
      manager: "",
      email: "",
      phone: "",
      notes: "",
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
      } else {
        const { error } = await supabase
          .from("municipalities")
          .insert([formData]);

        if (error) throw error;

        toast({
          title: "Município cadastrado",
          description: "O município foi criado com sucesso.",
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {municipality ? "Editar Município" : "Novo Município"}
          </DialogTitle>
          <DialogDescription>
            Preencha os dados do município abaixo.
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
          </div>
          <DialogFooter>
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
