import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/SaaSAuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { toast } from 'sonner';

interface AccountPayable {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  status: string;
  paid_at: string | null;
  created_at: string;
}

const AccountsPayableManager: React.FC = () => {
  const { company, store } = useAuth();
  const [items, setItems] = useState<AccountPayable[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ description: '', amount: '', due_date: '' });

  const load = async () => {
    const { data } = await supabase
      .from('accounts_payable')
      .select('*')
      .order('due_date', { ascending: true })
      .limit(100);
    setItems((data as AccountPayable[]) || []);
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async () => {
    if (!form.description || !form.amount || !form.due_date || !company) return;
    const { error } = await supabase.from('accounts_payable').insert({
      company_id: company.id,
      store_id: store?.id || null,
      description: form.description,
      amount: parseFloat(form.amount),
      due_date: form.due_date,
      created_by: (await supabase.auth.getUser()).data.user?.id,
    });
    if (error) { toast.error('Erro ao registrar'); return; }
    toast.success('Conta registrada');
    setOpen(false);
    setForm({ description: '', amount: '', due_date: '' });
    load();
  };

  const handleMarkPaid = async (id: string) => {
    const { error } = await supabase.from('accounts_payable').update({
      status: 'pago',
      paid_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) { toast.error('Erro'); return; }
    toast.success('Conta marcada como paga');
    load();
  };

  const totalPending = items.filter(i => i.status === 'pendente').reduce((s, i) => s + Number(i.amount), 0);
  const totalPaid = items.filter(i => i.status === 'pago').reduce((s, i) => s + Number(i.amount), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Contas a Pagar</h3>
          <p className="text-sm text-muted-foreground">
            Pendente: {formatCurrency(totalPending)} · Pago: {formatCurrency(totalPaid)}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-2" /> Nova Conta</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova Conta a Pagar</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Descrição / Fornecedor</Label>
                <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor (MT)</Label>
                  <Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Vencimento</Label>
                  <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
                </div>
              </div>
              <Button className="w-full" onClick={handleSubmit}>Registrar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-auto max-h-[500px]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border">
                  <th className="text-left p-3">Descrição</th>
                  <th className="text-right p-3">Valor</th>
                  <th className="text-left p-3">Vencimento</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-right p-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.map(i => {
                  const overdue = i.status === 'pendente' && new Date(i.due_date) < new Date();
                  return (
                    <tr key={i.id} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="p-3">{i.description}</td>
                      <td className="p-3 text-right font-mono">{formatCurrency(i.amount)}</td>
                      <td className="p-3">{new Date(i.due_date).toLocaleDateString('pt-BR')}</td>
                      <td className="p-3">
                        <Badge variant={i.status === 'pago' ? 'default' : overdue ? 'destructive' : 'secondary'}>
                          {i.status === 'pago' ? 'Pago' : overdue ? 'Atrasado' : 'Pendente'}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        {i.status === 'pendente' && (
                          <Button variant="outline" size="sm" onClick={() => handleMarkPaid(i.id)}>
                            <CheckCircle2 className="w-4 h-4 mr-1" /> Pagar
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {items.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">Nenhuma conta registrada</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountsPayableManager;
