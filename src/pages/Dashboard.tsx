import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { generateDashboardPdf } from "@/lib/pdf";
import { Building2, FolderKanban, DollarSign, TrendingUp } from "lucide-react";

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

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [municipalitiesRes, projectsRes] = await Promise.all([
        supabase.from("municipalities").select("id", { count: "exact" }),
        supabase.from("projects").select("*"),
      ]);

      const projects = projectsRes.data || [];
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

      setStats({
        totalMunicipalities: municipalitiesRes.count || 0,
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