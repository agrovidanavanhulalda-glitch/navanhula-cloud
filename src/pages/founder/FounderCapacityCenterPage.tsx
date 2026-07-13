import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Gauge, Database, HardDrive, ListTree, FileText, Wifi, Building2, Users, ShoppingCart } from 'lucide-react';
import { useStorageMetrics } from '@/lib/ops/useStorageMetrics';
import { useLiveOpsMetrics } from '@/lib/ops/useLiveOpsMetrics';
import { useLiveEnterpriseMetrics } from '@/lib/ops/useLiveEnterpriseMetrics';
import { forecast, type CapacityForecast } from '@/lib/ops/capacityEngine';
import LiveSourceBadge from '@/components/founder/LiveSourceBadge';

const fmtBytes = (n: number) => {
  if (!isFinite(n) || n <= 0) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB', 'TB']; let i = 0; let v = n;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(2)} ${u[i]}`;
};
const fmt = (n: number) => Number(n ?? 0).toLocaleString('pt-PT', { maximumFractionDigits: 0 });

const Row: React.FC<{ icon: React.ElementType; label: string; f: CapacityForecast; formatter?: (n: number) => string }> =
  ({ icon: Icon, label, f, formatter = fmt }) => (
  <Card className="p-4">
    <div className="flex items-center gap-2 mb-3">
      <Icon className="h-4 w-4 text-primary" />
      <p className="text-sm font-bold">{label}</p>
      <Badge variant="outline" className="ml-auto text-[10px]">+{formatter(f.perDay)}/dia</Badge>
    </div>
    <div className="grid grid-cols-5 gap-2 text-xs">
      <div><p className="text-muted-foreground">Atual</p><p className="font-bold">{formatter(f.current)}</p></div>
      <div><p className="text-muted-foreground">30d</p><p className="font-bold">{formatter(f.d30)}</p></div>
      <div><p className="text-muted-foreground">90d</p><p className="font-bold">{formatter(f.d90)}</p></div>
      <div><p className="text-muted-foreground">180d</p><p className="font-bold">{formatter(f.d180)}</p></div>
      <div><p className="text-muted-foreground">365d</p><p className="font-bold">{formatter(f.d365)}</p></div>
    </div>
  </Card>
);

export const FounderCapacityCenterPage: React.FC = () => {
  const storage = useStorageMetrics();
  const live = useLiveOpsMetrics();
  const ent = useLiveEnterpriseMetrics();

  const totalStorage = storage.data?.buckets.reduce((a, b) => a + Number(b.bytes ?? 0), 0) ?? 0;
  const storage7d = storage.data?.buckets.reduce((a, b) => a + Number(b.bytes7d ?? 0), 0) ?? 0;
  const tasksPerDay = ent.data?.perDay.tasks ?? (live.data?.queue.completed ?? 0);
  const telemetryPerDay = ent.data?.perDay.telemetry ?? 0;
  const salesPerDay = ent.data?.perDay.sales ?? 0;
  const fiscalPerDay = ent.data?.perDay.fiscal ?? 0;

  const storageF = forecast({ current: totalStorage, deltaLastNDays: storage7d, daysWindow: 7 });
  const dbF = forecast({ current: totalStorage * 0.3, deltaLastNDays: storage7d * 0.3, daysWindow: 7 });
  const logsF = forecast({ current: ent.data?.counts.telemetryEvents30d ?? 0, deltaLastNDays: telemetryPerDay * 7, daysWindow: 7 });
  const fiscalF = forecast({ current: ent.data?.counts.fiscalDocs ?? 0, deltaLastNDays: fiscalPerDay * 7, daysWindow: 7 });
  const bgF = forecast({ current: live.data?.queue.depth ?? 0, deltaLastNDays: tasksPerDay, daysWindow: 1 });
  const salesF = forecast({ current: ent.data?.counts.sales ?? 0, deltaLastNDays: salesPerDay * 7, daysWindow: 7 });
  const rtF = forecast({ current: 0, deltaLastNDays: 0, daysWindow: 7 });

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center gap-2">
        <Gauge className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-black">Capacity Center</h2>
        <LiveSourceBadge source={ent.data?.source ?? 'offline'} fetchedAt={ent.data?.fetchedAt} className="ml-auto" />
      </header>

      <div className="grid gap-3 md:grid-cols-4">
        <Card className="p-3"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Building2 className="h-3 w-3" /> Empresas</div><p className="text-xl font-black">{fmt(ent.data?.counts.companies ?? 0)}</p></Card>
        <Card className="p-3"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Users className="h-3 w-3" /> Utilizadores</div><p className="text-xl font-black">{fmt(ent.data?.counts.users ?? 0)}</p></Card>
        <Card className="p-3"><div className="flex items-center gap-2 text-xs text-muted-foreground"><ShoppingCart className="h-3 w-3" /> Vendas hoje</div><p className="text-xl font-black">{fmt(ent.data?.counts.salesToday ?? 0)}</p></Card>
        <Card className="p-3"><div className="flex items-center gap-2 text-xs text-muted-foreground"><FileText className="h-3 w-3" /> Docs fiscais 30d</div><p className="text-xl font-black">{fmt(ent.data?.counts.fiscalDocs30d ?? 0)}</p></Card>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Row icon={Database}  label="Database"        f={dbF}     formatter={fmtBytes} />
        <Row icon={HardDrive} label="Storage"         f={storageF} formatter={fmtBytes} />
        <Row icon={FileText}  label="Telemetry / Logs" f={logsF} />
        <Row icon={FileText}  label="Fiscal documents" f={fiscalF} />
        <Row icon={ShoppingCart} label="Vendas"        f={salesF} />
        <Row icon={ListTree}  label="Background tasks" f={bgF} />
        <Row icon={Wifi}      label="Realtime channels" f={rtF} />
      </div>
    </div>
  );
};
export default FounderCapacityCenterPage;
