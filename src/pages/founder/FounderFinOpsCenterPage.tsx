import React from 'react';
import { Card } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';
import { useStorageMetrics } from '@/lib/ops/useStorageMetrics';
import { useLiveOpsMetrics } from '@/lib/ops/useLiveOpsMetrics';
import { useLiveEnterpriseMetrics } from '@/lib/ops/useLiveEnterpriseMetrics';
import { computeFinops } from '@/lib/ops/finopsEngine';
import LiveSourceBadge from '@/components/founder/LiveSourceBadge';

const usd = (n: number) => `$${n.toFixed(2)}`;

export const FounderFinOpsCenterPage: React.FC = () => {
  const storage = useStorageMetrics();
  const live = useLiveOpsMetrics();
  const ent = useLiveEnterpriseMetrics();

  const storageGb = (storage.data?.buckets.reduce((a, b) => a + Number(b.bytes ?? 0), 0) ?? 0) / 1024 ** 3;
  const rpcPerMonth = (live.data?.rpc.total ?? 0) * (1440 / 15) * 30;
  const workerRunsMonth = (ent.data?.counts.backgroundTasks30d ?? (live.data?.queue.completed ?? 0) * 30);
  const telemetryMonth = ent.data?.counts.telemetryEvents30d ?? 0;

  const snap = computeFinops({
    storageGb,
    bandwidthGbMonth: storageGb * 2,
    rpcCountMonth: rpcPerMonth + telemetryMonth,
    edgeInvocMonth: workerRunsMonth,
    realtimeChannels: Math.max(10, (ent.data?.counts.companies ?? 0)),
    workerRunsMonth,
    dbGb: storageGb * 0.3,
    companies: ent.data?.counts.companies ?? 0,
    salesMonth: ent.data?.counts.sales30d ?? 0,
    activeUsers: ent.data?.counts.users ?? 0,
  });

  const daily = snap.totalMonthly / 30;
  const annual = snap.totalMonthly * 12;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center gap-2">
        <DollarSign className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-black">FinOps Center</h2>
        <LiveSourceBadge source={ent.data?.source ?? 'offline'} fetchedAt={ent.data?.fetchedAt} className="ml-auto" />
      </header>

      <div className="grid gap-3 md:grid-cols-3">
        <Card className="p-4"><p className="text-xs text-muted-foreground">Custo diário</p><p className="text-2xl font-black">{usd(daily)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Custo mensal</p><p className="text-2xl font-black">{usd(snap.totalMonthly)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Custo anual</p><p className="text-2xl font-black">{usd(annual)}</p></Card>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Card className="p-4"><p className="text-xs text-muted-foreground">Por empresa</p><p className="text-xl font-black">{usd(snap.costPerCompany)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Por venda</p><p className="text-xl font-black">{usd(snap.costPerSale)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Por utilizador</p><p className="text-xl font-black">{usd(snap.costPerActiveUser)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Por GB</p><p className="text-xl font-black">{usd(snap.costPerGb)}</p></Card>
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
