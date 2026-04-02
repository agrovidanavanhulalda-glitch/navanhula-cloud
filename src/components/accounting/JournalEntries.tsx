import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/SaaSAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { Plus, FileText, AlertTriangle, Check } from 'lucide-react';

interface JournalEntry {
  id: string;
  entry_number: number;
  entry_date: string;
  description: string;
  reference: string | null;
  status: string;
  total_debit: number;
  total_credit: number;
  created_at: string;
}

interface Account {
  id: string;
  code: string;
  name: string;
  account_type: string;
}

interface JournalLine {
  account_id: string;
  description: string;
  debit: number;
  credit: number;
}

const JournalEntries: React.FC = () => {
  const { company } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [reference, setReference] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [lines, setLines] = useState<JournalLine[]>([
    { account_id: '', description: '', debit: 0, credit: 0 },
    { account_id: '', description: '', debit: 0, credit: 0 },
  ]);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [entriesRes, accountsRes] = await Promise.all([
      supabase.from('journal_entries').select('*').order('entry_date', { ascending: false }).limit(100),
      supabase.from('chart_of_accounts').select('id, code, name, account_type').eq('is_active', true).order('code'),
    ]);
    if (!entriesRes.error) setEntries((entriesRes.data as any[]) || []);
    if (!accountsRes.error) setAccounts((accountsRes.data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const totalDebit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const addLine = () => setLines(prev => [...prev, { account_id: '', description: '', debit: 0, credit: 0 }]);
  const removeLine = (idx: number) => { if (lines.length > 2) setLines(prev => prev.filter((_, i) => i !== idx)); };
  const updateLine = (idx: number, field: keyof JournalLine, value: string | number) => {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  };

  const submit = async () => {
    if (!description.trim()) { toast.error('Preencha a descrição'); return; }
    if (!isBalanced) { toast.error('Débito deve ser igual ao Crédito'); return; }
    if (lines.some(l => !l.account_id)) { toast.error('Selecione uma conta para cada linha'); return; }

    setSubmitting(true);
    const { data, error } = await (supabase as any).rpc('create_journal_entry', {
      p_description: description,
      p_lines: JSON.stringify(lines.map(l => ({
        account_id: l.account_id,
        description: l.description,
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
      }))),
      p_reference: reference || null,
      p_entry_date: entryDate,
    });

    if (error) { toast.error(error.message); setSubmitting(false); return; }
    toast.success('Lançamento criado com sucesso');
    setDialogOpen(false);
    setDescription('');
    setReference('');
    setLines([
      { account_id: '', description: '', debit: 0, credit: 0 },
      { account_id: '', description: '', debit: 0, credit: 0 },
    ]);
    loadData();
    setSubmitting(false);
  };

  const accountMap = Object.fromEntries(accounts.map(a => [a.id, a]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Lançamentos Contábeis</h3>
          <Badge variant="secondary">{entries.length}</Badge>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" disabled={accounts.length === 0}>
              <Plus className="w-4 h-4 mr-1" /> Novo Lançamento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Novo Lançamento Contábil</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Data</Label>
                  <Input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} />
                </div>
                <div>
                  <Label>Referência</Label>
                  <Input value={reference} onChange={e => setReference(e.target.value)} placeholder="Ex: FAT-001" />
                </div>
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição do lançamento" rows={2} />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Linhas</Label>
                  <Button variant="ghost" size="sm" onClick={addLine}><Plus className="w-3 h-3 mr-1" /> Linha</Button>
                </div>
                <div className="space-y-2">
                  {lines.map((line, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-5">
                        <Select value={line.account_id} onValueChange={v => updateLine(idx, 'account_id', v)}>
                          <SelectTrigger className="text-xs"><SelectValue placeholder="Conta" /></SelectTrigger>
                          <SelectContent>
                            {accounts.map(a => (
                              <SelectItem key={a.id} value={a.id} className="text-xs">
                                {a.code} - {a.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-3">
                        <Input type="number" placeholder="Débito" value={line.debit || ''} onChange={e => updateLine(idx, 'debit', e.target.value)} className="text-sm" />
                      </div>
                      <div className="col-span-3">
                        <Input type="number" placeholder="Crédito" value={line.credit || ''} onChange={e => updateLine(idx, 'credit', e.target.value)} className="text-sm" />
                      </div>
                      <div className="col-span-1">
                        {lines.length > 2 && (
                          <Button variant="ghost" size="sm" onClick={() => removeLine(idx)} className="text-destructive">×</Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`flex items-center justify-between p-3 rounded-lg ${isBalanced ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                <div className="flex items-center gap-2">
                  {isBalanced ? <Check className="w-4 h-4 text-green-600" /> : <AlertTriangle className="w-4 h-4 text-red-600" />}
                  <span className="text-sm font-medium">{isBalanced ? 'Balanceado' : 'Não balanceado'}</span>
                </div>
                <div className="flex gap-4 text-sm font-mono">
                  <span>D: {formatCurrency(totalDebit)}</span>
                  <span>C: {formatCurrency(totalCredit)}</span>
                </div>
              </div>

              <Button className="w-full" onClick={submit} disabled={!isBalanced || submitting}>
                {submitting ? 'Salvando...' : 'Criar Lançamento'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {accounts.length === 0 && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="py-4 text-center text-sm text-warning">
            Primeiro crie o Plano de Contas na aba correspondente
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-auto max-h-[500px]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border">
                  <th className="text-left p-3">Nº</th>
                  <th className="text-left p-3">Data</th>
                  <th className="text-left p-3">Descrição</th>
                  <th className="text-left p-3">Referência</th>
                  <th className="text-right p-3">Débito</th>
                  <th className="text-right p-3">Crédito</th>
                  <th className="text-center p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(e => (
                  <tr key={e.id} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="p-3 font-mono text-muted-foreground">#{e.entry_number}</td>
                    <td className="p-3">{formatDate(e.entry_date)}</td>
                    <td className="p-3 font-medium max-w-[200px] truncate">{e.description}</td>
                    <td className="p-3 text-muted-foreground">{e.reference || '-'}</td>
                    <td className="p-3 text-right font-mono">{formatCurrency(e.total_debit)}</td>
                    <td className="p-3 text-right font-mono">{formatCurrency(e.total_credit)}</td>
                    <td className="p-3 text-center">
                      <Badge variant={e.status === 'posted' ? 'default' : 'secondary'}>
                        {e.status === 'posted' ? 'Lançado' : 'Rascunho'}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {entries.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">Nenhum lançamento encontrado</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default JournalEntries;
