import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ProgramDialog } from "@/components/programs/ProgramDialog";
import ProgramInfoDialog from "@/components/programs/ProgramInfoDialog";

interface Program {
  id: string;
  name: string;
  responsible_agency: string | null;
  deadline: string | null;
  status: string;
  notes: string | null;
}

const Programs = () => {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<Program | undefined>(undefined);
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const [detailProgram, setDetailProgram] = useState<Program | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadPrograms();
  }, []);

  const loadPrograms = async () => {
    try {
      const { data, error } = await supabase
        .from("programs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPrograms(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar programas",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return "Sem prazo definido";
    return new Date(date).toLocaleDateString("pt-BR");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Carregando programas...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Programas</h2>
          <p className="text-muted-foreground">Gerencie programas PAC e Transferegov</p>
        </div>
        <Button onClick={() => { setSelectedProgram(undefined); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Programa
        </Button>
      </div>

      {programs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">Nenhum programa cadastrado ainda</p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Cadastrar Primeiro Programa
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {programs.map((program) => (
            <Card
              key={program.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={async () => {
                try {
                  const { data, error } = await supabase
                    .from("programs")
                    .select("*")
                    .eq("id", program.id)
                    .single();
                  if (error) throw error;
                  setDetailProgram(data);
                  setInfoDialogOpen(true);
                } catch (err: any) {
                  toast({ title: "Erro ao abrir detalhes", description: err.message, variant: "destructive" });
                }
              }}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="mb-2">{program.name}</CardTitle>
                    {program.responsible_agency && (
                      <CardDescription>{program.responsible_agency}</CardDescription>
                    )}
                  </div>
                  <Badge variant={program.status === "Aberto" ? "default" : "secondary"}>
                    {program.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Prazo final</p>
                    <p className="font-medium">{formatDate(program.deadline)}</p>
                  </div>
                  {program.notes && (
                    <div>
                      <p className="text-muted-foreground">Observações</p>
                      <p className="text-sm">{program.notes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ProgramDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        program={selectedProgram}
        onSuccess={loadPrograms}
      />

      <ProgramInfoDialog
        open={infoDialogOpen}
        onOpenChange={setInfoDialogOpen}
        program={detailProgram ?? undefined}
        onEdit={() => {
          if (!detailProgram) return;
          setSelectedProgram(detailProgram);
          setInfoDialogOpen(false);
          setDialogOpen(true);
        }}
      />
    </div>
  );
};

export default Programs;