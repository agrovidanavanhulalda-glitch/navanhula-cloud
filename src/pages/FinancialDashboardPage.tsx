import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig,
} from '@/components/ui/chart';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line,
  PieChart, Pie, Cell, ResponsiveContainer, Area, AreaChart,
} from 'recharts';
import {
  TrendingUp, TrendingDown, DollarSign, Wallet, CreditCard,
  ArrowDownCircle, ArrowUpCircle, RefreshCw, AlertTriangle,
  FileText, BarChart3, PieChart as PieIcon, Activity,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { useFinancialDashboard } from '@/hooks/useFinancialDashboard';

const PERIOD_OPTIONS = [
  { value: 'today', label: 'Hoje' },
  { value: 'week', label: 'Esta Semana' },
  { value: 'month', label: 'Este Mês' },
  { value: 'quarter', label: 'Trimestre' },
  { value: 'year', label: 'Este Ano' },
];

function getDateRange(period: string): [Date, Date] {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  let start: Date;
  switch (period) {
    case 'today': start = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break;
    case 'week': start = new Date(now); start.setDate(now.getDate() - now.getDay()); start.setHours(0, 0, 0, 0); break;
    case 'quarter': start = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1); break;
    case 'year': start = new Date(now.getFullYear(), 0, 1); break;
    default: start = new Date(now.getFullYear(), now.getMonth(), 1); break;
  }
  return [start, end];
}

const CATEGORY_LABELS: Record<string, string> = {
  sales: 'Vendas', purchase: 'Compras', salary: 'Salários', rent: 'Aluguel',
  utilities: 'Utilidades', marketing: 'Marketing', others: 'Outros',
  transport: 'Transporte', maintenance: 'Manutenção', supplies: 'Materiais',
};

const CHART_COLORS = [
  'hsl(var(--primary))', 'hsl(142 76% 36%)', 'hsl(0 84% 60%)',
  'hsl(45 93% 47%)', 'hsl(262 83% 58%)', 'hsl(199 89% 48%)',
];

const chartConfig: ChartConfig = {
  income: { label: 'Receitas', color: 'hsl(142 76% 36%)' },
  expense: { label: 'Despesas', color: 'hsl(0 84% 60%)' },
  balance: { label: 'Saldo', color: 'hsl(var(--primary))' },
};

