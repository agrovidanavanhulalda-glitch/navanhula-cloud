import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/SaaSAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/formatters';
import {
  Bird, Plus, TrendingUp, AlertTriangle, Egg, Package,
  BarChart3, RefreshCw, DollarSign, Skull, Pencil, Trash2
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts';

interface Batch {
  id: string;
  company_id: string;
  store_id: string | null;
  batch_name: string;
  initial_quantity: number;
  current_quantity: number;
  mortality: number;
  avg_weight: number;
  start_date: string;
  expected_slaughter_date: string | null;
  total_cost: number;
  status: string;
  created_at: string;
}

interface Feed {
  id: string;
  batch_id: string;
  feed_type: string;
  daily_consumption: number;
  total_cost: number;
  supplier: string | null;
  usage_date: string;
}

interface Production {
  id: string;
  batch_id: string;
  chickens_sold: number;
  eggs_produced: number;
  revenue: number;
  profit: number;
  production_date: string;
}

const statusLabels: Record<string, string> = {
  active: 'Ativo', slaughtered: 'Abatido', sold: 'Vendido', lost: 'Perdido',
};
const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800', slaughtered: 'bg-amber-100 text-amber-800',
  sold: 'bg-blue-100 text-blue-800', lost: 'bg-red-100 text-red-800',
};

