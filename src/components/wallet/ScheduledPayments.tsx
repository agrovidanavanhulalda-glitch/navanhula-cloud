import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/SaaSAuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Calendar, Clock, Plus, Trash2, Edit, CalendarClock } from 'lucide-react';
import { formatCurrency, formatDateTime } from '@/lib/formatters';
import { toast } from 'sonner';

interface ScheduledPayment {
  id: string;
  description: string;
  amount: number;
  payment_method: string;
  destination_phone: string | null;
  destination_info: string | null;
  frequency: string;
  next_run_at: string;
  last_run_at: string | null;
  is_active: boolean;
  category: string;
}

interface Props {
  storeId: string;
  companyId: string;
}

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Diário',
  weekly: 'Semanal',
  monthly: 'Mensal',
};

const CATEGORY_LABELS: Record<string, string> = {
  supplier: 'Fornecedor',
  tax: 'Imposto',
  salary: 'Salário',
  other: 'Outro',
};

const ScheduledPayments: React.FC<Props> = ({ storeId, companyId }) => {
  const [payments, setPayments] = useState<ScheduledPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('mpesa');
  const [phone, setPhone] = useState('');
  const [info, setInfo] = useState('');
  const [frequency, setFrequency] = useState('monthly');
  const [nextRun, setNextRun] = useState('');
  const [category, setCategory] = useState('supplier');

  useEffect(() => {
    loadPayments();
  }, [storeId]);

  const loadPayments = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('scheduled_payments')
      .select('*')
      .eq('store_id', storeId)
      .order('next_run_at', { ascending: true });
    if (data) setPayments(data as any);
    setLoading(false);
  };

  const resetForm = () => {
    setDescription('');
    setAmount('');
    setMethod('mpesa');
    setPhone('');
    setInfo('');
    setFrequency('monthly');
    setNextRun('');
    setCategory('supplier');
    setEditingId(null);
  };

  const openEdit = (p: ScheduledPayment) => {
    setDescription(p.description);
    setAmount(String(p.amount));
    setMethod(p.payment_method);
    setPhone(p.destination_phone || '');
    setInfo(p.destination_info || '');
    setFrequency(p.frequency);
    setNextRun(p.next_run_at.slice(0, 16));
    setCategory(p.category);
    setEditingId(p.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!description || !amount || !nextRun) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const payload = {
      store_id: storeId,
      company_id: companyId,
      description,
      amount: parseFloat(amount),
      payment_method: method,
      destination_phone: phone || null,
      destination_info: info || null,
      frequency,
      next_run_at: new Date(nextRun).toISOString(),
      category,
    };

    if (editingId) {
      const { error } = await supabase
        .from('scheduled_payments')
        .update(payload)
        .eq('id', editingId);
      if (error) { toast.error('Erro ao atualizar'); return; }
      toast.success('Agendamento atualizado');
    } else {
      const { error } = await supabase
        .from('scheduled_payments')
        .insert(payload);
      if (error) { toast.error('Erro ao criar agendamento'); return; }
      toast.success('Pagamento agendado!');
    }

    setShowForm(false);
    resetForm();
    loadPayments();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('scheduled_payments').update({ is_active: !current }).eq('id', id);
    loadPayments();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remover este agendamento?')) return;
    await supabase.from('scheduled_payments').delete().eq('id', id);
    toast.success('Agendamento removido');
    loadPayments();
  };

  const getCategoryColor = (cat: string) => {
    const colors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      supplier: 'default',
      tax: 'destructive',
      salary: 'secondary',
      other: 'outline',
    };
    return colors[cat] || 'outline';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <CalendarClock className="w-5 h-5 text-primary" />
          Pagamentos Agendados
        </h3>
        <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Agendar
        </Button>
      </div>

      {payments.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <CalendarClock className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Nenhum pagamento agendado</p>
          <p className="text-xs mt-1">Agende pagamentos automáticos para fornecedores, impostos ou salários</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {payments.map(p => (
            <Card key={p.id} className={`p-4 ${!p.is_active ? 'opacity-60' : ''}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm truncate">{p.description}</p>
                    <Badge variant={getCategoryColor(p.category)}>
                      {CATEGORY_LABELS[p.category] || p.category}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {FREQUENCY_LABELS[p.frequency]}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Próximo: {formatDateTime(p.next_run_at)}
                    </span>
                    <span>{p.payment_method.toUpperCase()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-sm whitespace-nowrap">{formatCurrency(Number(p.amount))}</p>
                  <Switch checked={p.is_active} onCheckedChange={() => toggleActive(p.id, p.is_active)} />
                  <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={(o) => { setShowForm(o); if (!o) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Agendamento' : 'Novo Pagamento Agendado'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Descrição *</label>
              <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Pagamento Fornecedor X" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Categoria</label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Frequência</label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(FREQUENCY_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Valor (MT) *</label>
              <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Método</label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mpesa">M-Pesa</SelectItem>
                    <SelectItem value="emola">E-Mola</SelectItem>
                    <SelectItem value="bank">Banco</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Telefone destino</label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="84XXXXXXX" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Info adicional</label>
              <Input value={info} onChange={e => setInfo(e.target.value)} placeholder="Referência, banco, etc." />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Próxima execução *</label>
              <Input type="datetime-local" value={nextRun} onChange={e => setNextRun(e.target.value)} />
            </div>
            <Button className="w-full" onClick={handleSave}>
              {editingId ? 'Salvar Alterações' : 'Criar Agendamento'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ScheduledPayments;
