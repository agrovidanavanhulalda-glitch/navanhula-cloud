import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/SaaSAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  DollarSign, TrendingUp, TrendingDown, Users, Calculator, BookOpen,
  Receipt, RefreshCw, Download, FileDown, Shield, AlertTriangle,
  CreditCard, ArrowDownLeft, FileText, Banknote, CheckCircle, Clock,
  ShoppingCart, Truck, BarChart3, UserCheck, Award,
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { toast } from 'sonner';
import { SkeletonKPI } from '@/components/ui/skeleton-card';

// Sub-components
import EmployeeManagement from '@/components/hr/EmployeeManagement';
import PayrollProcessing from '@/components/hr/PayrollProcessing';
import AttendanceManager from '@/components/hr/AttendanceManager';
import ExpensesManager from '@/components/finance/ExpensesManager';
import AccountsPayableManager from '@/components/finance/AccountsPayableManager';
import AccountsReceivableManager from '@/components/finance/AccountsReceivableManager';
import ChartOfAccounts from '@/components/accounting/ChartOfAccounts';
import JournalEntries from '@/components/accounting/JournalEntries';
import CommissionsManager from '@/components/hr/CommissionsManager';
import { useFinancialAggregator } from '@/hooks/useFinancialAggregator';
import { downloadFiscalPdfA4 } from '@/lib/generateFiscalPdfA4';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const periodLabel = (m: number, y: number) => `${MONTHS_PT[m - 1]} ${y}`;

