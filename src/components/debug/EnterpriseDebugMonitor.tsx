import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Database, Shield, Store, Building2, User } from 'lucide-react';

const EnterpriseDebugMonitor: React.FC = () => {
  const { user, role, company, store, loading } = useAuth();

  if (process.env.NODE_ENV === 'production' && !user?.is_super_admin) {
    return null;
  }

  return (
    <Card className="fixed bottom-4 right-4 p-4 shadow-2xl border-2 border-primary/20 z-50 bg-background/95 backdrop-blur-sm max-w-xs overflow-hidden text-xs">
      <div className="flex items-center justify-between mb-3 border-b pb-2">
        <h3 className="font-bold flex items-center gap-1.5 text-primary">
          <Database className="w-3.5 h-3.5" />
          ARQUITETURA CLOUD
        </h3>
        <Badge variant={loading ? "secondary" : "outline"} className="h-5 animate-pulse">
          {loading ? "Sincronizando..." : "Conectado"}
        </Badge>
      </div>
      
      <div className="space-y-2.5">
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground flex items-center gap-1">
            <User className="w-3 h-3" /> USUÁRIO
          </span>
          <span className="font-mono truncate bg-muted/50 p-1 rounded border text-[10px]">
            {user?.id || 'Desconectado'}
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground flex items-center gap-1">
            <Building2 className="w-3 h-3" /> EMPRESA (ID)
          </span>
          <span className="font-mono truncate bg-muted/50 p-1 rounded border text-[10px]">
            {company?.id || 'Não vinculada'}
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground flex items-center gap-1">
            <Store className="w-3 h-3" /> LOJA ATIVA
          </span>
          <span className="font-mono truncate bg-muted/50 p-1 rounded border text-[10px]">
            {store?.id || 'Nenhuma selecionada'}
          </span>
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-muted-foreground flex items-center gap-1">
            <Shield className="w-3 h-3" /> NÍVEL ACESSO
          </span>
          <Badge variant="secondary" className="capitalize text-[10px] h-5">
            {role || 'Visitante'}
          </Badge>
        </div>
      </div>
    </Card>
  );
};

export default EnterpriseDebugMonitor;