import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DashboardFilters {
  municipality_id: string;
  program_id: string;
  ministry: string;
  status: string;
}

export interface DashboardStats {
  totalMunicipalities: number;
  totalProjects: number;
  totalAmount: number;
  avgExecution: number;
  projectsByStatus: { status: string; count: number }[];
}

export interface MunicipalityProjectSummary {
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

export interface MunicipalitiesBoardFilter {
  status: string;
  showAll: boolean;
}

async function fetchDashboardStats(filters: DashboardFilters) {
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
    query = query.eq("status", filters.status as any);
  }

  const { data: projects, error } = await query;
  if (error) {
    throw error;
  }

  const totalAmount = (projects || []).reduce(
    (sum, p) => sum + Number(p.transfer_amount || 0) + Number(p.counterpart_amount || 0),
    0
  );
  const avgExecution =
    projects && projects.length > 0
      ? projects.reduce((sum, p) => sum + Number(p.execution_percentage || 0), 0) / projects.length
      : 0;

  const statusCounts = (projects || []).reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const distinctMunicipalities = new Set((projects || []).map((p: any) => p.municipality_id)).size;

  const stats: DashboardStats = {
    totalMunicipalities: distinctMunicipalities,
    totalProjects: projects?.length ?? 0,
    totalAmount,
    avgExecution,
    projectsByStatus: Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
    })),
  };

  return stats;
}

async function fetchMunicipalitiesBoard(filter: MunicipalitiesBoardFilter) {
  let query = supabase
    .from("projects")
    .select("*, municipalities(id, name)")
    .order("created_at", { ascending: false });

  if (filter.status && filter.status !== "all" && !filter.showAll) {
    query = query.eq("status", filter.status as any);
  }

  const { data: projects, error } = await query;
  if (error) {
    throw error;
  }

  const grouped = (projects || []).reduce((acc: Record<string, MunicipalityProjectSummary>, p: any) => {
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

  const municipalitiesData = Object.values(grouped).map((mun) => {
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

  return municipalitiesData.sort((a, b) => a.name.localeCompare(b.name));
}

export function useDashboardData(filters: DashboardFilters) {
  return useQuery({
    queryKey: ["dashboard-data", filters],
    queryFn: () => fetchDashboardStats(filters),
    staleTime: 60 * 1000,
  });
}

export function useMunicipalitiesBoardData(filter: MunicipalitiesBoardFilter) {
  return useQuery({
    queryKey: ["municipalities-board", filter],
    queryFn: () => fetchMunicipalitiesBoard(filter),
    staleTime: 60 * 1000,
  });
}


