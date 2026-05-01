import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { toast } from 'sonner';

interface AccountReceivable {
  id: string;
  customer_name: string;
  description: string;
  amount: number;
  document_ref: string | null;
  due_date: string;
  status: string;
  paid_at: string | null;
}

const AccountsReceivableManager: React.FC = () => {
  const { company, store } = useAuth();
  const [items, setItems] = useState<AccountReceivable[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ customer_name: '', description: '', amount: '', due_date: '', document_ref: '' });

  const load = async () => {
    const { data } = await supabase
      .from('accounts_receivable')
      .select('*')
      .order('due_date', { ascending: true })
      .limit(100);
    setItems((data as AccountReceivable[]) || []);
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async () => {
    if (!form.customer_name || !form.description || !form.amount || !form.due_date || !company) return;
    const { error } = await supabase.from('accounts_receivable').insert({
      company_id: company.id,
      store_id: store?.id || null,
      customer_name: form.customer_name,
      description: form.description,
      amount: parseFloat(form.amount),
      due_date: form.due_date,
      document_ref: form.document_ref || null,
      created_by: (await supabase.auth.getUser()).data.user?.id,
    });
    if (error) { toast.error('Erro ao registrar'); return; }
    toast.success('Conta registrada');
    setOpen(false);
    setForm({ customer_name: '', description: '', amount: '', due_date: '', document_ref: '' });
    load();
  };

  const handleMarkPaid = async (id: string) => {
    const { error } = await supabase.from('accounts_receivable').update({
      status: 'pago',
      paid_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) { toast.error('Erro'); return; }
    toast.success('Pagamento recebido');
    load();
  };

  const totalPending = items.filter(i => i.status === 'pendente').reduce((s, i) => s + Number(i.amount), 0);
  const overdue = items.filter(i => i.status === 'pendente' && new Date(i.due_date) < new Date());

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Contas a Receber</h3>
          <p className="text-sm text-muted-foreground">
            Pendente: {formatCurrency(totalPending)} · {overdue.length} atrasado(s)
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-2" /> Novo Recebível</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Recebível</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Input value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
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
              <div className="space-y-2">
                <Label>Nº Documento (opcional)</Label>
                <Input value={form.document_ref} onChange={e => setForm(f => ({ ...f, document_ref: e.target.value }))} />
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
                  <th className="text-left p-3">Cliente</th>
                  <th className="text-left p-3">Descrição</th>
                  <th className="text-right p-3">Valor</th>
                  <th className="text-left p-3">Vencimento</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-right p-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.map(i => {
                  const isOverdue = i.status === 'pendente' && new Date(i.due_date) < new Date();
                  return (
                    <tr key={i.id} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="p-3 font-medium">{i.customer_name}</td>
                      <td className="p-3">{i.description}</td>
                      <td className="p-3 text-right font-mono">{formatCurrency(i.amount)}</td>
                      <td className="p-3">{new Date(i.due_date).toLocaleDateString('pt-BR')}</td>
                      <td className="p-3">
                        <Badge variant={i.status === 'pago' ? 'default' : isOverdue ? 'destructive' : 'secondary'}>
                          {i.status === 'pago' ? 'Pago' : isOverdue ? 'Atrasado' : 'Pendente'}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        {i.status !== 'pago' && (
                          <Button variant="outline" size="sm" onClick={() => handleMarkPaid(i.id)}>
                            <CheckCircle2 className="w-4 h-4 mr-1" /> Receber
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {items.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">Nenhuma conta a receber</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountsReceivableManager;
