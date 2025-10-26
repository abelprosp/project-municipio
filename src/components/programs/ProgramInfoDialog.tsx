import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/use-permissions";

interface Program {
  id: string;
  name: string;
  responsible_agency: string | null;
  deadline: string | null;
  status: string;
  notes: string | null;
  created_at?: string;
}

interface ProgramInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  program?: Program | null;
  onEdit?: () => void;
}

const formatDate = (date: string | null) => {
  if (!date) return "Sem prazo definido";
  const d = new Date(date);
  return isNaN(d.getTime()) ? "Sem prazo definido" : d.toLocaleDateString("pt-BR");
};

export default function ProgramInfoDialog({ open, onOpenChange, program, onEdit }: ProgramInfoDialogProps) {
  const { permissions } = usePermissions();
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Detalhes do Programa</DialogTitle>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant={program?.status === "Aberto" ? "default" : "secondary"}>{program?.status || "—"}</Badge>
            {onEdit && permissions.canManagePrograms && <Button size="sm" onClick={onEdit}>Editar</Button>}
          </div>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Nome</Label>
                <div className="font-medium">{program?.name || "—"}</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Órgão Responsável</Label>
                <div className="font-medium">{program?.responsible_agency || "—"}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Prazo</Label>
                <div className="font-medium">{formatDate(program?.deadline || null)}</div>
              </div>
            </div>
            {program?.notes && (
              <div>
                <Label className="text-xs text-muted-foreground">Observações</Label>
                <div className="mt-1">{program.notes}</div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}