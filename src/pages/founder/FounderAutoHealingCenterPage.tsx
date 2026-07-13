import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wrench } from 'lucide-react';
import { useStorageMetrics } from '@/lib/ops/useStorageMetrics';
import { useLiveOpsMetrics } from '@/lib/ops/useLiveOpsMetrics';
import { useLiveEnterpriseMetrics } from '@/lib/ops/useLiveEnterpriseMetrics';
import { recommend } from '@/lib/ops/autoHealingEngine';
import LiveSourceBadge from '@/components/founder/LiveSourceBadge';

const sevTone = (s: string) =>
  s === 'CRITICAL' ? 'border-destructive/40 bg-destructive/5'
  : s === 'WARNING' ? 'border-warning/40 bg-warning/5'
  : 'border-primary/30 bg-primary/5';

export const FounderAutoHealingCenterPage: React.FC = () => {
  const live = useLiveOpsMetrics();
  const storage = useStorageMetrics();
  const ent = useLiveEnterpriseMetrics();

  const totalBytes = storage.data?.buckets.reduce((a, b) => a + Number(b.bytes ?? 0), 0) ?? 0;
  const bytes7d = storage.data?.buckets.reduce((a, b) => a + Number(b.bytes7d ?? 0), 0) ?? 0;
  const quota = 100 * 1024 ** 3;

  const recs = recommend({
    queueDepth: live.data?.queue.depth ?? 0,
    queueGrowthPerMin: (live.data?.queue.pending ?? 0) / 60,
    dlqCount: live.data?.queue.dlq ?? 0,
    storagePctUsed: totalBytes > 0 ? (totalBytes / quota) * 100 : null,
    storageGrowthGbPerDay: bytes7d / 7 / 1024 ** 3,
    realtimeChannels: 0,
    rpcErrorRate: live.data?.rpc.errorRate ?? null,
    rpcP95Ms: live.data?.rpc.p95 ?? null,
    workerSuccessRate: live.data?.queue.successRate ?? null,
  });

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center gap-2">
        <Wrench className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-black">Auto-Healing Center</h2>
        <Badge variant="outline">Somente recomendações</Badge>
        <LiveSourceBadge source={ent.data?.source ?? 'offline'} fetchedAt={ent.data?.fetchedAt} className="ml-auto" />
      </header>
      {recs.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">Nenhuma recomendação ativa.</Card>
      ) : (
        <div className="space-y-2">
          {recs.map(r => (
            <Card key={r.id} className={`p-4 border ${sevTone(r.severity)}`}>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{r.severity}</Badge>
                <Badge variant="secondary" className="uppercase text-[10px]">{r.area}</Badge>
                <p className="text-sm font-bold">{r.title}</p>
              </div>
              <p className="mt-1 text-xs">{r.suggestion}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">Evidência: {r.evidence}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
export default FounderAutoHealingCenterPage;
