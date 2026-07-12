import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, BellRing } from 'lucide-react';

const FISCAL_TYPES = [
  'fiscal_dlq_growing', 'fiscal_retry_high', 'fiscal_worker_stalled',
  'fiscal_document_corrupted', 'fiscal_hash_mismatch', 'fiscal_storage_error',
];

export const FounderFiscalAlertsPage: React.FC = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['fiscal_alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_alerts')
        .select('*')
        .in('type', FISCAL_TYPES)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    refetchInterval: 15_000,
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-black flex items-center gap-2"><BellRing className="h-5 w-5" /> Alertas Fiscais</h2>
        <p className="text-xs text-muted-foreground">Últimos 100 alertas do subsistema fiscal.</p>
      </div>

      {isLoading ? <Skeleton className="h-64" /> : error ? (
        <Card className="p-6 border-destructive/40 text-destructive text-sm">{(error as Error).message}</Card>
      ) : (data ?? []).length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground text-sm">Nenhum alerta fiscal ativo.</Card>
      ) : (
        <div className="space-y-2">
          {(data ?? []).map((a: any) => (
            <Card key={a.id} className="p-3 flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline">{a.type}</Badge>
                  <Badge variant={a.status === 'open' ? 'destructive' : 'outline'}>{a.status}</Badge>
                  <span className="text-[10px] text-muted-foreground">{new Date(a.created_at).toLocaleString('pt-PT')}</span>
                </div>
                <p className="text-sm mt-1">{a.message}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default FounderFiscalAlertsPage;
