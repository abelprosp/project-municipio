import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";

type DashboardStats = {
  totalMunicipalities: number;
  totalProjects: number;
  totalAmount: number;
  avgExecution: number;
  projectsByStatus: { status: string; count: number }[];
};

type ProjectStatus =
  | "em_criacao"
  | "enviado"
  | "em_analise"
  | "em_complementacao"
  | "solicitado_documentacao"
  | "aguardando_documentacao"
  | "clausula_suspensiva"
  | "aprovado"
  | "em_execucao"
  | "prestacao_contas"
  | "concluido"
  | "cancelado";

const STATUS_LABEL: Record<string, string> = {
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

const formatCurrencyBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const formatDateBR = (date?: string | null) => {
  if (!date) return "—";
  try {
    return new Intl.DateTimeFormat("pt-BR").format(new Date(date));
  } catch {
    return date as string;
  }
};

export async function generateDashboardPdf(stats: DashboardStats) {
  const doc = new jsPDF();
  const marginLeft = 14;
  let y = 20;

  doc.setFontSize(16);
  doc.text("Relatório Geral — Dashboard", marginLeft, y);
  doc.setFontSize(10);
  y += 6;
  doc.text(`Emitido em: ${new Date().toLocaleString("pt-BR")}`, marginLeft, y);

  y += 12;
  doc.setFontSize(12);
  doc.text("Resumo", marginLeft, y);
  y += 8;
  doc.setFontSize(10);
  doc.text(`Municípios: ${stats.totalMunicipalities}`, marginLeft, y);
  y += 6;
  doc.text(`Projetos: ${stats.totalProjects}`, marginLeft, y);
  y += 6;
  doc.text(`Valor Total: ${formatCurrencyBRL(stats.totalAmount)}`, marginLeft, y);
  y += 6;
  doc.text(`Execução Média: ${Math.round(stats.avgExecution)}%`, marginLeft, y);

  y += 12;
  doc.setFontSize(12);
  doc.text("Projetos por Status", marginLeft, y);
  y += 8;
  doc.setFontSize(10);
  for (const item of stats.projectsByStatus || []) {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.text(`${STATUS_LABEL[item.status] || item.status}: ${item.count}`, marginLeft, y);
    y += 6;
  }

  doc.save(`relatorio-geral-dashboard.pdf`);
}

export async function generateProjectPdfById(projectId: string) {
  const { data: project, error } = await supabase
    .from("projects")
    .select("*, municipalities(name), programs(name, status)")
    .eq("id", projectId)
    .single();
  if (error || !project) throw error || new Error("Projeto não encontrado");

  const { data: movements } = await supabase
    .from("movements")
    .select("*")
    .eq("project_id", projectId)
    .order("date", { ascending: true });

  const doc = new jsPDF();
  const marginLeft = 14;
  let y = 20;

  doc.setFontSize(16);
  doc.text("Relatório do Projeto", marginLeft, y);
  doc.setFontSize(10);
  y += 6;
  doc.text(`Emitido em: ${new Date().toLocaleString("pt-BR")}`, marginLeft, y);

  y += 12;
  doc.setFontSize(12);
  doc.text("Dados do Projeto", marginLeft, y);
  y += 8;
  doc.setFontSize(10);
  doc.text(`Objeto: ${project.object || "—"}`, marginLeft, y);
  y += 6;
  doc.text(`Município: ${project.municipalities?.name || "—"}`, marginLeft, y);
  y += 6;
  doc.text(`Ano: ${project.year ?? "—"}`, marginLeft, y);
  y += 6;
  if (project.proposal_number) {
    doc.text(`Nº Proposta: ${project.proposal_number}`, marginLeft, y);
    y += 6;
  }
  if (project.ministry) {
    doc.text(`Ministério/Órgão: ${project.ministry}`, marginLeft, y);
    y += 6;
  }
  if (project.programs?.name) {
    doc.text(`Programa: ${project.programs.name} (${project.programs.status || "—"})`, marginLeft, y);
    y += 6;
  }
  doc.text(
    `Valores: Repasse ${formatCurrencyBRL(Number(project.transfer_amount))} | Contrapartida ${formatCurrencyBRL(Number(project.counterpart_amount))}`,
    marginLeft,
    y
  );
  y += 6;
  doc.text(`Total: ${formatCurrencyBRL(Number(project.transfer_amount) + Number(project.counterpart_amount))}`, marginLeft, y);
  y += 6;
  doc.text(`Execução: ${project.execution_percentage ?? 0}%`, marginLeft, y);
  y += 6;
  doc.text(`Situação: ${STATUS_LABEL[project.status as ProjectStatus] || project.status}`, marginLeft, y);
  y += 6;
  if (project.start_date || project.end_date) {
    doc.text(`Período: ${formatDateBR(project.start_date)} a ${formatDateBR(project.end_date)}`, marginLeft, y);
    y += 6;
  }
  if (project.accountability_date) {
    doc.text(`Prestação de Contas: ${formatDateBR(project.accountability_date)}`, marginLeft, y);
    y += 6;
  }
  if (project.status === "solicitado_documentacao") {
    if ((project as any).document_request_date) {
      doc.text(`Data de envio: ${formatDateBR((project as any).document_request_date)}`, marginLeft, y);
      y += 6;
    }
    if ((project as any).document_deadline_date) {
      doc.text(`Prazo de atendimento: ${formatDateBR((project as any).document_deadline_date)}`, marginLeft, y);
      y += 6;
    }
  }
  if (project.notes) {
    const notes = `Observações: ${project.notes}`;
    const split = doc.splitTextToSize(notes, 180);
    for (const line of split) {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, marginLeft, y);
      y += 6;
    }
  }

  y += 10;
  doc.setFontSize(12);
  doc.text("Acompanhamento", marginLeft, y);
  y += 8;
  doc.setFontSize(10);
  for (const m of movements || []) {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.text(
      `${formatDateBR(m.date)} — ${STATUS_LABEL[m.stage as ProjectStatus] || m.stage} — Resp.: ${m.responsible || "—"}`,
      marginLeft,
      y
    );
    y += 6;
    if (m.description) {
      const split = doc.splitTextToSize(m.description, 180);
      for (const line of split) {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, marginLeft + 6, y);
        y += 6;
      }
    }
    y += 2;
  }

  const fileNameSafeMun = (project.municipalities?.name || "municipio").replace(/[^a-z0-9_-]+/gi, "_");
  doc.save(`relatorio-projeto_${fileNameSafeMun}_${project.year || ""}.pdf`);
}

