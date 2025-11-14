import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, FileText, Shield, Workflow } from "lucide-react";

const sections = [
  {
    title: "1. Antes de começar",
    badge: "Acesso",
    steps: [
      "Faça login em /auth com suas credenciais. Sem sessão ativa, qualquer rota redireciona para a tela de autenticação.",
      "Mantenha o e-mail verificado: o Supabase usa o mesmo usuário para registrar atividades, notificações e uploads.",
      "Verifique se seu perfil possui o papel correto (admin, gestor municipal ou visualizador). Permissões controlam quem pode criar/editar registros.",
    ],
  },
  {
    title: "2. Visão geral (Dashboard)",
    badge: "Monitoramento",
    steps: [
      "Use os filtros superiores para restringir dados por município, programa, ministério ou status.",
      "Acompanhe os cartões principais (municípios, projetos, valores e execução média) e os gráficos de status/progresso.",
      "Clique em “Relatórios” para exportar PDF/Excel e mantenha os filtros se quiser relatórios segmentados.",
    ],
  },
  {
    title: "3. Cadastro e consulta de municípios",
    badge: "Municípios",
    steps: [
      "Na aba Municípios, utilize a busca para localizar por nome, estado, gestor, e-mail ou CNPJ.",
      "Clique em um card para abrir os detalhes completos; use o botão “Relatório” para gerar o PDF individual.",
      "Se tiver permissão, use “Novo Município” para cadastrar ou editar. Todo salvamento aciona validações básicas.",
    ],
  },
  {
    title: "4. Gestão de projetos",
    badge: "Projetos",
    steps: [
      "Escolha o modo de visualização (Lista, Kanban ou Tabela). Os filtros (município, programa, ministério, status, datas) afetam qualquer modo.",
      "Na lista, cada card mostra valores, execução, vigência e links rápidos para editar, histórico, município, detalhes e relatório PDF.",
      "Use o botão “Tarefa” para criar pendências vinculadas ao projeto. Selecione prioridade, responsável e prazo para alimentar o painel de tarefas.",
      "No histórico, registre atividades e exporte PDF/Excel; na aba Documentos (dentro de Detalhes), faça upload de qualquer arquivo e mantenha o nome original.",
    ],
  },
  {
    title: "5. Programas e tarefas gerais",
    badge: "Programas & Tarefas",
    steps: [
      "Programas listam oportunidades (PAC, Transferegov). Filtros de status/município ajudam a entender adesões; clique em “Ver detalhes” ou gere relatórios.",
      "A aba Tarefas combina a visão rápida (pendências por prazo) com o painel completo (User Control Panel). Organize prioridades, responsáveis, tags e lembretes.",
      "Use notificações configuráveis (e-mail/push) para receber alertas de tarefas atribuídas, vencimentos e atualizações de atividades.",
    ],
  },
  {
    title: "6. Meu Perfil e auditoria",
    badge: "Perfil",
    steps: [
      "Em Meu Perfil (User Control), acompanhe seu histórico, tarefas próprias, notificações e estatísticas pessoais.",
      "Atualize as configurações de notificação conforme a necessidade da equipe (e-mail, push, lembretes de tarefas, alertas de sistema).",
      "Todas as ações sensíveis (upload, exclusão, criação de tarefa, movimentação de projeto) geram logs que podem ser auditados pelo time admin.",
    ],
  },
  {
    title: "7. Boas práticas",
    badge: "Dicas",
    steps: [
      "Prefira filtros específicos antes de exportar relatórios: isso acelera o processamento e reduz ruídos na análise.",
      "Mantenha os documentos com descrições claras no nome do arquivo. O sistema preserva o nome original para facilitar buscas.",
      "Revise o histórico antes de atualizar o status de um projeto para garantir rastreabilidade completa.",
    ],
  },
];

const quickChecklist = [
  "Filtros aplicados? (Município, programa, status e datas)",
  "Relatórios exportados após revisar dados",
  "Tarefas críticas atribuídas com responsável e prazo",
  "Documentos anexados logo após cada fase",
  "Notificações configuradas para o time",
];

const Guide = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Guia de Uso</h1>
        <p className="text-muted-foreground max-w-3xl">
          Este passo a passo descreve todo o fluxo da plataforma de gestão de convênios: desde o acesso,
          passando por monitoramento, cadastros, tarefas e auditoria. Siga cada etapa para garantir que
          os dados fiquem completos e os relatórios reflitam a rotina da equipe.
        </p>
      </div>

      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Workflow className="h-5 w-5" />
            Como navegar
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            No menu lateral, acesse as seções principais. Em telas menores, o menu recolhe automaticamente
            após cada clique. Sempre que finalizar uma ação crítica (cadastro, upload, tarefa), confira os
            toasts de confirmação no canto superior direito.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {sections.map((section) => (
          <Card key={section.title}>
            <CardHeader className="flex flex-col gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary">{section.badge}</Badge>
                <CardTitle className="text-xl">{section.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm text-muted-foreground">
                {section.steps.map((step, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5" />
            Checklist rápido antes de encerrar o dia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
            {quickChecklist.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default Guide;

