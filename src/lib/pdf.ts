import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { buildDashboardReportData, buildProjectsReportData } from "@/lib/reporting/reporting";
import { formatDateLocal } from "@/lib/utils";

type MunicipalityWithProjects = {
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

type DashboardStats = {
  totalMunicipalities: number;
  totalProjects: number;
  totalAmount: number;
  avgExecution: number;
  projectsByStatus: { status: string; count: number }[];
  municipalities: MunicipalityWithProjects[];
};

type ProjectStatus =
  | "em_criacao"
  | "em_elaboracao"
  | "em_analise"
  | "habilitada"
  | "selecionada"
  | "em_complementacao"
  | "solicitado_documentacao"
  | "aguardando_documentacao"
  | "clausula_suspensiva"
  | "aprovado"
  | "em_execucao"
  | "prestacao_contas"
  | "concluido"
  | "arquivada";

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
  habilitada: "Habilitada",
  selecionada: "Selecionada",
  arquivada: "Arquivada",
};

const formatCurrencyBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const formatDateBR = (date?: string | null) => formatDateLocal(date ?? null, "—");

// Função para adicionar cabeçalho estilizado
const addStyledHeader = (doc: jsPDF, title: string, subtitle?: string) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const baseHeight = 40;

  let subtitleLines: string[] = [];
  if (subtitle) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    subtitleLines = doc.splitTextToSize(subtitle, pageWidth - margin * 2);
  }

  const subtitleHeight = subtitleLines.length ? subtitleLines.length * 6 + 4 : 0;
  const headerHeight = baseHeight + Math.max(0, subtitleHeight - 16);

  // Fundo colorido para o cabeçalho
  doc.setFillColor(59, 130, 246); // blue-500
  doc.rect(0, 0, pageWidth, headerHeight, "F");

  // Título principal
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(title, margin, 22);

  // Subtítulo
  if (subtitleLines.length) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    subtitleLines.forEach((line, idx) => {
      doc.text(line, margin, 32 + idx * 6);
    });
  }

  // Data de emissão
  doc.setFontSize(10);
  doc.text(`Emitido em: ${new Date().toLocaleString("pt-BR")}`, pageWidth - margin, headerHeight - 8, {
    align: "right",
  });

  return headerHeight + 12; // Retorna a posição Y para continuar o conteúdo
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

  y += 6; // reduz espaço para caber em 1 página

  // Progresso geral como barra horizontal simulada (meta 60%)
  y = addSection(doc, "Progresso Geral", y);
  const pct = Math.round(stats.avgExecution);
  const meta = 60;
  const barX = 20; const barY = y + 6; const barW = 160; const barH = 7;
  // fundo
  doc.setFillColor(229, 231, 235);
  doc.rect(barX, barY, barW, barH, 'F');
  // preenchimento
  const fillW = Math.max(0, Math.min(barW, (pct / 100) * barW));
  doc.setFillColor(59, 130, 246);
  doc.rect(barX, barY, fillW, barH, 'F');
  // marcador de meta
  const metaX = barX + (meta / 100) * barW;
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.5);
  doc.line(metaX, barY - 2, metaX, barY + barH + 2);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0,0,0);
  doc.text(`${pct}% (meta ${meta}%)`, barX, barY + 16);
  y = barY + 22;

  // Seção de projetos por status (tabela + gráfico de barras)
  y = addSection(doc, "Projetos por Status", y);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  // Tabela resumida
  doc.setFillColor(241, 245, 249); // gray-100
  doc.rect(15, y, 180, 12, 'F');
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text("Status", 20, y + 8);
  doc.text("Qtd.", 145, y + 8);
  doc.text("%", 185, y + 8);
  y += 14;

  const totalStatus = (stats.projectsByStatus || []).reduce((s, i) => s + i.count, 0) || 1;
  const maxCount = Math.max(1, ...(stats.projectsByStatus || []).map((i) => i.count));
  const BAR_MAX_WIDTH = 50; // largura menor para caber tudo
  const BAR_START_X = 125; // início da barra

  const COLOR: Record<string, [number, number, number]> = {
    em_criacao: [124, 122, 246],
    prestacao_contas: [245, 224, 66],
    em_execucao: [31, 64, 223],
    em_elaboracao: [34, 197, 94],
    em_analise: [249, 115, 22],
    habilitada: [56, 189, 248],
    selecionada: [252, 165, 3],
    em_complementacao: [249, 115, 22],
    aprovado: [59, 130, 246],
    arquivada: [148, 163, 184],
    concluido: [16, 185, 129],
    aguardando_documentacao: [14, 165, 233],
    solicitado_documentacao: [56, 189, 248],
    clausula_suspensiva: [99, 102, 241],
  };

  for (const item of stats.projectsByStatus || []) {
    if (y > 250) {
      doc.addPage();
      y = addStyledHeader(doc, "Relatório Geral", "Dashboard de Convênios e Projetos");
      y = addSection(doc, "Projetos por Status (cont.)", y);
    }

    const pct = Math.round((item.count / totalStatus) * 1000) / 10; // 1 casa
    // Tabela
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text(STATUS_LABEL[item.status] || item.status, 20, y);
    doc.text(String(item.count), 145, y);

    // Barra (antes do % para não encobrir)
    const width = Math.max(2, (item.count / maxCount) * BAR_MAX_WIDTH);
    const color = COLOR[item.status] || [59, 130, 246];
    doc.setFillColor(color[0], color[1], color[2]);
    doc.rect(BAR_START_X, y - 3, width, 5, 'F');

    // Percentual em coluna fixa
    doc.setTextColor(0, 0, 0);
    doc.text(`${pct}%`, 185, y);

    y += 9;
  }

  // Seção Quadro de Municípios
  if (y > 240) {
    doc.addPage();
    y = addStyledHeader(doc, "Relatório Geral", "Dashboard de Convênios e Projetos");
  }
  y = addSection(doc, "Quadro de Municípios", y);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  // Ordenar municípios por nome
  const sortedMunicipalities = (stats.municipalities || []).sort((a, b) => a.name.localeCompare(b.name));

  for (const mun of sortedMunicipalities) {
    const nameLines = doc.splitTextToSize(mun.name, 160);
    const requiredHeight = nameLines.length * 6 + 20;

    if (y + requiredHeight > 250) {
      doc.addPage();
      y = addStyledHeader(doc, "Relatório Geral", "Dashboard de Convênios e Projetos");
      y = addSection(doc, "Quadro de Municípios (cont.)", y);
    }

    // Cabeçalho do município
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    nameLines.forEach((line, idx) => {
      doc.text(line, 20, y + idx * 6);
    });
    y += nameLines.length * 6;

    // Estatísticas do município
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Projetos: ${mun.totalProjects}`, 25, y);
    doc.text(`Valor Total: ${formatCurrencyBRL(mun.totalAmount)}`, 90, y);
    doc.text(`Execução: ${Math.round(mun.avgExecution)}%`, 160, y);
    y += 7;

    // Lista de projetos (limitado a 5 primeiros)
    const projectsToShow = mun.projects.slice(0, 5);
    doc.setFontSize(8);
    for (const proj of projectsToShow) {
      const projectText = doc.splitTextToSize(proj.object || "—", 110);
      const blockHeight = projectText.length * 5 + 5;

      if (y + blockHeight > 250) {
        doc.addPage();
        y = addStyledHeader(doc, "Relatório Geral", "Dashboard de Convênios e Projetos");
        y = addSection(doc, "Quadro de Municípios (cont.)", y);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(mun.name + " (cont.)", 20, y);
        y += 6;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
      }

      projectText.forEach((line, idx) => {
        doc.text(`${idx === 0 ? "  • " : "    "}${line}`, 25, y + idx * 5);
      });
      doc.text(
        `(${STATUS_LABEL[proj.status as ProjectStatus] || proj.status})`,
        140,
        y
      );
      y += blockHeight;
    }
    if (mun.projects.length > 5) {
      doc.text(`  ... e mais ${mun.projects.length - 5} projeto(s)`, 25, y);
      y += 5;
    }

    y += 3; // Espaço entre municípios
  }

  // Rodapé
  const pageHeightDash = doc.internal.pageSize.getHeight();
  doc.setFillColor(59, 130, 246);
  doc.rect(0, pageHeightDash - 20, doc.internal.pageSize.getWidth(), 20, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text("Sistema de Gestão de Convênios e Projetos", 20, pageHeightDash - 8);

  doc.save(`relatorio-geral-dashboard.pdf`);
}

// Wrappers de alto nível solicitados
export async function createDashboardPdf(filters?: { from?: string; to?: string }) {
  const data = await buildDashboardReportData(filters);
  // Sem captura de canvas; simulamos no PDF
  await generateDashboardPdf({
    totalMunicipalities: data.totalMunicipalities,
    totalProjects: data.totalProjects,
    totalAmount: data.totalAmount,
    avgExecution: data.avgExecution,
    projectsByStatus: data.projectsByStatus,
    municipalities: data.municipalities,
  });
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
  const subtitle =
    opts?.from || opts?.to
      ? `Período: ${opts?.from ? formatDateBR(opts.from) : "—"} a ${opts?.to ? formatDateBR(opts.to) : "—"}`
      : project.object || "Projeto";
  let y = addStyledHeader(doc, "Relatório do Projeto", subtitle);
  const bottomLimit = doc.internal.pageSize.getHeight() - 25;
  const lineHeight = 5;

  const ensureSpace = (height: number, headerTitle?: string) => {
    if (y + height <= bottomLimit) return;
    doc.addPage();
    y = addStyledHeader(doc, "Relatório do Projeto", project.object || "Projeto");
    if (headerTitle) {
      y = addSection(doc, headerTitle, y);
    }
  };

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
    const valueLines = doc.splitTextToSize(item.value, 110);
    const blockHeight = Math.max(8, valueLines.length * lineHeight + 2);
    ensureSpace(blockHeight + 4);

    doc.setFont("helvetica", "bold");
    doc.text(`${item.label}:`, 20, y);
    doc.setFont("helvetica", "normal");
    valueLines.forEach((line, idx) => {
      doc.text(line, 60, y + idx * lineHeight);
    });
    y += blockHeight;
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
    ensureSpace(lineHeight + 4);

    doc.setFont("helvetica", "bold");
    doc.text(`${date.label}:`, 20, y);
    doc.setFont("helvetica", "normal");
    doc.text(date.value, 60, y);
    y += lineHeight + 4;
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
      ensureSpace(lineHeight);
      doc.text(line, 20, y);
      y += lineHeight + 1;
    }
  }

  // Acompanhamento
  if (movements && movements.length > 0) {
    y += 15;
    y = addSection(doc, "Acompanhamento", y);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    for (const m of movements) {
      ensureSpace(lineHeight * 2 + 6);

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
          ensureSpace(lineHeight);
          doc.text(line, 30, y);
          y += lineHeight + 1;
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
    const drawTaskHeader = () => {
      doc.setFont("helvetica", "bold");
      doc.text("Título", 20, y);
      doc.text("Status", 120, y);
      doc.text("Prazo", 160, y);
      y += 8;
      doc.setFont("helvetica", "normal");
    };

    drawTaskHeader();

    for (const t of tasks) {
      const title = String(t.title || "—");
      const status = String(t.status || "—");
      const due = t.due_date ? formatDateBR(t.due_date) : "—";

      const titleLines = doc.splitTextToSize(title, 90);
      const rowHeight = Math.max(8, titleLines.length * lineHeight + 2);

      if (y + rowHeight > bottomLimit) {
        doc.addPage();
        y = addStyledHeader(doc, "Relatório do Projeto", subtitle);
        y = addSection(doc, "Tarefas", y);
        drawTaskHeader();
      }

      doc.text(titleLines, 20, y);
      doc.text(status, 120, y);
      doc.text(due, 160, y);
      y += rowHeight + 4;
    }
  }

  // Rodapé
  const pageHeightProj = doc.internal.pageSize.getHeight();
  doc.setFillColor(59, 130, 246);
  doc.rect(0, pageHeightProj - 20, doc.internal.pageSize.getWidth(), 20, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text("Sistema de Gestão de Convênios e Projetos", 20, pageHeightProj - 8);

  const fileNameSafeMun = (project.municipalities?.name || "municipio").replace(/[^a-z0-9_-]+/gi, "_");
  doc.save(`relatorio-projeto_${fileNameSafeMun}_${project.year || ""}.pdf`);
}

export async function generateProjectsListPdf(projects: any[]) {
  // Caso vazio: gerar PDF simples OU nem gerar (aqui geramos simples)
  if (!projects || projects.length === 0) {
    const docEmpty = new jsPDF();
    let yEmpty = addStyledHeader(docEmpty, "Lista de Projetos", "Sem registros no período");
    yEmpty = addSection(docEmpty, "Resumo", yEmpty);
    docEmpty.setFont("helvetica", "normal");
    docEmpty.setTextColor(0, 0, 0);
    docEmpty.text("Não há registros para os filtros selecionados.", 20, yEmpty + 10);
    docEmpty.save("relatorio-lista-projetos.pdf");
    return;
  }

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
  const pageHeight = doc.internal.pageSize.getHeight();
  const bottomLimit = pageHeight - 25; // margem inferior

  const renderProjectsRows = (rows: typeof projects) => {
    const lineHeight = 5;
    const columns = [
      { x: 15, width: 35, align: "left" as const },
      { x: 52, width: 12, align: "left" as const },
      { x: 70, width: 45, align: "left" as const },
      { x: 118, width: 25, align: "left" as const },
      { x: 150, width: 27, align: "right" as const },
      { x: 180, width: 18, align: "right" as const },
    ];

    const drawTableHeader = () => {
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.setFillColor(241, 245, 249);
      doc.rect(10, y, 190, 12, "F");
      doc.text("Município", columns[0].x, y + 8);
      doc.text("Ano", columns[1].x, y + 8);
      doc.text("Objeto", columns[2].x, y + 8);
      doc.text("Status", columns[3].x, y + 8);
      doc.text("Valor Total", columns[4].x + columns[4].width, y + 8, { align: "right" });
      doc.text("Exec.%", columns[5].x + columns[5].width, y + 8, { align: "right" });
      y += 15;
      doc.setFont("helvetica", "normal");
    };

    drawTableHeader();

    for (const p of rows) {
      const values = [
        p.municipalities?.name || "—",
        String(p.year ?? "—"),
        String(p.object || "—"),
        STATUS_LABEL[p.status as string] || String(p.status || "—"),
        formatCurrencyBRL(Number(p.transfer_amount || 0) + Number(p.counterpart_amount || 0)),
        `${Number(p.execution_percentage || 0).toFixed(1)}%`,
      ];

      const wrapped = values.map((text, index) =>
        doc.splitTextToSize(text, columns[index].width)
      );

      const maxLines = Math.max(...wrapped.map((lines) => lines.length));
      const rowHeight = Math.max(10, maxLines * lineHeight + 4);

      if (y + rowHeight > bottomLimit) {
        doc.addPage();
        y = addStyledHeader(doc, "Lista de Projetos", `${projects.length} projetos encontrados`);
        y += 10;
        drawTableHeader();
      }

      doc.setFillColor(255, 255, 255);
      doc.rect(10, y - 3, 190, rowHeight, "F");
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(10, y + rowHeight - 3, 200, y + rowHeight - 3);

      wrapped.forEach((lines, colIndex) => {
        lines.forEach((line, lineIndex) => {
          const textY = y + 2 + lineIndex * lineHeight;
          const col = columns[colIndex];
          if (col.align === "right") {
            doc.text(line, col.x + col.width, textY, { align: "right" });
          } else {
            doc.text(line, col.x, textY);
          }
        });
      });

      y += rowHeight;
    }
  };

  renderProjectsRows(projects);

  // Rodapé (reutiliza pageHeight definido acima)
  doc.setFillColor(59, 130, 246);
  doc.rect(0, pageHeight - 20, doc.internal.pageSize.getWidth(), 20, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text("Sistema de Gestão de Convênios e Projetos", 20, pageHeight - 8);

  doc.save("relatorio-lista-projetos.pdf");
}

export async function generateMunicipalityPdf(options: { municipalityId?: string } = {}) {
  const data = await buildDashboardReportData();
  const selectedMunicipalities = options.municipalityId
    ? data.municipalities.filter((mun) => mun.id === options.municipalityId)
    : data.municipalities;

  if (!selectedMunicipalities.length) {
    const docEmpty = new jsPDF();
    let yEmpty = addStyledHeader(docEmpty, "Relatório por Município", "Nenhum município encontrado");
    docEmpty.setFont("helvetica", "normal");
    docEmpty.setTextColor(0, 0, 0);
    docEmpty.text("Não foram encontrados municípios para gerar o relatório.", 20, yEmpty + 10);
    const filename = options.municipalityId ? "municipio-nao-encontrado.pdf" : "relatorio-municipios.pdf";
    docEmpty.save(filename);
    return;
  }

  const doc = new jsPDF();

  selectedMunicipalities.forEach((municipality, index) => {
    if (index > 0) {
      doc.addPage();
    }

    let y = addStyledHeader(doc, "Relatório do Município", municipality.name);
    y = addSection(doc, "Resumo Executivo", y);

    const cardWidth = 55;
    const cardSpacing = 60;
    const startX = 15;

    y = addStatCard(doc, "Projetos cadastrados", municipality.totalProjects.toString(), startX, y, cardWidth);
    y = addStatCard(doc, "Valor total contratado", formatCurrencyBRL(municipality.totalAmount), startX + cardSpacing, y - 30, cardWidth);
    y += 5;
    y = addStatCard(
      doc,
      "Execução média",
      `${Number(municipality.avgExecution || 0).toFixed(1)}%`,
      startX,
      y,
      cardWidth
    );
    y += 20;

    y = addSection(doc, "Projetos do município", y);

    if (!municipality.projects.length) {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.text("Não há projetos associados a este município.", 20, y + 6);
      return;
    }

    const pageHeight = doc.internal.pageSize.getHeight();
    const bottomLimit = pageHeight - 25;

    const renderMunicipalityRows = (rows: typeof municipality.projects) => {
      const lineHeight = 5;
      const columns = [
        { x: 15, width: 75, align: "left" as const },
        { x: 95, width: 12, align: "left" as const },
        { x: 112, width: 28, align: "left" as const },
        { x: 150, width: 30, align: "right" as const },
        { x: 182, width: 16, align: "right" as const },
      ];

      const drawHeaders = (title?: string) => {
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.setFillColor(241, 245, 249);
        doc.rect(10, y, 190, 12, "F");
        if (title) {
          doc.text(title, 15, y - 4);
        }
        doc.text("Objeto", columns[0].x, y + 8);
        doc.text("Ano", columns[1].x, y + 8);
        doc.text("Situação", columns[2].x, y + 8);
        doc.text("Valor (R$)", columns[3].x + columns[3].width, y + 8, { align: "right" });
        doc.text("Exec.%", columns[4].x + columns[4].width, y + 8, { align: "right" });
        y += 15;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
      };

      drawHeaders();

      for (const project of rows) {
        const totalValue = project.transfer_amount + project.counterpart_amount;
        const values = [
          project.object || "—",
          String(project.year ?? "—"),
          STATUS_LABEL[project.status] || project.status,
          formatCurrencyBRL(totalValue),
          `${Number(project.execution_percentage || 0).toFixed(1)}%`,
        ];

        const wrapped = values.map((text, index) =>
          doc.splitTextToSize(text, columns[index].width)
        );
        const maxLines = Math.max(...wrapped.map((lines) => lines.length));
        const rowHeight = Math.max(10, maxLines * lineHeight + 4);

        if (y + rowHeight > bottomLimit) {
          doc.addPage();
          y = addStyledHeader(doc, "Relatório do Município", municipality.name);
          y = addSection(doc, "Projetos do município (continuação)", y);
          drawHeaders("Projetos do município (continuação)");
        }

        doc.setFillColor(255, 255, 255);
        doc.rect(10, y - 3, 190, rowHeight, "F");
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.line(10, y + rowHeight - 3, 200, y + rowHeight - 3);

        wrapped.forEach((lines, colIndex) => {
          lines.forEach((line, lineIndex) => {
            const textY = y + 2 + lineIndex * lineHeight;
            const col = columns[colIndex];
            if (col.align === "right") {
              doc.text(line, col.x + col.width, textY, { align: "right" });
            } else {
              doc.text(line, col.x, textY);
            }
          });
        });

        y += rowHeight;
      }
    };

    renderMunicipalityRows(municipality.projects);
  });

  const fileName = (() => {
    if (options.municipalityId && selectedMunicipalities[0]) {
      return `relatorio-municipio-${selectedMunicipalities[0].name.replace(/[^a-z0-9_-]+/gi, "_")}.pdf`;
    }
    return "relatorio-municipios.pdf";
  })();

  doc.save(fileName);
}

export async function createProjectsPdf(filters?: { from?: string; to?: string; status?: string }) {
  const { projects } = await buildProjectsReportData(filters);
  await generateProjectsListPdf(projects);
}

export async function generateProgramPdf(programId: string) {
  const { data: program, error: programError } = await supabase
    .from("programs")
    .select("*")
    .eq("id", programId)
    .single();

  if (programError || !program) {
    throw programError || new Error("Programa não encontrado");
  }

  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select("id, object, status, year, transfer_amount, counterpart_amount, execution_percentage, municipalities(name)")
    .eq("program_id", programId)
    .order("year", { ascending: false });

  if (projectsError) {
    throw projectsError;
  }

  let excludedNames: string[] = [];
  if (program.excluded_municipalities && program.excluded_municipalities.length > 0) {
    const { data: excludedData } = await supabase
      .from("municipalities")
      .select("id, name")
      .in("id", program.excluded_municipalities as string[]);
    excludedNames = (excludedData || []).map((m: any) => m.name).filter(Boolean);
  }

  const totalAmount = (projects || []).reduce(
    (sum, proj: any) =>
      sum + Number(proj.transfer_amount || 0) + Number(proj.counterpart_amount || 0),
    0
  );
  const avgExecution =
    (projects || []).length > 0
      ? (projects as any[]).reduce(
          (sum, proj) => sum + Number(proj.execution_percentage || 0),
          0
        ) / (projects as any[]).length
      : 0;

  const municipalitiesCovered = Array.from(
    new Set(
      (projects || [])
        .map((proj: any) => proj.municipalities?.name)
        .filter(Boolean)
    )
  );

  const doc = new jsPDF();
  let y = addStyledHeader(doc, "Relatório do Programa", program.name);
  const bottomLimit = doc.internal.pageSize.getHeight() - 25;
  const lineHeight = 5;

  const ensureSpace = (height: number, headerTitle?: string) => {
    if (y + height <= bottomLimit) return;
    doc.addPage();
    y = addStyledHeader(doc, "Relatório do Programa", program.name);
    if (headerTitle) {
      y = addSection(doc, headerTitle, y);
    }
  };

  // Informações gerais
  y = addSection(doc, "Informações do Programa", y);
  const infoRows = [
    { label: "Nome", value: program.name || "—" },
    { label: "Status", value: program.status || "—" },
    { label: "Órgão Responsável", value: program.responsible_agency || "—" },
    { label: "Prazo", value: formatDateLocal(program.deadline, "—") },
  ];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);

  for (const row of infoRows) {
    const valueLines = doc.splitTextToSize(row.value, 130);
    const blockHeight = Math.max(8, valueLines.length * lineHeight + 2);
    ensureSpace(blockHeight + 4);

    doc.setFont("helvetica", "bold");
    doc.text(`${row.label}:`, 20, y);
    doc.setFont("helvetica", "normal");
    valueLines.forEach((line, idx) => {
      doc.text(line, 70, y + idx * lineHeight);
    });
    y += blockHeight;
  }

  if (program.notes) {
    const obsLines = doc.splitTextToSize(program.notes, 170);
    const obsHeight = obsLines.length * lineHeight + 6;
    ensureSpace(obsHeight + 4, "Informações do Programa");
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.text("Observações:", 20, y);
    doc.setFont("helvetica", "normal");
    obsLines.forEach((line, idx) => {
      doc.text(line, 20, y + (idx + 1) * lineHeight);
    });
    y += obsLines.length * lineHeight + 6;
  }

  if (excludedNames.length > 0) {
    const excludedLines = doc.splitTextToSize(excludedNames.join(", "), 170);
    const excludedHeight = excludedLines.length * lineHeight + 6;
    ensureSpace(excludedHeight + 4, "Informações do Programa");
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.text("Municípios sem pendência automática:", 20, y);
    doc.setFont("helvetica", "normal");
    excludedLines.forEach((line, idx) => {
      doc.text(line, 20, y + (idx + 1) * lineHeight);
    });
    y += excludedLines.length * lineHeight + 6;
  }

  // Resumo executivo
  y += 10;
  y = addSection(doc, "Resumo Executivo", y);
  const cardWidth = 55;
  const cardSpacing = 60;
  const startX = 15;

  y = addStatCard(doc, "Total de projetos", String(projects?.length || 0), startX, y, cardWidth);
  y = addStatCard(
    doc,
    "Valor total contratado",
    formatCurrencyBRL(totalAmount),
    startX + cardSpacing,
    y - 30,
    cardWidth
  );

  y += 5;
  y = addStatCard(
    doc,
    "Execução média",
    `${Math.round(avgExecution)}%`,
    startX,
    y,
    cardWidth
  );

  y += 20;
  y = addSection(doc, "Abrangência", y);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const coverageText =
    municipalitiesCovered.length > 0
      ? municipalitiesCovered.join(", ")
      : "Nenhum município registrado.";
  const coverageLines = doc.splitTextToSize(coverageText, 170);
  coverageLines.forEach((line, idx) => {
    ensureSpace(lineHeight);
    doc.text(line, 20, y + idx * lineHeight);
  });
  y += coverageLines.length * lineHeight + 10;

  // Projetos do programa
  y = addSection(doc, "Projetos do programa", y);
  const renderProgramProjects = (rows: any[]) => {
    const columns = [
      { x: 15, width: 75, align: "left" as const },
      { x: 95, width: 12, align: "left" as const },
      { x: 112, width: 28, align: "left" as const },
      { x: 150, width: 30, align: "right" as const },
      { x: 182, width: 16, align: "right" as const },
    ];

    const drawHeader = () => {
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.setFillColor(241, 245, 249);
      doc.rect(10, y, 190, 12, "F");
      doc.text("Município / Objeto", columns[0].x, y + 8);
      doc.text("Ano", columns[1].x, y + 8);
      doc.text("Situação", columns[2].x, y + 8);
      doc.text("Valor (R$)", columns[3].x + columns[3].width, y + 8, { align: "right" });
      doc.text("Exec.%", columns[4].x + columns[4].width, y + 8, { align: "right" });
      y += 15;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
    };

    drawHeader();

    for (const proj of rows) {
      const totalValue = Number(proj.transfer_amount || 0) + Number(proj.counterpart_amount || 0);
      const values = [
        `${proj.municipalities?.name || "—"} — ${proj.object || "—"}`,
        String(proj.year ?? "—"),
        STATUS_LABEL[proj.status as ProjectStatus] || proj.status,
        formatCurrencyBRL(totalValue),
        `${Number(proj.execution_percentage || 0).toFixed(1)}%`,
      ];

      const wrapped = values.map((text, index) =>
        doc.splitTextToSize(text, columns[index].width)
      );
      const maxLines = Math.max(...wrapped.map((lines) => lines.length));
      const rowHeight = Math.max(10, maxLines * lineHeight + 4);

      if (y + rowHeight > bottomLimit) {
        doc.addPage();
        y = addStyledHeader(doc, "Relatório do Programa", program.name);
        y = addSection(doc, "Projetos do programa (continuação)", y);
        drawHeader();
      }

      doc.setFillColor(255, 255, 255);
      doc.rect(10, y - 3, 190, rowHeight, "F");
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(10, y + rowHeight - 3, 200, y + rowHeight - 3);

      wrapped.forEach((lines, colIndex) => {
        const col = columns[colIndex];
        lines.forEach((line, lineIdx) => {
          const textY = y + 2 + lineIdx * lineHeight;
          if (col.align === "right") {
            doc.text(line, col.x + col.width, textY, { align: "right" });
          } else {
            doc.text(line, col.x, textY);
          }
        });
      });

      y += rowHeight;
    }
  };

  renderProgramProjects(projects || []);

  // Rodapé
  const pageHeightProgram = doc.internal.pageSize.getHeight();
  doc.setFillColor(59, 130, 246);
  doc.rect(0, pageHeightProgram - 20, doc.internal.pageSize.getWidth(), 20, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text("Sistema de Gestão de Convênios e Projetos", 20, pageHeightProgram - 8);

  const filename = `relatorio-programa_${(program.name || "programa").replace(/[^a-z0-9_-]+/gi, "_")}.pdf`;
  doc.save(filename);
}