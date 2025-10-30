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
  | "em_elaboracao"
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

// Função para adicionar cabeçalho estilizado
const addStyledHeader = (doc: jsPDF, title: string, subtitle?: string) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Fundo colorido para o cabeçalho
  doc.setFillColor(59, 130, 246); // blue-500
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  // Título principal
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(title, 20, 25);
  
  // Subtítulo
  if (subtitle) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(subtitle, 20, 35);
  }
  
  // Data de emissão
  doc.setFontSize(10);
  doc.text(`Emitido em: ${new Date().toLocaleString("pt-BR")}`, pageWidth - 20, 35, { align: "right" });
  
  return 50; // Retorna a posição Y para continuar o conteúdo
};

// Função para adicionar seção com título
const addSection = (doc: jsPDF, title: string, y: number) => {
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(title, 20, y);
  
  // Linha decorativa
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.5);
  doc.line(20, y + 2, 80, y + 2);
  
  return y + 10;
};

// Função para adicionar card de estatística
const addStatCard = (doc: jsPDF, label: string, value: string, x: number, y: number, width: number = 45) => {
  // Fundo do card
  doc.setFillColor(248, 250, 252); // gray-50
  doc.rect(x, y, width, 25, 'F');
  
  // Borda
  doc.setDrawColor(226, 232, 240); // gray-200
  doc.setLineWidth(0.5);
  doc.rect(x, y, width, 25, 'S');
  
  // Label
  doc.setTextColor(100, 116, 139); // gray-500
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(label, x + 4, y + 8);
  
  // Valor
  doc.setTextColor(15, 23, 42); // gray-900
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(value, x + 4, y + 20);
  
  return y + 30;
};

