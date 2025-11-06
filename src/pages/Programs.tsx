import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ProgramDialog } from "@/components/programs/ProgramDialog";
import ProgramInfoDialog from "@/components/programs/ProgramInfoDialog";
import { usePermissions } from "@/hooks/use-permissions";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Program {
  id: string;
  name: string;
  responsible_agency: string | null;
  deadline: string | null;
  status: string;
  notes: string | null;
}

interface ProgramWithMunicipalities extends Program {
  municipalities?: string[];
}

const Programs = () => {
  const [programs, setPrograms] = useState<ProgramWithMunicipalities[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<Program | undefined>(undefined);
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const [detailProgram, setDetailProgram] = useState<Program | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [municipalities, setMunicipalities] = useState<{ id: string; name: string }[]>([]);
  const [filters, setFilters] = useState({
    status: "" as "" | "Aberto" | "__finalizados__" | "__all__",
    search: "",
    municipality_id: "",
    sortBy: "deadline" as "deadline" | "name" | "created_at",
  });
  const { toast } = useToast();
  const { permissions } = usePermissions();

  useEffect(() => {
    let mounted = true;
    
    const loadData = async () => {
      await loadMunicipalities();
      if (mounted) {
        await loadPrograms();
      }
    };
    
    loadData();
    
    return () => {
      mounted = false;
    };
  }, [filters]);

  const loadMunicipalities = async () => {
    try {
      const { data, error } = await supabase
        .from("municipalities")
        .select("id, name")
        .order("name");
      if (error) throw error;
      setMunicipalities(data || []);
    } catch (error) {
      // silencioso
    }
  };

  const loadPrograms = async () => {
    try {
      let query = supabase.from("programs").select("*");

      // Aplicar filtros
      if (filters.status === "__finalizados__") {
        // Mostrar apenas finalizados
        query = query.eq("status", "Finalizado");
      } else if (filters.status === "Aberto") {
        // Status específico (Aberto)
        query = query.eq("status", "Aberto");
      } else if (filters.status === "__all__") {
        // "Todos" - não aplicar filtro de status (mostra todos incluindo finalizados)
        // Não aplicar filtro
      } else {
        // Por padrão (vazio) - mostrar apenas programas abertos (ocultar finalizados)
        query = query.eq("status", "Aberto");
      }
      
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,responsible_agency.ilike.%${filters.search}%`);
      }

      // Ordenação padrão: menor prazo primeiro (nulls por último)
      // Só ordena por menor prazo quando não está mostrando finalizados
      if (filters.sortBy === "deadline") {
        query = query.order("deadline", { ascending: true, nullsFirst: false });
      } else if (filters.sortBy === "name") {
        query = query.order("name", { ascending: true });
      } else {
        query = query.order("created_at", { ascending: false });
      }

      // Buscar projetos separadamente - sempre buscar todos os projetos para mapear municípios
      // independente do filtro de status do programa
      let projectsQuery = supabase
        .from("projects")
        .select("program_id, municipality_id, municipalities(name, id)")
        .not("program_id", "is", null);

      // Se há filtro de município, aplicar na query de projetos
      if (filters.municipality_id) {
        projectsQuery = projectsQuery.eq("municipality_id", filters.municipality_id);
      }

      const [{ data: programsData, error: programsError }, { data: projectsData, error: projectsQueryError }] = await Promise.all([
        query,
        projectsQuery,
      ]);

      if (programsError) throw programsError;
      if (projectsQueryError) throw projectsQueryError;

      const programIdToMunicipalities: Record<string, string[]> = {};
      (projectsData || []).forEach((row: any) => {
        const pid = row.program_id as string | null;
        const mName = row.municipalities?.name as string | undefined;
        if (!pid || !mName) return;
        if (!programIdToMunicipalities[pid]) programIdToMunicipalities[pid] = [];
        if (!programIdToMunicipalities[pid].includes(mName)) {
          programIdToMunicipalities[pid].push(mName);
        }
      });

      let enriched = (programsData || []).map((p: Program) => ({
        ...p,
        municipalities: programIdToMunicipalities[p.id] || [],
      }));

      // Se há filtro de município, filtrar apenas programas que têm esse município
      // Mas não filtrar se estiver mostrando finalizados (pois podem não ter projetos associados)
      if (filters.municipality_id && filters.status !== "__finalizados__") {
        enriched = enriched.filter((p) => programIdToMunicipalities[p.id]?.length > 0);
      }

      setPrograms(enriched);
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
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Programas</h2>
          <p className="text-sm md:text-base text-muted-foreground">Gerencie programas PAC e Transferegov</p>
        </div>
        {permissions.canManagePrograms && (
          <Button size="sm" onClick={() => { setSelectedProgram(undefined); setDialogOpen(true); }}>
            <Plus className="h-3 w-3 md:h-4 md:w-4 md:mr-2" />
            <span className="hidden sm:inline">Novo </span>Programa
          </Button>
        )}
      </div>

      {/* Seção de Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <div className="grid gap-2">
              <Label htmlFor="filter_status">Status</Label>
              <Select
                value={filters.status === "" ? "Aberto" : filters.status}
                onValueChange={(value) => {
                  if (value === "Aberto") {
                    setFilters((f) => ({ ...f, status: "" }));
                  } else {
                    setFilters((f) => ({ ...f, status: value as typeof filters.status }));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos</SelectItem>
                  <SelectItem value="Aberto">Aberto</SelectItem>
                  <SelectItem value="__finalizados__">Finalizados</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="filter_municipality">Município</Label>
              <Select
                value={filters.municipality_id || undefined}
                onValueChange={(value) =>
                  setFilters((f) => ({ ...f, municipality_id: value === "__all__" ? "" : value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos</SelectItem>
                  {municipalities.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="filter_search">Buscar</Label>
              <Input
                id="filter_search"
                placeholder="Nome ou órgão responsável"
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="filter_sort">Ordenar por</Label>
              <Select
                value={filters.sortBy}
                onValueChange={(value) =>
                  setFilters((f) => ({ ...f, sortBy: value as typeof filters.sortBy }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deadline">Menor prazo</SelectItem>
                  <SelectItem value="name">Nome</SelectItem>
                  <SelectItem value="created_at">Mais recente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => setFilters({ status: "", search: "", municipality_id: "", sortBy: "deadline" })}
            >
              Limpar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {programs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">Nenhum programa cadastrado ainda</p>
            {permissions.canManagePrograms && (
              <Button size="sm" onClick={() => setDialogOpen(true)}>
                <Plus className="h-3 w-3 md:h-4 md:w-4 md:mr-2" />
                Cadastrar Primeiro Programa
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
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
                <div className="space-y-3 text-sm">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                      <p className="text-muted-foreground">Prazo final</p>
                      <p className="font-medium">{formatDate(program.deadline)}</p>
                    </div>
                    <div className="min-w-0 sm:max-w-[60%]">
                      <p className="text-muted-foreground">Municípios</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(() => {
                          const list = program.municipalities || [];
                          const isExpanded = !!expanded[program.id];
                          const limit = 3;
                          const visible = isExpanded ? list : list.slice(0, limit);
                          return (
                            <>
                              {visible.map((name) => (
                                <Badge key={name} variant="outline" className="px-2 py-0.5 text-[11px]">
                                  {name}
                                </Badge>
                              ))}
                              {list.length > limit && !isExpanded && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-[11px]"
                                  onClick={(e) => { e.stopPropagation(); setExpanded((prev) => ({ ...prev, [program.id]: true })); }}
                                >
                                  ver mais
                                </Button>
                              )}
                              {list.length > limit && isExpanded && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-[11px]"
                                  onClick={(e) => { e.stopPropagation(); setExpanded((prev) => ({ ...prev, [program.id]: false })); }}
                                >
                                  ver menos
                                </Button>
                              )}
                              {list.length === 0 && (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
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