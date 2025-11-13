import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/use-permissions";
import { formatDateLocal } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface Program {
  id: string;
  name: string;
  responsible_agency: string | null;
  deadline: string | null;
  status: string;
  notes: string | null;
  created_at?: string;
  excluded_municipalities?: string[] | null;
}

interface ProgramInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  program?: Program | null;
  onEdit?: () => void;
}

const formatDate = (date: string | null) => formatDateLocal(date);

export default function ProgramInfoDialog({ open, onOpenChange, program, onEdit }: ProgramInfoDialogProps) {
  const { permissions } = usePermissions();
  const [excludedNames, setExcludedNames] = useState<string[]>([]);

  useEffect(() => {
    const loadExcluded = async () => {
      if (!program?.excluded_municipalities || program.excluded_municipalities.length === 0) {
        setExcludedNames([]);
        return;
      }
      const { data } = await supabase
        .from("municipalities")
        .select("id, name")
        .in("id", program.excluded_municipalities as string[]);
      setExcludedNames((data || []).map((m) => m.name).filter(Boolean));
    };
    loadExcluded();
  }, [program?.excluded_municipalities]);
  
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
            {excludedNames.length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground">Municípios sem pendência automática</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {excludedNames.map((name) => (
                    <Badge key={name} variant="outline" className="px-2 py-0.5 text-[11px]">
                      {name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}