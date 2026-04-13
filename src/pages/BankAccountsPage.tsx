import React, { useState } from 'react';
import { useAuth } from '@/contexts/SaaSAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Building2, Plus, Upload, RefreshCw, CheckCircle2, XCircle, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { PermissionGate } from '@/components/auth/PermissionGate';
import PlanGate from '@/components/monetization/PlanGate';
import { formatCurrency } from '@/lib/formatters';

const BankAccountsPage = () => {
  const { company } = useAuth();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ bank_name: '', account_number: '', account_holder: '', currency: 'MZN' });

  const companyId = company?.id;

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['bank-accounts', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('company_id', companyId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['bank-transactions', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_transactions')
        .select('*, bank_accounts(bank_name)')
        .eq('company_id', companyId!)
        .order('transaction_date', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const addAccount = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('bank_accounts').insert({
        company_id: companyId!,
        bank_name: form.bank_name,
        account_number: form.account_number,
        account_holder: form.account_holder,
        currency: form.currency,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      setShowAdd(false);
      setForm({ bank_name: '', account_number: '', account_holder: '', currency: 'MZN' });
      toast.success('Conta bancária adicionada!');
    },
    onError: () => toast.error('Erro ao adicionar conta'),
  });

  const reconcile = useMutation({
    mutationFn: async (bankAccountId: string) => {
      const { data, error } = await supabase.rpc('reconcile_bank_transactions', { p_bank_account_id: bankAccountId });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      toast.success(`Reconciliação concluída: ${data?.matched || 0} transações correspondidas`);
    },
    onError: () => toast.error('Erro na reconciliação'),
  });

  const totalBalance = accounts.reduce((sum: number, a: any) => sum + Number(a.balance || 0), 0);

  return (
    <PlanGate module="fiscal">
      <PermissionGate module="finance">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Contas Bancárias</h1>
              <p className="text-sm text-muted-foreground">Gestão bancária e reconciliação</p>
            </div>
            <Dialog open={showAdd} onOpenChange={setShowAdd}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="w-4 h-4" /> Nova Conta</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Adicionar Conta Bancária</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>Nome do Banco</Label><Input value={form.bank_name} onChange={e => setForm({ ...form, bank_name: e.target.value })} placeholder="BCI, Millennium, etc." /></div>
                  <div><Label>Número da Conta</Label><Input value={form.account_number} onChange={e => setForm({ ...form, account_number: e.target.value })} /></div>
                  <div><Label>Titular</Label><Input value={form.account_holder} onChange={e => setForm({ ...form, account_holder: e.target.value })} /></div>
                  <div><Label>Moeda</Label><Input value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} /></div>
                  <Button className="w-full" onClick={() => addAccount.mutate()} disabled={!form.bank_name}>Adicionar</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Building2 className="w-8 h-8 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Contas Ativas</p>
                    <p className="text-2xl font-bold">{accounts.filter((a: any) => a.is_active).length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <ArrowUpRight className="w-8 h-8 text-emerald-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Saldo Total</p>
                    <p className="text-2xl font-bold">{formatCurrency(totalBalance)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-8 h-8 text-blue-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Transações Reconciliadas</p>
                    <p className="text-2xl font-bold">{transactions.filter((t: any) => t.reconciled).length}/{transactions.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Accounts List */}
          <Card>
            <CardHeader><CardTitle>Contas</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : accounts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhuma conta bancária cadastrada</p>
              ) : (
                <div className="space-y-3">
                  {accounts.map((acc: any) => (
                    <div key={acc.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Building2 className="w-5 h-5 text-primary" />
                        <div>
                          <p className="font-medium">{acc.bank_name}</p>
                          <p className="text-xs text-muted-foreground">{acc.account_number} • {acc.currency}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="font-bold">{formatCurrency(acc.balance)}</p>
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => reconcile.mutate(acc.id)}>
                          <RefreshCw className="w-3 h-3" /> Reconciliar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card>
            <CardHeader><CardTitle>Transações Recentes</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Banco</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Sem transações</TableCell></TableRow>
                  ) : transactions.map((tx: any) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-sm">{new Date(tx.transaction_date).toLocaleDateString('pt-MZ')}</TableCell>
                      <TableCell className="text-sm">{tx.bank_accounts?.bank_name}</TableCell>
                      <TableCell className="text-sm">{tx.description || '-'}</TableCell>
                      <TableCell className="text-sm">
                        <span className={tx.type === 'credit' ? 'text-emerald-600' : 'text-destructive'}>
                          {tx.type === 'credit' ? '+' : '-'}{formatCurrency(Math.abs(tx.amount))}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={tx.reconciled ? 'default' : 'secondary'}>
                          {tx.reconciled ? 'Reconciliado' : 'Pendente'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </PermissionGate>
    </PlanGate>
  );
};

export default BankAccountsPage;
