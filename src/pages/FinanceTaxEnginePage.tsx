import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/SaaSAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import {
  Calculator, TrendingUp, DollarSign, AlertTriangle, Shield,
  FileDown, RefreshCw, CheckCircle, Clock, XCircle, BarChart3,
  Users, ShoppingCart, Truck, Banknote,
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { toast } from 'sonner';
import { downloadFiscalPdfA4 } from '@/lib/generateFiscalPdfA4';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface TaxCalc {
  id: string;
  tax_type: string;
  period_start: string;
  period_end: string;
  base_amount: number;
  tax_rate: number;
  tax_amount: number;
  status: string;
  paid_at: string | null;
  notes: string | null;
}

interface FinScore {
  score: number;
  revenue: number;
  expenses: number;
  profit: number;
  taxes_paid_on_time: number;
  taxes_total: number;
  period_month: number;
  period_year: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const TAX_LABELS: Record<string, string> = {
  iva: 'IVA (16%)',
  irpc: 'IRPC (3%)',
  inss_employee: 'INSS — Trabalhador (3%)',
  inss_employer: 'INSS — Empresa (4%)',
};

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pendente', variant: 'secondary' },
  paid: { label: 'Pago', variant: 'default' },
  overdue: { label: 'Atrasado', variant: 'destructive' },
};

const currentMonth = () => {
  const d = new Date();
  return { month: d.getMonth() + 1, year: d.getFullYear() };
};

const periodLabel = (m: number, y: number) => {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[m - 1]} ${y}`;
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const FinanceTaxEnginePage: React.FC = () => {
  const { role, company } = useAuth();
  const isAdmin = role === 'admin' || (role as string) === 'ceo';

  const [tab, setTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);

  // Data
  const [taxCalcs, setTaxCalcs] = useState<TaxCalc[]>([]);
  const [scores, setScores] = useState<FinScore[]>([]);

  // Aggregates from live queries
  const [salesTotal, setSalesTotal] = useState(0);
  const [salesProfit, setSalesProfit] = useState(0);
  const [expensesTotal, setExpensesTotal] = useState(0);
  const [payrollTotal, setPayrollTotal] = useState(0);

  const { month, year } = currentMonth();

  /* ----- Fetch all data ----- */
  const fetchData = useCallback(async () => {
    if (!company) return;
    setLoading(true);

    const startDate = new Date(year, month - 1, 1).toISOString();
    const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

    const [salesRes, expRes, payRes, taxRes, scoreRes] = await Promise.all([
      supabase
        .from('sales')
        .select('total, profit')
        .eq('status', 'completed')
        .gte('created_at', startDate)
        .lte('created_at', endDate),
      supabase
        .from('expenses')
        .select('amount')
        .eq('company_id', company.id)
        .gte('expense_date', startDate.slice(0, 10))
        .lte('expense_date', endDate.slice(0, 10)),
      supabase
        .from('payroll_runs')
        .select('net_salary, inss_employee, inss_employer')
        .eq('company_id', company.id)
        .gte('created_at', startDate)
        .lte('created_at', endDate),
      supabase
        .from('tax_calculations')
        .select('*')
        .eq('company_id', company.id)
        .order('period_start', { ascending: false })
        .limit(50),
      supabase
        .from('financial_scores')
        .select('*')
        .eq('company_id', company.id)
        .order('period_year', { ascending: false })
        .order('period_month', { ascending: false })
        .limit(12),
    ]);

    const sales = salesRes.data || [];
    setSalesTotal(sales.reduce((s, r) => s + Number(r.total || 0), 0));
    setSalesProfit(sales.reduce((s, r) => s + Number(r.profit || 0), 0));
    setExpensesTotal((expRes.data || []).reduce((s, r) => s + Number(r.amount || 0), 0));

    const payrolls = payRes.data || [];
    setPayrollTotal(payrolls.reduce((s, r) => s + Number(r.net_salary || 0), 0));

    setTaxCalcs((taxRes.data as TaxCalc[]) || []);
    setScores((scoreRes.data as FinScore[]) || []);
    setLoading(false);
  }, [company, month, year]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ----- Calculate taxes for current month ----- */
  const handleCalculateTaxes = async () => {
    if (!company) return;
    setCalculating(true);

    const startDate = new Date(year, month - 1, 1).toISOString().slice(0, 10);
    const endDate = new Date(year, month, 0).toISOString().slice(0, 10);

    // Fetch CMV (cost of goods sold) for the period
    const startDateISO = `${startDate}T00:00:00`;
    const endDateISO = `${endDate}T23:59:59`;
    const { data: saleItemsData } = await supabase
      .from('sale_items')
      .select('cost_price, quantity')
      .gte('created_at', startDateISO)
      .lte('created_at', endDateISO);
    const cmv = (saleItemsData || []).reduce((s, i) => s + (Number(i.cost_price || 0) * Number(i.quantity || 0)), 0);

    // Check for incomplete data
    const hasIncompleteData = cmv === 0 && salesTotal > 0;

    // IVA = 16% of sales
    const ivaAmount = salesTotal * 0.16;
    // Lucro = Receita - CMV - Despesas - Salários (fórmula correta)
    const realProfit = salesTotal - cmv - expensesTotal - payrollTotal;
    // IRPC = 3% of profit (only if positive)
    const irpcAmount = realProfit > 0 ? realProfit * 0.03 : 0;
    // INSS from payroll
    const payrolls = await supabase
      .from('payroll_runs')
      .select('inss_employee, inss_employer')
      .eq('company_id', company.id)
      .gte('created_at', `${startDate}T00:00:00`)
      .lte('created_at', `${endDate}T23:59:59`);

    const pr = payrolls.data || [];
    const inssEmp = pr.reduce((s, r) => s + Number(r.inss_employee || 0), 0);
    const inssEr = pr.reduce((s, r) => s + Number(r.inss_employer || 0), 0);

    const taxes = [
      { tax_type: 'iva', base_amount: salesTotal, tax_rate: 16, tax_amount: ivaAmount },
      { tax_type: 'irpc', base_amount: realProfit, tax_rate: 3, tax_amount: irpcAmount },
      { tax_type: 'inss_employee', base_amount: payrollTotal, tax_rate: 3, tax_amount: inssEmp || payrollTotal * 0.03 },
      { tax_type: 'inss_employer', base_amount: payrollTotal, tax_rate: 4, tax_amount: inssEr || payrollTotal * 0.04 },
    ];

    // Delete existing calcs for this period then insert new
    await supabase
      .from('tax_calculations')
      .delete()
      .eq('company_id', company.id)
      .eq('period_start', startDate);

    const { error } = await supabase.from('tax_calculations').insert(
      taxes.map(t => ({
        company_id: company.id,
        period_start: startDate,
        period_end: endDate,
        ...t,
        status: 'pending',
      }))
    );

    if (error) {
      toast.error('Erro ao calcular impostos');
    } else {
      if (hasIncompleteData) {
        toast.warning('⚠️ Dados fiscais incompletos — CMV não registado. Lucro pode estar inflacionado.');
      }
      // Also upsert financial score
      const totalTaxes = taxCalcs.filter(t => t.period_start >= `${year}-01-01`).length;
      const paidOnTime = taxCalcs.filter(t => t.status === 'paid').length;

      const profitMargin = salesTotal > 0 ? (realProfit / salesTotal) * 100 : 0;
      const paymentScore = totalTaxes > 0 ? (paidOnTime / totalTaxes) * 40 : 20;
      const profitScore = Math.min(30, Math.max(0, profitMargin));
      const consistencyScore = salesTotal > 0 ? 30 : 0;
      const score = Math.round(paymentScore + profitScore + consistencyScore);

      await supabase.from('financial_scores').upsert({
        company_id: company.id,
        period_month: month,
        period_year: year,
        score: Math.min(100, score),
        revenue: salesTotal,
        expenses: expensesTotal + cmv + payrollTotal,
        profit: realProfit,
        taxes_paid_on_time: paidOnTime,
        taxes_total: totalTaxes + 4,
      }, { onConflict: 'company_id,period_month,period_year' });

      toast.success('Impostos calculados com sucesso');
      fetchData();
    }
    setCalculating(false);
  };

  /* ----- Mark as paid ----- */
  const handleMarkPaid = async (id: string) => {
    await supabase.from('tax_calculations').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', id);
    toast.success('Imposto marcado como pago');
    fetchData();
  };

  /* ----- Derived stats ----- */
  const totalTaxDue = useMemo(() =>
    taxCalcs.filter(t => t.status === 'pending' || t.status === 'overdue').reduce((s, t) => s + t.tax_amount, 0)
  , [taxCalcs]);

  const latestScore = scores[0];
  const profit = salesTotal - expensesTotal;

  const scoreColor = (s: number) => s >= 70 ? 'text-green-600' : s >= 40 ? 'text-amber-600' : 'text-destructive';

  /* ----- Alerts ----- */
  const alerts = useMemo(() => {
    const a: { level: 'warning' | 'critical'; msg: string }[] = [];
    if (totalTaxDue > 0) a.push({ level: 'warning', msg: `${formatCurrency(totalTaxDue)} em impostos pendentes este mês` });
    if (profit < 0) a.push({ level: 'critical', msg: `Prejuízo de ${formatCurrency(Math.abs(profit))} no período` });
    taxCalcs.filter(t => t.status === 'overdue').forEach(t =>
      a.push({ level: 'critical', msg: `${TAX_LABELS[t.tax_type] || t.tax_type} está atrasado` })
    );
    if (latestScore && latestScore.score < 40) a.push({ level: 'critical', msg: 'Score financeiro crítico — atenção imediata necessária' });
    return a;
  }, [totalTaxDue, profit, taxCalcs, latestScore]);

  /* ----- DRE data ----- */
  const dre = useMemo(() => {
    const ivaCalc = taxCalcs.find(t => t.tax_type === 'iva' && t.period_start >= `${year}-${String(month).padStart(2, '0')}-01`);
    const irpcCalc = taxCalcs.find(t => t.tax_type === 'irpc' && t.period_start >= `${year}-${String(month).padStart(2, '0')}-01`);
    const totalTax = (ivaCalc?.tax_amount || 0) + (irpcCalc?.tax_amount || 0);
    return {
      revenue: salesTotal,
      expenses: expensesTotal,
      payroll: payrollTotal,
      grossProfit: salesTotal - expensesTotal,
      taxes: totalTax,
      netProfit: salesTotal - expensesTotal - totalTax - payrollTotal,
    };
  }, [salesTotal, expensesTotal, payrollTotal, taxCalcs, month, year]);

  /* ----- Export PDF ----- */
  const handleExportDRE = () => {
    downloadFiscalPdfA4({
      companyName: company?.name || 'Empresa',
      companyNif: (company as any)?.nif || '',
      companyAddress: (company as any)?.address || '',
      companyPhone: (company as any)?.phone || '',
      regime: { label: 'DRE', rate: 0, description: 'Demonstração de Resultados do Exercício' },
      periodLabel: periodLabel(month, year),
      totalRevenue: dre.revenue,
      totalDiscount: 0,
      taxDue: dre.taxes,
      netRevenue: dre.netProfit,
      totalSales: 0,
      byMethod: {
        'Receita Bruta': dre.revenue,
        'Despesas': dre.expenses,
        'Salários': dre.payroll,
        'Impostos': dre.taxes,
      },
      getMethodLabel: (m: string) => m,
    });
    toast.success('DRE exportado em PDF');
  };

  /* ----- Access check ----- */
  if (!isAdmin) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full text-center p-8">
          <AlertTriangle className="w-12 h-12 text-warning mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground">Apenas Administradores e CEOs podem acessar o motor fiscal.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Calculator className="w-7 h-7" /> Finance & Tax Engine
          </h1>
          <p className="text-muted-foreground">{company?.name} — Cálculo automático de impostos e análise financeira</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleCalculateTaxes} disabled={calculating}>
            <RefreshCw className={`w-4 h-4 mr-2 ${calculating ? 'animate-spin' : ''}`} />
            {calculating ? 'Calculando...' : 'Calcular Impostos'}
          </Button>
          <Button variant="outline" onClick={handleExportDRE}>
            <FileDown className="w-4 h-4 mr-2" /> DRE PDF
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a, i) => (
            <div key={i} className={`flex items-center gap-2 p-3 rounded-lg ${a.level === 'critical' ? 'bg-destructive/10 text-destructive' : 'bg-amber-500/10 text-amber-700'}`}>
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span className="text-sm font-medium">{a.msg}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="taxes">Impostos</TabsTrigger>
          <TabsTrigger value="dre">DRE</TabsTrigger>
          <TabsTrigger value="score">Score Financeiro</TabsTrigger>
        </TabsList>

        {/* ---- DASHBOARD ---- */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <KPICard icon={DollarSign} label="Receita Mensal" value={formatCurrency(salesTotal)} />
            <KPICard icon={Truck} label="Despesas" value={formatCurrency(expensesTotal)} color="text-amber-600" />
            <KPICard icon={TrendingUp} label="Lucro Estimado" value={formatCurrency(profit)} color={profit >= 0 ? 'text-green-600' : 'text-destructive'} />
            <KPICard icon={Banknote} label="Impostos a Pagar" value={formatCurrency(totalTaxDue)} color="text-destructive" />
            <KPICard icon={Shield} label="Score Financeiro" value={latestScore ? `${latestScore.score}/100` : '—'} color={latestScore ? scoreColor(latestScore.score) : ''} />
          </div>

          {/* Integration sources */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><ShoppingCart className="w-4 h-4" /> PDV — Vendas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(salesTotal)}</p>
                <p className="text-xs text-muted-foreground">Lucro bruto: {formatCurrency(salesProfit)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Truck className="w-4 h-4" /> Compras & Despesas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(expensesTotal)}</p>
                <p className="text-xs text-muted-foreground">Custos operacionais do mês</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4" /> RH — Salários</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(payrollTotal)}</p>
                <p className="text-xs text-muted-foreground">Folha salarial líquida</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ---- TAXES ---- */}
        <TabsContent value="taxes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Obrigações Fiscais — {periodLabel(month, year)}</CardTitle>
            </CardHeader>
            <CardContent>
              {taxCalcs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhum cálculo gerado. Clique em "Calcular Impostos" para gerar.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Imposto</TableHead>
                      <TableHead>Base</TableHead>
                      <TableHead>Taxa</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {taxCalcs.map(t => {
                      const st = STATUS_MAP[t.status] || STATUS_MAP.pending;
                      return (
                        <TableRow key={t.id}>
                          <TableCell className="font-medium">{TAX_LABELS[t.tax_type] || t.tax_type}</TableCell>
                          <TableCell>{formatCurrency(t.base_amount)}</TableCell>
                          <TableCell>{t.tax_rate}%</TableCell>
                          <TableCell className="font-bold">{formatCurrency(t.tax_amount)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{t.period_start} → {t.period_end}</TableCell>
                          <TableCell>
                            <Badge variant={st.variant}>{st.label}</Badge>
                          </TableCell>
                          <TableCell>
                            {t.status === 'pending' && (
                              <Button size="sm" variant="outline" onClick={() => handleMarkPaid(t.id)}>
                                <CheckCircle className="w-3 h-3 mr-1" /> Pagar
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- DRE ---- */}
        <TabsContent value="dre" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Demonstração de Resultados — {periodLabel(month, year)}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-w-lg">
                <DRELine label="Receita Bruta" value={dre.revenue} bold />
                <DRELine label="(-) Despesas Operacionais" value={-dre.expenses} />
                <hr className="border-border" />
                <DRELine label="Lucro Bruto" value={dre.grossProfit} bold color={dre.grossProfit >= 0 ? 'text-green-600' : 'text-destructive'} />
                <DRELine label="(-) Salários" value={-dre.payroll} />
                <DRELine label="(-) Impostos" value={-dre.taxes} />
                <hr className="border-border" />
                <DRELine label="Resultado Líquido" value={dre.netProfit} bold color={dre.netProfit >= 0 ? 'text-green-600' : 'text-destructive'} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- SCORE ---- */}
        <TabsContent value="score" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="w-5 h-5" /> Score Financeiro
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {latestScore ? (
                <>
                  <div className="flex items-center gap-6">
                    <div className={`text-5xl font-bold ${scoreColor(latestScore.score)}`}>{latestScore.score}</div>
                    <div>
                      <p className="text-sm text-muted-foreground">de 100 pontos</p>
                      <p className="text-sm font-medium">
                        {latestScore.score >= 70 ? 'Saúde financeira boa' : latestScore.score >= 40 ? 'Atenção necessária' : 'Risco financeiro'}
                      </p>
                    </div>
                  </div>
                  <Progress value={latestScore.score} className="h-3" />
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Receita</p>
                      <p className="font-bold">{formatCurrency(latestScore.revenue)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Despesas</p>
                      <p className="font-bold">{formatCurrency(latestScore.expenses)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Lucro</p>
                      <p className={`font-bold ${latestScore.profit >= 0 ? 'text-green-600' : 'text-destructive'}`}>{formatCurrency(latestScore.profit)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Impostos em dia</p>
                      <p className="font-bold">{latestScore.taxes_paid_on_time}/{latestScore.taxes_total}</p>
                    </div>
                  </div>

                  {/* Score criteria */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Critérios do Score</p>
                    <ScoreCriteria label="Pagamentos em dia" max={40} value={latestScore.taxes_total > 0 ? Math.round((latestScore.taxes_paid_on_time / latestScore.taxes_total) * 40) : 20} />
                    <ScoreCriteria label="Margem de lucro" max={30} value={Math.min(30, Math.max(0, Math.round(latestScore.revenue > 0 ? ((latestScore.profit / latestScore.revenue) * 100) : 0)))} />
                    <ScoreCriteria label="Consistência operacional" max={30} value={latestScore.revenue > 0 ? 30 : 0} />
                  </div>
                </>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum score calculado. Clique em "Calcular Impostos" para gerar o score financeiro.
                </p>
              )}

              {/* History */}
              {scores.length > 1 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Histórico</p>
                  <div className="flex gap-2 flex-wrap">
                    {scores.map((s, i) => (
                      <div key={i} className="text-center px-3 py-2 rounded-lg bg-muted/30">
                        <p className="text-xs text-muted-foreground">{periodLabel(s.period_month, s.period_year)}</p>
                        <p className={`text-lg font-bold ${scoreColor(s.score)}`}>{s.score}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

const KPICard: React.FC<{ icon: React.ElementType; label: string; value: string; color?: string }> = ({ icon: Icon, label, value, color }) => (
  <Card className="p-4">
    <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
      <Icon className="w-4 h-4" /> {label}
    </div>
    <p className={`text-xl font-bold ${color || ''}`}>{value}</p>
  </Card>
);

const DRELine: React.FC<{ label: string; value: number; bold?: boolean; color?: string }> = ({ label, value, bold, color }) => (
  <div className="flex justify-between items-center">
    <span className={`text-sm ${bold ? 'font-bold' : 'text-muted-foreground'}`}>{label}</span>
    <span className={`text-sm ${bold ? 'font-bold' : ''} ${color || ''}`}>{formatCurrency(Math.abs(value))}</span>
  </div>
);

const ScoreCriteria: React.FC<{ label: string; max: number; value: number }> = ({ label, max, value }) => (
  <div className="flex items-center gap-3">
    <span className="text-xs w-40 text-muted-foreground">{label}</span>
    <Progress value={(value / max) * 100} className="h-2 flex-1" />
    <span className="text-xs font-bold w-12 text-right">{value}/{max}</span>
  </div>
);

export default FinanceTaxEnginePage;
