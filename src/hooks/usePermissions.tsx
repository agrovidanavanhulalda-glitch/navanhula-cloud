import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export type ModulePermission = {
  module: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_approve: boolean;
};

export function usePermissions() {
  const { role, isAuthenticated } = useAuth();

  const { data: permissions = [] } = useQuery({
    queryKey: ['role-permissions', role],
    queryFn: async () => {
      if (!role) return [];
      const { data, error } = await supabase
        .from('role_permissions')
        .select('module, can_view, can_create, can_edit, can_delete, can_approve')
        .eq('role', role);
      if (error) throw error;
      return (data ?? []) as ModulePermission[];
    },
    enabled: isAuthenticated && !!role,
    staleTime: 5 * 60 * 1000,
  });

  const can = (module: string, action: 'view' | 'create' | 'edit' | 'delete' | 'approve'): boolean => {
    if (!role) return false;
    if (role === 'ceo' || role === 'admin') return true;
    const perm = permissions.find(p => p.module === module);
    if (!perm) return false;
    return perm[`can_${action}`];
  };

  const canViewModule = (module: string) => can(module, 'view');
  const canCreateIn = (module: string) => can(module, 'create');
  const canEditIn = (module: string) => can(module, 'edit');
  const canDeleteIn = (module: string) => can(module, 'delete');
  const canApproveIn = (module: string) => can(module, 'approve');

  return { permissions, can, canViewModule, canCreateIn, canEditIn, canDeleteIn, canApproveIn, role };
}
