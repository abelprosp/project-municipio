import DailyTasks from "@/components/tasks/DailyTasks";
import { UserControlPanel } from "@/components/user/UserControlPanel";

const Tasks = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Tarefas</h2>
        <p className="text-muted-foreground">
          Acompanhe atividades pendentes, organize as próximas ações e registre novos lembretes.
        </p>
      </div>

      <section>
        <h3 className="text-lg font-semibold mb-3">Pendências por prazo</h3>
        <DailyTasks />
      </section>

      <section>
        <h3 className="text-lg font-semibold mb-3">Gestão completa</h3>
        <UserControlPanel />
      </section>
    </div>
  );
};

export default Tasks;

