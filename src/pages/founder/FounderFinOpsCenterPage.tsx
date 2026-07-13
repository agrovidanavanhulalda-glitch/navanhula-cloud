import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign } from 'lucide-react';
import { useStorageMetrics } from '@/lib/ops/useStorageMetrics';
import { useLiveOpsMetrics } from '@/lib/ops/useLiveOpsMetrics';
import { computeFinops } from '@/lib/ops/finopsEngine';

const usd = (n: number) => `$${n.toFixed(2)}`;

export const FounderFinOpsCenterPage: React.FC = () => {
  const storage = useStorageMetrics();
  const live = useLiveOpsMetrics();

  const storageGb = (storage.data?.metrics.reduce((a, b) => a + Number(b.bytes ?? 0), 0) ?? 0) / 1024 ** 3;
  const rpcPerMonth = (live.data?.rpc.total ?? 0) * (1440 / 15) * 30;
  const workerRunsMonth = (live.data?.queue.completed ?? 0) * 30;

  const snap = computeFinops({
    storageGb,
    bandwidthGbMonth: storageGb * 2,
    rpcCountMonth: rpcPerMonth,
    edgeInvocMonth: workerRunsMonth,
    realtimeChannels: 100,
    workerRunsMonth,
    dbGb: storageGb * 0.3,
    companies: 100,
    salesMonth: 5000,
    activeUsers: 500,
  });

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-2">
        <DollarSign className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-black">FinOps Center</h2>
        <Badge variant="outline" className="ml-auto">Estimativas · Sem provider</Badge>
      </header>
      <div className="grid gap-3 md:grid-cols-4">
        <Card className="p-4"><p className="text-xs text-muted-foreground">Custo Mensal Estimado</p><p className="text-2xl font-black">{usd(snap.totalMonthly)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Por Empresa</p><p className="text-2xl font-black">{usd(snap.costPerCompany)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Por Venda</p><p className="text-2xl font-black">{usd(snap.costPerSale)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Por Utilizador Ativo</p><p className="text-2xl font-black">{usd(snap.costPerActiveUser)}</p></Card>
      </div>
      <Card className="p-4">
        <p className="text-sm font-bold mb-2">Breakdown por serviço</p>
        <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
          {Object.entries(snap.perService).map(([k, v]) => (
            <div key={k} className="flex justify-between rounded border border-border/40 px-2 py-1.5">
              <span className="uppercase text-muted-foreground">{k}</span>
              <span className="font-bold">{usd(v)}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
export default FounderFinOpsCenterPage;