interface TaxCalc {
  id: string; tax_type: string; period_start: string; period_end: string;
  base_amount: number; tax_rate: number; tax_amount: number; status: string; paid_at: string | null;
}
interface FinScore {
  score: number; revenue: number; expenses: number; profit: number;
  taxes_paid_on_time: number; taxes_total: number; period_month: number; period_year: number;
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

const FinanceHRUnifiedPage: React.FC = () => {
  const { company, role } = useAuth();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'dashboard';
  const month = new Date().getMonth() + 1;
  const year = new Date().getFullYear();

  const periodStart = useMemo(() => new Date(year, month - 1, 1), [month, year]);
  const periodEnd = useMemo(() => new Date(year, month, 0, 23, 59, 59), [month, year]);
  const { summary, loading: aggLoading, refresh: refreshAgg } = useFinancialAggregator(periodStart, periodEnd);

  const [taxCalcs, setTaxCalcs] = useState<TaxCalc[]>([]);
  const [scores, setScores] = useState<FinScore[]>([]);
  const [calculating, setCalculating] = useState(false);
  const [loading, setLoading] = useState(true);

  /* ----- Load tax + score data ----- */
  const fetchTaxData = useCallback(async () => {
    if (!company) return;
    setLoading(true);
    const [taxRes, scoreRes] = await Promise.all([
      supabase.from('tax_calculations').select('*').eq('company_id', company.id)
        .order('period_start', { ascending: false }).limit(50),
      supabase.from('financial_scores').select('*').eq('company_id', company.id)
        .order('period_year', { ascending: false }).order('period_month', { ascending: false }).limit(12),
    ]);
    setTaxCalcs((taxRes.data as TaxCalc[]) || []);
    setScores((scoreRes.data as FinScore[]) || []);
    setLoading(false);
  }, [company]);

  useEffect(() => { fetchTaxData(); }, [fetchTaxData]);

  /* ----- Calculate taxes ----- */
  const handleCalculateTaxes = async () => {
    if (!company) return;
    setCalculating(true);
    const startDate = new Date(year, month - 1, 1).toISOString().slice(0, 10);
    const endDate = new Date(year, month, 0).toISOString().slice(0, 10);

    const ivaAmount = summary.receitas * 0.16;
    const profit = summary.receitas - summary.despesasOperacionais;
    const irpcAmount = Math.max(0, profit * 0.03);

    const payrolls = await supabase.from('payroll_runs').select('inss_employee, inss_employer')
      .eq('company_id', company.id).gte('created_at', `${startDate}T00:00:00`).lte('created_at', `${endDate}T23:59:59`);
    const pr = payrolls.data || [];
    const inssEmp = pr.reduce((s, r) => s + Number(r.inss_employee || 0), 0);
    const inssEr = pr.reduce((s, r) => s + Number(r.inss_employer || 0), 0);

    const taxes = [
      { tax_type: 'iva', base_amount: summary.receitas, tax_rate: 16, tax_amount: ivaAmount },
      { tax_type: 'irpc', base_amount: profit, tax_rate: 3, tax_amount: irpcAmount },
      { tax_type: 'inss_employee', base_amount: summary.salarios, tax_rate: 3, tax_amount: inssEmp || summary.salarios * 0.03 },
      { tax_type: 'inss_employer', base_amount: summary.salarios, tax_rate: 4, tax_amount: inssEr || summary.salarios * 0.04 },
    ];

    await supabase.from('tax_calculations').delete().eq('company_id', company.id).eq('period_start', startDate);
    const { error } = await supabase.from('tax_calculations').insert(
      taxes.map(t => ({ company_id: company.id, period_start: startDate, period_end: endDate, ...t, status: 'pending' }))
    );

    if (error) { toast.error('Erro ao calcular impostos'); }
    else {
      const totalTaxes = taxCalcs.filter(t => t.period_start >= `${year}-01-01`).length;
      const paidOnTime = taxCalcs.filter(t => t.status === 'paid').length;
      const profitMargin = summary.receitas > 0 ? (profit / summary.receitas) * 100 : 0;
      const score = Math.min(100, Math.round(
        (totalTaxes > 0 ? (paidOnTime / totalTaxes) * 40 : 20) +
        Math.min(30, Math.max(0, profitMargin)) +
        (summary.receitas > 0 ? 30 : 0)
      ));
      await supabase.from('financial_scores').upsert({
        company_id: company.id, period_month: month, period_year: year, score,
        revenue: summary.receitas, expenses: summary.despesasOperacionais, profit,
        taxes_paid_on_time: paidOnTime, taxes_total: totalTaxes + 4,
      }, { onConflict: 'company_id,period_month,period_year' });
      toast.success('Impostos calculados com sucesso');
      fetchTaxData();
      refreshAgg();
    }
    setCalculating(false);
  };

  const handleMarkPaid = async (id: string) => {
    await supabase.from('tax_calculations').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', id);
    toast.success('Imposto marcado como pago');
    fetchTaxData();
  };

  /* ----- Derived ----- */
  const totalTaxDue = useMemo(() =>
    taxCalcs.filter(t => t.status === 'pending' || t.status === 'overdue').reduce((s, t) => s + t.tax_amount, 0)
  , [taxCalcs]);
  const latestScore = scores[0];
  const scoreColor = (s: number) => s >= 70 ? 'text-green-600' : s >= 40 ? 'text-amber-600' : 'text-destructive';

  /* DRE from aggregator */
  const ivaCalc = taxCalcs.find(t => t.tax_type === 'iva' && t.period_start >= `${year}-${String(month).padStart(2, '0')}-01`);
  const irpcCalc = taxCalcs.find(t => t.tax_type === 'irpc' && t.period_start >= `${year}-${String(month).padStart(2, '0')}-01`);
  const totalTaxDRE = (ivaCalc?.tax_amount || 0) + (irpcCalc?.tax_amount || 0);
  const netProfitDRE = summary.receitas - summary.despesasOperacionais - summary.salarios - totalTaxDRE;

  /* Alerts */
  const alerts = useMemo(() => {
    const a: { level: 'warning' | 'critical'; msg: string }[] = [];
    if (summary.dadosIncompletos) {
      a.push({ level: 'warning', msg: `Dados incompletos: ${summary.detalhesIncompletos.join(', ')}` });
    }
    if (totalTaxDue > 0) a.push({ level: 'warning', msg: `${formatCurrency(totalTaxDue)} em impostos pendentes` });
    if (summary.lucroLiquido < 0) a.push({ level: 'critical', msg: `Prejuízo de ${formatCurrency(Math.abs(summary.lucroLiquido))}` });
    return a;
  }, [summary, totalTaxDue]);

  const handleExportDRE = () => {
    downloadFiscalPdfA4({
      companyName: company?.name || 'Empresa',
      companyNif: (company as any)?.nif || '',
      companyAddress: (company as any)?.address || '',
      companyPhone: (company as any)?.phone || '',
      regime: { label: 'DRE', rate: 0, description: 'Demonstração de Resultados do Exercício' },
      periodLabel: periodLabel(month, year),
      totalRevenue: summary.receitas,
      totalDiscount: 0,
      taxDue: totalTaxDRE,
      netRevenue: netProfitDRE,
      totalSales: 0,
      byMethod: {
        'Receita Bruta': summary.receitas,
        'Custo Mercadorias': summary.custoMercadorias,
        'Despesas Operacionais': summary.despesasOperacionais,
        'Salários': summary.salarios,
        'Impostos': totalTaxDRE,
      },
      getMethodLabel: (m: string) => m,
    });
    toast.success('DRE exportado em PDF');
  };

  const isLoading = loading || aggLoading;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <DollarSign className="w-7 h-7 text-primary" /> Financeiro & RH
          </h1>
          <p className="text-muted-foreground">{company?.name} — Visão financeira total integrada</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={handleCalculateTaxes} disabled={calculating} size="sm">
            <RefreshCw className={`w-4 h-4 mr-2 ${calculating ? 'animate-spin' : ''}`} />
            Calcular Impostos
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportDRE}>
            <FileDown className="w-4 h-4 mr-2" /> DRE PDF
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a, i) => (
            <div key={i} className={`flex items-center gap-2 p-3 rounded-lg ${a.level === 'critical' ? 'bg-destructive/10 text-destructive' : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'}`}>
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span className="text-sm font-medium">{a.msg}</span>
            </div>
          ))}
        </div>
      )}

      {/* KPIs */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[1,2,3,4,5].map(i => <SkeletonKPI key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <KPICard icon={ShoppingCart} label="Receita" value={formatCurrency(summary.receitas)} />
          <KPICard icon={TrendingDown} label="Custos Totais" value={formatCurrency(summary.custosTotal)} color="text-amber-600" />
          <KPICard icon={TrendingUp} label="Lucro Líquido" value={formatCurrency(summary.lucroLiquido)} color={summary.lucroLiquido >= 0 ? 'text-green-600' : 'text-destructive'} />
          <KPICard icon={Banknote} label="Impostos a Pagar" value={formatCurrency(totalTaxDue)} color="text-destructive" />
          <KPICard icon={Shield} label="Score Financeiro" value={latestScore ? `${latestScore.score}/100` : '—'} color={latestScore ? scoreColor(latestScore.score) : ''} />
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue={initialTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="dashboard"><BarChart3 className="w-4 h-4 mr-1" /> Dashboard</TabsTrigger>
          <TabsTrigger value="dre"><Receipt className="w-4 h-4 mr-1" /> DRE</TabsTrigger>
          <TabsTrigger value="taxes"><Calculator className="w-4 h-4 mr-1" /> Impostos</TabsTrigger>
          <TabsTrigger value="expenses"><TrendingDown className="w-4 h-4 mr-1" /> Despesas</TabsTrigger>
          <TabsTrigger value="payable"><CreditCard className="w-4 h-4 mr-1" /> Contas a Pagar</TabsTrigger>
          <TabsTrigger value="receivable"><ArrowDownLeft className="w-4 h-4 mr-1" /> Contas a Receber</TabsTrigger>
          <TabsTrigger value="employees"><Users className="w-4 h-4 mr-1" /> Funcionários</TabsTrigger>
          <TabsTrigger value="payroll"><Banknote className="w-4 h-4 mr-1" /> Salários</TabsTrigger>
          <TabsTrigger value="attendance"><Clock className="w-4 h-4 mr-1" /> Presenças</TabsTrigger>
          <TabsTrigger value="chart"><BookOpen className="w-4 h-4 mr-1" /> Plano de Contas</TabsTrigger>
          <TabsTrigger value="journal"><FileText className="w-4 h-4 mr-1" /> Diário</TabsTrigger>
          <TabsTrigger value="commissions"><Award className="w-4 h-4 mr-1" /> Comissões</TabsTrigger>
          <TabsTrigger value="score"><Shield className="w-4 h-4 mr-1" /> Score</TabsTrigger>
        </TabsList>

        {/* DASHBOARD */}
        <TabsContent value="dashboard" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><ShoppingCart className="w-4 h-4" /> PDV — Vendas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(summary.receitas)}</p>
                <p className="text-xs text-muted-foreground">Receita bruta do mês</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Truck className="w-4 h-4" /> Compras & Despesas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(summary.despesasOperacionais + summary.custoMercadorias)}</p>
                <p className="text-xs text-muted-foreground">Custos operacionais</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4" /> RH — Salários</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(summary.salarios)}</p>
                <p className="text-xs text-muted-foreground">Folha salarial</p>
              </CardContent>
            </Card>
          </div>

          {/* Margin */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Margem de Lucro</span>
                <span className={`text-sm font-bold ${summary.lucroMargin >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                  {summary.lucroMargin.toFixed(1)}%
                </span>
              </div>
              <Progress value={Math.max(0, Math.min(100, summary.lucroMargin))} className="h-2" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* DRE */}
        <TabsContent value="dre" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><Receipt className="w-5 h-5" /> Demonstração de Resultados — {periodLabel(month, year)}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-w-lg">
                <DRELine label="Receita Bruta" value={summary.receitas} bold />
                <DRELine label="(-) Custo das Mercadorias" value={-summary.custoMercadorias} />
                <DRELine label="(-) Despesas Operacionais" value={-summary.despesasOperacionais} />
                <hr className="border-border" />
                <DRELine label="Lucro Bruto" value={summary.receitas - summary.custoMercadorias - summary.despesasOperacionais} bold
                  color={(summary.receitas - summary.custoMercadorias - summary.despesasOperacionais) >= 0 ? 'text-green-600' : 'text-destructive'} />
                <DRELine label="(-) Salários" value={-summary.salarios} />
                <DRELine label="(-) Comissões" value={-summary.comissoes} />
                <DRELine label="(-) Impostos" value={-totalTaxDRE} />
                <hr className="border-border" />
                <DRELine label="Resultado Líquido" value={netProfitDRE - summary.comissoes} bold color={(netProfitDRE - summary.comissoes) >= 0 ? 'text-green-600' : 'text-destructive'} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAXES */}
        <TabsContent value="taxes" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Obrigações Fiscais — {periodLabel(month, year)}</CardTitle>
            </CardHeader>
            <CardContent>
              {taxCalcs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Clique em "Calcular Impostos" para gerar.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Imposto</TableHead>
                      <TableHead>Base</TableHead>
                      <TableHead>Taxa</TableHead>
                      <TableHead>Valor</TableHead>
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
                          <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
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

        {/* Expenses */}
        <TabsContent value="expenses" className="mt-4"><ExpensesManager /></TabsContent>
        <TabsContent value="payable" className="mt-4"><AccountsPayableManager /></TabsContent>
        <TabsContent value="receivable" className="mt-4"><AccountsReceivableManager /></TabsContent>

        {/* HR */}
        <TabsContent value="employees" className="mt-4"><EmployeeManagement /></TabsContent>
        <TabsContent value="payroll" className="mt-4"><PayrollProcessing /></TabsContent>
        <TabsContent value="attendance" className="mt-4"><AttendanceManager /></TabsContent>

        {/* Accounting */}
        <TabsContent value="chart" className="mt-4"><ChartOfAccounts /></TabsContent>
        <TabsContent value="journal" className="mt-4"><JournalEntries /></TabsContent>
        <TabsContent value="commissions" className="mt-4"><CommissionsManager /></TabsContent>

        {/* Score */}
        <TabsContent value="score" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><Shield className="w-5 h-5" /> Score Financeiro</CardTitle>
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
                    <div><p className="text-muted-foreground">Receita</p><p className="font-bold">{formatCurrency(latestScore.revenue)}</p></div>
                    <div><p className="text-muted-foreground">Despesas</p><p className="font-bold">{formatCurrency(latestScore.expenses)}</p></div>
                    <div><p className="text-muted-foreground">Lucro</p><p className={`font-bold ${latestScore.profit >= 0 ? 'text-green-600' : 'text-destructive'}`}>{formatCurrency(latestScore.profit)}</p></div>
                    <div><p className="text-muted-foreground">Impostos em dia</p><p className="font-bold">{latestScore.taxes_paid_on_time}/{latestScore.taxes_total}</p></div>
                  </div>
                </>
              ) : (
                <p className="text-center text-muted-foreground py-8">Clique em "Calcular Impostos" para gerar o score.</p>
              )}
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
  <Card className="p-4 hover:shadow-md transition-shadow">
    <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
      <Icon className="w-4 h-4" /> {label}
    </div>
    <p className={`text-xl font-bold ${color || ''}`}>{value}</p>
  </Card>
);

const DRELine: React.FC<{ label: string; value: number; bold?: boolean; color?: string }> = ({ label, value, bold, color }) => (
  <div className="flex justify-between items-center">
    <span className={`text-sm ${bold ? 'font-bold' : 'text-muted-foreground'}`}>{label}</span>
    <span className={`text-sm font-mono ${bold ? 'font-bold' : ''} ${color || ''}`}>
      {value < 0 ? '-' : ''}{formatCurrency(Math.abs(value))}
    </span>
  </div>
);

export default FinanceHRUnifiedPage;
