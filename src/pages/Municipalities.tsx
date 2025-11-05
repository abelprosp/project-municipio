import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MunicipalityDialog } from "@/components/municipalities/MunicipalityDialog";
import MunicipalityInfoDialog from "@/components/municipalities/MunicipalityInfoDialog";
import { usePermissions } from "@/hooks/use-permissions";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface Municipality {
  id: string;
  name: string;
  state: string;
  cnpj: string | null;
  address: string | null;
  manager: string | null;
  email: string | null;
  phone: string | null;
}

const Municipalities = () => {
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [filteredMunicipalities, setFilteredMunicipalities] = useState<Municipality[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMunicipality, setSelectedMunicipality] = useState<Municipality | undefined>(undefined);
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const [detailMunicipality, setDetailMunicipality] = useState<Municipality | null>(null);
  const [searchFilter, setSearchFilter] = useState("");
  const { toast } = useToast();
  const { permissions } = usePermissions();

  useEffect(() => {
    loadMunicipalities();
  }, []);

  useEffect(() => {
    if (!searchFilter.trim()) {
      setFilteredMunicipalities(municipalities);
    } else {
      const searchLower = searchFilter.toLowerCase();
      const filtered = municipalities.filter(
        (m) =>
          m.name.toLowerCase().includes(searchLower) ||
          m.state.toLowerCase().includes(searchLower) ||
          (m.manager && m.manager.toLowerCase().includes(searchLower)) ||
          (m.email && m.email.toLowerCase().includes(searchLower)) ||
          (m.cnpj && m.cnpj.includes(searchFilter))
      );
      setFilteredMunicipalities(filtered);
    }
  }, [searchFilter, municipalities]);

  const loadMunicipalities = async () => {
    try {
      const { data, error } = await supabase
        .from("municipalities")
        .select("*")
        .order("name");

      if (error) throw error;
      setMunicipalities(data || []);
      setFilteredMunicipalities(data || []);
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
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Municípios</h2>
          <p className="text-sm md:text-base text-muted-foreground">Gerencie os municípios cadastrados</p>
        </div>
        {permissions.canManageMunicipalities && (
          <Button size="sm" onClick={() => { setSelectedMunicipality(undefined); setDialogOpen(true); }}>
            <Plus className="h-3 w-3 md:h-4 md:w-4 md:mr-2" />
            <span className="hidden sm:inline">Novo </span>Município
          </Button>
        )}
      </div>

      {/* Filtro de busca */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-2">
            <Label htmlFor="search_municipality">Buscar município</Label>
            <Input
              id="search_municipality"
              placeholder="Nome, estado, gestor, email ou CNPJ"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
            />
          </div>
          {searchFilter && (
            <div className="flex justify-end mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchFilter("")}
              >
                Limpar busca
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {municipalities.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">Nenhum município cadastrado ainda</p>
            {permissions.canManageMunicipalities && (
              <Button onClick={() => { setSelectedMunicipality(undefined); setDialogOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" />
                Cadastrar Primeiro Município
              </Button>
            )}
          </CardContent>
        </Card>
      ) : filteredMunicipalities.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">Nenhum município encontrado com o filtro aplicado</p>
            <Button variant="outline" onClick={() => setSearchFilter("")}>
              Limpar busca
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filteredMunicipalities.map((municipality) => (
            <Card
              key={municipality.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={async () => {
                try {
                  const { data, error } = await supabase
                    .from("municipalities")
                    .select("*")
                    .eq("id", municipality.id)
                    .single();
                  if (error) throw error;
                  setDetailMunicipality(data);
                  setInfoDialogOpen(true);
                } catch (err: any) {
                  toast({ title: "Erro ao abrir detalhes", description: err.message, variant: "destructive" });
                }
              }}
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

      <MunicipalityInfoDialog
        open={infoDialogOpen}
        onOpenChange={setInfoDialogOpen}
        municipality={detailMunicipality ?? undefined}
        onEdit={() => {
          if (!detailMunicipality) return;
          setSelectedMunicipality(detailMunicipality);
          setInfoDialogOpen(false);
          setDialogOpen(true);
        }}
      />
    </div>
  );
};

export default Municipalities;