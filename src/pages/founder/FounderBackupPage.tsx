import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import {
  DatabaseBackup, Download, ShieldCheck, Trash2, Play, Clock,
  HardDrive, CheckCircle2, XCircle, Timer, Fingerprint, CalendarClock, Loader2,
} from 'lucide-react';

interface Backup {
  id: string;
  filename: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  backup_type: 'manual' | 'scheduled';
  size_bytes: number;
  checksum: string | null;
  storage_path: string | null;
  duration_ms: number | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

interface Stats {
  last_backup_at: string | null;
  last_backup_size: number;
  last_backup_duration_ms: number;
  last_checksum: string | null;
  last_storage_path: string | null;
  next_backup_at: string | null;
  schedule_enabled: boolean;
  schedule_frequency: string | null;
  total_backups: number;
  successful_backups: number;
  failed_backups: number;
  total_storage_bytes: number;
}

interface Schedule {
  id: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
  hour: number;
  minute: number;
  enabled: boolean;
  cron_expression: string | null;
  next_run_at: string | null;
}

const fmtBytes = (n: number) => {
  if (!n) return '—';
  if (n < 1024) return `${n} B`;
  const u = ['KB', 'MB', 'GB', 'TB'];
  let v = n / 1024, i = 0;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(2)} ${u[i]}`;
};
const fmtMs = (ms: number | null) => (ms ? `${(ms / 1000).toFixed(1)}s` : '—');
const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' }) : '—';

const StatCard: React.FC<{ icon: React.ElementType; label: string; value: React.ReactNode; hint?: string; tone?: 'default' | 'success' | 'warning' | 'danger' | 'gold' }> = ({
  icon: Icon, label, value, hint, tone = 'default',
}) => {
  const tones = {
    default: 'from-primary/10 to-primary/5 text-primary',
    success: 'from-success/15 to-success/5 text-success',
    warning: 'from-warning/15 to-warning/5 text-warning',
    danger: 'from-destructive/15 to-destructive/5 text-destructive',
    gold: 'from-gold/20 to-accent/5 text-accent-foreground',
  }[tone];
  return (
    <Card className="p-4">
      <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${tones} mb-3`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-lg font-black mt-1 leading-tight truncate">{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground mt-1 truncate">{hint}</p>}
    </Card>
  );
};

const StatusBadge: React.FC<{ status: Backup['status'] }> = ({ status }) => {
  const map = {
    success: { label: 'Sucesso', cls: 'bg-success/15 text-success border-success/30' },
    failed: { label: 'Falhou', cls: 'bg-destructive/15 text-destructive border-destructive/30' },
    running: { label: 'A executar', cls: 'bg-warning/15 text-warning border-warning/30' },
    pending: { label: 'Pendente', cls: 'bg-muted text-muted-foreground' },
  }[status];
  return <Badge variant="outline" className={map.cls}>{map.label}</Badge>;
};

