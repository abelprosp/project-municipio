import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MunicipalityDialog } from "@/components/municipalities/MunicipalityDialog";

interface Municipality {
  id: string;
  name: string;
  state: string;
  manager: string | null;
  email: string | null;
  phone: string | null;
}

const Municipalities = () => {
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMunicipality, setSelectedMunicipality] = useState<Municipality | undefined>(undefined);
  const { toast } = useToast();

  useEffect(() => {
    loadMunicipalities();
  }, []);

  const loadMunicipalities = async () => {
    try {
      const { data, error } = await supabase
        .from("municipalities")
        .select("*")
        .order("name");

      if (error) throw error;
      setMunicipalities(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar municípios",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Carregando municípios...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Municípios</h2>
          <p className="text-muted-foreground">Gerencie os municípios cadastrados</p>
        </div>
        <Button onClick={() => { setSelectedMunicipality(undefined); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Município
        </Button>
      </div>

      {municipalities.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">Nenhum município cadastrado ainda</p>
            <Button onClick={() => { setSelectedMunicipality(undefined); setDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              Cadastrar Primeiro Município
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {municipalities.map((municipality) => (
            <Card
              key={municipality.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => { setSelectedMunicipality(municipality); setDialogOpen(true); }}
            >
              <CardHeader>
                <CardTitle>{municipality.name}</CardTitle>
                <CardDescription>{municipality.state}</CardDescription>
              </CardHeader>
              <CardContent>
                {municipality.manager && (
                  <p className="text-sm text-muted-foreground">
                    Gestor: {municipality.manager}
                  </p>
                )}
                {municipality.email && (
                  <p className="text-sm text-muted-foreground">{municipality.email}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <MunicipalityDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        municipality={selectedMunicipality}
        onSuccess={loadMunicipalities}
      />
    </div>
  );
};

export default Municipalities;