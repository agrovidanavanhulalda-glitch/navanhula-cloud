import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/formatters';
import { Package, Plus, AlertTriangle, Pencil, Trash2 } from 'lucide-react';

const INPUT_TYPES = [
  { value: 'racao', label: 'Ração' },
  { value: 'antibiotico', label: 'Antibiótico' },
  { value: 'carvao', label: 'Carvão' },
  { value: 'vacina', label: 'Vacina' },
  { value: 'energia', label: 'Energia' },
  { value: 'agua', label: 'Água' },
  { value: 'outros', label: 'Outros' },
];

const UNITS = [
  { value: 'saco', label: 'Saco' },
  { value: 'litro', label: 'Litro' },
  { value: 'kg', label: 'Kg' },
  { value: 'dose', label: 'Dose' },
  { value: 'kWh', label: 'kWh' },
  { value: 'unidade', label: 'Unidade' },
];

export interface PoultryInput {
  id: string;
  batch_id: string;
  company_id: string;
  input_type: string;
  name: string;
  unit: string;
  quantity_received: number;
  quantity_used: number;
  balance: number;
  unit_cost: number;
  total_cost: number;
  supplier: string | null;
  entry_date: string;
  usage_date: string | null;
  low_stock_threshold: number;
  notes: string | null;
  created_at: string;
}

interface Props {
  inputs: PoultryInput[];
  batches: { id: string; batch_name: string; status: string }[];
  companyId: string;
  onRefresh: () => void;
}

