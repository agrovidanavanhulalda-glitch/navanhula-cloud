import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck } from 'lucide-react';
import { useLiveOpsMetrics } from '@/lib/ops/useLiveOpsMetrics';
import { computeScoreV2 } from '@/lib/ops/enterpriseScoreV2';

export const FounderSRECenterPage: React.FC = () => {
  const live = useLiveOpsMetrics();
  const rpc = live.data?.rpc;
  const queue = live.data?.queue;
  const errRate = rpc?.errorRate ?? 0;
  const p95 = rpc?.p95 ?? 0;
  const workerOk = (queue?.successRate ?? 1) * 100;

  const score = computeScoreV2({
    availability: 100 - errRate * 100,
    reliability: workerOk,
    performance: Math.max(0, 100 - (p95 / 15)),
    sre: 85,
  });

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-black">SRE Center</h2>
        <Badge variant="outline" className="ml-auto">Enterprise V2 · {score.total} ({score.grade})</Badge>
      </header>
      <div className="grid gap-3 md:grid-cols-4">
        <Card className="p-4"><p className="text-xs text-muted-foreground">Error rate (RPC)</p><p className="text-2xl font-black">{(errRate * 100).toFixed(2)}%</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">P95 latency</p><p className="text-2xl font-black">{p95.toFixed(0)} ms</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Worker success</p><p className="text-2xl font-black">{workerOk.toFixed(1)}%</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">DLQ</p><p className="text-2xl font-black">{queue?.dlq ?? 0}</p></Card>
      </div>
      <Card className="p-4">
        <p className="text-sm font-bold mb-2">Dimensões</p>
        <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
          {Object.entries(score.dimensions).map(([k, v]) => (
            <div key={k} className="flex justify-between rounded border border-border/40 px-2 py-1.5">
              <span className="uppercase text-muted-foreground">{k}</span>
              <span className="font-bold">{Math.round(v)}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
export default FounderSRECenterPage;
