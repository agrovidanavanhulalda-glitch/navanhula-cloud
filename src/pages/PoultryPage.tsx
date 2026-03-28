import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/SaaSAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
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
  Bird, Plus, RefreshCw, DollarSign, Skull, Pencil, Trash2, Egg,
  Package, ClipboardList, BarChart3, TrendingUp
} from 'lucide-react';
import PoultryInputsManager, { type PoultryInput } from '@/components/poultry/PoultryInputsManager';
import PoultryOperationalCosts, { type OperationalCost } from '@/components/poultry/PoultryOperationalCosts';
import PoultryDailyRecords, { type DailyRecord } from '@/components/poultry/PoultryDailyRecords';
import PoultryFinancialTab from '@/components/poultry/PoultryFinancialTab';

interface Batch {
  id: string;
  company_id: string;
  store_id: string | null;
  batch_name: string;
  initial_quantity: number;
  current_quantity: number;
  mortality: number;
  avg_weight: number | null;
  start_date: string;
  expected_slaughter_date: string | null;
  total_cost: number;
  status: string;
  created_at: string;
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
  const [productions, setProductions] = useState<Production[]>([]);
  const [inputs, setInputs] = useState<PoultryInput[]>([]);
  const [opCosts, setOpCosts] = useState<OperationalCost[]>([]);
  const [dailyRecords, setDailyRecords] = useState<DailyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewBatch, setShowNewBatch] = useState(false);
  const [showNewProd, setShowNewProd] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; id: string; name: string } | null>(null);

  const [newBatch, setNewBatch] = useState({
    batch_name: '', initial_quantity: '', start_date: new Date().toISOString().split('T')[0],
    expected_slaughter_date: '', total_cost: '',
  });
  const [newProd, setNewProd] = useState({
    batch_id: '', chickens_sold: '', eggs_produced: '', revenue: '', profit: '',
    production_date: new Date().toISOString().split('T')[0],
  });

  const fetchData = useCallback(async () => {
    if (!company?.id) return;
    setLoading(true);
    try {
      const [bRes, pRes, iRes, cRes, dRes] = await Promise.all([
        supabase.from('poultry_batches').select('*').eq('company_id', company.id).order('created_at', { ascending: false }),
        supabase.from('poultry_production').select('*').order('created_at', { ascending: false }),
        supabase.from('poultry_inputs').select('*').eq('company_id', company.id).order('created_at', { ascending: false }),
        supabase.from('poultry_operational_costs').select('*').eq('company_id', company.id).order('created_at', { ascending: false }),
        supabase.from('poultry_daily_records').select('*').eq('company_id', company.id).order('record_date', { ascending: false }),
      ]);
      if (bRes.data) setBatches(bRes.data as unknown as Batch[]);
      if (pRes.data) setProductions(pRes.data as unknown as Production[]);
      if (iRes.data) setInputs(iRes.data as unknown as PoultryInput[]);
      if (cRes.data) setOpCosts(cRes.data as unknown as OperationalCost[]);
      if (dRes.data) setDailyRecords(dRes.data as unknown as DailyRecord[]);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [company?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSaveBatch = async () => {
    if (!newBatch.batch_name || !newBatch.initial_quantity) {
      toast.error('Preencha nome e quantidade inicial'); return;
    }
    const qty = Number(newBatch.initial_quantity);
    if (editingBatch) {
      const qtyDiff = qty - editingBatch.initial_quantity;
      const newCurrent = Math.max(0, editingBatch.current_quantity + qtyDiff);
      await supabase.from('audit_logs').insert({
        action: 'update', table_name: 'poultry_batches', record_id: editingBatch.id,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        old_data: { initial_quantity: editingBatch.initial_quantity, total_cost: editingBatch.total_cost },
        new_data: { initial_quantity: qty, total_cost: Number(newBatch.total_cost) },
      } as any);
      const { error } = await supabase.from('poultry_batches').update({
        batch_name: newBatch.batch_name, initial_quantity: qty, current_quantity: newCurrent,
        start_date: newBatch.start_date, expected_slaughter_date: newBatch.expected_slaughter_date || null,
        total_cost: Number(newBatch.total_cost) || 0,
      } as any).eq('id', editingBatch.id);
      if (error) { toast.error('Erro ao atualizar'); return; }
      toast.success('Lote atualizado!');
    } else {
      const { error } = await supabase.from('poultry_batches').insert({
        company_id: company?.id, store_id: store?.id, batch_name: newBatch.batch_name,
        initial_quantity: qty, current_quantity: qty, start_date: newBatch.start_date,
        expected_slaughter_date: newBatch.expected_slaughter_date || null,
        total_cost: Number(newBatch.total_cost) || 0,
        created_by: (await supabase.auth.getUser()).data.user?.id,
      } as any);
      if (error) { toast.error('Erro ao criar lote'); return; }
      toast.success('Lote criado!');
    }
    setShowNewBatch(false); setEditingBatch(null);
    setNewBatch({ batch_name: '', initial_quantity: '', start_date: new Date().toISOString().split('T')[0], expected_slaughter_date: '', total_cost: '' });
    fetchData();
  };

  const handleCreateProduction = async () => {
    if (!newProd.batch_id) { toast.error('Selecione o lote'); return; }
    const { error } = await supabase.from('poultry_production').insert({
      batch_id: newProd.batch_id, chickens_sold: Number(newProd.chickens_sold) || 0,
      eggs_produced: Number(newProd.eggs_produced) || 0, revenue: Number(newProd.revenue) || 0,
      profit: Number(newProd.profit) || 0, production_date: newProd.production_date,
    } as any);
    if (error) { toast.error('Erro ao registar produção'); return; }
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

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    const { type, id } = deleteConfirm;
    await supabase.from('audit_logs').insert({
      action: 'delete', table_name: type === 'batch' ? 'poultry_batches' : 'poultry_production',
      record_id: id, user_id: (await supabase.auth.getUser()).data.user?.id,
    } as any);
    if (type === 'batch') {
      await supabase.from('poultry_feed').delete().eq('batch_id', id);
      await supabase.from('poultry_production').delete().eq('batch_id', id);
      await supabase.from('poultry_inputs').delete().eq('batch_id', id);
      await supabase.from('poultry_operational_costs').delete().eq('batch_id', id);
      await supabase.from('poultry_daily_records').delete().eq('batch_id', id);
      await supabase.from('poultry_batches').delete().eq('id', id);
    } else {
      await supabase.from('poultry_production').delete().eq('id', id);
    }
    toast.success('Registro excluído');
    setDeleteConfirm(null);
    fetchData();
  };

  // KPIs
  const activeBatches = batches.filter(b => b.status === 'active').length;
  const totalBirds = batches.reduce((s, b) => s + b.current_quantity, 0);
  const totalMortality = batches.reduce((s, b) => s + (b.mortality || 0), 0);
  const totalRevenue = productions.reduce((s, p) => s + Number(p.revenue || 0), 0);
  const totalEggs = productions.reduce((s, p) => s + (p.eggs_produced || 0), 0);
  const totalCost = batches.reduce((s, b) => s + Number(b.total_cost || 0), 0);
  const lowStockInputs = inputs.filter(i => i.balance <= i.low_stock_threshold);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Bird className="w-7 h-7 text-amber-600" /> Módulo Avicultura PRO
          </h1>
          <p className="text-muted-foreground">Gestão completa de lotes, insumos, produção e financeiro</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Atualizar
          </Button>
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
          <Dialog open={showNewBatch} onOpenChange={open => {
            setShowNewBatch(open);
            if (!open) { setEditingBatch(null); setNewBatch({ batch_name: '', initial_quantity: '', start_date: new Date().toISOString().split('T')[0], expected_slaughter_date: '', total_cost: '' }); }
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
                <Button className="w-full" onClick={handleSaveBatch}>{editingBatch ? 'Salvar' : 'Criar Lote'}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Alerts */}
      {lowStockInputs.length > 0 && (
        <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
          <p className="text-sm font-medium text-amber-700">⚠️ {lowStockInputs.length} insumo(s) com stock baixo ou esgotado</p>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { icon: Bird, label: 'Lotes Ativos', value: activeBatches, color: 'text-green-600' },
          { icon: Bird, label: 'Aves Vivas', value: totalBirds },
          { icon: Skull, label: 'Mortalidade', value: totalMortality, color: 'text-destructive' },
          { icon: Egg, label: 'Ovos Total', value: totalEggs },
          { icon: DollarSign, label: 'Receita', value: formatCurrency(totalRevenue), color: 'text-green-600' },
          { icon: DollarSign, label: 'Custo Total', value: formatCurrency(totalCost), color: 'text-destructive' },
          { icon: TrendingUp, label: 'Lucro', value: formatCurrency(totalRevenue - totalCost), color: totalRevenue - totalCost >= 0 ? 'text-green-600' : 'text-destructive' },
        ].map((kpi, i) => (
          <Card key={i} className="p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs"><kpi.icon className="w-3.5 h-3.5" />{kpi.label}</div>
            <p className={`text-lg font-bold mt-1 ${kpi.color || ''}`}>{kpi.value}</p>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="batches">
        <TabsList className="flex-wrap">
          <TabsTrigger value="batches">🐔 Lotes</TabsTrigger>
          <TabsTrigger value="daily">📋 Diário</TabsTrigger>
          <TabsTrigger value="inputs">📦 Insumos</TabsTrigger>
          <TabsTrigger value="costs">💰 Custos</TabsTrigger>
          <TabsTrigger value="production">🥚 Produção</TabsTrigger>
          <TabsTrigger value="financial">📊 Financeiro</TabsTrigger>
        </TabsList>

        {/* BATCHES TAB */}
        <TabsContent value="batches" className="space-y-4 mt-4">
          {batches.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">Nenhum lote registado.</Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {batches.map(batch => {
                const mortalityRate = batch.initial_quantity > 0 ? ((batch.mortality || 0) / batch.initial_quantity * 100).toFixed(1) : '0';
                const batchDailyRecords = dailyRecords.filter(r => r.batch_id === batch.id);
                const totalFeed = batchDailyRecords.reduce((s, r) => s + (r.feed_consumed_kg || 0), 0);
                return (
                  <Card key={batch.id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-lg">{batch.batch_name}</h3>
                      <div className="flex items-center gap-1">
                        <Badge className={statusColors[batch.status] || 'bg-muted'}>{statusLabels[batch.status] || batch.status}</Badge>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                          setEditingBatch(batch);
                          setNewBatch({ batch_name: batch.batch_name, initial_quantity: String(batch.initial_quantity), start_date: batch.start_date, expected_slaughter_date: batch.expected_slaughter_date || '', total_cost: String(batch.total_cost) });
                          setShowNewBatch(true);
                        }}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteConfirm({ type: 'batch', id: batch.id, name: batch.batch_name })}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-muted-foreground">Inicial:</span> {batch.initial_quantity}</div>
                      <div><span className="text-muted-foreground">Atual:</span> {batch.current_quantity}</div>
                      <div><span className="text-muted-foreground">Mortalidade:</span> <span className={Number(mortalityRate) > 5 ? 'text-destructive font-bold' : ''}>{mortalityRate}%</span></div>
                      <div><span className="text-muted-foreground">Peso Médio:</span> {batch.avg_weight ? `${batch.avg_weight} kg` : '—'}</div>
                      <div><span className="text-muted-foreground">Custo:</span> {formatCurrency(batch.total_cost)}</div>
                      <div><span className="text-muted-foreground">Ração:</span> {totalFeed.toFixed(1)} kg</div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* DAILY RECORDS TAB */}
        <TabsContent value="daily" className="mt-4">
          <PoultryDailyRecords
            records={dailyRecords}
            batches={batches.map(b => ({ id: b.id, batch_name: b.batch_name, status: b.status, initial_quantity: b.initial_quantity, current_quantity: b.current_quantity, mortality: b.mortality || 0, avg_weight: b.avg_weight }))}
            companyId={company?.id || ''}
            onRefresh={fetchData}
          />
        </TabsContent>

        {/* INPUTS TAB */}
        <TabsContent value="inputs" className="mt-4">
          <PoultryInputsManager
            inputs={inputs}
            batches={batches.map(b => ({ id: b.id, batch_name: b.batch_name, status: b.status }))}
            companyId={company?.id || ''}
            onRefresh={fetchData}
          />
        </TabsContent>

        {/* OPERATIONAL COSTS TAB */}
        <TabsContent value="costs" className="mt-4">
          <PoultryOperationalCosts
            costs={opCosts}
            batches={batches.map(b => ({ id: b.id, batch_name: b.batch_name, status: b.status }))}
            companyId={company?.id || ''}
            onRefresh={fetchData}
          />
        </TabsContent>

        {/* PRODUCTION TAB */}
        <TabsContent value="production" className="mt-4">
          <Card>
            <div className="p-4">
              <h3 className="text-lg font-semibold mb-4">Registos de Produção</h3>
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
                            {p.chickens_sold} frangos · {p.eggs_produced} ovos · {new Date(p.production_date).toLocaleDateString('pt-MZ')}
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
            </div>
          </Card>
        </TabsContent>

        {/* FINANCIAL TAB */}
        <TabsContent value="financial" className="mt-4">
          <PoultryFinancialTab
            batches={batches}
            productions={productions}
            inputs={inputs}
            operationalCosts={opCosts}
            dailyRecords={dailyRecords}
            companyName={company?.name || 'NAVANHULA CLOUD'}
          />
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirmar Exclusão</DialogTitle></DialogHeader>
          <p className="text-muted-foreground">Excluir <strong>"{deleteConfirm?.name}"</strong>? Esta ação não pode ser desfeita.</p>
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
