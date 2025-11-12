import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'admin' | 'gestor_municipal' | 'visualizador';

interface UserPermissions {
  isAdmin: boolean;
  isManager: boolean;
  isViewer: boolean;
  canManageMunicipalities: boolean;
  canManagePrograms: boolean;
  canManageProjects: boolean;
  roles: AppRole[];
}

export function usePermissions() {
  const [permissions, setPermissions] = useState<UserPermissions>({
    isAdmin: false,
    isManager: false,
    isViewer: false,
    canManageMunicipalities: false,
    canManagePrograms: false,
    canManageProjects: false,
    roles: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setPermissions({
            isAdmin: false,
            isManager: false,
            isViewer: false,
            canManageMunicipalities: false,
            canManagePrograms: false,
            canManageProjects: false,
            roles: [],
          });
          setLoading(false);
          return;
        }

        // Buscar roles do usuário
        const { data: userRoles, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (error) {
          console.error('Erro ao buscar roles:', error);
          setPermissions({
            isAdmin: false,
            isManager: false,
            isViewer: false,
            canManageMunicipalities: false,
            canManagePrograms: false,
            canManageProjects: false,
            roles: [],
          });
          setLoading(false);
          return;
        }

        const roles = userRoles?.map(r => r.role) || [];
        const isAdmin = roles.includes('admin');
        const isManager = roles.includes('gestor_municipal');
        const isViewer = roles.includes('visualizador');

        setPermissions({
          isAdmin,
          isManager,
          isViewer,
          canManageMunicipalities: isAdmin,
          canManagePrograms: isAdmin || isManager,
          canManageProjects: isAdmin || isManager,
          roles,
        });
      } catch (error) {
        console.error('Erro ao verificar permissões:', error);
        setPermissions({
          isAdmin: false,
          isManager: false,
          isViewer: false,
          canManageMunicipalities: false,
          canManagePrograms: false,
          canManageProjects: false,
          roles: [],
        });
      } finally {
        setLoading(false);
      }
    };

    checkPermissions();

    // Escutar mudanças na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkPermissions();
    });

    return () => subscription.unsubscribe();
  }, []);

  return { permissions, loading };
}
