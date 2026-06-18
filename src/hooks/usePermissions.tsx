import { useAuth } from '@/contexts/AuthContext';

/**
 * RBAC bridge — backwards-compatible with the previous role-hierarchy API
 * but resolves every check through `useAuth().hasPerm()` whenever a granular
 * permission key (modulo.acao) is provided. Keeps `hasMinimumRole` for the
 * legacy call-sites; new code should call `hasPerm` directly.
 */
export function usePermissions() {
  const { user, role, roles, isMaster, hasPerm } = useAuth();

  const isOwnerLike = isMaster || roles.includes('owner') || roles.includes('admin');

  const getRoleWeight = (r: string | null) => {
    if (!r) return -1;
    if (user?.is_super_admin || isMaster) return 100;
    const n = r.toLowerCase();
    if (n === 'owner') return 100;
    if (n === 'director' || n === 'ceo') return 5;
    if (n === 'admin') return 4;
    if (n === 'manager') return 3;
    if (n === 'seller' || n === 'cashier') return 2;
    if (n === 'viewer') return 1;
    return 0;
  };

  const hasMinimumRole = (minRole: string): boolean => {
    if (isOwnerLike) return true;
    // Use highest role in the user's role list, not just the primary
    const maxWeight = roles.length
      ? Math.max(...roles.map(getRoleWeight))
      : getRoleWeight(role);
    return maxWeight >= getRoleWeight(minRole);
  };

  // Module -> default `view` permission key (modulo.acao)
  const MODULE_PERM_MAP: Record<string, string> = {
    users: 'users.view',
    iam: 'users.view',
    settings: 'settings.manage',
    configuracoes: 'settings.manage',
    compliance: 'settings.manage',
    audit: 'settings.manage',
    finance: 'finance.view',
    reports: 'reports.view',
    stock: 'inventory.view',
    inventory: 'inventory.view',
    products: 'inventory.view',
    sales: 'sales.view',
    pos: 'sales.view',
    cash: 'cash.view',
    hr: 'hr.view',
    crm: 'sales.view',
  };

  const moduleAction = (module: string, action: string): string => {
    const base = MODULE_PERM_MAP[module] || `${module}.view`;
    const prefix = base.split('.')[0];
    return `${prefix}.${action}`;
  };

  const hasPermission = (key: string): boolean => hasPerm(key);

  const canViewModule = (module: string): boolean => {
    if (isOwnerLike) return true;
    return hasPerm(MODULE_PERM_MAP[module] || `${module}.view`);
  };

  const canCreateIn = (module: string): boolean => {
    if (isOwnerLike) return true;
    return hasPerm(moduleAction(module, 'create'));
  };

  const canEditIn = (module: string): boolean => {
    if (isOwnerLike) return true;
    return hasPerm(moduleAction(module, 'edit')) || hasPerm(moduleAction(module, 'create'));
  };

  const canDeleteIn = (module: string): boolean => {
    if (isOwnerLike) return true;
    return hasPerm(moduleAction(module, 'delete'));
  };

  const canApproveIn = (module: string): boolean => {
    if (isOwnerLike) return true;
    return hasPerm(moduleAction(module, 'approve'));
  };

  return {
    role,
    hasPermission,
    hasPerm,
    hasMinimumRole,
    canViewModule,
    canCreateIn,
    canEditIn,
    canDeleteIn,
    canApproveIn,
    isMaster,
    isCEO: hasMinimumRole('ceo'),
    isAdmin: hasMinimumRole('admin'),
    isManager: hasMinimumRole('manager'),
    isSeller: hasMinimumRole('seller'),
    isViewer: hasMinimumRole('viewer'),
  };
}