export async function generateProjectsListPdf(projects: any[]) {
  const doc = new jsPDF();
  const marginLeft = 12;
  let y = 20;

  doc.setFontSize(16);
  doc.text("Relatório — Lista de Projetos (filtrados)", marginLeft, y);
  doc.setFontSize(10);
  y += 6;
  doc.text(`Emitido em: ${new Date().toLocaleString("pt-BR")}`, marginLeft, y);

  // Cabeçalho de colunas
  y += 12;
  doc.setFontSize(11);
  doc.text("Município", marginLeft, y);
  doc.text("Ano", marginLeft + 45, y);
  doc.text("Objeto", marginLeft + 60, y);
  doc.text("Programa", marginLeft + 140, y);
  doc.text("Ministério", marginLeft + 180, y);
  y += 6;
  doc.setFontSize(10);
  doc.text("Status", marginLeft, y);
  doc.text("Repasse", marginLeft + 45, y);
  doc.text("Contrapartida", marginLeft + 90, y);
  doc.text("Total", marginLeft + 140, y);
  doc.text("Exec.%", marginLeft + 180, y);

  y += 8;
  doc.setFontSize(10);

  for (const p of projects || []) {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    const mun = p.municipalities?.name || "—";
    const ano = p.year ?? "—";
    const obj = String(p.object || "—");
    const prog = p.programs?.name || "—";
    const min = p.ministry || "—";
    const status = STATUS_LABEL[p.status as string] || String(p.status || "—");
    const rep = formatCurrencyBRL(Number(p.transfer_amount || 0));
    const ctr = formatCurrencyBRL(Number(p.counterpart_amount || 0));
    const tot = formatCurrencyBRL(Number(p.transfer_amount || 0) + Number(p.counterpart_amount || 0));
    const exec = `${Number(p.execution_percentage || 0)}%`;

    // Primeira linha com infos textuais
    const linha1 = `${mun}`;
    doc.text(linha1, marginLeft, y);
    doc.text(String(ano), marginLeft + 45, y);
    doc.text(obj.length > 60 ? doc.splitTextToSize(obj, 70)[0] : obj, marginLeft + 60, y);
    doc.text(prog.length > 28 ? doc.splitTextToSize(prog, 38)[0] : prog, marginLeft + 140, y);
    doc.text(min.length > 28 ? doc.splitTextToSize(min, 38)[0] : min, marginLeft + 180, y);
    y += 6;

    // Segunda linha com métricas
    doc.text(status, marginLeft, y);
    doc.text(rep, marginLeft + 45, y);
    doc.text(ctr, marginLeft + 90, y);
    doc.text(tot, marginLeft + 140, y);
    doc.text(exec, marginLeft + 180, y);
    y += 8;
  }

  doc.save("relatorio-lista-projetos.pdf");
}