const PoultryInputsManager: React.FC<Props> = ({ inputs, batches, companyId, onRefresh }) => {
  const [showNew, setShowNew] = useState(false);
  const [showUse, setShowUse] = useState<PoultryInput | null>(null);
  const [useQty, setUseQty] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<PoultryInput | null>(null);
  const [form, setForm] = useState({
    batch_id: '', input_type: 'racao', name: '', unit: 'kg',
    quantity_received: '', unit_cost: '', supplier: '',
    entry_date: new Date().toISOString().split('T')[0],
    low_stock_threshold: '10', notes: '',
  });

  const handleCreate = async () => {
    if (!form.batch_id || !form.name) {
      toast.error('Preencha lote e nome do insumo');
      return;
    }
    const userId = (await supabase.auth.getUser()).data.user?.id;
    const { error } = await supabase.from('poultry_inputs').insert({
      batch_id: form.batch_id,
      company_id: companyId,
      input_type: form.input_type,
      name: form.name,
      unit: form.unit,
      quantity_received: Number(form.quantity_received) || 0,
      unit_cost: Number(form.unit_cost) || 0,
      supplier: form.supplier || null,
      entry_date: form.entry_date,
      low_stock_threshold: Number(form.low_stock_threshold) || 10,
      notes: form.notes || null,
      created_by: userId,
    } as any);
    if (error) { toast.error('Erro ao registar insumo'); console.error(error); return; }
    toast.success('Insumo registado!');
    setShowNew(false);
    setForm({ batch_id: '', input_type: 'racao', name: '', unit: 'kg', quantity_received: '', unit_cost: '', supplier: '', entry_date: new Date().toISOString().split('T')[0], low_stock_threshold: '10', notes: '' });
    onRefresh();
  };

  const handleUseInput = async () => {
    if (!showUse || !useQty) return;
    const qty = Number(useQty);
    if (qty <= 0 || qty > showUse.balance) {
      toast.error('Quantidade inválida');
      return;
    }
    const { error } = await supabase.from('poultry_inputs')
      .update({ quantity_used: showUse.quantity_used + qty, usage_date: new Date().toISOString().split('T')[0] } as any)
      .eq('id', showUse.id);
    if (error) { toast.error('Erro ao registar uso'); return; }
    toast.success('Uso registado!');
    setShowUse(null);
    setUseQty('');
    onRefresh();
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    await supabase.from('audit_logs').insert({
      action: 'delete', table_name: 'poultry_inputs', record_id: deleteConfirm.id,
      user_id: (await supabase.auth.getUser()).data.user?.id,
    } as any);
    const { error } = await supabase.from('poultry_inputs').delete().eq('id', deleteConfirm.id);
    if (error) toast.error('Erro ao excluir');
    else toast.success('Insumo excluído');
    setDeleteConfirm(null);
    onRefresh();
  };

  const lowStockInputs = inputs.filter(i => i.balance <= i.low_stock_threshold && i.balance > 0);
  const outOfStock = inputs.filter(i => i.balance <= 0);
  const totalInputCost = inputs.reduce((s, i) => s + Number(i.total_cost || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Package className="w-5 h-5" /> Gestão de Insumos
        </h3>
        <Dialog open={showNew} onOpenChange={setShowNew}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Novo Insumo</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Registar Insumo</DialogTitle></DialogHeader>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
              <div>
                <Label>Lote</Label>
                <Select value={form.batch_id} onValueChange={v => setForm(p => ({ ...p, batch_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{batches.filter(b => b.status === 'active').map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.batch_name}</SelectItem>
                  ))}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Tipo</Label>
                  <Select value={form.input_type} onValueChange={v => setForm(p => ({ ...p, input_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{INPUT_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Unidade</Label>
                  <Select value={form.unit} onValueChange={v => setForm(p => ({ ...p, unit: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{UNITS.map(u => (
                      <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                    ))}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Nome</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Ração Starter 50kg" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Qtd. Recebida</Label><Input type="number" value={form.quantity_received} onChange={e => setForm(p => ({ ...p, quantity_received: e.target.value }))} /></div>
                <div><Label>Custo Unitário (MZN)</Label><Input type="number" value={form.unit_cost} onChange={e => setForm(p => ({ ...p, unit_cost: e.target.value }))} /></div>
              </div>
              <div><Label>Fornecedor</Label><Input value={form.supplier} onChange={e => setForm(p => ({ ...p, supplier: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Data Entrada</Label><Input type="date" value={form.entry_date} onChange={e => setForm(p => ({ ...p, entry_date: e.target.value }))} /></div>
                <div><Label>Alerta Stock Baixo</Label><Input type="number" value={form.low_stock_threshold} onChange={e => setForm(p => ({ ...p, low_stock_threshold: e.target.value }))} /></div>
              </div>
              <div><Label>Notas</Label><Input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
              <Button className="w-full" onClick={handleCreate}>Registar Insumo</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Alerts */}
      {(lowStockInputs.length > 0 || outOfStock.length > 0) && (
        <div className="space-y-2">
          {outOfStock.map(i => (
            <div key={i.id} className="flex items-center gap-2 p-2 rounded-md bg-destructive/10 text-destructive text-sm">
              <AlertTriangle className="w-4 h-4" /> <strong>{i.name}</strong> — Esgotado!
            </div>
          ))}
          {lowStockInputs.map(i => (
            <div key={i.id} className="flex items-center gap-2 p-2 rounded-md bg-amber-500/10 text-amber-700 text-sm">
              <AlertTriangle className="w-4 h-4" /> <strong>{i.name}</strong> — Saldo baixo: {i.balance} {i.unit}
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3"><p className="text-xs text-muted-foreground">Total Insumos</p><p className="text-xl font-bold">{inputs.length}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">Custo Total</p><p className="text-xl font-bold">{formatCurrency(totalInputCost)}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground text-amber-600">Stock Baixo</p><p className="text-xl font-bold text-amber-600">{lowStockInputs.length}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground text-destructive">Esgotado</p><p className="text-xl font-bold text-destructive">{outOfStock.length}</p></Card>
      </div>

      {/* List */}
      {inputs.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">Nenhum insumo registado.</Card>
      ) : (
        <div className="space-y-2">
          {inputs.map(inp => {
            const batch = batches.find(b => b.id === inp.batch_id);
            const typeLabel = INPUT_TYPES.find(t => t.value === inp.input_type)?.label || inp.input_type;
            const isLow = inp.balance <= inp.low_stock_threshold && inp.balance > 0;
            const isEmpty = inp.balance <= 0;
            return (
              <div key={inp.id} className={`flex items-center justify-between p-3 rounded-lg border ${isEmpty ? 'border-destructive/30 bg-destructive/5' : isLow ? 'border-amber-500/30 bg-amber-500/5' : 'bg-muted/30'}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{inp.name}</p>
                    <Badge variant="outline" className="text-xs">{typeLabel}</Badge>
                    {isEmpty && <Badge variant="destructive" className="text-xs">Esgotado</Badge>}
                    {isLow && !isEmpty && <Badge className="bg-amber-500/20 text-amber-700 text-xs">Baixo</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{batch?.batch_name || '—'} · {inp.supplier || 'Sem fornecedor'} · {new Date(inp.entry_date).toLocaleDateString('pt-MZ')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-bold">{inp.balance} {inp.unit}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(Number(inp.total_cost || 0))}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => { setShowUse(inp); setUseQty(''); }}>Usar</Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteConfirm(inp)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Use Input Dialog */}
      <Dialog open={!!showUse} onOpenChange={() => setShowUse(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registar Uso — {showUse?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Saldo disponível: <strong>{showUse?.balance} {showUse?.unit}</strong></p>
            <div><Label>Quantidade a usar</Label><Input type="number" value={useQty} onChange={e => setUseQty(e.target.value)} max={showUse?.balance} /></div>
            <Button className="w-full" onClick={handleUseInput}>Confirmar Uso</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirmar Exclusão</DialogTitle></DialogHeader>
          <p className="text-muted-foreground">Excluir <strong>"{deleteConfirm?.name}"</strong>?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PoultryInputsManager;
