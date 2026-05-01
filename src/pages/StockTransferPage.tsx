import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  Package, Send, CheckCircle, Clock, Plus, Trash2, ArrowRightLeft,
  AlertTriangle, Target, Trophy, ShieldAlert, BarChart3, Users, Eye
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface TransferItem {
  product_id: string;
  product_name: string;
  quantity: number;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING: { label: 'Pendente', color: 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30', icon: <Clock className="w-3 h-3" /> },
  CONFIRMED: { label: 'Confirmado', color: 'bg-green-500/20 text-green-700 border-green-500/30', icon: <CheckCircle className="w-3 h-3" /> },
  FORCED_CONFIRMED: { label: 'Forçado', color: 'bg-blue-500/20 text-blue-700 border-blue-500/30', icon: <CheckCircle className="w-3 h-3" /> },
};

// ─── Transfers Tab ──────────────────────────────────────────
function TransfersTab({ isAdmin, user, company, sellers, products }: any) {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSalesman, setSelectedSalesman] = useState('');
  const [items, setItems] = useState<TransferItem[]>([]);
  const [notes, setNotes] = useState('');

  const { data: transfers = [], isLoading } = useQuery({
    queryKey: ['stock-transfers', company?.id, filterStatus],
    queryFn: async () => {
      if (!company?.id) return [];
      let q = supabase
        .from('stock_transfers')
        .select('*, stock_transfer_items(*, products:product_id(name, code))')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });
      if (filterStatus !== 'all') q = q.eq('status', filterStatus);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!company?.id,
  });

  const salesmanIds = [...new Set(transfers.map((t: any) => t.to_salesman_id))];
  const { data: salesmanNames = {} } = useQuery({
    queryKey: ['salesman-names', salesmanIds.join(',')],
    queryFn: async () => {
      if (salesmanIds.length === 0) return {};
      const { data } = await supabase.from('profiles').select('id, full_name').in('id', salesmanIds);
      const map: Record<string, string> = {};
      (data || []).forEach((p: any) => { map[p.id] = p.full_name; });
      return map;
    },
    enabled: salesmanIds.length > 0,
  });

  const pendingCount = transfers.filter((t: any) => t.status === 'PENDING').length;

  const createTransfer = useMutation({
    mutationFn: async () => {
      if (!selectedSalesman || items.length === 0 || !company?.id || !user?.id) throw new Error('Preencha todos os campos');
      const { data: transfer, error: transferError } = await supabase
        .from('stock_transfers')
        .insert({ company_id: company.id, from_admin_id: user.id, to_salesman_id: selectedSalesman, notes, status: 'PENDING' })
        .select().single();
      if (transferError) throw transferError;
      const { error: itemsError } = await supabase
        .from('stock_transfer_items')
        .insert(items.map(item => ({ transfer_id: transfer.id, product_id: item.product_id, quantity: item.quantity })));
      if (itemsError) throw itemsError;
      return transfer;
    },
    onSuccess: () => {
      toast.success('Transferência criada');
      queryClient.invalidateQueries({ queryKey: ['stock-transfers'] });
      setDialogOpen(false); setSelectedSalesman(''); setItems([]); setNotes('');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const confirmTransfer = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.rpc('confirm_stock_transfer', { p_transfer_id: id });
      if (error) throw error;
      if (data && !(data as any).success) throw new Error((data as any).message);
    },
    onSuccess: () => { toast.success('Recebimento confirmado'); queryClient.invalidateQueries({ queryKey: ['stock-transfers'] }); },
    onError: (err: any) => toast.error(err.message),
  });

  const forceConfirm = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.rpc('force_confirm_stock_transfer', { p_transfer_id: id });
      if (error) throw error;
      if (data && !(data as any).success) throw new Error((data as any).message);
    },
    onSuccess: () => { toast.success('Confirmação forçada'); queryClient.invalidateQueries({ queryKey: ['stock-transfers'] }); },
    onError: (err: any) => toast.error(err.message),
  });

  const addItem = () => setItems([...items, { product_id: '', product_name: '', quantity: 1 }]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: keyof TransferItem, value: any) => {
    const updated = [...items];
    if (field === 'product_id') {
      const prod = products.find((p: any) => p.id === value);
      updated[idx] = { ...updated[idx], product_id: value, product_name: prod?.name || '' };
    } else {
      updated[idx] = { ...updated[idx], [field]: value };
    }
    setItems(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {pendingCount > 0 && <Badge variant="destructive" className="animate-pulse">{pendingCount} pendente{pendingCount > 1 ? 's' : ''}</Badge>}
        </div>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Send className="w-4 h-4 mr-1" /> Nova Transferência</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Criar Transferência de Stock</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Vendedor</label>
                  <Select value={selectedSalesman} onValueChange={setSelectedSalesman}>
                    <SelectTrigger><SelectValue placeholder="Selecione o vendedor" /></SelectTrigger>
                    <SelectContent>
                      {sellers.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>{s.full_name} ({s.email})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">Produtos</label>
                    <Button size="sm" variant="outline" onClick={addItem}><Plus className="w-3 h-3 mr-1" /> Adicionar</Button>
                  </div>
                  {items.map((item, idx) => (
                    <div key={idx} className="flex gap-2 mb-2 items-end">
                      <div className="flex-1">
                        <Select value={item.product_id} onValueChange={(v) => updateItem(idx, 'product_id', v)}>
                          <SelectTrigger><SelectValue placeholder="Produto" /></SelectTrigger>
                          <SelectContent>
                            {products.map((p: any) => (<SelectItem key={p.id} value={p.id}>{p.name} ({p.code})</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Input type="number" min={1} className="w-20" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)} />
                      <Button size="icon" variant="ghost" onClick={() => removeItem(idx)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  ))}
                  {items.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Clique "Adicionar" para incluir produtos</p>}
                </div>
                <div>
                  <label className="text-sm font-medium">Notas (opcional)</label>
                  <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observações..." />
                </div>
                <Button className="w-full" onClick={() => createTransfer.mutate()} disabled={!selectedSalesman || items.length === 0 || items.some(i => !i.product_id) || createTransfer.isPending}>
                  {createTransfer.isPending ? 'Enviando...' : 'Enviar Transferência'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        {['all', 'PENDING', 'CONFIRMED', 'FORCED_CONFIRMED'].map((s) => (
          <Button key={s} size="sm" variant={filterStatus === s ? 'default' : 'outline'} onClick={() => setFilterStatus(s)}>
            {s === 'all' ? 'Todos' : statusConfig[s]?.label || s}
          </Button>
        ))}
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">Carregando...</CardContent></Card>
        ) : transfers.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground"><Package className="w-10 h-10 mx-auto mb-2 opacity-50" />Nenhuma transferência</CardContent></Card>
        ) : transfers.map((transfer: any) => {
          const config = statusConfig[transfer.status] || statusConfig.PENDING;
          const isMine = transfer.to_salesman_id === user?.id;
          return (
            <Card key={transfer.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={config.color}>{config.icon}<span className="ml-1">{config.label}</span></Badge>
                    <span className="text-xs text-muted-foreground">{new Date(transfer.created_at).toLocaleDateString('pt-MZ', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="flex gap-2">
                    {transfer.status === 'PENDING' && isMine && (
                      <Button size="sm" onClick={() => confirmTransfer.mutate(transfer.id)} disabled={confirmTransfer.isPending}><CheckCircle className="w-3 h-3 mr-1" /> Confirmar</Button>
                    )}
                    {transfer.status === 'PENDING' && isAdmin && (
                      <Button size="sm" variant="outline" onClick={() => forceConfirm.mutate(transfer.id)} disabled={forceConfirm.isPending}>Forçar</Button>
                    )}
                  </div>
                </div>
                <CardTitle className="text-sm mt-1">Para: {(salesmanNames as any)[transfer.to_salesman_id] || 'Vendedor'}</CardTitle>
                {transfer.notes && <p className="text-xs text-muted-foreground">{transfer.notes}</p>}
              </CardHeader>
              <CardContent className="pt-0">
                <Table>
                  <TableHeader><TableRow><TableHead>Produto</TableHead><TableHead className="text-right">Qtd</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(transfer.stock_transfer_items || []).map((item: any) => (
                      <TableRow key={item.id}><TableCell className="text-sm">{item.products?.name || 'Produto'}</TableCell><TableCell className="text-right font-medium">{item.quantity}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── Salesman Stock Tab ─────────────────────────────────────
function SalesmanStockTab({ isAdmin, user, company, sellers }: any) {
  const [selectedSalesman, setSelectedSalesman] = useState(isAdmin ? '' : user?.id || '');

  const targetId = isAdmin ? selectedSalesman : user?.id;

  const { data: stock = [], isLoading } = useQuery({
    queryKey: ['salesman-stock', targetId],
    queryFn: async () => {
      if (!targetId) return [];
      const { data, error } = await supabase
        .from('salesman_stock')
        .select('*, products:product_id(name, code)')
        .eq('salesman_id', targetId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!targetId,
  });

  return (
    <div className="space-y-4">
      {isAdmin && (
        <Select value={selectedSalesman} onValueChange={setSelectedSalesman}>
          <SelectTrigger><SelectValue placeholder="Selecione o vendedor" /></SelectTrigger>
          <SelectContent>
            {sellers.map((s: any) => (<SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>))}
          </SelectContent>
        </Select>
      )}
      {isLoading ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Carregando...</CardContent></Card>
      ) : stock.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground"><Package className="w-10 h-10 mx-auto mb-2 opacity-50" />{targetId ? 'Nenhum stock atribuído' : 'Selecione um vendedor'}</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Produto</TableHead><TableHead>Código</TableHead><TableHead className="text-right">Qtd</TableHead></TableRow></TableHeader>
              <TableBody>
                {stock.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.products?.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{s.products?.code}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={s.quantity <= 5 ? 'destructive' : 'secondary'}>{s.quantity}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Reconciliation Tab ─────────────────────────────────────
function ReconciliationTab({ company, sellers }: any) {
  const queryClient = useQueryClient();
  const [selectedSalesman, setSelectedSalesman] = useState('');

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['stock-reconciliation', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data } = await supabase
        .from('stock_reconciliation')
        .select('*, products:product_id(name)')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
        .limit(100);
      return data || [];
    },
    enabled: !!company?.id,
  });

  const runReconciliation = useMutation({
    mutationFn: async () => {
      if (!selectedSalesman) throw new Error('Selecione um vendedor');
      const { data, error } = await supabase.rpc('run_stock_reconciliation', { p_salesman_id: selectedSalesman });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      toast.success(`Reconciliação concluída: ${data.reconciled} items, ${data.alerts} alertas`);
      queryClient.invalidateQueries({ queryKey: ['stock-reconciliation'] });
      queryClient.invalidateQueries({ queryKey: ['system-alerts'] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const statusBadge = (status: string) => {
    if (status === 'OK') return <Badge className="bg-emerald-500/20 text-emerald-700">OK</Badge>;
    if (status === 'WARNING') return <Badge className="bg-yellow-500/20 text-yellow-700">Aviso</Badge>;
    return <Badge variant="destructive">Crítico</Badge>;
  };

  // Get salesman names for display
  const salesmanIdsInRecords = [...new Set(records.map((r: any) => r.salesman_id))];
  const { data: recSalesmanNames = {} } = useQuery({
    queryKey: ['rec-salesman-names', salesmanIdsInRecords.join(',')],
    queryFn: async () => {
      if (salesmanIdsInRecords.length === 0) return {};
      const { data } = await supabase.from('profiles').select('id, full_name').in('id', salesmanIdsInRecords);
      const map: Record<string, string> = {};
      (data || []).forEach((p: any) => { map[p.id] = p.full_name; });
      return map;
    },
    enabled: salesmanIdsInRecords.length > 0,
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <Select value={selectedSalesman} onValueChange={setSelectedSalesman}>
            <SelectTrigger><SelectValue placeholder="Selecione o vendedor" /></SelectTrigger>
            <SelectContent>
              {sellers.map((s: any) => (<SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => runReconciliation.mutate()} disabled={!selectedSalesman || runReconciliation.isPending}>
          <ShieldAlert className="w-4 h-4 mr-1" />
          {runReconciliation.isPending ? 'Verificando...' : 'Executar Reconciliação'}
        </Button>
      </div>

      {isLoading ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Carregando...</CardContent></Card>
      ) : records.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground"><ShieldAlert className="w-10 h-10 mx-auto mb-2 opacity-50" />Nenhuma reconciliação executada</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Esperado</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-right">Diff</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">{(recSalesmanNames as any)[r.salesman_id] || '—'}</TableCell>
                    <TableCell className="text-sm">{r.products?.name || '—'}</TableCell>
                    <TableCell className="text-right">{r.expected_stock}</TableCell>
                    <TableCell className="text-right">{r.actual_stock}</TableCell>
                    <TableCell className={`text-right font-bold ${r.difference !== 0 ? 'text-destructive' : ''}`}>{r.difference}</TableCell>
                    <TableCell>{statusBadge(r.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Targets & Ranking Tab ──────────────────────────────────
function TargetsTab({ company, sellers, isAdmin }: any) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [targetSalesman, setTargetSalesman] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');

  const { data: targets = [] } = useQuery({
    queryKey: ['sales-targets', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data } = await supabase
        .from('sales_targets')
        .select('*')
        .eq('company_id', company.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!company?.id,
  });

  const sellerMap = Object.fromEntries(sellers.map((s: any) => [s.id, s.full_name]));

  const createTarget = useMutation({
    mutationFn: async () => {
      if (!company?.id || !targetSalesman || !targetAmount || !periodStart || !periodEnd) throw new Error('Preencha todos os campos');
      const { error } = await supabase.from('sales_targets').insert({
        company_id: company.id, salesman_id: targetSalesman,
        target_amount: parseFloat(targetAmount), period_start: periodStart, period_end: periodEnd,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Meta criada');
      queryClient.invalidateQueries({ queryKey: ['sales-targets'] });
      setDialogOpen(false); setTargetSalesman(''); setTargetAmount(''); setPeriodStart(''); setPeriodEnd('');
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex justify-end">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button size="sm"><Target className="w-4 h-4 mr-1" /> Nova Meta</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Definir Meta de Vendas</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Select value={targetSalesman} onValueChange={setTargetSalesman}>
                  <SelectTrigger><SelectValue placeholder="Vendedor" /></SelectTrigger>
                  <SelectContent>{sellers.map((s: any) => (<SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>))}</SelectContent>
                </Select>
                <Input type="number" placeholder="Valor da meta (MT)" value={targetAmount} onChange={e => setTargetAmount(e.target.value)} />
                <div className="grid grid-cols-2 gap-2">
                  <Input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} />
                  <Input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} />
                </div>
                <Button className="w-full" onClick={() => createTarget.mutate()} disabled={createTarget.isPending}>
                  {createTarget.isPending ? 'Salvando...' : 'Criar Meta'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {targets.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground"><Target className="w-10 h-10 mx-auto mb-2 opacity-50" />Nenhuma meta definida</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {targets.map((t: any, idx: number) => {
            const progress = t.target_amount > 0 ? Math.min(100, (t.current_amount / t.target_amount) * 100) : 0;
            return (
              <Card key={t.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {idx === 0 && <Trophy className="w-4 h-4 text-yellow-500" />}
                      <span className="font-medium text-sm">{sellerMap[t.salesman_id] || 'Vendedor'}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(t.period_start).toLocaleDateString('pt-MZ')} — {new Date(t.period_end).toLocaleDateString('pt-MZ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Progress value={progress} className="flex-1" />
                    <span className="text-sm font-bold tabular-nums">{progress.toFixed(0)}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {Number(t.current_amount).toLocaleString('pt-MZ')} / {Number(t.target_amount).toLocaleString('pt-MZ')} MT
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Alerts Tab ─────────────────────────────────────────────
function AlertsTab({ company }: any) {
  const queryClient = useQueryClient();

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['system-alerts', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data } = await supabase
        .from('system_alerts')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!company?.id,
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('system_alerts').update({ status: 'READ' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['system-alerts'] }),
  });

  const typeIcon = (type: string) => {
    if (type === 'FRAUD_ALERT') return <ShieldAlert className="w-4 h-4 text-destructive" />;
    if (type === 'LOW_STOCK') return <Package className="w-4 h-4 text-yellow-600" />;
    return <AlertTriangle className="w-4 h-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-3">
      {isLoading ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Carregando...</CardContent></Card>
      ) : alerts.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground"><CheckCircle className="w-10 h-10 mx-auto mb-2 text-emerald-500 opacity-60" />Nenhum alerta — sistema saudável</CardContent></Card>
      ) : alerts.map((a: any) => (
        <Card key={a.id} className={a.status === 'UNREAD' ? 'border-l-4 border-l-destructive' : 'opacity-70'}>
          <CardContent className="p-4 flex items-start gap-3">
            {typeIcon(a.type)}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{a.message}</p>
              <p className="text-xs text-muted-foreground mt-1">{new Date(a.created_at).toLocaleString('pt-MZ')}</p>
            </div>
            {a.status === 'UNREAD' && (
              <Button size="sm" variant="ghost" onClick={() => markRead.mutate(a.id)}>
                <Eye className="w-3 h-3" />
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────
export default function StockTransferPage() {
  const { user, company, role } = useAuth();
  const isAdmin = role === 'admin' || role === 'ceo' || role === 'manager';

  const { data: sellers = [] } = useQuery({
    queryKey: ['sellers-for-transfer', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data } = await supabase.from('profiles').select('id, full_name, email').eq('company_id', company.id).eq('is_active', true);
      return data || [];
    },
    enabled: !!company?.id,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products-for-transfer'],
    queryFn: async () => {
      const { data } = await supabase.from('products').select('id, name, code').eq('is_active', true).order('name');
      return data || [];
    },
  });

  // Unread alerts count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unread-alerts-count', company?.id],
    queryFn: async () => {
      if (!company?.id) return 0;
      const { count } = await supabase
        .from('system_alerts')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', company.id)
        .eq('status', 'UNREAD');
      return count || 0;
    },
    enabled: isAdmin && !!company?.id,
  });

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-3">
        <ArrowRightLeft className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-xl font-bold">{isAdmin ? 'Controle de Stock Elite+' : 'Meu Stock'}</h1>
          <p className="text-sm text-muted-foreground">{isAdmin ? 'Transferências, reconciliação e metas' : 'Stock recebido e transferências'}</p>
        </div>
      </div>

      <Tabs defaultValue="transfers">
        <TabsList className="w-full grid grid-cols-5">
          <TabsTrigger value="transfers" className="text-xs gap-1"><Send className="w-3 h-3" /><span className="hidden sm:inline">Transferências</span></TabsTrigger>
          <TabsTrigger value="stock" className="text-xs gap-1"><Package className="w-3 h-3" /><span className="hidden sm:inline">Stock</span></TabsTrigger>
          {isAdmin && <TabsTrigger value="reconciliation" className="text-xs gap-1"><ShieldAlert className="w-3 h-3" /><span className="hidden sm:inline">Auditoria</span></TabsTrigger>}
          {isAdmin && <TabsTrigger value="targets" className="text-xs gap-1"><Target className="w-3 h-3" /><span className="hidden sm:inline">Metas</span></TabsTrigger>}
          {isAdmin && (
            <TabsTrigger value="alerts" className="text-xs gap-1 relative">
              <AlertTriangle className="w-3 h-3" /><span className="hidden sm:inline">Alertas</span>
              {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-[10px] text-white flex items-center justify-center">{unreadCount}</span>}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="transfers"><TransfersTab isAdmin={isAdmin} user={user} company={company} sellers={sellers} products={products} /></TabsContent>
        <TabsContent value="stock"><SalesmanStockTab isAdmin={isAdmin} user={user} company={company} sellers={sellers} /></TabsContent>
        {isAdmin && <TabsContent value="reconciliation"><ReconciliationTab company={company} sellers={sellers} /></TabsContent>}
        {isAdmin && <TabsContent value="targets"><TargetsTab company={company} sellers={sellers} isAdmin={isAdmin} /></TabsContent>}
        {isAdmin && <TabsContent value="alerts"><AlertsTab company={company} /></TabsContent>}
      </Tabs>
    </div>
  );
}