export async function generateDashboardPdf(stats: DashboardStats) {
  const doc = new jsPDF();
  let y = addStyledHeader(doc, "Relatório Geral", "Dashboard de Convênios e Projetos");

  // Cards de estatísticas principais
  y = addSection(doc, "Resumo Executivo", y);
  
  const cardWidth = 45;
  const cardSpacing = 50;
  const startX = 15;
  
  // Primeira linha - Municípios e Projetos
  y = addStatCard(doc, "Municípios", stats.totalMunicipalities.toString(), startX, y, cardWidth);
  y = addStatCard(doc, "Projetos", stats.totalProjects.toString(), startX + cardSpacing, y - 30, cardWidth);
  
  // Segunda linha - Valor Total e Execução Média
  y += 5;
  y = addStatCard(doc, "Valor Total", formatCurrencyBRL(stats.totalAmount), startX, y, cardWidth);
  y = addStatCard(doc, "Execução Média", `${Math.round(stats.avgExecution)}%`, startX + cardSpacing, y - 30, cardWidth);

  y += 20;

  // Seção de projetos por status
  y = addSection(doc, "Projetos por Status", y);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  
  // Cabeçalho da tabela
  doc.setFillColor(241, 245, 249); // gray-100
  doc.rect(15, y, 180, 15, 'F');
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text("Status", 20, y + 10);
  doc.text("Quantidade", 120, y + 10);
  y += 20;

  // Dados da tabela
  doc.setFont("helvetica", "normal");
  for (const item of stats.projectsByStatus || []) {
    if (y > 250) {
      doc.addPage();
      y = addStyledHeader(doc, "Relatório Geral", "Dashboard de Convênios e Projetos");
      y += 20;
    }
    
    // Linha da tabela
    doc.setFillColor(255, 255, 255);
    doc.rect(15, y - 5, 180, 12, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(15, y + 7, 195, y + 7);
    
    doc.text(STATUS_LABEL[item.status] || item.status, 20, y + 2);
    doc.text(item.count.toString(), 120, y + 2);
    y += 12;
  }

  // Rodapé
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFillColor(59, 130, 246);
  doc.rect(0, pageHeight - 20, doc.internal.pageSize.getWidth(), 20, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text("Sistema de Gestão de Convênios e Projetos", 20, pageHeight - 8);

  doc.save(`relatorio-geral-dashboard.pdf`);
}

export async function generateProjectPdfById(projectId: string, opts?: { from?: string; to?: string }) {
  const { data: project, error } = await supabase
    .from("projects")
    .select("*, municipalities(name), programs(name, status)")
    .eq("id", projectId)
    .single();
  if (error || !project) throw error || new Error("Projeto não encontrado");

  let movementsQuery = supabase
    .from("movements")
    .select("*")
    .eq("project_id", projectId)
    .order("date", { ascending: true });

  if (opts?.from) {
    movementsQuery = movementsQuery.gte("date", opts.from);
  }
  if (opts?.to) {
    movementsQuery = movementsQuery.lte("date", opts.to);
  }

  const { data: movements } = await movementsQuery;

  // Buscar tarefas relacionadas ao projeto
  let tasksQuery = supabase
    .from("user_tasks")
    .select("id, title, status, priority, due_date, created_at")
    .eq("related_entity_type", "project")
    .eq("related_entity_id", projectId)
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (opts?.from) {
    tasksQuery = tasksQuery.gte("created_at", opts.from);
  }
  if (opts?.to) {
    tasksQuery = tasksQuery.lte("created_at", opts.to);
  }

  const { data: tasks } = await tasksQuery;

  const doc = new jsPDF();
  const subtitle = opts?.from || opts?.to
    ? `Período: ${opts?.from ? formatDateBR(opts.from) : "—"} a ${opts?.to ? formatDateBR(opts.to) : "—"}`
    : project.object || "Projeto";
  let y = addStyledHeader(doc, "Relatório do Projeto", subtitle);

  // Informações principais do projeto
  y = addSection(doc, "Dados do Projeto", y);
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  
  const projectData = [
    { label: "Objeto", value: project.object || "—" },
    { label: "Município", value: project.municipalities?.name || "—" },
    { label: "Ano", value: project.year?.toString() || "—" },
    { label: "Nº Proposta", value: project.proposal_number || "—" },
    { label: "Ministério/Órgão", value: project.ministry || "—" },
    { label: "Programa", value: project.programs?.name ? `${project.programs.name} (${project.programs.status || "—"})` : "—" },
    { label: "Situação", value: STATUS_LABEL[project.status as ProjectStatus] || project.status },
  ];

  for (const item of projectData) {
    if (y > 250) {
      doc.addPage();
      y = addStyledHeader(doc, "Relatório do Projeto", project.object || "Projeto");
      y += 20;
    }
    
    doc.setFont("helvetica", "bold");
    doc.text(`${item.label}:`, 20, y);
    doc.setFont("helvetica", "normal");
    doc.text(item.value, 60, y);
    y += 8;
  }

  // Valores financeiros em cards
  y += 10;
  y = addSection(doc, "Valores Financeiros", y);
  
  const repasse = formatCurrencyBRL(Number(project.transfer_amount));
  const contrapartida = formatCurrencyBRL(Number(project.counterpart_amount));
  const total = formatCurrencyBRL(Number(project.transfer_amount) + Number(project.counterpart_amount));
  const execucao = `${Number(project.execution_percentage ?? 0).toFixed(2)}%`;

  // Primeira linha - Repasse e Contrapartida
  y = addStatCard(doc, "Repasse", repasse, 15, y, 45);
  y = addStatCard(doc, "Contrapartida", contrapartida, 65, y - 30, 45);
  
  // Segunda linha - Total e Execução
  y += 5;
  y = addStatCard(doc, "Total", total, 15, y, 45);
  y = addStatCard(doc, "Execução", execucao, 65, y - 30, 45);

  // Datas importantes
  y += 20;
  y = addSection(doc, "Cronograma", y);
  
  const dates = [
    { label: "Início", value: formatDateBR(project.start_date) },
    { label: "Término", value: formatDateBR(project.end_date) },
    { label: "Prestação de Contas", value: formatDateBR(project.accountability_date) },
  ];

  if (project.status === "solicitado_documentacao") {
    dates.push(
      { label: "Data de Envio", value: formatDateBR((project as any).document_request_date) },
      { label: "Prazo de Atendimento", value: formatDateBR((project as any).document_deadline_date) }
    );
  }

  for (const date of dates) {
    if (y > 250) {
      doc.addPage();
      y = addStyledHeader(doc, "Relatório do Projeto", project.object || "Projeto");
      y += 20;
    }
    
    doc.setFont("helvetica", "bold");
    doc.text(`${date.label}:`, 20, y);
    doc.setFont("helvetica", "normal");
    doc.text(date.value, 60, y);
    y += 8;
  }

  // Observações
  if (project.notes) {
    y += 10;
    y = addSection(doc, "Observações", y);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const notes = `Observações: ${project.notes}`;
    const split = doc.splitTextToSize(notes, 170);
    for (const line of split) {
      if (y > 250) {
        doc.addPage();
        y = addStyledHeader(doc, "Relatório do Projeto", project.object || "Projeto");
        y += 20;
      }
      doc.text(line, 20, y);
      y += 6;
    }
  }

  // Acompanhamento
  if (movements && movements.length > 0) {
    y += 15;
    y = addSection(doc, "Acompanhamento", y);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    for (const m of movements) {
      if (y > 250) {
        doc.addPage();
        y = addStyledHeader(doc, "Relatório do Projeto", project.object || "Projeto");
        y += 20;
      }
      
      // Data e status
      doc.setFont("helvetica", "bold");
      doc.text(`${formatDateBR(m.date)} — ${STATUS_LABEL[m.stage as ProjectStatus] || m.stage}`, 20, y);
      if (m.responsible) {
        doc.setFont("helvetica", "normal");
        doc.text(`Responsável: ${m.responsible}`, 20, y + 6);
        y += 6;
      }
      y += 6;
      
      // Descrição
      if (m.description) {
        doc.setFont("helvetica", "normal");
        const split = doc.splitTextToSize(m.description, 170);
        for (const line of split) {
          if (y > 250) {
            doc.addPage();
            y = addStyledHeader(doc, "Relatório do Projeto", project.object || "Projeto");
            y += 20;
          }
          doc.text(line, 30, y);
          y += 6;
        }
      }
      y += 8;
    }
  }

  // Tarefas relacionadas
  if (tasks && tasks.length > 0) {
    y += 15;
    y = addSection(doc, "Tarefas", y);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    // Cabeçalho das colunas
    doc.setFont("helvetica", "bold");
    doc.text("Título", 20, y);
    doc.text("Status", 120, y);
    doc.text("Prazo", 160, y);
    y += 8;
    doc.setFont("helvetica", "normal");

    for (const t of tasks) {
      if (y > 270) {
        doc.addPage();
        y = addStyledHeader(doc, "Relatório do Projeto", subtitle);
        y += 10;
        doc.setFont("helvetica", "bold");
        doc.text("Título", 20, y);
        doc.text("Status", 120, y);
        doc.text("Prazo", 160, y);
        y += 8;
        doc.setFont("helvetica", "normal");
      }

      const title = String(t.title || "—");
      const status = String(t.status || "—");
      const due = t.due_date ? formatDateBR(t.due_date) : "—";

      // Título com quebra se longo
      const titleLines = doc.splitTextToSize(title, 90);
      doc.text(titleLines, 20, y);
      // Status e Prazo na mesma linha base
      doc.text(status, 120, y);
      doc.text(due, 160, y);

      // Avança Y pelo número de linhas do título
      y += Math.max(8, titleLines.length * 6);
    }
  }

  // Rodapé
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFillColor(59, 130, 246);
  doc.rect(0, pageHeight - 20, doc.internal.pageSize.getWidth(), 20, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text("Sistema de Gestão de Convênios e Projetos", 20, pageHeight - 8);

  const fileNameSafeMun = (project.municipalities?.name || "municipio").replace(/[^a-z0-9_-]+/gi, "_");
  doc.save(`relatorio-projeto_${fileNameSafeMun}_${project.year || ""}.pdf`);
}

export async function generateProjectsListPdf(projects: any[]) {
  const doc = new jsPDF();
  let y = addStyledHeader(doc, "Lista de Projetos", `${projects.length} projetos encontrados`);

  // Resumo estatístico
  y = addSection(doc, "Resumo Estatístico", y);
  
  const totalAmount = projects.reduce((sum, p) => sum + Number(p.transfer_amount || 0) + Number(p.counterpart_amount || 0), 0);
  const avgExecution = projects.length > 0 ? projects.reduce((sum, p) => sum + (p.execution_percentage || 0), 0) / projects.length : 0;
  const distinctMunicipalities = new Set(projects.map(p => p.municipality_id)).size;

  const cardWidth = 45;
  const cardSpacing = 50;
  const startX = 15;
  
  // Primeira linha - Total de Projetos e Municípios
  y = addStatCard(doc, "Total de Projetos", projects.length.toString(), startX, y, cardWidth);
  y = addStatCard(doc, "Municípios", distinctMunicipalities.toString(), startX + cardSpacing, y - 30, cardWidth);
  
  // Segunda linha - Valor Total e Execução Média
  y += 5;
  y = addStatCard(doc, "Valor Total", formatCurrencyBRL(totalAmount), startX, y, cardWidth);
  y = addStatCard(doc, "Execução Média", `${Math.round(avgExecution)}%`, startX + cardSpacing, y - 30, cardWidth);

  y += 20;

  // Tabela de projetos
  y = addSection(doc, "Lista Detalhada", y);
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  
  // Cabeçalho da tabela
  doc.setFillColor(241, 245, 249); // gray-100
  doc.rect(10, y, 190, 12, 'F');
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text("Município", 15, y + 8);
  doc.text("Ano", 50, y + 8);
  doc.text("Objeto", 65, y + 8);
  doc.text("Status", 120, y + 8);
  doc.text("Valor Total", 150, y + 8);
  doc.text("Exec.%", 175, y + 8);
  y += 15;

  // Dados da tabela
  doc.setFont("helvetica", "normal");
  for (const p of projects || []) {
    if (y > 250) {
      doc.addPage();
      y = addStyledHeader(doc, "Lista de Projetos", `${projects.length} projetos encontrados`);
      y += 20;
    }
    
    const mun = p.municipalities?.name || "—";
    const ano = p.year ?? "—";
    const obj = String(p.object || "—");
    const status = STATUS_LABEL[p.status as string] || String(p.status || "—");
    const total = formatCurrencyBRL(Number(p.transfer_amount || 0) + Number(p.counterpart_amount || 0));
    const exec = `${Number(p.execution_percentage || 0)}%`;

    // Linha da tabela
    doc.setFillColor(255, 255, 255);
    doc.rect(10, y - 3, 190, 10, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(10, y + 7, 200, y + 7);
    
    doc.text(mun.length > 15 ? mun.substring(0, 15) + "..." : mun, 15, y + 2);
    doc.text(String(ano), 50, y + 2);
    doc.text(obj.length > 20 ? obj.substring(0, 20) + "..." : obj, 65, y + 2);
    doc.text(status.length > 12 ? status.substring(0, 12) + "..." : status, 120, y + 2);
    doc.text(total, 150, y + 2);
    doc.text(exec, 175, y + 2);
    y += 10;
  }

  // Rodapé
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFillColor(59, 130, 246);
  doc.rect(0, pageHeight - 20, doc.internal.pageSize.getWidth(), 20, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text("Sistema de Gestão de Convênios e Projetos", 20, pageHeight - 8);

  doc.save("relatorio-lista-projetos.pdf");
}