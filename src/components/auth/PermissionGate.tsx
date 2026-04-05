import React from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { ShieldAlert } from 'lucide-react';

interface PermissionGateProps {
  module: string;
  action?: 'view' | 'create' | 'edit' | 'delete';
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
  const { can } = usePermissions();

  if (!can(module, action)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
