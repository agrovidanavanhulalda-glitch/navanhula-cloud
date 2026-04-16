import type { AppRole } from '@/types/pos';

/** Maps each role to its default landing route after login */
export function getDefaultRouteForRole(role: AppRole | null): string {
  switch (role) {
    case 'ceo':
      return '/app/ceo';
    case 'admin':
      return '/app/dashboard';
    case 'director':
      return '/app/dashboard/diretor';
    case 'manager':
      return '/app/dashboard/gestor';
    case 'hr':
      return '/app/dashboard/rh';
    case 'cashier':
    case 'seller':
      return '/app/pdv';
    case 'reseller':
      return '/app/revendedores/dashboard';
    default:
      return '/app/dashboard';
  }
}

/** Roles allowed per route prefix. If not listed, all authenticated roles can access. */
const routeRoleMap: Record<string, AppRole[]> = {
  '/app/ceo': ['ceo', 'admin'],
  '/app/dashboard/diretor': ['director', 'ceo', 'admin'],
  '/app/dashboard/gestor': ['manager', 'director', 'ceo', 'admin'],
  '/app/dashboard/rh': ['hr', 'director', 'ceo', 'admin'],
  '/app/financeiro-rh': ['admin', 'ceo', 'director', 'hr', 'manager'],
  '/app/bi': ['ceo', 'admin', 'director'],
  '/app/compliance': ['ceo', 'admin'],
  '/app/auditoria': ['ceo', 'admin'],
  '/app/configuracoes': ['ceo', 'admin', 'manager'],
  '/app/lojas': ['ceo', 'admin'],
  '/app/vendedores': ['ceo', 'admin', 'manager'],
};

export function canAccessRoute(path: string, role: AppRole | null): boolean {
  if (!role) return false;
  // CEO and admin can access everything
  if (role === 'ceo' || role === 'admin') return true;

  for (const [prefix, allowedRoles] of Object.entries(routeRoleMap)) {
    if (path === prefix || path.startsWith(prefix + '/') || path.startsWith(prefix + '?')) {
      return allowedRoles.includes(role);
    }
  }
  // If no restriction defined, allow access
  return true;
}
