import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { AppRole } from '@/types/pos';

export function usePermissions() {
  const { user, role, isAuthenticated } = useAuth();

  // Define role hierarchy
  const roles = ['viewer', 'seller', 'manager', 'admin', 'ceo', 'master'];
  
  const getRoleWeight = (r: string | null) => {
    if (!r) return -1;
    if (user?.is_super_admin) return 100; // Master weight
    const normalizedRole = r.toLowerCase();
    if (normalizedRole === 'director' || normalizedRole === 'ceo') return 5;
    if (normalizedRole === 'admin') return 4;
    if (normalizedRole === 'manager') return 3;
    if (normalizedRole === 'seller') return 2;
    if (normalizedRole === 'viewer') return 1;
    return 0;
  };

  const hasMinimumRole = (minRole: string): boolean => {
    const userWeight = getRoleWeight(role);
    const minWeight = getRoleWeight(minRole);
    return userWeight >= minWeight;
  };

  const hasPermission = (permissionKey: string): boolean => {
    // Master user/CEO/Admin have all permissions
    if (user?.is_super_admin || hasMinimumRole('admin')) return true;
    
    // For specific granular permissions, we could add a list here if needed
    // but for now we follow the hierarchy requirement
    return false;
  };

  const canViewModule = (module: string) => {
    if (user?.is_super_admin || hasMinimumRole('admin')) return true;
    
    switch (module) {
      case 'users':
      case 'iam':
      case 'compliance':
      case 'audit':
      case 'settings':
      case 'configuracoes':
        return hasMinimumRole('admin');
      case 'finance':
      case 'reports':
        return hasMinimumRole('manager');
      case 'stock':
      case 'products':
        return hasMinimumRole('manager');
      case 'sales':
      case 'pos':
        return hasMinimumRole('seller');
      default:
        return true;
    }
  };

  const canCreateIn = (module: string) => {
    if (user?.is_super_admin || hasMinimumRole('admin')) return true;
    
    switch (module) {
      case 'users':
        return false;
      case 'sales':
      case 'pos':
        return hasMinimumRole('seller');
      case 'stock':
      case 'products':
        return hasMinimumRole('manager');
      default:
        return hasMinimumRole('admin');
    }
  };

  const canEditIn = (module: string) => canCreateIn(module);
  
  const canDeleteIn = (module: string) => {
    if (user?.is_super_admin || hasMinimumRole('ceo')) return true;
    return false;
  };

  const canApproveIn = (module: string) => {
    if (user?.is_super_admin || hasMinimumRole('manager')) return true;
    return false;
  };

  return { 
    role,
    hasPermission, 
    hasMinimumRole,
    canViewModule, 
    canCreateIn, 
    canEditIn, 
    canDeleteIn, 
    canApproveIn,
    isMaster: !!user?.is_super_admin,
    isCEO: hasMinimumRole('ceo'),
    isAdmin: hasMinimumRole('admin'),
    isManager: hasMinimumRole('manager'),
    isSeller: hasMinimumRole('seller'),
    isViewer: hasMinimumRole('viewer')
  };
}
