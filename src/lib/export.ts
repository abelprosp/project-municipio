function toCsvValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = typeof value === "number" ? value.toString().replace(".", ",") : String(value);
  const needsQuotes = /[\";\n]/.test(str);
  const escaped = str.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

function downloadCsv(filename: string, rows: string[][], delimiter = ";") {
  const csv = rows.map((r) => r.map(toCsvValue).join(delimiter)).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportProjectsToCsv(projects: any[]) {
  const headers = [
    "Município",
    "Ano",
    "Programa",
    "Objeto",
    "Situação",
    "Repasse (R$)",
    "Contrapartida (R$)",
    "Valor Total (R$)",
    "Execução (%)",
    "Início",
    "Vigência (Fim)",
    "Prestação de Contas",
  ];
  const rows: string[][] = [headers];

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const statusLabel: Record<string, string> = {
    em_criacao: "Em Criação",
    em_elaboracao: "Em Elaboração",
    em_analise: "Em Análise",
    habilitada: "Habilitada",
    selecionada: "Selecionada",
    em_complementacao: "Em Complementação",
    solicitado_documentacao: "Solicitado Documentação",
    aguardando_documentacao: "Aguardando Documentação",
    clausula_suspensiva: "Cláusula Suspensiva",
    aprovado: "Aprovado",
    em_execucao: "Em Execução",
    prestacao_contas: "Prestação de Contas",
    concluido: "Concluído",
    arquivada: "Arquivada",
  };

  const formatDate = (value: string | null | undefined) => {
    if (!value) return "";
    return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
  };

  for (const p of projects || []) {
    const repasse = Number(p.transfer_amount || 0);
    const contrapartida = Number(p.counterpart_amount || 0);
    const total = repasse + contrapartida;
    const exec = Number(p.execution_percentage || 0);

    rows.push([
      p.municipalities?.name || "—",
      String(p.year ?? ""),
      p.programs?.name || "—",
      p.object || "",
      statusLabel[p.status] || p.status || "—",
      formatCurrency(repasse),
      formatCurrency(contrapartida),
      formatCurrency(total),
      exec.toFixed(2),
      formatDate(p.start_date),
      formatDate(p.end_date),
      formatDate(p.accountability_date),
    ]);
  }

  downloadCsv(`projetos-${new Date().toISOString().slice(0, 10)}.csv`, rows);
}

export function exportMovementsToCsv(movements: any[]) {
  const headers = ["Data", "Status", "Responsável", "Descrição"]; 
  const rows: string[][] = [headers];
  for (const m of movements || []) {
    const data = m.date ? new Intl.DateTimeFormat("pt-BR").format(new Date(m.date)) : "";
    const status = m.stage || "";
    const resp = m.responsible || "";
    const desc = m.description || "";
    rows.push([data, status, resp, desc]);
  }
  downloadCsv("atividades-projeto.csv", rows);
}

// Função para exportar Dashboard para Excel
export async function exportDashboardToExcel(stats: {
  totalMunicipalities: number;
  totalProjects: number;
  totalAmount: number;
  avgExecution: number;
  projectsByStatus: { status: string; count: number }[];
}) {
  const XLSX = await import("xlsx");
  const { saveAs } = await import("file-saver");

  const workbook = XLSX.utils.book_new();

  // Função auxiliar para obter labels de status
  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      em_criacao: "Em Criação",
      em_elaboracao: "Em Elaboração",
      em_analise: "Em Análise",
      habilitada: "Habilitada",
      selecionada: "Selecionada",
      em_complementacao: "Em Complementação",
      solicitado_documentacao: "Solicitado Documentação",
      aguardando_documentacao: "Aguardando Documentação",
      clausula_suspensiva: "Cláusula Suspensiva",
      aprovado: "Aprovado",
      em_execucao: "Em Execução",
      prestacao_contas: "Prestação de Contas",
      concluido: "Concluído",
      arquivada: "Arquivada",
    };
    return labels[status] || status;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Aba 1: KPIs
  const kpisData = [
    { Indicador: "Municípios", Valor: stats.totalMunicipalities },
    { Indicador: "Projetos", Valor: stats.totalProjects },
    { Indicador: "Valor Total", Valor: formatCurrency(stats.totalAmount) },
    { Indicador: "Execução Média", Valor: `${Math.round(stats.avgExecution)}%` },
  ];
  const kpisSheet = XLSX.utils.json_to_sheet(kpisData);
  XLSX.utils.book_append_sheet(workbook, kpisSheet, "KPIs");

  // Aba 2: Distribuição por Status
  const totalStatus = (stats.projectsByStatus || []).reduce((s, i) => s + i.count, 0) || 1;
  const statusData = (stats.projectsByStatus || [])
    .sort((a, b) => b.count - a.count)
    .map((item) => ({
      Status: getStatusLabel(item.status),
      Quantidade: item.count,
      Percentual: `${Math.round((item.count / totalStatus) * 1000) / 10}%`,
    }));
  const statusSheet = XLSX.utils.json_to_sheet(statusData);
  XLSX.utils.book_append_sheet(workbook, statusSheet, "Distribuição Status");

  // Gerar arquivo Excel
  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  saveAs(blob, `dashboard-${new Date().toISOString().split("T")[0]}.xlsx`);
}


