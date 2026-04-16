import React, { useState } from 'react';
import { useAuth } from '@/contexts/SaaSAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Zap, Plus, AlertTriangle, TrendingDown, Package, Trash2 } from 'lucide-react';
import { PermissionGate } from '@/components/auth/PermissionGate';

const TRIGGER_TYPES = [
  { value: 'stock_low', label: 'Stock Baixo', icon: Package, description: 'Quando stock fica abaixo do mínimo' },
  { value: 'no_sales', label: 'Sem Vendas', icon: TrendingDown, description: 'Sem vendas por X dias' },
  { value: 'high_expense', label: 'Despesa Alta', icon: AlertTriangle, description: 'Despesa acima do limite' },
];

const ACTION_TYPES = [
  { value: 'alert', label: 'Gerar Alerta' },
  { value: 'block_sale', label: 'Bloquear Venda' },
  { value: 'suggest_purchase', label: 'Sugerir Compra' },
  { value: 'notify', label: 'Notificação' },
];

const AutomationRulesPage = () => {
  const { company } = useAuth();
  const queryClient = useQueryClient();
  const companyId = company?.id;
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    trigger_type: 'stock_low',
    action_type: 'alert',
    priority: '1',
  });

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['automation-rules', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('automation_rules')
        .select('*')
        .eq('company_id', companyId!)
        .order('priority', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ['automation-alerts', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('company_id', companyId!)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const createRule = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('automation_rules').insert({
        company_id: companyId!,
        name: form.name,
        description: form.description || null,
        trigger_type: form.trigger_type,
        action_type: form.action_type,
        priority: parseInt(form.priority),
        conditions: {},
        actions: {},
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] });
      toast.success('Regra criada!');
      setShowCreate(false);
      setForm({ name: '', description: '', trigger_type: 'stock_low', action_type: 'alert', priority: '1' });
    },
    onError: () => toast.error('Erro ao criar regra'),
  });

  const toggleRule = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('automation_rules')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] });
      toast.success('Regra atualizada!');
    },
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('automation_rules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] });
      toast.success('Regra removida!');
    },
  });

  const resolveAlert = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('alerts')
        .update({ status: 'resolved', resolved_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-alerts'] });
      toast.success('Alerta resolvido!');
    },
  });

  const triggerLabels: Record<string, string> = {
    stock_low: 'Stock Baixo', no_sales: 'Sem Vendas', high_expense: 'Despesa Alta',
  };
  const actionLabels: Record<string, string> = {
    alert: 'Alerta', block_sale: 'Bloquear Venda', suggest_purchase: 'Sugerir Compra', notify: 'Notificação',
  };
  const severityVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    critical: 'destructive', high: 'destructive', medium: 'default', low: 'secondary',
  };

  return (
    <PermissionGate module="settings">
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Zap className="w-7 h-7 text-primary" /> Automação Inteligente
            </h1>
            <p className="text-sm text-muted-foreground">Regras automáticas, alertas e workflows</p>
          </div>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="w-4 h-4" /> Nova Regra</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Criar Regra de Automação</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nome da Regra *</Label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Alerta stock mínimo" />
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descreva o comportamento..." rows={2} />
                </div>
                <div>
                  <Label>Trigger (Quando)</Label>
                  <Select value={form.trigger_type} onValueChange={v => setForm(f => ({ ...f, trigger_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TRIGGER_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label} — {t.description}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Ação (Então)</Label>
                  <Select value={form.action_type} onValueChange={v => setForm(f => ({ ...f, action_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ACTION_TYPES.map(a => (
                        <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Prioridade</Label>
                  <Input type="number" min="1" max="10" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => createRule.mutate()} disabled={!form.name || createRule.isPending}>
                  {createRule.isPending ? 'Criando...' : 'Criar Regra'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold">{rules.length}</p>
            <p className="text-xs text-muted-foreground">Regras Total</p>
          </CardContent></Card>
          <Card><CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-emerald-600">{rules.filter((r: any) => r.is_active).length}</p>
            <p className="text-xs text-muted-foreground">Ativas</p>
          </CardContent></Card>
          <Card><CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-amber-600">{alerts.length}</p>
            <p className="text-xs text-muted-foreground">Alertas Pendentes</p>
          </CardContent></Card>
          <Card><CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-muted-foreground">{rules.filter((r: any) => r.last_triggered_at).length}</p>
            <p className="text-xs text-muted-foreground">Já Dispararam</p>
          </CardContent></Card>
        </div>

        {/* Rules List */}
        <Card>
          <CardHeader><CardTitle>Regras de Automação</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <p className="text-center py-8 text-muted-foreground">Carregando...</p>
            ) : rules.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Nenhuma regra criada. Clique em "Nova Regra" para começar.</p>
            ) : rules.map((rule: any) => (
              <div key={rule.id} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm">{rule.name}</p>
                    <Badge variant="outline">{triggerLabels[rule.trigger_type] || rule.trigger_type}</Badge>
                    <Badge variant="secondary">{actionLabels[rule.action_type] || rule.action_type}</Badge>
                  </div>
                  {rule.description && <p className="text-xs text-muted-foreground mt-1">{rule.description}</p>}
                  {rule.last_triggered_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Último disparo: {new Date(rule.last_triggered_at).toLocaleString('pt-MZ')}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <Switch
                    checked={rule.is_active}
                    onCheckedChange={checked => toggleRule.mutate({ id: rule.id, is_active: checked })}
                  />
                  <Button variant="ghost" size="sm" onClick={() => deleteRule.mutate(rule.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Active Alerts */}
        {alerts.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-amber-500" /> Alertas Ativos</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {alerts.map((alert: any) => (
                <div key={alert.id} className="flex items-center justify-between p-3 rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant={severityVariant[alert.severity] || 'outline'}>{alert.severity}</Badge>
                      <p className="font-medium text-sm">{alert.title}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{alert.message}</p>
                    <p className="text-xs text-muted-foreground">{new Date(alert.created_at).toLocaleString('pt-MZ')}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => resolveAlert.mutate(alert.id)}>
                    Resolver
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </PermissionGate>
  );
};

export default AutomationRulesPage;
