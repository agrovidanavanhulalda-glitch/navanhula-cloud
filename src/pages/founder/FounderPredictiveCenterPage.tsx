import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp } from 'lucide-react';
import { useStorageMetrics } from '@/lib/ops/useStorageMetrics';
import { useLiveOpsMetrics } from '@/lib/ops/useLiveOpsMetrics';
import { useLiveEnterpriseMetrics } from '@/lib/ops/useLiveEnterpriseMetrics';
import { forecast } from '@/lib/ops/capacityEngine';
import { predict } from '@/lib/ops/predictiveEngine';
import LiveSourceBadge from '@/components/founder/LiveSourceBadge';

const sevTone = (s: string) =>
  s === 'CRITICAL' ? 'bg-destructive/15 text-destructive border-destructive/40'
  : s === 'WARNING' ? 'bg-warning/15 text-warning border-warning/40'
  : 'bg-primary/10 text-primary border-primary/30';

export const FounderPredictiveCenterPage: React.FC = () => {
  const storage = useStorageMetrics();
  const live = useLiveOpsMetrics();
  const ent = useLiveEnterpriseMetrics();

  const totalStorage = storage.data?.buckets.reduce((a, b) => a + Number(b.bytes ?? 0), 0) ?? 0;
  const storage7d = storage.data?.buckets.reduce((a, b) => a + Number(b.bytes7d ?? 0), 0) ?? 0;
  const storageF = forecast({ current: totalStorage, deltaLastNDays: storage7d, daysWindow: 7 });
  const dbF = forecast({ current: totalStorage * 0.3, deltaLastNDays: storage7d * 0.3, daysWindow: 7 });

  const alerts = predict({
    db: dbF,
    storage: storageF,
    storageQuotaBytes: 100 * 1024 ** 3,
    dlqCurrent: live.data?.queue.dlq ?? 0,
    dlqPerDay: (live.data?.queue.failed ?? 0),
    workerSuccessRate: live.data?.queue.successRate ?? null,
  });

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center gap-2">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-black">Predictive Center</h2>
        <Badge variant="outline">{alerts.length} alertas</Badge>
        <LiveSourceBadge source={ent.data?.source ?? 'offline'} fetchedAt={ent.data?.fetchedAt} className="ml-auto" />
      </header>
      {alerts.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">Sem previsões críticas no horizonte.</Card>
      ) : (
        <div className="space-y-2">
          {alerts.map(a => (
            <Card key={a.id} className={`p-4 border ${sevTone(a.severity)}`}>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{a.severity}</Badge>
                <p className="text-sm font-bold">{a.title}</p>
                <span className="ml-auto text-xs opacity-70">ETA {a.eta}</span>
              </div>
              <p className="mt-1 text-xs opacity-80">{a.detail}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
export default FounderPredictiveCenterPage;
