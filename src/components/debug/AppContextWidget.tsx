import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { Building2, Shield, MapPin, Layers, KeyRound } from 'lucide-react';

/**
 * Temporary RBAC debug widget — shows the live app_context for the current user.
 * Helps validate that Phase 2 wiring is complete.
 */
const AppContextWidget: React.FC = () => {
  const { user, company, branch, tenant, roles, permissions, isMaster, appReady } = useAuth();

  if (!user) return null;

  return (
    <Card className="p-4 border-dashed border-primary/40 bg-primary/5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Contexto RBAC</span>
        </div>
        <Badge variant={appReady ? 'default' : 'secondary'} className="text-[10px]">
          {appReady ? 'session_ready' : 'a carregar…'}
        </Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
        <Info icon={<Building2 className="w-3.5 h-3.5" />} label="Empresa" value={company?.name || '—'} />
        <Info icon={<Layers className="w-3.5 h-3.5" />} label="Tenant" value={tenant?.name || '—'} />
        <Info icon={<MapPin className="w-3.5 h-3.5" />} label="Filial" value={branch?.name || '—'} />
        <Info
          icon={<Shield className="w-3.5 h-3.5" />}
          label="Cargos"
          value={isMaster ? 'master · ' + (roles.join(', ') || '—') : (roles.join(', ') || '—')}
        />
        <Info
          icon={<KeyRound className="w-3.5 h-3.5" />}
          label="Permissões"
          value={`${permissions.length} carregadas`}
        />
      </div>

      {permissions.length > 0 && (
        <details className="mt-3">
          <summary className="text-[11px] text-muted-foreground cursor-pointer">Ver chaves</summary>
          <div className="mt-2 flex flex-wrap gap-1">
            {permissions.map((p) => (
              <Badge key={p} variant="outline" className="text-[9px] font-mono">
                {p}
              </Badge>
            ))}
          </div>
        </details>
      )}
    </Card>
  );
};

const Info: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="flex flex-col gap-1 min-w-0">
    <div className="flex items-center gap-1 text-muted-foreground">
      {icon}
      <span className="uppercase tracking-wider text-[9px] font-semibold">{label}</span>
    </div>
    <span className="font-medium truncate" title={value}>
      {value}
    </span>
  </div>
);

export default AppContextWidget;
