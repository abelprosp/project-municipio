import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { buildDashboardReportData, buildProjectsReportData } from "@/lib/reporting/reporting";

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
    em_complementacao: [249, 115, 22],
    aprovado: [59, 130, 246],
    cancelado: [148, 163, 184],
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
    if (y > 250) {
      doc.addPage();
      y = addStyledHeader(doc, "Relatório Geral", "Dashboard de Convênios e Projetos");
      y = addSection(doc, "Quadro de Municípios (cont.)", y);
    }

    // Cabeçalho do município
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(mun.name, 20, y);
    y += 6;

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
      if (y > 250) {
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
      const projText = (proj.object || "—").length > 40 ? (proj.object || "—").substring(0, 37) + "..." : (proj.object || "—");
      doc.text(`  • ${projText}`, 25, y);
      doc.text(`(${STATUS_LABEL[proj.status as ProjectStatus] || proj.status})`, 140, y);
      y += 5;
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

  const drawTableHeader = () => {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.setFillColor(241, 245, 249);
    doc.rect(10, y, 190, 12, 'F');
    doc.text("Município", 15, y + 8);
    doc.text("Ano", 50, y + 8);
    doc.text("Objeto", 65, y + 8);
    doc.text("Status", 120, y + 8);
    doc.text("Valor Total", 150, y + 8);
    doc.text("Exec.%", 175, y + 8);
    y += 15;
    doc.setFont("helvetica", "normal");
  };

  drawTableHeader();
  let linesDrawnOnPage = 0;
  for (const p of projects) {
    const mun = p.municipalities?.name || "—";
    const ano = p.year ?? "—";
    const obj = String(p.object || "—");
    const status = STATUS_LABEL[p.status as string] || String(p.status || "—");
    const total = formatCurrencyBRL(Number(p.transfer_amount || 0) + Number(p.counterpart_amount || 0));
    const exec = `${Number(p.execution_percentage || 0)}%`;

    const rowHeight = 10;
    if (y + rowHeight > bottomLimit) {
      // evita página vazia: só quebra se há itens restantes
      doc.addPage();
      y = addStyledHeader(doc, "Lista de Projetos", `${projects.length} projetos encontrados`);
      y += 10;
      drawTableHeader();
      linesDrawnOnPage = 0;
    }

    // Linha
    doc.setTextColor(0, 0, 0);
    doc.setFillColor(255, 255, 255);
    doc.rect(10, y - 3, 190, rowHeight, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(10, y + 7, 200, y + 7);

    doc.text(mun.length > 15 ? mun.substring(0, 15) + "..." : mun, 15, y + 2);
    doc.text(String(ano), 50, y + 2);
    doc.text(obj.length > 20 ? obj.substring(0, 20) + "..." : obj, 65, y + 2);
    doc.text(status.length > 12 ? status.substring(0, 12) + "..." : status, 120, y + 2);
    doc.text(total, 150, y + 2);
    doc.text(exec, 175, y + 2);
    y += rowHeight;
    linesDrawnOnPage++;
  }

  // Rodapé (reutiliza pageHeight definido acima)
  doc.setFillColor(59, 130, 246);
  doc.rect(0, pageHeight - 20, doc.internal.pageSize.getWidth(), 20, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text("Sistema de Gestão de Convênios e Projetos", 20, pageHeight - 8);

  doc.save("relatorio-lista-projetos.pdf");
}

export async function createProjectsPdf(filters?: { from?: string; to?: string; status?: string }) {
  const { projects } = await buildProjectsReportData(filters);
  await generateProjectsListPdf(projects);
}