const FinancialDashboardPage: React.FC = () => {
  const [period, setPeriod] = useState('month');
  const [startDate, endDate] = getDateRange(period);
  const { kpis, dre, cashflow, categoryBreakdown, insights, transactions, loading, refresh } = useFinancialDashboard(startDate, endDate);

  const expenseCategories = categoryBreakdown
    .filter(c => c.type === 'expense')
    .map((c, i) => ({ ...c, fill: CHART_COLORS[i % CHART_COLORS.length], label: CATEGORY_LABELS[c.category] || c.category }));

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-primary" />
            Módulo Financeiro
          </h1>
          <p className="text-sm text-muted-foreground">Lucro real • DRE • Cashflow • Decisão estratégica</p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={refresh} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <Card className="border-yellow-300 bg-yellow-50/50 dark:bg-yellow-950/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 shrink-0" />
              <div className="space-y-1">
                {insights.map((msg, i) => <p key={i} className="text-sm">{msg}</p>)}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard title="Receita Total" value={kpis.totalIncome} icon={<ArrowUpCircle className="w-5 h-5" />} color="text-green-600" />
        <KPICard title="Despesas Totais" value={kpis.totalExpense} icon={<ArrowDownCircle className="w-5 h-5" />} color="text-red-500" />
        <KPICard title="Lucro Líquido" value={kpis.netProfit} icon={kpis.netProfit >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />} color={kpis.netProfit >= 0 ? 'text-green-600' : 'text-red-500'} />
        <KPICard title="Margem %" value={kpis.profitMargin} suffix="%" icon={<Activity className="w-5 h-5" />} color="text-primary" isCurrency={false} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard title="Caixa Disponível" value={kpis.cashBalance} icon={<Wallet className="w-5 h-5" />} color="text-primary" />
        <KPICard title="CMV (COGS)" value={kpis.cogs} icon={<CreditCard className="w-5 h-5" />} color="text-orange-500" />
        <KPICard title="Contas a Pagar" value={kpis.pendingPayable} icon={<ArrowDownCircle className="w-5 h-5" />} color="text-red-400" />
        <KPICard title="Contas a Receber" value={kpis.pendingReceivable} icon={<ArrowUpCircle className="w-5 h-5" />} color="text-blue-500" />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="dre">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="dre"><FileText className="w-4 h-4 mr-1" /> DRE</TabsTrigger>
          <TabsTrigger value="cashflow"><BarChart3 className="w-4 h-4 mr-1" /> Cashflow</TabsTrigger>
          <TabsTrigger value="categories"><PieIcon className="w-4 h-4 mr-1" /> Categorias</TabsTrigger>
          <TabsTrigger value="transactions"><Activity className="w-4 h-4 mr-1" /> Transações</TabsTrigger>
        </TabsList>

        {/* DRE Tab */}
        <TabsContent value="dre">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Demonstração de Resultados (DRE)</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Valor (MT)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dre.map((line, i) => (
                    <TableRow key={i} className={line.separator ? 'border-t-2' : ''}>
                      <TableCell className={`${line.indent ? 'pl-8' : ''} ${line.bold ? 'font-bold' : ''}`}>
                        {line.label}
                      </TableCell>
                      <TableCell className={`text-right ${line.bold ? 'font-bold text-lg' : ''} ${line.value < 0 ? 'text-destructive' : line.value > 0 && line.bold ? 'text-green-600' : ''}`}>
                        {formatCurrency(Math.abs(line.value))}
                        {line.value < 0 && !line.label.startsWith('(') ? ' (-)' : ''}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cashflow Tab */}
        <TabsContent value="cashflow">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Fluxo de Caixa</CardTitle>
            </CardHeader>
            <CardContent>
              {cashflow.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Sem dados de cashflow no período</p>
              ) : (
                <ChartContainer config={chartConfig} className="h-[350px] w-full">
                  <AreaChart data={cashflow}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" fontSize={11} tickFormatter={d => d.slice(5)} />
                    <YAxis fontSize={11} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area type="monotone" dataKey="income" stackId="1" stroke="hsl(142 76% 36%)" fill="hsl(142 76% 36% / 0.3)" name="Receitas" />
                    <Area type="monotone" dataKey="expense" stackId="2" stroke="hsl(0 84% 60%)" fill="hsl(0 84% 60% / 0.3)" name="Despesas" />
                    <Line type="monotone" dataKey="balance" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Saldo Acumulado" />
                  </AreaChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-lg">Despesas por Categoria</CardTitle></CardHeader>
              <CardContent>
                {expenseCategories.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Sem despesas no período</p>
                ) : (
                  <ChartContainer config={chartConfig} className="h-[300px] w-full">
                    <PieChart>
                      <Pie data={expenseCategories} dataKey="amount" nameKey="label" cx="50%" cy="50%" outerRadius={100} label={({ label, percent }) => `${label} ${(percent * 100).toFixed(0)}%`}>
                        {expenseCategories.map((e, i) => <Cell key={i} fill={e.fill} />)}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-lg">Detalhamento</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {categoryBreakdown.map((c, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={c.type === 'income' ? 'default' : 'destructive'} className="text-xs">
                          {c.type === 'income' ? 'Receita' : 'Despesa'}
                        </Badge>
                        <span className="text-sm">{CATEGORY_LABELS[c.category] || c.category}</span>
                      </div>
                      <span className="font-medium text-sm">{formatCurrency(c.amount)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions">
          <Card>
            <CardHeader><CardTitle className="text-lg">Transações Recentes</CardTitle></CardHeader>
            <CardContent className="p-0">
              {transactions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhuma transação no período</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Método</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.slice(0, 100).map((t: any) => (
                        <TableRow key={t.id}>
                          <TableCell className="text-xs">{t.transaction_date}</TableCell>
                          <TableCell>
                            <Badge variant={t.type === 'income' ? 'default' : 'destructive'} className="text-xs">
                              {t.type === 'income' ? '↑ Entrada' : '↓ Saída'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{CATEGORY_LABELS[t.category] || t.category}</TableCell>
                          <TableCell className="text-sm max-w-[200px] truncate">{t.description}</TableCell>
                          <TableCell className="text-xs uppercase">{t.payment_method}</TableCell>
                          <TableCell className={`text-right font-medium ${t.type === 'income' ? 'text-green-600' : 'text-destructive'}`}>
                            {t.type === 'income' ? '+' : '-'}{formatCurrency(Number(t.amount))}
                          </TableCell>
                          <TableCell>
                            <Badge variant={t.status === 'paid' ? 'secondary' : 'outline'} className="text-xs">
                              {t.status === 'paid' ? 'Pago' : 'Pendente'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

function KPICard({ title, value, icon, color, suffix, isCurrency = true }: {
  title: string; value: number; icon: React.ReactNode; color: string; suffix?: string; isCurrency?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">{title}</span>
          <span className={color}>{icon}</span>
        </div>
        <p className={`text-xl font-bold ${color}`}>
          {isCurrency ? formatCurrency(value) : value.toFixed(1)}{suffix || ''}
        </p>
      </CardContent>
    </Card>
  );
}

export default FinancialDashboardPage;
