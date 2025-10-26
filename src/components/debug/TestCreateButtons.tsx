import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { MunicipalityDialog } from "@/components/municipalities/MunicipalityDialog";
import { ProjectDialog } from "@/components/projects/ProjectDialog";
import { ProgramDialog } from "@/components/programs/ProgramDialog";

export function TestCreateButtons() {
  const [municipalityDialogOpen, setMunicipalityDialogOpen] = useState(false);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [programDialogOpen, setProgramDialogOpen] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Teste - Botões de Criação</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <h4 className="font-medium">Municípios</h4>
            <Button onClick={() => setMunicipalityDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Município
            </Button>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">Projetos</h4>
            <Button onClick={() => setProjectDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Projeto
            </Button>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">Programas</h4>
            <Button onClick={() => setProgramDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Programa
            </Button>
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          <p>Estes botões estão sempre visíveis para teste. Use-os para verificar se os diálogos funcionam corretamente.</p>
        </div>
      </CardContent>

      {/* Diálogos */}
      <MunicipalityDialog
        open={municipalityDialogOpen}
        onOpenChange={setMunicipalityDialogOpen}
        municipality={undefined}
        onSuccess={() => {
          setMunicipalityDialogOpen(false);
          // Recarregar dados se necessário
        }}
      />

      <ProjectDialog
        open={projectDialogOpen}
        onOpenChange={setProjectDialogOpen}
        project={undefined}
        onSuccess={() => {
          setProjectDialogOpen(false);
          // Recarregar dados se necessário
        }}
        onOpenActivity={() => {}}
        onOpenReport={() => {}}
      />

      <ProgramDialog
        open={programDialogOpen}
        onOpenChange={setProgramDialogOpen}
        program={undefined}
        onSuccess={() => {
          setProgramDialogOpen(false);
          // Recarregar dados se necessário
        }}
      />
    </Card>
  );
}
