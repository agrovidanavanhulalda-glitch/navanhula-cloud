import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, DollarSign, Receipt, RefreshCw, Download, Calculator, Users, BookOpen, CreditCard, ArrowDownLeft, FileText } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import EmployeeManagement from '@/components/hr/EmployeeManagement';
import PayrollProcessing from '@/components/hr/PayrollProcessing';
import ExpensesManager from '@/components/finance/ExpensesManager';
import AccountsPayableManager from '@/components/finance/AccountsPayableManager';
import AccountsReceivableManager from '@/components/finance/AccountsReceivableManager';
import ChartOfAccounts from '@/components/accounting/ChartOfAccounts';
import JournalEntries from '@/components/accounting/JournalEntries';

interface AccountingEntry {
  id: string;
  type: string;
  category: string;
  amount: number;
  description: string | null;
  created_at: string;
  store_id: string | null;
}

const CHART_COLORS = ['hsl(217, 91%, 60%)', 'hsl(142, 76%, 36%)', 'hsl(38, 92%, 50%)', 'hsl(0, 84%, 60%)'];

const AccountingPage: React.FC = () => {
  const { user, company } = useAuth();
  const [entries, setEntries] = useState<AccountingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');
  const companyId = (user as any)?.company_id || (user as any)?.user_metadata?.company_id || company?.id;

  const loadData = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const startDate = period === 'month' 
        ? new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
        : period === 'quarter'
        ? new Date(new Date().getFullYear(), Math.floor(new Date().getMonth() / 3) * 3, 1).toISOString()
        : new Date(new Date().getFullYear(), 0, 1).toISOString();

      const { data, error } = await supabase
        .from('accounting_entries')
        .select('*')
        .eq('company_id', companyId)
        .gte('created_at', startDate)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setEntries((data as unknown as AccountingEntry[]) || []);
    } catch (e) {
      console.error('Accounting load error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    if (companyId) loadData(); 
  }, [period, companyId]);

  const revenue = entries.filter(e => e.type === 'revenue').reduce((s, e) => s + Number(e.amount), 0);
  const expenses = entries.filter(e => e.type === 'expense').reduce((s, e) => s + Number(e.amount), 0);
  const taxes = entries.filter(e => e.type === 'tax').reduce((s, e) => s + Number(e.amount), 0);
  const netProfit = revenue - expenses - taxes;

  const fiscalRate = company ? Number((company as any).fiscal_rate || 3) : 3;
  const estimatedTax = revenue * (fiscalRate / 100);

  const dreData = [
    { label: 'Receita Bruta', value: revenue, type: 'positive' },
    { label: 'Despesas Operacionais', value: -expenses, type: 'negative' },
    { label: 'Lucro Operacional', value: revenue - expenses, type: revenue - expenses >= 0 ? 'positive' : 'negative' },
    { label: 'Impostos (' + fiscalRate + '%)', value: -estimatedTax, type: 'negative' },
    { label: 'Lucro Líquido', value: revenue - expenses - estimatedTax, type: (revenue - expenses - estimatedTax) >= 0 ? 'positive' : 'negative' },
  ];

  const categoryBreakdown = entries.reduce((acc, e) => {
    const key = e.category || 'general';
    acc[key] = (acc[key] || 0) + Number(e.amount);
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(categoryBreakdown).map(([name, value]) => ({ name, value }));

  const dailyData = entries
    .filter(e => e.type === 'revenue')
    .reduce((acc, e) => {
      const day = new Date(e.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      acc[day] = (acc[day] || 0) + Number(e.amount);
      return acc;
    }, {} as Record<string, number>);

  const barData = Object.entries(dailyData).map(([day, total]) => ({ day, total })).reverse().slice(0, 30);

  // Livro Caixa
  const cashBookEntries = entries.map(e => ({
    ...e,
    entrada: e.type === 'revenue' ? Number(e.amount) : 0,
    saida: e.type !== 'revenue' ? Number(e.amount) : 0,
  }));

  let runningBalance = 0;
  const cashBookWithBalance = [...cashBookEntries].reverse().map(e => {
    runningBalance += e.entrada - e.saida;
    return { ...e, saldo: runningBalance };
  }).reverse();

  const exportCSV = () => {
    const rows = ['Data,Tipo,Categoria,Valor,Descrição'];
    entries.forEach(e => {
      rows.push(`${new Date(e.created_at).toLocaleDateString('pt-BR')},${e.type},${e.category},${e.amount},"${e.description || ''}"`);
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contabilidade_${period}.csv`;
    a.click();
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Contabilidade & Finanças</h1>
          <p className="text-muted-foreground">Gestão financeira completa da empresa</p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Mensal</SelectItem>
              <SelectItem value="quarter">Trimestral</SelectItem>
              <SelectItem value="year">Anual</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportCSV}><Download className="w-4 h-4 mr-2" /> CSV</Button>
          <Button variant="outline" onClick={loadData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Atualizar
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><TrendingUp className="w-4 h-4" /> Receita</div>
          <p className="text-2xl font-bold text-primary">{formatCurrency(revenue)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><TrendingDown className="w-4 h-4" /> Despesas</div>
          <p className="text-2xl font-bold text-destructive">{formatCurrency(expenses)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><Calculator className="w-4 h-4" /> Impostos ({fiscalRate}%)</div>
          <p className="text-2xl font-bold text-warning">{formatCurrency(estimatedTax)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><DollarSign className="w-4 h-4" /> Lucro Líquido</div>
          <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>{formatCurrency(netProfit)}</p>
        </Card>
      </div>

      <Tabs defaultValue="dre">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="dre"><Receipt className="w-4 h-4 mr-1" /> DRE</TabsTrigger>
          <TabsTrigger value="cashbook"><BookOpen className="w-4 h-4 mr-1" /> Livro Caixa</TabsTrigger>
          <TabsTrigger value="expenses"><TrendingDown className="w-4 h-4 mr-1" /> Despesas</TabsTrigger>
          <TabsTrigger value="payable"><CreditCard className="w-4 h-4 mr-1" /> Contas a Pagar</TabsTrigger>
          <TabsTrigger value="receivable"><ArrowDownLeft className="w-4 h-4 mr-1" /> Contas a Receber</TabsTrigger>
          <TabsTrigger value="entries">Lançamentos</TabsTrigger>
          <TabsTrigger value="chart"><BookOpen className="w-4 h-4 mr-1" /> Plano de Contas</TabsTrigger>
          <TabsTrigger value="journal"><FileText className="w-4 h-4 mr-1" /> Diário</TabsTrigger>
          <TabsTrigger value="employees"><Users className="w-4 h-4 mr-1" /> Funcionários</TabsTrigger>
          <TabsTrigger value="payroll"><Calculator className="w-4 h-4 mr-1" /> Folha Salarial</TabsTrigger>
        </TabsList>

        <TabsContent value="dre" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Receipt className="w-5 h-5" /> Demonstração de Resultados</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dreData.map((item, i) => (
                    <div key={i} className={`flex justify-between p-3 rounded-lg ${i === dreData.length - 1 ? 'bg-primary/10 font-bold' : 'bg-muted/30'}`}>
                      <span className="text-sm">{item.label}</span>
                      <span className={`font-mono ${item.type === 'positive' ? 'text-success' : 'text-destructive'}`}>
                        {formatCurrency(Math.abs(item.value))}
                      </span>
                    </div>
                  ))}
                </div>
                
                <div className=\"mt-8 space-y-2\">
                  <h4 className=\"text-sm font-bold uppercase tracking-wider text-muted-foreground\">Detalhamento de Despesas</h4>
                  <div className=\"divide-y border rounded-lg overflow-hidden\">
                    {Object.entries(categoryBreakdown).map(([cat, val], i) => (
                      <div key={i} className=\"flex justify-between p-3 bg-white text-sm\">
                        <span className=\"capitalize\">{cat}</span>
                        <span className=\"font-mono text-destructive\">{formatCurrency(val)}</span>
                      </div>
                    ))}
                    {Object.keys(categoryBreakdown).length === 0 && (
                      <div className=\"p-4 text-center text-muted-foreground text-xs\">Sem despesas registradas</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-lg">Distribuição por Categoria</CardTitle></CardHeader>
              <CardContent>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[280px] flex items-center justify-center text-muted-foreground">Sem dados</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cashbook" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><BookOpen className="w-5 h-5" /> Livro Caixa</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-auto max-h-[600px]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b border-border">
                      <th className="text-left p-3">Data</th>
                      <th className="text-left p-3">Tipo</th>
                      <th className="text-left p-3">Descrição</th>
                      <th className="text-right p-3 text-success">Entrada</th>
                      <th className="text-right p-3 text-destructive">Saída</th>
                      <th className="text-right p-3 font-bold">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cashBookWithBalance.map(e => (
                      <tr key={e.id} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="p-3">{new Date(e.created_at).toLocaleDateString('pt-BR')}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-xs ${e.type === 'revenue' ? 'bg-success/20 text-success' : e.type === 'expense' ? 'bg-destructive/20 text-destructive' : 'bg-warning/20 text-warning'}`}>
                            {e.type === 'revenue' ? 'Receita' : e.type === 'expense' ? 'Despesa' : 'Imposto'}
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground truncate max-w-[200px]">{e.description || '-'}</td>
                        <td className="p-3 text-right font-mono text-success">{e.entrada > 0 ? formatCurrency(e.entrada) : '-'}</td>
                        <td className="p-3 text-right font-mono text-destructive">{e.saida > 0 ? formatCurrency(e.saida) : '-'}</td>
                        <td className={`p-3 text-right font-mono font-bold ${e.saldo >= 0 ? 'text-foreground' : 'text-destructive'}`}>{formatCurrency(e.saldo)}</td>
                      </tr>
                    ))}
                    {cashBookWithBalance.length === 0 && (
                      <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">Nenhum lançamento no período</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="mt-4">
          <ExpensesManager />
        </TabsContent>

        <TabsContent value="payable" className="mt-4">
          <AccountsPayableManager />
        </TabsContent>

        <TabsContent value="receivable" className="mt-4">
          <AccountsReceivableManager />
        </TabsContent>

        <TabsContent value="entries" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-auto max-h-[500px]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b border-border">
                      <th className="text-left p-3">Data</th>
                      <th className="text-left p-3">Tipo</th>
                      <th className="text-left p-3">Categoria</th>
                      <th className="text-right p-3">Valor</th>
                      <th className="text-left p-3">Descrição</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map(e => (
                      <tr key={e.id} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="p-3">{new Date(e.created_at).toLocaleDateString('pt-BR')}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-xs ${e.type === 'revenue' ? 'bg-success/20 text-success' : e.type === 'expense' ? 'bg-destructive/20 text-destructive' : 'bg-warning/20 text-warning'}`}>
                            {e.type === 'revenue' ? 'Receita' : e.type === 'expense' ? 'Despesa' : 'Imposto'}
                          </span>
                        </td>
                        <td className="p-3 capitalize">{e.category}</td>
                        <td className="p-3 text-right font-mono">{formatCurrency(e.amount)}</td>
                        <td className="p-3 text-muted-foreground truncate max-w-[200px]">{e.description || '-'}</td>
                      </tr>
                    ))}
                    {entries.length === 0 && (
                      <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">Nenhum lançamento encontrado</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chart" className="mt-4">
          <ChartOfAccounts />
        </TabsContent>

        <TabsContent value="journal" className="mt-4">
          <JournalEntries />
        </TabsContent>

        <TabsContent value="employees" className="mt-4">
          <EmployeeManagement />
        </TabsContent>

        <TabsContent value="payroll" className="mt-4">
          <PayrollProcessing />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AccountingPage;
