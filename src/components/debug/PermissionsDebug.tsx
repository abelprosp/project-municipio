import { usePermissions } from "@/hooks/use-permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function PermissionsDebug() {
  const { permissions, loading } = usePermissions();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Debug - Permissões</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Carregando permissões...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Debug - Permissões do Usuário</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-medium mb-2">Roles:</h4>
          <div className="flex gap-2">
            {permissions.roles.map((role) => (
              <Badge key={role} variant="default">{role}</Badge>
            ))}
            {permissions.roles.length === 0 && (
              <Badge variant="destructive">Nenhum role atribuído</Badge>
            )}
          </div>
        </div>

        <div>
          <h4 className="font-medium mb-2">Permissões:</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant={permissions.isAdmin ? "default" : "secondary"}>
                Admin: {permissions.isAdmin ? "Sim" : "Não"}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={permissions.isManager ? "default" : "secondary"}>
                Gestor: {permissions.isManager ? "Sim" : "Não"}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={permissions.canManageMunicipalities ? "default" : "secondary"}>
                Municípios: {permissions.canManageMunicipalities ? "Sim" : "Não"}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={permissions.canManageProjects ? "default" : "secondary"}>
                Projetos: {permissions.canManageProjects ? "Sim" : "Não"}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={permissions.canManagePrograms ? "default" : "secondary"}>
                Programas: {permissions.canManagePrograms ? "Sim" : "Não"}
              </Badge>
            </div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          <p>Se você não tem permissões, execute o SQL no Supabase para atribuir um role:</p>
          <code className="block bg-gray-100 p-2 rounded mt-2">
            INSERT INTO public.user_roles (user_id, role)<br/>
            SELECT id, 'admin'::public.app_role<br/>
            FROM auth.users<br/>
            WHERE email = 'SEU_EMAIL@exemplo.com'<br/>
            ON CONFLICT (user_id, role) DO NOTHING;
          </code>
        </div>
      </CardContent>
    </Card>
  );
}
