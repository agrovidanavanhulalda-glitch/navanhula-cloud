import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export function usePermissions() {
  const { user, isAuthenticated } = useAuth();

  const { data: permissions = [] } = useQuery({
    queryKey: ['user-permissions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Get user's role and its permissions
      const { data, error } = await supabase
        .from('user_company')
        .select(`
          roles (
            role_permissions (
              permissions (key)
            )
          )
        `)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      const roleData = data?.roles as any;
      const permList = roleData?.role_permissions?.map((rp: any) => rp.permissions?.key) || [];
      return permList as string[];
    },
    enabled: isAuthenticated && !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const hasPermission = (permissionKey: string): boolean => {
    // Master user/CEO has all permissions
    if (user?.is_super_admin) return true;
    return permissions.includes(permissionKey);
  };

  // Compatibility helpers for existing code
  const canViewModule = (module: string) => {
    if (module === 'stock') return hasPermission('manage_stock');
    if (module === 'sales') return hasPermission('manage_sales');
    if (module === 'finance') return hasPermission('manage_finance');
    if (module === 'reports') return hasPermission('view_reports');
    if (module === 'users') return hasPermission('create_user');
    return true; // Default to true for unmapped modules during transition
  };

  const canCreateIn = (module: string) => canViewModule(module);
  const canEditIn = (module: string) => canViewModule(module);
  const canDeleteIn = (module: string) => hasPermission('delete_user');
  const canApproveIn = (module: string) => hasPermission('manage_finance');

  return { permissions, hasPermission, canViewModule, canCreateIn, canEditIn, canDeleteIn, canApproveIn };
}