export const FounderBackupPage: React.FC = () => {
  const qc = useQueryClient();

  const statsQ = useQuery({
    queryKey: ['founder', 'backup_stats'],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('founder_backup_stats');
      if (error) throw error;
      return data as Stats;
    },
    refetchInterval: 20_000,
  });

  const listQ = useQuery({
    queryKey: ['founder', 'backup_list'],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('founder_backup_list', { p_limit: 100 });
      if (error) throw error;
      return (data ?? []) as Backup[];
    },
    refetchInterval: 15_000,
  });

  const scheduleQ = useQuery({
    queryKey: ['founder', 'backup_schedule'],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('founder_backup_schedule_get');
      if (error) throw error;
      return data as Schedule | null;
    },
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['founder', 'backup_stats'] });
    qc.invalidateQueries({ queryKey: ['founder', 'backup_list'] });
    qc.invalidateQueries({ queryKey: ['founder', 'backup_schedule'] });
  };

  const createMut = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('founder-backup', {
        body: { action: 'create', backup_type: 'manual' },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => { toast.success('Backup criado com sucesso'); invalidateAll(); },
    onError: (e: any) => toast.error('Falha ao criar backup: ' + (e?.message ?? e)),
  });

  const downloadMut = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke('founder-backup', { body: { action: 'download', id } });
      if (error) throw error;
      return data as { url: string };
    },
    onSuccess: (data) => { window.open(data.url, '_blank'); },
    onError: (e: any) => toast.error('Erro no download: ' + (e?.message ?? e)),
  });

  const verifyMut = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke('founder-backup', { body: { action: 'verify', id } });
      if (error) throw error;
      return data as { ok: boolean; checksum: string; expected: string };
    },
    onSuccess: (d) => d.ok ? toast.success('Integridade verificada ✓') : toast.error('Checksum divergente!'),
    onError: (e: any) => toast.error('Erro na verificação: ' + (e?.message ?? e)),
  });

  const restoreMut = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke('founder-backup', { body: { action: 'restore', id } });
      if (error) throw error;
      return data;
    },
    onSuccess: (d: any) => toast.info(d?.message ?? 'Solicitação registada.'),
    onError: (e: any) => toast.error('Erro: ' + (e?.message ?? e)),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.rpc as any)('founder_backup_delete', { p_id: id });
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Backup removido'); invalidateAll(); },
    onError: (e: any) => toast.error('Erro ao remover: ' + (e?.message ?? e)),
  });

  const [freq, setFreq] = React.useState<'daily' | 'weekly' | 'monthly' | 'custom'>('daily');
  const [hour, setHour] = React.useState(3);
  const [minute, setMinute] = React.useState(0);
  const [enabled, setEnabled] = React.useState(true);

  React.useEffect(() => {
    if (scheduleQ.data) {
      setFreq(scheduleQ.data.frequency);
      setHour(scheduleQ.data.hour);
      setMinute(scheduleQ.data.minute);
      setEnabled(scheduleQ.data.enabled);
    }
  }, [scheduleQ.data]);

  const scheduleMut = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase.rpc as any)('founder_backup_schedule_upsert', {
        p_frequency: freq, p_hour: hour, p_minute: minute, p_cron: null, p_enabled: enabled,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Agendamento atualizado'); invalidateAll(); },
    onError: (e: any) => toast.error('Erro: ' + (e?.message ?? e)),
  });

  const s = statsQ.data;

  return (
    <div className="space-y-6">
      {/* Dashboard */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <DatabaseBackup className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">Backup Center</h2>
          </div>
          <Button onClick={() => createMut.mutate()} disabled={createMut.isPending} className="gap-2">
            {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Criar Backup Manual
          </Button>
        </div>

        {statsQ.isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={CheckCircle2} label="Último Backup" value={fmtDate(s?.last_backup_at ?? null)} tone="success" />
            <StatCard icon={CalendarClock} label="Próximo Backup" value={fmtDate(s?.next_backup_at ?? null)} hint={s?.schedule_frequency ?? 'Não agendado'} />
            <StatCard icon={HardDrive} label="Tamanho (último)" value={fmtBytes(s?.last_backup_size ?? 0)} tone="gold" />
            <StatCard icon={Timer} label="Duração (último)" value={fmtMs(s?.last_backup_duration_ms ?? null)} />
            <StatCard icon={Fingerprint} label="Checksum" value={s?.last_checksum ? s.last_checksum.slice(0, 12) + '…' : '—'} hint="SHA-256" />
            <StatCard icon={DatabaseBackup} label="Total Backups" value={s?.total_backups ?? 0} hint={`${s?.successful_backups ?? 0} ok / ${s?.failed_backups ?? 0} falhas`} />
            <StatCard icon={HardDrive} label="Storage Usado" value={fmtBytes(s?.total_storage_bytes ?? 0)} tone="gold" />
            <StatCard icon={ShieldCheck} label="Localização" value="founder-backups" hint="Bucket privado" tone="success" />
          </div>
        )}
      </div>

      {/* Schedule */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-4 w-4 text-primary" />
          <h3 className="font-bold">Agendamento Automático</h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Frequência</label>
            <Select value={freq} onValueChange={(v) => setFreq(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Diário</SelectItem>
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="monthly">Mensal</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Hora (UTC)</label>
            <Input type="number" min={0} max={23} value={hour} onChange={(e) => setHour(Number(e.target.value))} />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Minuto</label>
            <Input type="number" min={0} max={59} value={minute} onChange={(e) => setMinute(Number(e.target.value))} />
          </div>
          <div className="flex items-end gap-3">
            <div className="flex items-center gap-2">
              <Switch checked={enabled} onCheckedChange={setEnabled} />
              <span className="text-sm">Ativo</span>
            </div>
            <Button onClick={() => scheduleMut.mutate()} disabled={scheduleMut.isPending} className="ml-auto">
              Salvar
            </Button>
          </div>
        </div>
      </Card>

      {/* History */}
      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-border/60">
          <h3 className="font-bold">Histórico de Backups</h3>
        </div>
        {listQ.isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Tamanho</TableHead>
                <TableHead className="text-right">Duração</TableHead>
                <TableHead>Checksum</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(listQ.data ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                    Nenhum backup ainda. Clique em "Criar Backup Manual".
                  </TableCell>
                </TableRow>
              )}
              {(listQ.data ?? []).map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-mono text-xs">{fmtDate(b.created_at)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{b.backup_type === 'manual' ? 'Manual' : 'Agendado'}</Badge>
                  </TableCell>
                  <TableCell><StatusBadge status={b.status} /></TableCell>
                  <TableCell className="text-right font-mono text-xs">{fmtBytes(b.size_bytes)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{fmtMs(b.duration_ms)}</TableCell>
                  <TableCell className="font-mono text-[10px]">{b.checksum ? b.checksum.slice(0, 10) + '…' : '—'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" disabled={b.status !== 'success' || downloadMut.isPending} onClick={() => downloadMut.mutate(b.id)} title="Download">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" disabled={b.status !== 'success' || verifyMut.isPending} onClick={() => verifyMut.mutate(b.id)} title="Verificar integridade">
                        <ShieldCheck className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" disabled={b.status !== 'success'} title="Restaurar">
                            <Play className="h-4 w-4 text-warning" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Restaurar backup?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta é uma operação crítica que substitui dados atuais.
                              A restauração exige janela de manutenção e será registada em auditoria.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => restoreMut.mutate(b.id)}>Confirmar</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" title="Excluir">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir backup?</AlertDialogTitle>
                            <AlertDialogDescription>Ação irreversível.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteMut.mutate(b.id)}>Excluir</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {(listQ.data ?? []).some((b) => b.status === 'failed' && b.error_message) && (
        <Card className="p-4 border-destructive/40 bg-destructive/5">
          <p className="text-xs font-semibold text-destructive mb-1 flex items-center gap-1">
            <XCircle className="h-3 w-3" /> Últimos erros
          </p>
          <div className="space-y-1">
            {(listQ.data ?? []).filter((b) => b.status === 'failed').slice(0, 3).map((b) => (
              <p key={b.id} className="text-[11px] font-mono text-destructive/90">
                {fmtDate(b.created_at)} — {b.error_message}
              </p>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default FounderBackupPage;
