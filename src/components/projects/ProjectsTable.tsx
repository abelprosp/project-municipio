import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, History, Pencil } from "lucide-react";

export interface ProjectRow {
  id: string;
  year: number;
  proposal_number: string | null;
  object: string;
  ministry: string | null;
  status: string;
  transfer_amount: number;
  counterpart_amount: number;
  execution_percentage: number;
  municipality_id: string;
  municipalities: {
    name: string;
  };
  programs?: {
    name: string;
  } | null;
}

interface ProjectsTableProps {
  projects: ProjectRow[];
  onEdit?: (project: ProjectRow) => void;
  onOpenHistory?: (project: ProjectRow) => void;
  onGeneratePdf?: (projectId: string) => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const getStatusBadge = (status: string) => {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    em_criacao: "secondary",
    enviado: "outline",
    em_analise: "outline",
    em_complementacao: "outline",
    solicitado_documentacao: "outline",
    aguardando_documentacao: "outline",
    clausula_suspensiva: "destructive",
    aprovado: "default",
    em_execucao: "default",
    prestacao_contas: "secondary",
    concluido: "default",
    cancelado: "destructive",
  };

  const labels: Record<string, string> = {
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

  return <Badge variant={variants[status] || "default"}>{labels[status] || status}</Badge>;
};

export const ProjectsTable: React.FC<ProjectsTableProps> = ({ projects, onEdit, onOpenHistory, onGeneratePdf }) => {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Município</TableHead>
            <TableHead>Programa</TableHead>
            <TableHead>Objeto</TableHead>
            <TableHead className="w-[100px]">Ano</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Repasse</TableHead>
            <TableHead className="text-right">Contrapartida</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="w-[140px]">Execução</TableHead>
            <TableHead>Ministério</TableHead>
            <TableHead>Proposta</TableHead>
            <TableHead className="w-[220px] text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project) => (
            <TableRow key={project.id}>
              <TableCell>{project.municipalities?.name || "—"}</TableCell>
              <TableCell>{project.programs?.name || "—"}</TableCell>
              <TableCell className="max-w-[360px] truncate" title={project.object}>{project.object}</TableCell>
              <TableCell>{project.year}</TableCell>
              <TableCell>{getStatusBadge(project.status)}</TableCell>
              <TableCell className="text-right">{formatCurrency(project.transfer_amount)}</TableCell>
              <TableCell className="text-right">{formatCurrency(project.counterpart_amount)}</TableCell>
              <TableCell className="text-right">{formatCurrency(project.transfer_amount + project.counterpart_amount)}</TableCell>
              <TableCell>
                <div className="flex items-center">
                  <div className="h-2 w-24 rounded bg-muted">
                    <div
                      className="h-2 rounded bg-primary"
                      style={{ width: `${Math.min(100, Math.max(0, project.execution_percentage))}%` }}
                    />
                  </div>
                  <span className="ml-2 text-sm text-muted-foreground">{project.execution_percentage}%</span>
                </div>
              </TableCell>
              <TableCell>{project.ministry || "—"}</TableCell>
              <TableCell>{project.proposal_number || "—"}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  {onOpenHistory && (
                    <Button size="sm" variant="outline" onClick={() => onOpenHistory(project)}>
                      <History className="mr-1 h-3 w-3" /> Histórico
                    </Button>
                  )}
                  {onGeneratePdf && (
                    <Button size="sm" variant="ghost" onClick={() => onGeneratePdf(project.id)}>
                      <FileText className="mr-1 h-3 w-3" /> Relatório
                    </Button>
                  )}
                  {onEdit && (
                    <Button size="sm" onClick={() => onEdit(project)}>
                      <Pencil className="mr-1 h-3 w-3" /> Editar
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
          {projects.length === 0 && (
            <TableRow>
              <TableCell colSpan={12} className="text-center text-muted-foreground">
                Nenhum projeto encontrado
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};