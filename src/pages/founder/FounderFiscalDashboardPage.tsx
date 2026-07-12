import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import {
  FileCheck, Clock, XCircle, RefreshCw, AlertTriangle, Timer,
  Gauge, HardDrive, TrendingUp, Activity, Download, ShieldCheck, FileText,
} from 'lucide-react';

const fmt = (n: unknown) => Number(n ?? 0).toLocaleString('pt-PT');
const fmtMs = (n: unknown) => `${Math.round(Number(n ?? 0))} ms`;
const fmtBytes = (b: unknown) => {
  const n = Number(b ?? 0);
  if (n < 1024) return `${n} B`;
  const u = ['KB', 'MB', 'GB', 'TB']; let v = n / 1024; let i = 0;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(2)} ${u[i]}`;
};

const Stat: React.FC<{ icon: React.ElementType; label: string; value: React.ReactNode; tone?: string; hint?: string }> = ({ icon: Icon, label, value, tone = 'default', hint }) => {
  const tones: Record<string, string> = {
    default: 'from-primary/10 to-primary/5 text-primary',
    success: 'from-success/15 to-success/5 text-success',
    warning: 'from-warning/15 to-warning/5 text-warning',
    danger: 'from-destructive/15 to-destructive/5 text-destructive',
  };
  return (
    <Card className="p-4 border-border/60">
      <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${tones[tone]} mb-3`}><Icon className="h-4 w-4" /></div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-2xl font-black text-foreground mt-1 leading-tight">{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground mt-1">{hint}</p>}
    </Card>
  );
};

export const FounderFiscalDashboardPage: React.FC = () => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['founder_fiscal_metrics'],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('founder_fiscal_metrics', { p_hours: 24 });
      if (error) throw error;
      return data as any;
    },
    refetchInterval: 15_000,
  });

  const openArtifact = async (docId: string, kind: string) => {
    try {
      const { data, error } = await (supabase.rpc as any)('get_fiscal_document_url', {
        p_document_id: docId, p_kind: kind, p_expires_in: 60,
      });
      if (error) throw error;
      const url = (data as any)?.url;
      if (url) window.open(url, '_blank');
      else toast({ title: 'Artefacto indisponível', description: kind, variant: 'destructive' });
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  const verifyIntegrity = async (docId: string) => {
    const { data, error } = await (supabase.rpc as any)('verify_fiscal_document_integrity', { p_document_id: docId });
    if (error) return toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    const ok = (data as any)?.valid ?? (data as any)?.match;
    toast({ title: ok ? 'Integridade OK' : 'Integridade comprometida', variant: ok ? 'default' : 'destructive' });
  };

  const runHealthCheck = async () => {
    const { data, error } = await (supabase.rpc as any)('check_fiscal_health');
    if (error) return toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    const n = ((data as any)?.alerts_created ?? []).length;
    toast({ title: n ? `${n} alerta(s) criado(s)` : 'Tudo saudável' });
  };

  if (isLoading) return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>;
  if (error) return <Card className="p-6 border-destructive/40 text-destructive">Erro: {(error as Error).message}</Card>;

  const s = data ?? {};
  const q = s.queue ?? {};
  const r = s.rates ?? {};
  const t = s.timings_ms ?? {};

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black">Fiscal Compliance Engine</h2>
          <p className="text-xs text-muted-foreground">Janela: últimas 24h · Worker: {s.worker_healthy ? <Badge variant="outline" className="text-success border-success">saudável</Badge> : <Badge variant="destructive">degradado</Badge>}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={runHealthCheck}><ShieldCheck className="h-3.5 w-3.5 mr-1" /> Health Check</Button>
          <Button size="sm" variant="outline" onClick={() => refetch()}><RefreshCw className="h-3.5 w-3.5 mr-1" /> Atualizar</Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={FileCheck} label="Documentos (total)" value={fmt(s.docs_total)} tone="success" />
        <Stat icon={TrendingUp} label="Emitidos (24h)" value={fmt(s.docs_period)} tone="success" hint={`${s.throughput_per_hour ?? 0}/h`} />
        <Stat icon={Clock} label="Pendentes" value={fmt(q.pending)} />
        <Stat icon={Activity} label="Em processamento" value={fmt(q.processing)} tone="warning" />
        <Stat icon={RefreshCw} label="Retry" value={fmt(q.retry)} tone="warning" />
        <Stat icon={XCircle} label="Dead Letter Queue" value={fmt(q.failed_dlq)} tone="danger" />
        <Stat icon={Gauge} label="Queue Size" value={fmt(q.queue_size)} />
        <Stat icon={HardDrive} label="Storage" value={fmtBytes(s.storage_bytes)} />
        <Stat icon={TrendingUp} label="Success Rate" value={`${r.success ?? 0}%`} tone="success" />
        <Stat icon={AlertTriangle} label="Failure Rate" value={`${r.failure ?? 0}%`} tone={Number(r.failure) > 5 ? 'danger' : 'default'} />
        <Stat icon={RefreshCw} label="Retry Rate" value={`${r.retry ?? 0}%`} />
        <Stat icon={Timer} label="Tempo médio" value={fmtMs(t.avg)} hint={`min ${fmtMs(t.min)} · max ${fmtMs(t.max)}`} />
        <Stat icon={Timer} label="P95" value={fmtMs(t.p95)} />
        <Stat icon={Timer} label="P99" value={fmtMs(t.p99)} />
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-sm">Últimos 20 documentos emitidos</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground">
              <tr className="border-b border-border/60">
                <th className="text-left py-2">Nº</th>
                <th className="text-left">Tipo</th>
                <th className="text-left">Status</th>
                <th className="text-left">Integridade</th>
                <th className="text-right">Total</th>
                <th className="text-left">Emitido</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {(s.recent_documents ?? []).map((d: any) => (
                <tr key={d.id} className="border-b border-border/40 hover:bg-secondary/30">
                  <td className="py-2 font-mono">{d.document_number}</td>
                  <td>{d.document_type}</td>
                  <td><Badge variant="outline">{d.status}</Badge></td>
                  <td>
                    <Badge variant={d.integrity_status === 'verified' ? 'outline' : 'destructive'} className={d.integrity_status === 'verified' ? 'border-success text-success' : ''}>
                      {d.integrity_status ?? '—'}
                    </Badge>
                  </td>
                  <td className="text-right font-mono">{Number(d.total ?? 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} {d.currency ?? 'MT'}</td>
                  <td>{new Date(d.created_at).toLocaleString('pt-PT')}</td>
                  <td className="text-right space-x-1">
                    <Button size="icon" variant="ghost" title="PDF" disabled={!d.pdf_path} onClick={() => openArtifact(d.id, 'pdf')}><FileText className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" title="XML" disabled={!d.xml_path} onClick={() => openArtifact(d.id, 'xml')}><Download className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" title="JSON" disabled={!d.json_path} onClick={() => openArtifact(d.id, 'json')}><Download className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" title="Verificar hash" onClick={() => verifyIntegrity(d.id)}><ShieldCheck className="h-3.5 w-3.5" /></Button>
                  </td>
                </tr>
              ))}
              {(s.recent_documents ?? []).length === 0 && (
                <tr><td colSpan={7} className="py-6 text-center text-muted-foreground">Sem documentos.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default FounderFiscalDashboardPage;