const PoultryPage: React.FC = () => {
  const { company, store } = useAuth();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [productions, setProductions] = useState<Production[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewBatch, setShowNewBatch] = useState(false);
  const [showNewFeed, setShowNewFeed] = useState(false);
  const [showNewProd, setShowNewProd] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; id: string; name: string } | null>(null);

  const [newBatch, setNewBatch] = useState({
    batch_name: '', initial_quantity: '', start_date: new Date().toISOString().split('T')[0],
    expected_slaughter_date: '', total_cost: '',
  });
  const [newFeed, setNewFeed] = useState({
    batch_id: '', feed_type: 'starter', daily_consumption: '', total_cost: '', supplier: '',
    usage_date: new Date().toISOString().split('T')[0],
  });
  const [newProd, setNewProd] = useState({
    batch_id: '', chickens_sold: '', eggs_produced: '', revenue: '', profit: '',
    production_date: new Date().toISOString().split('T')[0],
  });

  const fetchData = useCallback(async () => {
    if (!company?.id) return;
    setLoading(true);
    try {
      const [bRes, fRes, pRes] = await Promise.all([
        supabase.from('poultry_batches').select('*').eq('company_id', company.id).order('created_at', { ascending: false }),
        supabase.from('poultry_feed').select('*').order('created_at', { ascending: false }),
        supabase.from('poultry_production').select('*').order('created_at', { ascending: false }),
      ]);
      if (bRes.data) setBatches(bRes.data as unknown as Batch[]);
      if (fRes.data) setFeeds(fRes.data as unknown as Feed[]);
      if (pRes.data) setProductions(pRes.data as unknown as Production[]);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [company?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreateBatch = async () => {
    if (!newBatch.batch_name || !newBatch.initial_quantity) {
      toast.error('Preencha nome e quantidade inicial'); return;
    }
    const qty = Number(newBatch.initial_quantity);
    const { error } = await supabase.from('poultry_batches').insert({
      company_id: company?.id,
      store_id: store?.id,
      batch_name: newBatch.batch_name,
      initial_quantity: qty,
      current_quantity: qty,
      start_date: newBatch.start_date,
      expected_slaughter_date: newBatch.expected_slaughter_date || null,
      total_cost: Number(newBatch.total_cost) || 0,
      created_by: (await supabase.auth.getUser()).data.user?.id,
    } as any);
    if (error) { toast.error('Erro ao criar lote'); console.error(error); return; }
    toast.success('Lote criado com sucesso!');
    setShowNewBatch(false);
    setNewBatch({ batch_name: '', initial_quantity: '', start_date: new Date().toISOString().split('T')[0], expected_slaughter_date: '', total_cost: '' });
    fetchData();
  };

  // Edit batch
  const handleOpenEdit = (batch: Batch) => {
    setEditingBatch(batch);
    setNewBatch({
      batch_name: batch.batch_name,
      initial_quantity: String(batch.initial_quantity),
      start_date: batch.start_date,
      expected_slaughter_date: batch.expected_slaughter_date || '',
      total_cost: String(batch.total_cost),
    });
    setShowNewBatch(true);
  };

  const handleSaveBatch = async () => {
    if (editingBatch) {
      const newInitial = Number(newBatch.initial_quantity);
      const oldInitial = editingBatch.initial_quantity;
      const qtyDiff = newInitial - oldInitial;
      const newCurrent = Math.max(0, editingBatch.current_quantity + qtyDiff);

      // Log audit
      await supabase.from('audit_logs').insert({
        action: 'update',
        table_name: 'poultry_batches',
        record_id: editingBatch.id,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        old_data: { initial_quantity: oldInitial, total_cost: editingBatch.total_cost, batch_name: editingBatch.batch_name },
        new_data: { initial_quantity: newInitial, total_cost: Number(newBatch.total_cost), batch_name: newBatch.batch_name },
      } as any);

      const { error } = await supabase.from('poultry_batches').update({
        batch_name: newBatch.batch_name,
        initial_quantity: newInitial,
        current_quantity: newCurrent,
        start_date: newBatch.start_date,
        expected_slaughter_date: newBatch.expected_slaughter_date || null,
        total_cost: Number(newBatch.total_cost) || 0,
      } as any).eq('id', editingBatch.id);

      if (error) { toast.error('Erro ao atualizar lote'); return; }
      toast.success('Lote atualizado com sucesso!');
    } else {
      await handleCreateBatch();
      return;
    }
    setShowNewBatch(false);
    setEditingBatch(null);
    setNewBatch({ batch_name: '', initial_quantity: '', start_date: new Date().toISOString().split('T')[0], expected_slaughter_date: '', total_cost: '' });
    fetchData();
  };

  // Delete with confirmation
  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    const { type, id } = deleteConfirm;

    // Log audit
    await supabase.from('audit_logs').insert({
      action: 'delete',
      table_name: type === 'batch' ? 'poultry_batches' : type === 'feed' ? 'poultry_feed' : 'poultry_production',
      record_id: id,
      user_id: (await supabase.auth.getUser()).data.user?.id,
    } as any);

    let error;
    if (type === 'batch') {
      // Delete related records first
      await supabase.from('poultry_feed').delete().eq('batch_id', id);
      await supabase.from('poultry_production').delete().eq('batch_id', id);
      ({ error } = await supabase.from('poultry_batches').delete().eq('id', id));
    } else if (type === 'feed') {
      ({ error } = await supabase.from('poultry_feed').delete().eq('id', id));
    } else {
      ({ error } = await supabase.from('poultry_production').delete().eq('id', id));
    }

    if (error) { toast.error('Erro ao excluir'); console.error(error); }
    else toast.success('Registro excluído com sucesso');
    setDeleteConfirm(null);
    fetchData();
  };

  const handleCreateFeed = async () => {
    if (!newFeed.batch_id) { toast.error('Selecione o lote'); return; }
    const { error } = await supabase.from('poultry_feed').insert({
      batch_id: newFeed.batch_id,
      feed_type: newFeed.feed_type,
      daily_consumption: Number(newFeed.daily_consumption) || 0,
      total_cost: Number(newFeed.total_cost) || 0,
      supplier: newFeed.supplier || null,
      usage_date: newFeed.usage_date,
    } as any);
    if (error) { toast.error('Erro ao registar ração'); console.error(error); return; }
    const feedCost = Number(newFeed.total_cost) || 0;
    if (feedCost > 0) {
      const batch = batches.find(b => b.id === newFeed.batch_id);
      if (batch) {
        await supabase.from('poultry_batches').update({ total_cost: batch.total_cost + feedCost } as any).eq('id', newFeed.batch_id);
      }
    }
    toast.success('Ração registada!');
    setShowNewFeed(false);
    setNewFeed({ batch_id: '', feed_type: 'starter', daily_consumption: '', total_cost: '', supplier: '', usage_date: new Date().toISOString().split('T')[0] });
    fetchData();
  };

  const handleCreateProduction = async () => {
    if (!newProd.batch_id) { toast.error('Selecione o lote'); return; }
    const { error } = await supabase.from('poultry_production').insert({
      batch_id: newProd.batch_id,
      chickens_sold: Number(newProd.chickens_sold) || 0,
      eggs_produced: Number(newProd.eggs_produced) || 0,
      revenue: Number(newProd.revenue) || 0,
      profit: Number(newProd.profit) || 0,
      production_date: newProd.production_date,
    } as any);
    if (error) { toast.error('Erro ao registar produção'); console.error(error); return; }
    const sold = Number(newProd.chickens_sold) || 0;
    if (sold > 0) {
      const batch = batches.find(b => b.id === newProd.batch_id);
      if (batch) {
        await supabase.from('poultry_batches').update({
          current_quantity: Math.max(0, batch.current_quantity - sold),
        } as any).eq('id', newProd.batch_id);
      }
    }
    toast.success('Produção registada!');
    setShowNewProd(false);
    setNewProd({ batch_id: '', chickens_sold: '', eggs_produced: '', revenue: '', profit: '', production_date: new Date().toISOString().split('T')[0] });
    fetchData();
  };

  const handleMortality = async (batchId: string) => {
    const qty = prompt('Quantidade de mortes:');
    if (!qty) return;
    const batch = batches.find(b => b.id === batchId);
    if (!batch) return;
    const newMortality = (batch.mortality || 0) + Number(qty);
    const newCurrent = Math.max(0, batch.current_quantity - Number(qty));
    
    await supabase.from('audit_logs').insert({
      action: 'mortality',
      table_name: 'poultry_batches',
      record_id: batchId,
      user_id: (await supabase.auth.getUser()).data.user?.id,
      old_data: { mortality: batch.mortality, current_quantity: batch.current_quantity },
      new_data: { mortality: newMortality, current_quantity: newCurrent },
    } as any);

    await supabase.from('poultry_batches').update({
      mortality: newMortality,
      current_quantity: newCurrent,
    } as any).eq('id', batchId);
    toast.success('Mortalidade registada');
    fetchData();
  };

  // KPIs
  const totalBatches = batches.length;
  const activeBatches = batches.filter(b => b.status === 'active').length;
  const totalBirds = batches.reduce((s, b) => s + b.current_quantity, 0);
  const totalMortality = batches.reduce((s, b) => s + (b.mortality || 0), 0);
  const totalRevenue = productions.reduce((s, p) => s + Number(p.revenue || 0), 0);
  const totalEggs = productions.reduce((s, p) => s + (p.eggs_produced || 0), 0);

  const revenueByBatch = batches.map(b => {
    const prods = productions.filter(p => p.batch_id === b.id);
    return {
      name: b.batch_name,
      receita: prods.reduce((s, p) => s + Number(p.revenue || 0), 0),
      custo: Number(b.total_cost || 0),
    };
  }).filter(d => d.receita > 0 || d.custo > 0);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Bird className="w-7 h-7 text-amber-600" /> Módulo Avicultura
          </h1>
          <p className="text-muted-foreground">Gestão de lotes, ração e produção avícola</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Atualizar
          </Button>
          <Dialog open={showNewFeed} onOpenChange={setShowNewFeed}>
            <DialogTrigger asChild><Button variant="outline"><Package className="w-4 h-4 mr-2" /> Ração</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Registar Ração</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Lote</Label>
                  <Select value={newFeed.batch_id} onValueChange={v => setNewFeed(p => ({ ...p, batch_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{batches.filter(b => b.status === 'active').map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.batch_name}</SelectItem>
                    ))}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select value={newFeed.feed_type} onValueChange={v => setNewFeed(p => ({ ...p, feed_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="starter">Inicial</SelectItem>
                      <SelectItem value="grower">Crescimento</SelectItem>
                      <SelectItem value="finisher">Acabamento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Consumo Diário (kg)</Label><Input type="number" value={newFeed.daily_consumption} onChange={e => setNewFeed(p => ({ ...p, daily_consumption: e.target.value }))} /></div>
                  <div><Label>Custo (MZN)</Label><Input type="number" value={newFeed.total_cost} onChange={e => setNewFeed(p => ({ ...p, total_cost: e.target.value }))} /></div>
                </div>
                <div><Label>Fornecedor</Label><Input value={newFeed.supplier} onChange={e => setNewFeed(p => ({ ...p, supplier: e.target.value }))} /></div>
                <Button className="w-full" onClick={handleCreateFeed}>Registar</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={showNewProd} onOpenChange={setShowNewProd}>
            <DialogTrigger asChild><Button variant="outline"><Egg className="w-4 h-4 mr-2" /> Produção</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Registar Produção</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Lote</Label>
                  <Select value={newProd.batch_id} onValueChange={v => setNewProd(p => ({ ...p, batch_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{batches.map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.batch_name}</SelectItem>
                    ))}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Frangos Vendidos</Label><Input type="number" value={newProd.chickens_sold} onChange={e => setNewProd(p => ({ ...p, chickens_sold: e.target.value }))} /></div>
                  <div><Label>Ovos Produzidos</Label><Input type="number" value={newProd.eggs_produced} onChange={e => setNewProd(p => ({ ...p, eggs_produced: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Receita (MZN)</Label><Input type="number" value={newProd.revenue} onChange={e => setNewProd(p => ({ ...p, revenue: e.target.value }))} /></div>
                  <div><Label>Lucro (MZN)</Label><Input type="number" value={newProd.profit} onChange={e => setNewProd(p => ({ ...p, profit: e.target.value }))} /></div>
                </div>
                <div><Label>Data</Label><Input type="date" value={newProd.production_date} onChange={e => setNewProd(p => ({ ...p, production_date: e.target.value }))} /></div>
                <Button className="w-full" onClick={handleCreateProduction}>Registar</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={showNewBatch} onOpenChange={(open) => {
            setShowNewBatch(open);
            if (!open) {
              setEditingBatch(null);
              setNewBatch({ batch_name: '', initial_quantity: '', start_date: new Date().toISOString().split('T')[0], expected_slaughter_date: '', total_cost: '' });
            }
          }}>
            <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" /> Novo Lote</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editingBatch ? 'Editar Lote' : 'Criar Lote de Aves'}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Nome do Lote</Label><Input value={newBatch.batch_name} onChange={e => setNewBatch(p => ({ ...p, batch_name: e.target.value }))} placeholder="Ex: Lote Fev 2026" /></div>
                <div><Label>Quantidade Inicial</Label><Input type="number" value={newBatch.initial_quantity} onChange={e => setNewBatch(p => ({ ...p, initial_quantity: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Data Início</Label><Input type="date" value={newBatch.start_date} onChange={e => setNewBatch(p => ({ ...p, start_date: e.target.value }))} /></div>
                  <div><Label>Previsão Abate</Label><Input type="date" value={newBatch.expected_slaughter_date} onChange={e => setNewBatch(p => ({ ...p, expected_slaughter_date: e.target.value }))} /></div>
                </div>
                <div><Label>Custo Inicial (MZN)</Label><Input type="number" value={newBatch.total_cost} onChange={e => setNewBatch(p => ({ ...p, total_cost: e.target.value }))} /></div>
                <Button className="w-full" onClick={handleSaveBatch}>{editingBatch ? 'Salvar Alterações' : 'Criar Lote'}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { icon: Bird, label: 'Lotes', value: totalBatches },
          { icon: Bird, label: 'Ativos', value: activeBatches, color: 'text-green-600' },
          { icon: Bird, label: 'Aves Vivas', value: totalBirds },
          { icon: Skull, label: 'Mortalidade', value: totalMortality, color: 'text-destructive' },
          { icon: Egg, label: 'Ovos Total', value: totalEggs },
          { icon: DollarSign, label: 'Receita', value: formatCurrency(totalRevenue), color: 'text-green-600' },
        ].map((kpi, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs"><kpi.icon className="w-4 h-4" />{kpi.label}</div>
            <p className={`text-xl font-bold mt-1 ${kpi.color || ''}`}>{kpi.value}</p>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="batches">
        <TabsList>
          <TabsTrigger value="batches">Lotes</TabsTrigger>
          <TabsTrigger value="feed">Ração</TabsTrigger>
          <TabsTrigger value="production">Produção</TabsTrigger>
          <TabsTrigger value="reports">Relatórios</TabsTrigger>
        </TabsList>

        <TabsContent value="batches" className="space-y-4 mt-4">
          {batches.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">Nenhum lote registado.</Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {batches.map(batch => {
                const mortalityRate = batch.initial_quantity > 0 ? ((batch.mortality || 0) / batch.initial_quantity * 100).toFixed(1) : '0';
                return (
                  <Card key={batch.id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-lg">{batch.batch_name}</h3>
                      <div className="flex items-center gap-2">
                        <Badge className={statusColors[batch.status] || 'bg-muted'}>{statusLabels[batch.status] || batch.status}</Badge>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleOpenEdit(batch)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteConfirm({ type: 'batch', id: batch.id, name: batch.batch_name })}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-muted-foreground">Inicial:</span> {batch.initial_quantity}</div>
                      <div><span className="text-muted-foreground">Atual:</span> {batch.current_quantity}</div>
                      <div><span className="text-muted-foreground">Mortalidade:</span> <span className={Number(mortalityRate) > 5 ? 'text-destructive font-bold' : ''}>{mortalityRate}%</span></div>
                      <div><span className="text-muted-foreground">Custo:</span> {formatCurrency(batch.total_cost)}</div>
                    </div>
                    {batch.status === 'active' && (
                      <Button size="sm" variant="outline" className="w-full" onClick={() => handleMortality(batch.id)}>
                        <Skull className="w-4 h-4 mr-2" /> Registar Mortalidade
                      </Button>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="feed" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Histórico de Ração</CardTitle></CardHeader>
            <CardContent>
              {feeds.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhum registo de ração</p>
              ) : (
                <div className="space-y-2">
                  {feeds.map(f => {
                    const batch = batches.find(b => b.id === f.batch_id);
                    return (
                      <div key={f.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <div>
                          <p className="font-medium text-sm">{f.feed_type === 'starter' ? 'Inicial' : f.feed_type === 'grower' ? 'Crescimento' : 'Acabamento'}</p>
                          <p className="text-xs text-muted-foreground">{batch?.batch_name || '—'} · {f.supplier || 'Sem fornecedor'}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="font-bold text-sm">{formatCurrency(f.total_cost)}</p>
                            <p className="text-xs text-muted-foreground">{f.daily_consumption} kg/dia</p>
                          </div>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteConfirm({ type: 'feed', id: f.id, name: `Ração - ${batch?.batch_name || ''}` })}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="production" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Registos de Produção</CardTitle></CardHeader>
            <CardContent>
              {productions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhum registo de produção</p>
              ) : (
                <div className="space-y-2">
                  {productions.map(p => {
                    const batch = batches.find(b => b.id === p.batch_id);
                    return (
                      <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <div>
                          <p className="font-medium text-sm">{batch?.batch_name || '—'}</p>
                          <p className="text-xs text-muted-foreground">
                            {p.chickens_sold} frangos · {p.eggs_produced} ovos · {new Date(p.production_date).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="font-bold text-sm">{formatCurrency(p.revenue)}</p>
                            <p className="text-xs text-green-600">Lucro: {formatCurrency(p.profit)}</p>
                          </div>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteConfirm({ type: 'production', id: p.id, name: `Produção - ${batch?.batch_name || ''}` })}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Receita vs Custo por Lote</CardTitle></CardHeader>
            <CardContent>
              {revenueByBatch.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={revenueByBatch}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Bar dataKey="receita" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} name="Receita" />
                    <Bar dataKey="custo" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} name="Custo" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-8">Sem dados suficientes</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Tem certeza que deseja excluir <strong>"{deleteConfirm?.name}"</strong>? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PoultryPage;
