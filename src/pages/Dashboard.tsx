import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { generateDashboardPdf } from "@/lib/pdf";
import { Building2, FolderKanban, DollarSign, TrendingUp } from "lucide-react";
import DailyTasks from "@/components/tasks/DailyTasks";

interface DashboardStats {
  totalMunicipalities: number;
  totalProjects: number;
  totalAmount: number;
  avgExecution: number;
  projectsByStatus: { status: string; count: number }[];
}

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ municipality_id: "", program_id: "", ministry: "", status: "" });
  const [municipalities, setMunicipalities] = useState<{ id: string; name: string }[]>([]);
  const [programs, setPrograms] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    loadOptions();
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [filters]);

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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      em_criacao: "Em Criação",
      enviado: "Enviado",
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
              <SelectItem value="enviado">Enviado</SelectItem>
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

      <Card>
        <CardHeader>
          <CardTitle>Projetos por Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats?.projectsByStatus.map((item) => (
              <div key={item.status} className="flex items-center justify-between">
                <span className="text-sm font-medium">{getStatusLabel(item.status)}</span>
                <span className="text-sm font-bold">{item.count}</span>
              </div>
            ))}
            {(!stats?.projectsByStatus || stats.projectsByStatus.length === 0) && (
              <p className="text-sm text-muted-foreground">Nenhum projeto cadastrado ainda</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;