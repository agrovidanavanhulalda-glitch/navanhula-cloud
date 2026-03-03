import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SaaSAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, DollarSign, Receipt, RefreshCw, Download, Calculator } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

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
  const { company } = useAuth();
  const [entries, setEntries] = useState<AccountingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');

  const loadData = async () => {
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

  useEffect(() => { loadData(); }, [period]);

  const revenue = entries.filter(e => e.type === 'revenue').reduce((s, e) => s + Number(e.amount), 0);
  const expenses = entries.filter(e => e.type === 'expense').reduce((s, e) => s + Number(e.amount), 0);
  const taxes = entries.filter(e => e.type === 'tax').reduce((s, e) => s + Number(e.amount), 0);
  const netProfit = revenue - expenses - taxes;

  const fiscalRate = company ? Number((company as any).fiscal_rate || 3) : 3;
  const estimatedTax = revenue * (fiscalRate / 100);

  // DRE data
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

  // Daily revenue chart
  const dailyData = entries
    .filter(e => e.type === 'revenue')
    .reduce((acc, e) => {
      const day = new Date(e.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      acc[day] = (acc[day] || 0) + Number(e.amount);
      return acc;
    }, {} as Record<string, number>);

  const barData = Object.entries(dailyData).map(([day, total]) => ({ day, total })).reverse().slice(0, 30);

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
          <h1 className="text-2xl md:text-3xl font-bold">Contabilidade</h1>
          <p className="text-muted-foreground">Demonstração de Resultados e Fluxo de Caixa</p>
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
        <Card className="pos-stat">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><TrendingUp className="w-4 h-4" /> Receita</div>
          <p className="text-2xl font-bold text-primary pos-money">{formatCurrency(revenue)}</p>
        </Card>
        <Card className="pos-stat">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><TrendingDown className="w-4 h-4" /> Despesas</div>
          <p className="text-2xl font-bold text-destructive">{formatCurrency(expenses)}</p>
        </Card>
        <Card className="pos-stat">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><Calculator className="w-4 h-4" /> Impostos ({fiscalRate}%)</div>
          <p className="text-2xl font-bold text-warning">{formatCurrency(estimatedTax)}</p>
        </Card>
        <Card className="pos-stat">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><DollarSign className="w-4 h-4" /> Lucro Líquido</div>
          <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>{formatCurrency(netProfit)}</p>
        </Card>
      </div>

      <Tabs defaultValue="dre">
        <TabsList>
          <TabsTrigger value="dre">DRE</TabsTrigger>
          <TabsTrigger value="flow">Fluxo de Caixa</TabsTrigger>
          <TabsTrigger value="entries">Lançamentos</TabsTrigger>
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

        <TabsContent value="flow" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Receita Diária</CardTitle></CardHeader>
            <CardContent>
              {barData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 22%)" />
                    <XAxis dataKey="day" tick={{ fill: 'hsl(215, 20%, 65%)', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'hsl(215, 20%, 65%)', fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: 'hsl(222, 47%, 14%)', border: '1px solid hsl(217, 33%, 22%)' }} />
                    <Bar dataKey="total" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} name="Receita" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[350px] flex items-center justify-center text-muted-foreground">Sem dados de receita</div>
              )}
            </CardContent>
          </Card>
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
      </Tabs>
    </div>
  );
};

export default AccountingPage;
