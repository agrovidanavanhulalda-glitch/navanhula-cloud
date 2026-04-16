import React, { useState } from 'react';
import { useAuth } from '@/contexts/SaaSAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Key, Plus, Copy, Shield, Webhook, Trash2, Activity, Globe } from 'lucide-react';
import { PermissionGate } from '@/components/auth/PermissionGate';
import PlanGate from '@/components/monetization/PlanGate';

const WEBHOOK_EVENTS = [
  'sale.created', 'sale.cancelled', 'stock.updated', 'stock.low',
  'payment.received', 'payment.failed', 'product.created', 'product.updated',
];

const ApiKeysPage = () => {
  const { company } = useAuth();
  const queryClient = useQueryClient();
  const companyId = company?.id;
  const [showAddKey, setShowAddKey] = useState(false);
  const [showAddWebhook, setShowAddWebhook] = useState(false);
  const [keyForm, setKeyForm] = useState({ name: '' });
  const [generatedKey, setGeneratedKey] = useState('');
  const [webhookForm, setWebhookForm] = useState({ url: '', events: [] as string[] });

  // API Keys query
  const { data: keys = [], isLoading: keysLoading } = useQuery({
    queryKey: ['api-keys', companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from('api_keys').select('*')
        .eq('company_id', companyId!).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  // Webhooks query
  const { data: webhooks = [], isLoading: webhooksLoading } = useQuery({
    queryKey: ['webhooks', companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from('webhooks').select('*')
        .eq('company_id', companyId!).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  // API logs query
  const { data: apiLogs = [] } = useQuery({
    queryKey: ['api-logs', companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from('api_request_logs').select('*')
        .eq('company_id', companyId!).order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  // Create API Key
  const createKey = useMutation({
    mutationFn: async () => {
      const rawKey = 'nava_' + crypto.randomUUID().replace(/-/g, '');
      const prefix = rawKey.substring(0, 12);
      const encoder = new TextEncoder();
      const data = encoder.encode(rawKey);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const keyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      const { error } = await supabase.from('api_keys').insert({
        company_id: companyId!, key_hash: keyHash, key_prefix: prefix,
        name: keyForm.name || 'Default', permissions: ['read', 'write'],
        created_by: (await supabase.auth.getUser()).data.user?.id,
      });
      if (error) throw error;
      return rawKey;
    },
    onSuccess: (key) => {
      setGeneratedKey(key);
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      toast.success('API Key criada!');
    },
    onError: () => toast.error('Erro ao criar API Key'),
  });

  // Toggle API Key
  const toggleKey = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('api_keys').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      toast.success('Key atualizada!');
    },
  });

  // Create Webhook
  const createWebhook = useMutation({
    mutationFn: async () => {
      const secret = 'whsec_' + crypto.randomUUID().replace(/-/g, '');
      const { error } = await supabase.from('webhooks').insert({
        company_id: companyId!, url: webhookForm.url, events: webhookForm.events,
        secret, created_by: (await supabase.auth.getUser()).data.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      toast.success('Webhook criado!');
      setShowAddWebhook(false);
      setWebhookForm({ url: '', events: [] });
    },
    onError: () => toast.error('Erro ao criar webhook'),
  });

  // Toggle Webhook
  const toggleWebhook = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('webhooks').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      toast.success('Webhook atualizado!');
    },
  });

  // Delete Webhook
  const deleteWebhook = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('webhooks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      toast.success('Webhook removido!');
    },
  });

  const toggleEvent = (event: string) => {
    setWebhookForm(f => ({
      ...f,
      events: f.events.includes(event) ? f.events.filter(e => e !== event) : [...f.events, event],
    }));
  };

  return (
    <PlanGate module="api">
      <PermissionGate module="settings">
        <div className="p-4 md:p-6 lg:p-8 space-y-6 animate-fade-in">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Globe className="w-4 h-4 text-primary" />
              </div>
              API & Integrações
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Chaves de API, webhooks e registos de actividade</p>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Keys Activas', value: keys.filter((k: any) => k.is_active).length, icon: Key },
              { label: 'Webhooks', value: webhooks.filter((w: any) => w.is_active).length, icon: Webhook },
              { label: 'Chamadas (24h)', value: apiLogs.filter((l: any) => new Date(l.created_at) > new Date(Date.now() - 86400000)).length, icon: Activity },
              { label: 'Rate Limit', value: '1.000/h', icon: Shield },
            ].map(kpi => (
              <Card key={kpi.label} className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{kpi.label}</span>
                  <kpi.icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold tracking-tight tabular-nums">{kpi.value}</p>
              </Card>
            ))}
          </div>

          <Tabs defaultValue="keys">
            <TabsList>
              <TabsTrigger value="keys">API Keys</TabsTrigger>
              <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
              <TabsTrigger value="logs">Registos</TabsTrigger>
            </TabsList>

            {/* API Keys Tab */}
            <TabsContent value="keys" className="space-y-4">
              <div className="flex justify-end">
                <Dialog open={showAddKey} onOpenChange={(open) => { setShowAddKey(open); if (!open) setGeneratedKey(''); }}>
                  <DialogTrigger asChild>
                    <Button className="gap-2"><Plus className="w-4 h-4" /> Nova API Key</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Criar API Key</DialogTitle></DialogHeader>
                    {generatedKey ? (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">Guarde esta chave. Ela não será mostrada novamente.</p>
                        <div className="flex gap-2">
                          <Input value={generatedKey} readOnly className="font-mono text-xs" />
                          <Button size="icon" variant="outline" onClick={() => { navigator.clipboard.writeText(generatedKey); toast.success('Copiada!'); }}>
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                        <Button className="w-full" onClick={() => { setShowAddKey(false); setGeneratedKey(''); }}>Fechar</Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div><Label>Nome</Label><Input value={keyForm.name} onChange={e => setKeyForm({ name: e.target.value })} placeholder="Ex: App Mobile" /></div>
                        <Button className="w-full" onClick={() => createKey.mutate()} disabled={createKey.isPending}>
                          {createKey.isPending ? 'Gerando...' : 'Gerar Key'}
                        </Button>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </div>

              <Card>
                <CardContent className="pt-6">
                  {keysLoading ? (
                    <p className="text-center py-8 text-muted-foreground">Carregando...</p>
                  ) : keys.length === 0 ? (
                    <div className="py-12 text-center">
                      <Key className="w-8 h-8 mx-auto mb-3 text-muted-foreground/40" />
                      <p className="text-sm font-medium">Nenhuma API Key</p>
                      <p className="text-xs text-muted-foreground mt-1">Crie uma chave para integrar com sistemas externos.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {keys.map((k: any) => (
                        <div key={k.id} className="flex items-center justify-between py-4 group">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm">{k.name}</p>
                              <code className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{k.key_prefix}...</code>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Último uso: {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString('pt-MZ') : 'Nunca'}
                              {' · '}Criada: {new Date(k.created_at).toLocaleDateString('pt-MZ')}
                            </p>
                          </div>
                          <Switch checked={k.is_active} onCheckedChange={checked => toggleKey.mutate({ id: k.id, is_active: checked })} />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Webhooks Tab */}
            <TabsContent value="webhooks" className="space-y-4">
              <div className="flex justify-end">
                <Dialog open={showAddWebhook} onOpenChange={setShowAddWebhook}>
                  <DialogTrigger asChild>
                    <Button className="gap-2"><Plus className="w-4 h-4" /> Novo Webhook</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Criar Webhook</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>URL de Callback *</Label>
                        <Input value={webhookForm.url} onChange={e => setWebhookForm(f => ({ ...f, url: e.target.value }))} placeholder="https://seu-sistema.com/webhook" />
                      </div>
                      <div>
                        <Label className="mb-2 block">Eventos</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {WEBHOOK_EVENTS.map(event => (
                            <label key={event} className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded-lg hover:bg-muted/50 transition-colors">
                              <Checkbox checked={webhookForm.events.includes(event)} onCheckedChange={() => toggleEvent(event)} />
                              <code className="text-xs">{event}</code>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={() => createWebhook.mutate()} disabled={!webhookForm.url || webhookForm.events.length === 0 || createWebhook.isPending}>
                        {createWebhook.isPending ? 'Criando...' : 'Criar Webhook'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <Card>
                <CardContent className="pt-6">
                  {webhooksLoading ? (
                    <p className="text-center py-8 text-muted-foreground">Carregando...</p>
                  ) : webhooks.length === 0 ? (
                    <div className="py-12 text-center">
                      <Webhook className="w-8 h-8 mx-auto mb-3 text-muted-foreground/40" />
                      <p className="text-sm font-medium">Nenhum Webhook</p>
                      <p className="text-xs text-muted-foreground mt-1">Receba eventos em tempo real no seu sistema.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {webhooks.map((w: any) => (
                        <div key={w.id} className="flex items-center justify-between py-4 group">
                          <div className="min-w-0 flex-1">
                            <code className="text-xs text-foreground break-all">{w.url}</code>
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {(w.events || []).map((e: string) => (
                                <Badge key={e} variant="outline" className="text-[10px]">{e}</Badge>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 ml-4">
                            <Switch checked={w.is_active} onCheckedChange={checked => toggleWebhook.mutate({ id: w.id, is_active: checked })} />
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteWebhook.mutate(w.id)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Logs Tab */}
            <TabsContent value="logs">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold uppercase tracking-wider">Últimas Chamadas à API</CardTitle>
                </CardHeader>
                <CardContent>
                  {apiLogs.length === 0 ? (
                    <div className="py-12 text-center">
                      <Activity className="w-8 h-8 mx-auto mb-3 text-muted-foreground/40" />
                      <p className="text-sm font-medium">Sem registos</p>
                      <p className="text-xs text-muted-foreground mt-1">As chamadas à API aparecerão aqui.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {apiLogs.map((log: any) => (
                        <div key={log.id} className="flex items-center justify-between py-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <Badge variant={log.status_code < 400 ? 'default' : 'destructive'} className="text-[10px]">
                                {log.status_code || '—'}
                              </Badge>
                              <code className="text-xs font-medium">{log.method} /{log.endpoint}</code>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {new Date(log.created_at).toLocaleString('pt-MZ')}
                              {log.response_time_ms && ` · ${log.response_time_ms}ms`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </PermissionGate>
    </PlanGate>
  );
};

export default ApiKeysPage;
