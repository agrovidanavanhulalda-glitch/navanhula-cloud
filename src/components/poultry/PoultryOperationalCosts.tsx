import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/formatters';
import { DollarSign, Plus, Trash2 } from 'lucide-react';

const COST_TYPES = [
  { value: 'energia', label: 'Energia', icon: '⚡' },
  { value: 'combustivel', label: 'Combustível', icon: '⛽' },
  { value: 'agua', label: 'Água', icon: '💧' },
  { value: 'mao_de_obra', label: 'Mão de Obra', icon: '👷' },
  { value: 'manutencao', label: 'Manutenção', icon: '🔧' },
  { value: 'transporte', label: 'Transporte', icon: '🚚' },
  { value: 'outros', label: 'Outros', icon: '📦' },
];

export interface OperationalCost {
  id: string;
  batch_id: string;
  company_id: string;
  cost_type: string;
  description: string;
  amount: number;
  quantity: number;
  unit: string;
  cost_date: string;
  notes: string | null;
  created_at: string;
}

interface Props {
  costs: OperationalCost[];
  batches: { id: string; batch_name: string; status: string }[];
  companyId: string;
  onRefresh: () => void;
}

const PoultryOperationalCosts: React.FC<Props> = ({ costs, batches, companyId, onRefresh }) => {
  const [showNew, setShowNew] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<OperationalCost | null>(null);
  const [form, setForm] = useState({
    batch_id: '', cost_type: 'energia', description: '', amount: '',
    quantity: '', unit: 'kWh', cost_date: new Date().toISOString().split('T')[0], notes: '',
  });

  const handleCreate = async () => {
    if (!form.batch_id || !form.description) {
      toast.error('Preencha lote e descrição'); return;
    }
    const userId = (await supabase.auth.getUser()).data.user?.id;
    const { error } = await supabase.from('poultry_operational_costs').insert({
      batch_id: form.batch_id, company_id: companyId, cost_type: form.cost_type,
      description: form.description, amount: Number(form.amount) || 0,
      quantity: Number(form.quantity) || 0, unit: form.unit,
      cost_date: form.cost_date, notes: form.notes || null, created_by: userId,
    } as any);
    if (error) { toast.error('Erro ao registar custo'); console.error(error); return; }
    toast.success('Custo operacional registado!');
    setShowNew(false);
    setForm({ batch_id: '', cost_type: 'energia', description: '', amount: '', quantity: '', unit: 'kWh', cost_date: new Date().toISOString().split('T')[0], notes: '' });
    onRefresh();
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    await supabase.from('audit_logs').insert({
      action: 'delete', table_name: 'poultry_operational_costs', record_id: deleteConfirm.id,
      user_id: (await supabase.auth.getUser()).data.user?.id,
    } as any);
    const { error } = await supabase.from('poultry_operational_costs').delete().eq('id', deleteConfirm.id);
    if (error) toast.error('Erro ao excluir');
    else toast.success('Custo excluído');
    setDeleteConfirm(null);
    onRefresh();
  };

  const totalCost = costs.reduce((s, c) => s + Number(c.amount), 0);
  const costByType: Record<string, number> = {};
  costs.forEach(c => { costByType[c.cost_type] = (costByType[c.cost_type] || 0) + Number(c.amount); });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <DollarSign className="w-5 h-5" /> Custos Operacionais
        </h3>
        <Dialog open={showNew} onOpenChange={setShowNew}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Novo Custo</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Registar Custo Operacional</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Lote</Label>
                <Select value={form.batch_id} onValueChange={v => setForm(p => ({ ...p, batch_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{batches.filter(b => b.status === 'active').map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.batch_name}</SelectItem>
                  ))}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo de Custo</Label>
                <Select value={form.cost_type} onValueChange={v => setForm(p => ({ ...p, cost_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{COST_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>
                  ))}</SelectContent>
                </Select>
              </div>
              <div><Label>Descrição</Label><Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Ex: Conta de luz Jan 2026" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Valor (MZN)</Label><Input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} /></div>
                <div><Label>Quantidade</Label><Input type="number" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))} /></div>
              </div>
              <div><Label>Data</Label><Input type="date" value={form.cost_date} onChange={e => setForm(p => ({ ...p, cost_date: e.target.value }))} /></div>
              <Button className="w-full" onClick={handleCreate}>Registar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary by type */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3 col-span-2 md:col-span-1">
          <p className="text-xs text-muted-foreground">Custo Total</p>
          <p className="text-xl font-bold">{formatCurrency(totalCost)}</p>
        </Card>
        {Object.entries(costByType).slice(0, 3).map(([type, amount]) => {
          const t = COST_TYPES.find(ct => ct.value === type);
          return (
            <Card key={type} className="p-3">
              <p className="text-xs text-muted-foreground">{t?.icon} {t?.label || type}</p>
              <p className="text-lg font-bold">{formatCurrency(amount)}</p>
            </Card>
          );
        })}
      </div>

      {/* List */}
      {costs.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">Nenhum custo operacional registado.</Card>
      ) : (
        <div className="space-y-2">
          {costs.map(c => {
            const batch = batches.find(b => b.id === c.batch_id);
            const t = COST_TYPES.find(ct => ct.value === c.cost_type);
            return (
              <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div>
                  <div className="flex items-center gap-2">
                    <span>{t?.icon}</span>
                    <p className="font-medium text-sm">{c.description}</p>
                    <Badge variant="outline" className="text-xs">{t?.label || c.cost_type}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{batch?.batch_name || '—'} · {new Date(c.cost_date).toLocaleDateString('pt-MZ')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-bold text-sm">{formatCurrency(c.amount)}</p>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteConfirm(c)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirmar Exclusão</DialogTitle></DialogHeader>
          <p className="text-muted-foreground">Excluir <strong>"{deleteConfirm?.description}"</strong>?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PoultryOperationalCosts;
