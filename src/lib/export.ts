function toCsvValue(value: any): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  const needsQuotes = /[",\n;]/.test(str);
  const escaped = str.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map(r => r.map(toCsvValue).join(",")).join("\n");
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
    "Objeto",
    "Status",
    "Repasse",
    "Contrapartida",
    "Total",
    "Execucao_%",
  ];
  const rows: string[][] = [headers];
  for (const p of projects || []) {
    const municipio = p.municipalities?.name || "—";
    const ano = p.year ?? "";
    const objeto = p.object || "";
    const status = p.status || "";
    const repasse = String(p.transfer_amount ?? 0);
    const contrapartida = String(p.counterpart_amount ?? 0);
    const total = String((Number(p.transfer_amount || 0) + Number(p.counterpart_amount || 0)).toFixed(2));
    const exec = String(Number(p.execution_percentage || 0).toFixed(2));
    rows.push([municipio, String(ano), objeto, status, repasse, contrapartida, total, exec]);
  }
  downloadCsv("lista-projetos.csv", rows);
}

export function exportMovementsToCsv(movements: any[]) {
  const headers = ["Data", "Status", "Responsável", "Descrição"]; 
  const rows: string[][] = [headers];
  for (const m of movements || []) {
    const data = m.date ? new Date(m.date).toISOString() : "";
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


