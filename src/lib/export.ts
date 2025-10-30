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


