import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export function usePermissions() {
  const { user, role, isAuthenticated } = useAuth();

  const { data: permissions = [] } = useQuery({
    queryKey: ['user-permissions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
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
    // Master user/CEO/Admin has all permissions
    if (
      user?.is_super_admin || 
      role === 'ceo' || 
      role === 'admin' || 
      role === 'owner' || 
      role === 'super_admin'
    ) return true;
    
    return permissions.includes(permissionKey);
  };

  const canViewModule = (module: string) => {
    // Standard role-based logic if permissions are not granularly set
    if (role === 'ceo' || role === 'admin' || role === 'owner') return true;
    
    if (module === 'users') {
      return role === 'ceo' || role === 'admin'; // Managers and sellers can't manage users
    }
    
    if (module === 'stock') {
      return role === 'manager' || hasPermission('manage_stock');
    }
    
    if (module === 'finance') {
      return role === 'manager' || hasPermission('manage_finance');
    }
    
    if (module === 'reports') {
      return role === 'manager' || hasPermission('view_reports');
    }

    if (module === 'sales') {
      return true; // Everyone can see sales (though sellers see only their own via RLS)
    }

    return true;
  };

  const canCreateIn = (module: string) => {
    if (role === 'ceo' || role === 'admin' || role === 'owner') return true;
    if (module === 'users') return false; // Only CEO/Admin can create users
    if (module === 'sales') return true; // Everyone can sell
    if (module === 'stock') return role === 'manager' || hasPermission('manage_stock');
    return canViewModule(module);
  };

  const canEditIn = (module: string) => canCreateIn(module);
  const canDeleteIn = (module: string) => {
    if (role === 'ceo' || role === 'admin' || role === 'owner') return true;
    return false; // Generally restrictive for others
  };
  const canApproveIn = (module: string) => {
    if (role === 'ceo' || role === 'admin' || role === 'owner') return true;
    return false;
  };

  return { 
    permissions, 
    role,
    hasPermission, 
    canViewModule, 
    canCreateIn, 
    canEditIn, 
    canDeleteIn, 
    canApproveIn,
    isCEO: role === 'ceo',
    isAdmin: role === 'ceo' || role === 'admin' || role === 'owner',
    isManager: role === 'manager',
    isSeller: role === 'seller' || role === 'vendedor'
  };
}
