import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { generateDashboardPdf } from "@/lib/pdf";
import { Building2, FolderKanban, DollarSign, TrendingUp, BarChart3, PieChart, MapPin, Users } from "lucide-react";
import DailyTasks from "@/components/tasks/DailyTasks";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart as RechartsPieChart, Cell, Pie } from "recharts";
import { Badge } from "@/components/ui/badge";
import { UserControlPanel } from "@/components/user/UserControlPanel";
import { useUserControl } from "@/hooks/use-user-control";

interface DashboardStats {
  totalMunicipalities: number;
  totalProjects: number;
  totalAmount: number;
  avgExecution: number;
  projectsByStatus: { status: string; count: number }[];
}

interface MunicipalityWithProjects {
  id: string;
  name: string;
  projects: {
    id: string;
    object: string;
    status: string;
    year: number;
    transfer_amount: number;
    counterpart_amount: number;
    execution_percentage: number;
  }[];
  totalProjects: number;
  totalAmount: number;
  avgExecution: number;
}

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ municipality_id: "", program_id: "", ministry: "", status: "" });
  const [municipalities, setMunicipalities] = useState<{ id: string; name: string }[]>([]);
  const [programs, setPrograms] = useState<{ id: string; name: string }[]>([]);
  const [municipalitiesWithProjects, setMunicipalitiesWithProjects] = useState<MunicipalityWithProjects[]>([]);
  const [boardFilter, setBoardFilter] = useState({ status: "em_elaboracao", showCompleted: false });
  
  // Hook para controle de usuário
  const { logActivity } = useUserControl();

  useEffect(() => {
    loadOptions();
  }, []);

  useEffect(() => {
    loadDashboardData();
    loadMunicipalitiesWithProjects();
  }, [filters, boardFilter]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      let query = supabase.from("projects").select("*");
      if (filters.municipality_id) {
        query = query.eq("municipality_id", filters.municipality_id);
      }
      if (filters.program_id) {
        query = query.eq("program_id", filters.program_id);
      }
      if (filters.ministry) {
        query = query.ilike("ministry", `%${filters.ministry}%`);
      }
      if (filters.status) {
        query = query.eq("status", filters.status);
      }

      const { data: projects, error } = await query;
      if (error) throw error;
      const totalAmount = projects.reduce(
        (sum, p) => sum + Number(p.transfer_amount) + Number(p.counterpart_amount),
        0
      );
      const avgExecution =
        projects.length > 0
          ? projects.reduce((sum, p) => sum + (p.execution_percentage || 0), 0) / projects.length
          : 0;

      const statusCounts = projects.reduce((acc, p) => {
        acc[p.status] = (acc[p.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const distinctMunicipalities = new Set((projects || []).map((p: any) => p.municipality_id)).size;
      setStats({
        totalMunicipalities: distinctMunicipalities,
        totalProjects: projects.length,
        totalAmount,
        avgExecution,
        projectsByStatus: Object.entries(statusCounts).map(([status, count]) => ({
          status,
          count,
        })),
      });
    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadOptions = async () => {
    try {
      const [munRes, progRes] = await Promise.all([
        supabase.from("municipalities").select("id, name").order("name"),
        supabase.from("programs").select("id, name").order("name"),
      ]);
      setMunicipalities(munRes.data || []);
      setPrograms(progRes.data || []);
    } catch (error) {
      console.error("Erro ao carregar opções:", error);
    }
  };

  const loadMunicipalitiesWithProjects = async () => {
    try {
      const { data: municipalitiesData, error: munError } = await supabase
        .from("municipalities")
        .select("id, name")
        .order("name");

      if (munError) throw munError;

      const { data: projectsData, error: projError } = await supabase
        .from("projects")
        .select("id, object, status, year, transfer_amount, counterpart_amount, execution_percentage, municipality_id")
        .order("created_at", { ascending: false });

      if (projError) throw projError;

      // Agrupar projetos por município
      const municipalitiesWithProjectsData = municipalitiesData.map(municipality => {
        const municipalityProjects = projectsData.filter(project => 
          project.municipality_id === municipality.id &&
          (boardFilter.showCompleted || project.status === boardFilter.status)
        );

        const totalAmount = municipalityProjects.reduce(
          (sum, p) => sum + Number(p.transfer_amount) + Number(p.counterpart_amount), 
          0
        );

        const avgExecution = municipalityProjects.length > 0
          ? municipalityProjects.reduce((sum, p) => sum + (p.execution_percentage || 0), 0) / municipalityProjects.length
          : 0;

        return {
          id: municipality.id,
          name: municipality.name,
          projects: municipalityProjects,
          totalProjects: municipalityProjects.length,
          totalAmount,
          avgExecution
        };
      }).filter(m => m.totalProjects > 0); // Apenas municípios com projetos

      setMunicipalitiesWithProjects(municipalitiesWithProjectsData);
    } catch (error) {
      console.error("Erro ao carregar municípios com projetos:", error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      em_criacao: "Em Criação",
      em_elaboracao: "Em Elaboração",
      em_analise: "Em Análise",
      em_complementacao: "Em Complementação",
      solicitado_documentacao: "Solicitado Documentação",
      aguardando_documentacao: "Aguardando Documentação",
      clausula_suspensiva: "Cláusula Suspensiva",
      aprovado: "Aprovado",
      em_execucao: "Em Execução",
      prestacao_contas: "Prestação de Contas",
      concluido: "Concluído",
      cancelado: "Cancelado",
    };
    return labels[status] || status;
  };

  // Cores para os gráficos
  const COLORS = [
    "#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#00ff00", 
    "#ff00ff", "#00ffff", "#ff0000", "#0000ff", "#ffff00", 
    "#ffa500", "#800080"
  ];

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      em_criacao: "#8884d8",
      em_elaboracao: "#82ca9d", 
      em_analise: "#ffc658",
      em_complementacao: "#ff7300",
      solicitado_documentacao: "#00ff00",
      aguardando_documentacao: "#ff00ff",
      clausula_suspensiva: "#ff0000",
      aprovado: "#00ffff",
      em_execucao: "#0000ff",
      prestacao_contas: "#ffff00",
      concluido: "#00ff00",
      cancelado: "#ff0000",
    };
    return colorMap[status] || "#8884d8";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Carregando dados...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Visão geral dos convênios e projetos</p>
        </div>
        <Button
          variant="outline"
          onClick={() => stats && generateDashboardPdf(stats)}
          disabled={!stats}
        >
          Gerar PDF
        </Button>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="filter_municipality">Município</Label>
          <Select
            value={filters.municipality_id || undefined}
            onValueChange={(val) => setFilters((f) => ({ ...f, municipality_id: val === "__all__" ? "" : val }))}
          >
            <SelectTrigger id="filter_municipality">
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
          <Label htmlFor="filter_program">Programa</Label>
          <Select
            value={filters.program_id || undefined}
            onValueChange={(val) => setFilters((f) => ({ ...f, program_id: val === "__all__" ? "" : val }))}
          >
            <SelectTrigger id="filter_program">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos</SelectItem>
              {programs.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="filter_ministry">Ministério</Label>
          <Input
            id="filter_ministry"
            placeholder="Digite para filtrar"
            value={filters.ministry}
            onChange={(e) => setFilters((f) => ({ ...f, ministry: e.target.value }))}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="filter_status">Status</Label>
          <Select
            value={filters.status || undefined}
            onValueChange={(val) => setFilters((f) => ({ ...f, status: val === "__all__" ? "" : val }))}
          >
            <SelectTrigger id="filter_status">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos</SelectItem>
              <SelectItem value="em_criacao">Em Criação</SelectItem>
                <SelectItem value="em_elaboracao">Em Elaboração</SelectItem>
              <SelectItem value="em_analise">Em Análise</SelectItem>
              <SelectItem value="em_complementacao">Em Complementação</SelectItem>
              <SelectItem value="solicitado_documentacao">Solicitado Documentação</SelectItem>
              <SelectItem value="aguardando_documentacao">Aguardando Documentação</SelectItem>
              <SelectItem value="clausula_suspensiva">Cláusula Suspensiva</SelectItem>
              <SelectItem value="aprovado">Aprovado</SelectItem>
              <SelectItem value="em_execucao">Em Execução</SelectItem>
              <SelectItem value="prestacao_contas">Prestação de Contas</SelectItem>
              <SelectItem value="concluido">Concluído</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-4 flex items-center justify-end">
          <Button variant="outline" onClick={() => setFilters({ municipality_id: "", program_id: "", ministry: "", status: "" })}>
            Limpar filtros
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Municípios</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalMunicipalities || 0}</div>
            <p className="text-xs text-muted-foreground">Total cadastrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projetos</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalProjects || 0}</div>
            <p className="text-xs text-muted-foreground">Em andamento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.totalAmount || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Repasse + contrapartida</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Execução Média</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(stats?.avgExecution || 0)}%
            </div>
            <p className="text-xs text-muted-foreground">Percentual médio</p>
          </CardContent>
        </Card>
      </div>

      {/* Atividades do dia e próximos dias */}
      <DailyTasks />

      {/* Quadro de Municípios */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Quadro de Municípios
          </CardTitle>
          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2">
              <Label htmlFor="board_status">Status dos Projetos:</Label>
              <Select
                value={boardFilter.status}
                onValueChange={(val) => setBoardFilter(prev => ({ ...prev, status: val }))}
              >
                <SelectTrigger id="board_status" className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="em_criacao">Em Criação</SelectItem>
                  <SelectItem value="em_elaboracao">Em Elaboração</SelectItem>
                  <SelectItem value="em_analise">Em Análise</SelectItem>
                  <SelectItem value="em_complementacao">Em Complementação</SelectItem>
                  <SelectItem value="solicitado_documentacao">Solicitado Documentação</SelectItem>
                  <SelectItem value="aguardando_documentacao">Aguardando Documentação</SelectItem>
                  <SelectItem value="clausula_suspensiva">Cláusula Suspensiva</SelectItem>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="em_execucao">Em Execução</SelectItem>
                  <SelectItem value="prestacao_contas">Prestação de Contas</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="show_completed"
                checked={boardFilter.showCompleted}
                onChange={(e) => setBoardFilter(prev => ({ ...prev, showCompleted: e.target.checked }))}
                className="rounded"
              />
              <Label htmlFor="show_completed">Mostrar todos os status</Label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {municipalitiesWithProjects.map((municipality) => (
              <Card key={municipality.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    {municipality.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Projetos:</span>
                    <Badge variant="secondary">{municipality.totalProjects}</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Valor Total:</span>
                    <span className="text-sm font-medium">{formatCurrency(municipality.totalAmount)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Execução:</span>
                    <Badge 
                      variant={municipality.avgExecution >= 80 ? "default" : municipality.avgExecution >= 50 ? "secondary" : "destructive"}
                    >
                      {Math.round(municipality.avgExecution)}%
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground">Projetos:</div>
                    {municipality.projects.slice(0, 3).map((project) => (
                      <div key={project.id} className="text-xs p-2 bg-gray-50 rounded">
                        <div className="font-medium truncate">{project.object}</div>
                        <div className="flex items-center justify-between mt-1">
                          <Badge variant="outline" className="text-xs">
                            {getStatusLabel(project.status)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{project.year}</span>
                        </div>
                      </div>
                    ))}
                    {municipality.projects.length > 3 && (
                      <div className="text-xs text-muted-foreground text-center">
                        +{municipality.projects.length - 3} mais
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {municipalitiesWithProjects.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum município encontrado com projetos no status selecionado</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gráficos */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Gráfico de Barras - Projetos por Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Projetos por Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                projectsByStatus: {
                  label: "Projetos",
                },
              }}
              className="h-[300px]"
            >
              <BarChart data={stats?.projectsByStatus.map(item => ({
                status: getStatusLabel(item.status),
                count: item.count,
                fill: getStatusColor(item.status)
              })) || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="status" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={12}
                />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Pizza - Distribuição por Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Distribuição por Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                projectsByStatus: {
                  label: "Projetos",
                },
              }}
              className="h-[300px]"
            >
              <RechartsPieChart>
                <Pie
                  data={stats?.projectsByStatus.map(item => ({
                    name: getStatusLabel(item.status),
                    value: item.count,
                    fill: getStatusColor(item.status)
                  })) || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stats?.projectsByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getStatusColor(entry.status)} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </RechartsPieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Resumo em Cards */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo Detalhado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {stats?.projectsByStatus.map((item) => (
              <div key={item.status} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: getStatusColor(item.status) }}
                  />
                  <span className="text-sm font-medium">{getStatusLabel(item.status)}</span>
                </div>
                <span className="text-lg font-bold">{item.count}</span>
              </div>
            ))}
            {(!stats?.projectsByStatus || stats.projectsByStatus.length === 0) && (
              <p className="text-sm text-muted-foreground col-span-full">Nenhum projeto cadastrado ainda</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Painel de Controle do Usuário */}
      <UserControlPanel />
    </div>
  );
};

export default Dashboard;