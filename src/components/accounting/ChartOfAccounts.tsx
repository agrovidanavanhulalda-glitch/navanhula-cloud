import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, BookOpen, ChevronRight, RefreshCw } from 'lucide-react';

interface Account {
  id: string;
  code: string;
  name: string;
  account_type: string;
  parent_id: string | null;
  is_active: boolean;
  description: string | null;
}

const ACCOUNT_TYPES = [
  { value: 'asset', label: 'Activo', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  { value: 'liability', label: 'Passivo', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
  { value: 'equity', label: 'Capital Próprio', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
  { value: 'revenue', label: 'Receita', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  { value: 'expense', label: 'Despesa', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
];

const ChartOfAccounts: React.FC = () => {
  const { company } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newAccount, setNewAccount] = useState({ code: '', name: '', account_type: 'asset', description: '', parent_id: '' });

  const loadAccounts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('chart_of_accounts')
      .select('*')
      .order('code');
    if (!error) setAccounts((data as any[]) || []);
    setLoading(false);
  };

  const seedDefaults = async () => {
    if (!company?.id) return;
    const { error } = await (supabase as any).rpc('seed_chart_of_accounts', { p_company_id: company.id });
    if (error) { toast.error(error.message); return; }
    toast.success('Plano de contas padrão criado');
    loadAccounts();
  };

  const addAccount = async () => {
    if (!company?.id || !newAccount.code || !newAccount.name) {
      toast.error('Preencha código e nome');
      return;
    }
    const { error } = await supabase.from('chart_of_accounts').insert({
      company_id: company.id,
      code: newAccount.code,
      name: newAccount.name,
      account_type: newAccount.account_type,
      description: newAccount.description || null,
      parent_id: newAccount.parent_id || null,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success('Conta adicionada');
    setDialogOpen(false);
    setNewAccount({ code: '', name: '', account_type: 'asset', description: '', parent_id: '' });
    loadAccounts();
  };

  useEffect(() => { loadAccounts(); }, []);

  const getTypeInfo = (type: string) => ACCOUNT_TYPES.find(t => t.value === type) || ACCOUNT_TYPES[0];

  // Group accounts by type
  const grouped = ACCOUNT_TYPES.map(type => ({
    ...type,
    accounts: accounts.filter(a => a.account_type === type.value),
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Plano de Contas</h3>
          <Badge variant="secondary">{accounts.length} contas</Badge>
        </div>
        <div className="flex gap-2">
          {accounts.length === 0 && (
            <Button variant="outline" size="sm" onClick={seedDefaults}>
              <RefreshCw className="w-4 h-4 mr-1" /> Criar Padrão MZ
            </Button>
          )}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Nova Conta</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Adicionar Conta</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Código</Label>
                    <Input value={newAccount.code} onChange={e => setNewAccount(p => ({ ...p, code: e.target.value }))} placeholder="1.1.1" />
                  </div>
                  <div>
                    <Label>Tipo</Label>
                    <Select value={newAccount.account_type} onValueChange={v => setNewAccount(p => ({ ...p, account_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ACCOUNT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Nome</Label>
                  <Input value={newAccount.name} onChange={e => setNewAccount(p => ({ ...p, name: e.target.value }))} placeholder="Nome da conta" />
                </div>
                <div>
                  <Label>Descrição (opcional)</Label>
                  <Input value={newAccount.description} onChange={e => setNewAccount(p => ({ ...p, description: e.target.value }))} />
                </div>
                <Button className="w-full" onClick={addAccount}>Adicionar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : accounts.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground mb-3">Nenhuma conta cadastrada</p>
            <Button onClick={seedDefaults}>Criar Plano de Contas Padrão</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {grouped.filter(g => g.accounts.length > 0).map(group => (
            <Card key={group.value}>
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Badge className={group.color}>{group.label}</Badge>
                  <span className="text-muted-foreground font-normal">({group.accounts.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {group.accounts.map(acc => {
                    const depth = (acc.code.match(/\./g) || []).length;
                    return (
                      <div key={acc.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors" style={{ paddingLeft: `${16 + depth * 20}px` }}>
                        <div className="flex items-center gap-2">
                          {depth > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                          <span className="font-mono text-sm text-muted-foreground w-16">{acc.code}</span>
                          <span className="text-sm font-medium">{acc.name}</span>
                        </div>
                        {acc.description && (
                          <span className="text-xs text-muted-foreground hidden md:block max-w-[200px] truncate">{acc.description}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChartOfAccounts;
