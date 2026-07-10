import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FeatureFlagService,
  FeatureFlag,
  FeatureFlagOverride,
  FEATURE_FLAG_CATEGORIES,
  FEATURE_FLAG_ENVIRONMENTS,
} from '@/services/featureFlagService';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Flag, Plus, Search, Trash2, Pencil, Copy, Download, Layers } from 'lucide-react';

type Flag = FeatureFlag;

export const FounderFeatureFlagsPage: React.FC = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [environment, setEnvironment] = useState<string>('all');
  const [editing, setEditing] = useState<Partial<Flag> | null>(null);
  const [overridesFor, setOverridesFor] = useState<Flag | null>(null);

  const flagsQ = useQuery({
    queryKey: ['founder', 'feature_flags', 'v2'],
    queryFn: () => FeatureFlagService.list(),
  });

  const overridesQ = useQuery({
    queryKey: ['founder', 'feature_flag_overrides'],
    queryFn: () => FeatureFlagService.listOverrides(),
  });

  const toggle = useMutation({
    mutationFn: async (f: Flag) =>
      FeatureFlagService.upsertFlag({ id: f.id, key: f.key, enabled: !f.enabled }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['founder', 'feature_flags', 'v2'] });
      toast.success('Flag atualizada');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const upsert = useMutation({
    mutationFn: (f: Partial<Flag>) =>
      FeatureFlagService.upsertFlag({ ...(f as any), key: f.key! }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['founder', 'feature_flags', 'v2'] });
      toast.success('Salvo');
      setEditing(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => FeatureFlagService.deleteFlag(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['founder', 'feature_flags', 'v2'] });
      toast.success('Removida');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const all = flagsQ.data ?? [];
    return all.filter((f) => {
      if (category !== 'all' && f.category !== category) return false;
      if (environment !== 'all' && f.environment !== environment && f.environment !== 'all') return false;
      if (search && !`${f.key} ${f.name ?? ''} ${f.description ?? ''}`.toLowerCase().includes(search.toLowerCase()))
        return false;
      return true;
    });
  }, [flagsQ.data, category, environment, search]);

  const grouped = useMemo(() => {
    const g: Record<string, Flag[]> = {};
    filtered.forEach((f) => {
      (g[f.category] ??= []).push(f);
    });
    return g;
  }, [filtered]);

  const stats = useMemo(() => {
    const all = flagsQ.data ?? [];
    return {
      total: all.length,
      active: all.filter((f) => f.enabled).length,
      inactive: all.filter((f) => !f.enabled).length,
      overrides: overridesQ.data?.length ?? 0,
      experimental: all.filter((f) => f.category === 'Experimental').length,
    };
  }, [flagsQ.data, overridesQ.data]);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(flagsQ.data ?? [], null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `feature-flags-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Flag className="h-6 w-6" /> Feature Flags Enterprise
          </h1>
          <p className="text-sm text-muted-foreground">Controle granular de funcionalidades da plataforma.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportJson}>
            <Download className="h-4 w-4 mr-1" /> Exportar
          </Button>
          <Button size="sm" onClick={() => setEditing({ key: '', enabled: false, category: 'Experimental', environment: 'production' })}>
            <Plus className="h-4 w-4 mr-1" /> Nova Flag
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Ativas" value={stats.active} accent="text-green-500" />
        <StatCard label="Desativadas" value={stats.inactive} accent="text-red-500" />
        <StatCard label="Overrides" value={stats.overrides} accent="text-blue-500" />
        <StatCard label="Experimentais" value={stats.experimental} accent="text-yellow-500" />
      </div>

      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar flags..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full md:w-52"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {FEATURE_FLAG_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={environment} onValueChange={setEnvironment}>
            <SelectTrigger className="w-full md:w-44"><SelectValue placeholder="Ambiente" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os ambientes</SelectItem>
              {FEATURE_FLAG_ENVIRONMENTS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {flagsQ.isLoading ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : Object.keys(grouped).length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">Nenhuma flag encontrada.</Card>
      ) : (
        Object.entries(grouped).map(([cat, items]) => (
          <div key={cat} className="space-y-2">
            <div className="flex items-center gap-2 pt-2">
              <h2 className="text-lg font-semibold">{cat}</h2>
              <Badge variant="secondary">{items.length}</Badge>
            </div>
            <div className="space-y-2">
              {items.map((f) => {
                const ovCount = (overridesQ.data ?? []).filter((o) => o.feature_flag_id === f.id).length;
                return (
                  <Card key={f.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="text-sm font-mono">{f.key}</code>
                        <Badge variant="outline">{f.environment}</Badge>
                        {ovCount > 0 && <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">{ovCount} override(s)</Badge>}
                      </div>
                      {f.name && <div className="text-sm font-medium mt-1">{f.name}</div>}
                      {f.description && <div className="text-xs text-muted-foreground truncate">{f.description}</div>}
                      <div className="text-[10px] text-muted-foreground mt-1">
                        Atualizado: {new Date(f.updated_at).toLocaleString('pt-PT')}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={f.enabled} onCheckedChange={() => toggle.mutate(f)} disabled={toggle.isPending} />
                      <Button size="sm" variant="ghost" onClick={() => setOverridesFor(f)} title="Overrides">
                        <Layers className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(f)} title="Editar">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditing({ ...f, id: undefined, key: `${f.key}_copy` })} title="Duplicar">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm" variant="ghost"
                        onClick={() => { if (confirm(`Remover ${f.key}?`)) remove.mutate(f.id); }}
                        title="Remover"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        ))
      )}

      <FlagEditDialog editing={editing} setEditing={setEditing} onSave={(f) => upsert.mutate(f)} saving={upsert.isPending} />

      <OverridesDialog
        flag={overridesFor}
        onClose={() => setOverridesFor(null)}
        overrides={(overridesQ.data ?? []).filter((o) => o.feature_flag_id === overridesFor?.id)}
        onChanged={() => qc.invalidateQueries({ queryKey: ['founder', 'feature_flag_overrides'] })}
      />
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: number; accent?: string }> = ({ label, value, accent }) => (
  <Card className="p-4">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className={`text-2xl font-bold ${accent ?? ''}`}>{value}</div>
  </Card>
);

const FlagEditDialog: React.FC<{
  editing: Partial<Flag> | null;
  setEditing: (v: Partial<Flag> | null) => void;
  onSave: (f: Partial<Flag>) => void;
  saving: boolean;
}> = ({ editing, setEditing, onSave, saving }) => {
  if (!editing) return null;
  return (
    <Dialog open onOpenChange={(v) => !v && setEditing(null)}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editing.id ? 'Editar Flag' : 'Nova Flag'}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Chave (key)</label>
            <Input value={editing.key ?? ''} onChange={(e) => setEditing({ ...editing, key: e.target.value })} placeholder="erp.sales" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Nome</label>
            <Input value={editing.name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Descrição</label>
            <Textarea value={editing.description ?? ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Categoria</label>
              <Select value={editing.category ?? 'Experimental'} onValueChange={(v) => setEditing({ ...editing, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FEATURE_FLAG_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Ambiente</label>
              <Select value={editing.environment ?? 'production'} onValueChange={(v) => setEditing({ ...editing, environment: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FEATURE_FLAG_ENVIRONMENTS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={editing.enabled ?? false} onCheckedChange={(v) => setEditing({ ...editing, enabled: v })} />
            <span className="text-sm">Ativa</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
          <Button onClick={() => onSave(editing)} disabled={!editing.key || saving}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const OverridesDialog: React.FC<{
  flag: Flag | null;
  overrides: FeatureFlagOverride[];
  onClose: () => void;
  onChanged: () => void;
}> = ({ flag, overrides, onClose, onChanged }) => {
  const [targetType, setTargetType] = useState<FeatureFlagOverride['target_type']>('company');
  const [targetId, setTargetId] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [reason, setReason] = useState('');

  if (!flag) return null;

  const add = async () => {
    if (!targetId) return toast.error('Informe o ID alvo');
    try {
      await FeatureFlagService.upsertOverride({
        feature_flag_id: flag.id, target_type: targetType, target_id: targetId, enabled, reason,
      });
      toast.success('Override criado');
      setTargetId(''); setReason('');
      onChanged();
    } catch (e: any) { toast.error(e.message); }
  };

  const del = async (id: string) => {
    try {
      await FeatureFlagService.deleteOverride(id);
      toast.success('Removido');
      onChanged();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Overrides — {flag.key}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <Card className="p-3 space-y-3">
            <div className="text-sm font-medium">Novo override</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Select value={targetType} onValueChange={(v) => setTargetType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="company">Empresa</SelectItem>
                  <SelectItem value="tenant">Tenant</SelectItem>
                  <SelectItem value="store">Loja</SelectItem>
                  <SelectItem value="plan">Plano</SelectItem>
                  <SelectItem value="user">Utilizador</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="UUID alvo" value={targetId} onChange={(e) => setTargetId(e.target.value)} />
            </div>
            <Input placeholder="Motivo (opcional)" value={reason} onChange={(e) => setReason(e.target.value)} />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch checked={enabled} onCheckedChange={setEnabled} />
                <span className="text-sm">{enabled ? 'Ativar' : 'Desativar'} para este alvo</span>
              </div>
              <Button size="sm" onClick={add}>Adicionar</Button>
            </div>
          </Card>

          <div className="space-y-2 max-h-64 overflow-auto">
            {overrides.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">Sem overrides</div>
            ) : overrides.map((o) => (
              <div key={o.id} className="flex items-center justify-between p-2 rounded border">
                <div className="text-xs">
                  <Badge variant="outline" className="mr-2">{o.target_type}</Badge>
                  <code>{o.target_id}</code>
                  <Badge className={`ml-2 ${o.enabled ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                    {o.enabled ? 'ON' : 'OFF'}
                  </Badge>
                  {o.reason && <div className="text-muted-foreground mt-1">{o.reason}</div>}
                </div>
                <Button size="sm" variant="ghost" onClick={() => del(o.id)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FounderFeatureFlagsPage;
