import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Database, Shield, Store, Building2, User, Wifi, WifiOff, RefreshCw, ChevronDown, Check } from 'lucide-react';
import { syncManager } from '@/lib/syncQueue';
import { AppRole } from '@/types/pos';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const EnterpriseDebugMonitor: React.FC = () => {
  const { user, role, company, store, loading, refreshUserData } = useAuth();
  const [online, setOnline] = useState(navigator.onLine);
  const [pendingSync, setPendingSync] = useState(0);
  const [isSwitching, setIsSwitching] = useState(false);

  useEffect(() => {
    const handleStatus = () => setOnline(navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    
    const interval = setInterval(() => {
      const status = syncManager.getQueueStatus();
      setPendingSync(status.pending);
    }, 2000);

    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
      clearInterval(interval);
    };
  }, []);

  const switchRole = async (newRole: string) => {
    if (!user?.id) return;
    setIsSwitching(true);
    try {
      const { error } = await supabase
        .from('user_roles')
        .upsert({ 
          user_id: user.id, 
          role: newRole,
          company_id: company?.id 
        }, { onConflict: 'user_id' });

      if (error) throw error;
      
      await refreshUserData();
      toast.success(`Papel alterado para ${newRole}`);
      // Force reload to ensure all guards re-evaluate
      window.location.reload();
    } catch (error: any) {
      toast.error("Erro ao trocar papel: " + error.message);
    } finally {
      setIsSwitching(false);
    }
  };

  const ROLES: { value: AppRole; label: string }[] = [
    { value: 'seller', label: 'Vendedor' },
    { value: 'manager', label: 'Gerente' },
    { value: 'admin', label: 'Administrador' },
    { value: 'ceo', label: 'CEO' },
  ];

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
        <Badge variant={online ? "outline" : "destructive"} className="h-5 gap-1">
          {online ? <Wifi className="w-2.5 h-2.5" /> : <WifiOff className="w-2.5 h-2.5" />}
          {online ? "Online" : "Offline"}
        </Badge>
      </div>

      {pendingSync > 0 && (
        <div className="mb-3 p-2 bg-orange-100 text-orange-800 rounded border border-orange-200 flex items-center justify-between animate-pulse">
          <span className="flex items-center gap-1.5 font-bold">
            <RefreshCw className="w-4 h-4 animate-spin" /> Sincronização:
          </span>
          <Badge variant="secondary" className="bg-orange-200">{pendingSync} pendentes</Badge>
        </div>
      )}
      
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

        <div className="flex items-center justify-between pt-1">
          <span className="text-muted-foreground flex items-center gap-1">
            <Shield className="w-3 h-3" /> NÍVEL ACESSO
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1 px-2" disabled={isSwitching}>
                {isSwitching ? <RefreshCw className="w-2 h-2 animate-spin" /> : role || 'Visitante'}
                <ChevronDown className="w-2 h-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-xs">
              <DropdownMenuLabel>Trocar Papel (Debug)</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {ROLES.map((r) => (
                <DropdownMenuItem key={r.value} onClick={() => switchRole(r.value)} className="gap-2">
                  {role === r.value && <Check className="w-3 h-3 text-primary" />}
                  {r.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  );
};

export default EnterpriseDebugMonitor;