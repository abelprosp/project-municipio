import { supabase } from "@/integrations/supabase/client";

function summarizeProjects(projects: any[]) {
  const statusCounts = projects.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalAmount = projects.reduce(
    (sum, p) => sum + Number(p.transfer_amount || 0) + Number(p.counterpart_amount || 0),
    0
  );
  const avgExecution =
    projects.length > 0
      ? projects.reduce((sum, p) => sum + (p.execution_percentage || 0), 0) / projects.length
      : 0;

  const statusLine = Object.entries(statusCounts)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");
  return `Projetos: ${projects.length} | Total (repasse+contrapartida): ${totalAmount.toFixed(2)} | Execução média: ${avgExecution.toFixed(2)}% | Status: ${statusLine}`;
}

export async function fetchContextSamples(limit = 8) {
  const [projRes, munRes, progRes] = await Promise.all([
    supabase
      .from("projects")
      .select("id, object, status, transfer_amount, counterpart_amount, execution_percentage, municipalities(name), programs(name)")
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("municipalities")
      .select("id, name, state, manager, email")
      .order("name")
      .limit(Math.max(5, Math.floor(limit / 2))),
    supabase
      .from("programs")
      .select("id, name, status, description, responsible_body")
      .order("name")
      .limit(Math.max(5, Math.floor(limit / 2))),
  ]);

  const projects = projRes.data || [];
  const municipalities = munRes.data || [];
  const programs = progRes.data || [];

  const summary = summarizeProjects(projects);

  const projectsSample = projects
    .map((p: any) => {
      const muni = p?.municipalities?.name ? ` | Município: ${p.municipalities.name}` : "";
      const prog = p?.programs?.name ? ` | Programa: ${p.programs.name}` : "";
      return `• ${p.object} | Status: ${p.status}${muni}${prog}`;
    })
    .join("\n");

  const municipalitiesSample = municipalities
    .map((m: any) => `• ${m.name} (${m.state})${m.manager ? ` | Gestor: ${m.manager}` : ""}`)
    .join("\n");

  const programsSample = programs
    .map((g: any) => `• ${g.name} | Órgão: ${g.responsible_body ?? "—"} | Status: ${g.status ?? "—"}`)
    .join("\n");

  return {
    summary,
    projectsSample,
    municipalitiesSample,
    programsSample,
  };
}