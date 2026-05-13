import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { ShieldAlert } from 'lucide-react';

interface PermissionGateProps {
  module: string;
  action?: 'view' | 'create' | 'edit' | 'delete' | 'approve';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const DefaultFallback = () => (
  <div className="flex flex-col items-center justify-center p-12 text-muted-foreground gap-3">
    <ShieldAlert className="w-12 h-12" />
    <p className="text-lg font-medium">Acesso Restrito</p>
    <p className="text-sm">Você não tem permissão para acessar este módulo.</p>
  </div>
);

export const PermissionGate: React.FC<PermissionGateProps> = ({
  module,
  action = 'view',
  children,
  fallback = <DefaultFallback />,
}) => {
  const { isMaster, hasMinimumRole, canViewModule, canCreateIn, canEditIn, canDeleteIn, canApproveIn } = usePermissions();

  const hasAccess = () => {
    // Master bypass
    if (isMaster) return true;

    // Hierarchy bypass for Admin/CEO
    if (hasMinimumRole('admin')) return true;

    switch (action) {
      case 'view': return canViewModule(module);
      case 'create': return canCreateIn(module);
      case 'edit': return canEditIn(module);
      case 'delete': return canDeleteIn(module);
      case 'approve': return canApproveIn(module);
      default: return false;
    }
  };

  if (!hasAccess()) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
