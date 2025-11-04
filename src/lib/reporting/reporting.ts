import { supabase } from "@/integrations/supabase/client";

export type MunicipalityWithProjects = {
  id: string;
  name: string;
  totalProjects: number;
  totalAmount: number;
  avgExecution: number;
  projects: Array<{
    id: string;
    object: string;
    status: string;
    year: number;
    transfer_amount: number;
    counterpart_amount: number;
    execution_percentage: number;
  }>;
};

export type DashboardReportData = {
  totalMunicipalities: number;
  totalProjects: number;
  totalAmount: number;
  avgExecution: number;
  projectsByStatus: { status: string; count: number }[];
  criticalDeadlines: { title: string; date: string }[];
  insights: string[];
  municipalities: MunicipalityWithProjects[];
};

export type ProjectsReportData = {
  projects: any[];
  countsByStatus: { status: string; count: number }[];
};

export function paginate<T>(items: T[], perPage = 30) {
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += perPage) pages.push(items.slice(i, i + perPage));
  return pages;
}

export function hasData(section: any) {
  if (!section) return false;
  if (Array.isArray(section)) return section.length > 0;
  return true;
}

export async function buildDashboardReportData(filters?: { from?: string; to?: string }): Promise<DashboardReportData> {
  // Base: mesma lógica do Dashboard
  let query = supabase.from("projects").select("*, municipalities(id, name)");
  if (filters?.from) query = query.gte("created_at", filters.from);
  if (filters?.to) query = query.lte("created_at", filters.to);

  const { data: projects = [] } = await query;

  const totalProjects = projects.length;
  const totalAmount = projects.reduce((s: number, p: any) => s + Number(p.transfer_amount || 0) + Number(p.counterpart_amount || 0), 0);
  const avgExecution = totalProjects > 0 ? projects.reduce((s: number, p: any) => s + (p.execution_percentage || 0), 0) / totalProjects : 0;
  const totalMunicipalities = new Set(projects.map((p: any) => p.municipality_id)).size;

  const counts: Record<string, number> = {};
  for (const p of projects) counts[p.status] = (counts[p.status] || 0) + 1;
  const projectsByStatus = Object.entries(counts).map(([status, count]) => ({ status, count }));

  // Agrupar por município (similar ao loadMunicipalitiesBoard)
  const grouped = (projects || []).reduce((acc: Record<string, MunicipalityWithProjects>, p: any) => {
    const munId = p.municipality_id;
    const munName = p.municipalities?.name || "Sem município";
    
    if (!acc[munId]) {
      acc[munId] = {
        id: munId,
        name: munName,
        projects: [],
        totalProjects: 0,
        totalAmount: 0,
        avgExecution: 0,
      };
    }

    acc[munId].projects.push({
      id: p.id,
      object: p.object || "—",
      status: p.status,
      year: p.year || new Date().getFullYear(),
      transfer_amount: Number(p.transfer_amount || 0),
      counterpart_amount: Number(p.counterpart_amount || 0),
      execution_percentage: Number(p.execution_percentage || 0),
    });

    return acc;
  }, {});

  // Calcular totais para cada município
  const municipalities = Object.values(grouped).map((mun) => {
    const totalProjects = mun.projects.length;
    const totalAmount = mun.projects.reduce(
      (sum, p) => sum + p.transfer_amount + p.counterpart_amount,
      0
    );
    const avgExecution =
      totalProjects > 0
        ? mun.projects.reduce((sum, p) => sum + p.execution_percentage, 0) / totalProjects
        : 0;

    return {
      ...mun,
      totalProjects,
      totalAmount,
      avgExecution,
    };
  });

  // Prazos críticos: exemplo simples usando end_date em 7/15/30
  const now = new Date();
  const toDays = (n: number) => new Date(now.getTime() + n * 86400000);
  const critical: { title: string; date: string }[] = (projects as any[])
    .filter((p) => p.end_date)
    .filter((p) => new Date(p.end_date) <= toDays(30))
    .slice(0, 10)
    .map((p) => ({ title: p.object || "Projeto", date: p.end_date }));

  const insights: string[] = [];
  if (totalProjects === 0) insights.push("Não há projetos no período.");
  if (avgExecution > 0) insights.push(`Execução média de ${avgExecution.toFixed(1)}%.`);
  if (projectsByStatus.length > 0) {
    const top = [...projectsByStatus].sort((a, b) => b.count - a.count)[0];
    insights.push(`Status predominante: ${top.status} (${top.count}).`);
  }

  return { totalMunicipalities, totalProjects, totalAmount, avgExecution, projectsByStatus, criticalDeadlines: critical, insights, municipalities };
}

export async function buildProjectsReportData(filters?: { from?: string; to?: string; status?: string }) {
  let query = supabase.from("projects").select("*, municipalities(name)").order("created_at", { ascending: false });
  if (filters?.from) query = query.gte("created_at", filters.from);
  if (filters?.to) query = query.lte("created_at", filters.to);
  if (filters?.status) query = query.eq("status", filters.status);

  const { data: projects = [] } = await query;
  const counts: Record<string, number> = {};
  for (const p of projects) counts[p.status] = (counts[p.status] || 0) + 1;
  const countsByStatus = Object.entries(counts).map(([status, count]) => ({ status, count }));
  return { projects, countsByStatus } as ProjectsReportData;
}


