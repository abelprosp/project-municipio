import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/use-permissions";

interface Municipality {
  id: string;
  name: string;
  state: string;
  manager: string | null;
  email: string | null;
  phone: string | null;
  notes?: string | null;
}

interface MunicipalityInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  municipality?: Municipality | null;
  onEdit?: () => void;
}

export default function MunicipalityInfoDialog({ open, onOpenChange, municipality, onEdit }: MunicipalityInfoDialogProps) {
  const { permissions } = usePermissions();
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Detalhes do Município</DialogTitle>
          {onEdit && permissions.canManageMunicipalities && (
            <div className="mt-2">
              <Button size="sm" onClick={onEdit}>Editar</Button>
            </div>
          )}
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Nome</Label>
                <div className="font-medium">{municipality?.name || "—"}</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">UF</Label>
                <div className="font-medium">{municipality?.state || "—"}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Gestor</Label>
                <div className="font-medium">{municipality?.manager || "—"}</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Telefone</Label>
                <div className="font-medium">{municipality?.phone || "—"}</div>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">E-mail</Label>
              <div className="font-medium">{municipality?.email || "—"}</div>
            </div>
            {municipality?.notes && (
              <div>
                <Label className="text-xs text-muted-foreground">Observações</Label>
                <div className="mt-1 text-sm">{municipality.notes}</div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}