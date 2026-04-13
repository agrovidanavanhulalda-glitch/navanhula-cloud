import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/SaaSAuthContext';

export interface FinancialKPIs {
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  profitMargin: number;
  pendingPayable: number;
  pendingReceivable: number;
  cashBalance: number;
  cogs: number;
  grossProfit: number;
}

export interface DRELine {
  label: string;
  value: number;
  indent?: boolean;
  bold?: boolean;
  separator?: boolean;
}

export interface CashflowPoint {
  date: string;
  income: number;
  expense: number;
  balance: number;
}

export interface CategoryBreakdown {
  category: string;
  amount: number;
  type: string;
}

export function useFinancialDashboard(startDate: Date, endDate: Date) {
  const { company } = useAuth();
  const companyId = company?.id;
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [salesCogs, setSalesCogs] = useState(0);
  const [pendingAP, setPendingAP] = useState(0);
  const [pendingAR, setPendingAR] = useState(0);
  const [payrollTotal, setPayrollTotal] = useState(0);
  const [walletBalance, setWalletBalance] = useState(0);

  const startStr = startDate.toISOString().slice(0, 10);
  const endStr = endDate.toISOString().slice(0, 10);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const [txRes, cogsRes, apRes, arRes, payrollRes, walletRes] = await Promise.all([
        supabase.from('financial_transactions')
          .select('*')
          .eq('company_id', companyId)
          .gte('transaction_date', startStr)
          .lte('transaction_date', endStr)
          .neq('status', 'cancelled')
          .order('transaction_date', { ascending: true }),
        // COGS from sale_items
        // COGS: fallback to useFinancialAggregator-style calculation from sale_items
        supabase.from('sale_items')
          .select('cost_price, quantity')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString()),
        // Accounts payable pending
        supabase.from('accounts_payable')
          .select('amount')
          .eq('company_id', companyId)
          .eq('status', 'pendente')
          .lte('due_date', endStr),
        // Accounts receivable pending
        supabase.from('accounts_receivable')
          .select('amount')
          .eq('company_id', companyId)
          .eq('status', 'pendente')
          .lte('due_date', endStr),
        // Payroll
        supabase.from('payroll_runs')
          .select('total_cost')
          .eq('company_id', companyId)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString()),
        // Wallet balance
        supabase.from('wallets')
          .select('balance')
          .eq('company_id', companyId),
      ]);

      setTransactions((txRes.data || []) as any[]);
      setSalesCogs(typeof cogsRes.data === 'number' ? cogsRes.data : 0);
      setPendingAP((apRes.data || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0));
      setPendingAR((arRes.data || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0));
      setPayrollTotal((payrollRes.data || []).reduce((s: number, r: any) => s + Number(r.total_cost || 0), 0));
      setWalletBalance((walletRes.data || []).reduce((s: number, r: any) => s + Number(r.balance || 0), 0));
    } catch (err) {
      console.error('Financial dashboard error:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId, startStr, endStr]);

  useEffect(() => { load(); }, [load]);

  const kpis: FinancialKPIs = useMemo(() => {
    const totalIncome = transactions.filter(t => t.type === 'income' && t.status === 'paid').reduce((s, t) => s + Number(t.amount), 0);
    const totalExpense = transactions.filter(t => t.type === 'expense' && t.status === 'paid').reduce((s, t) => s + Number(t.amount), 0);
    const grossProfit = totalIncome - salesCogs;
    const operationalExpenses = totalExpense + payrollTotal;
    const netProfit = totalIncome - salesCogs - operationalExpenses;
    const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

    return {
      totalIncome,
      totalExpense: operationalExpenses,
      netProfit,
      profitMargin,
      pendingPayable: pendingAP,
      pendingReceivable: pendingAR,
      cashBalance: walletBalance,
      cogs: salesCogs,
      grossProfit,
    };
  }, [transactions, salesCogs, pendingAP, pendingAR, payrollTotal, walletBalance]);

  const dre: DRELine[] = useMemo(() => {
    const salesIncome = transactions.filter(t => t.type === 'income' && t.category === 'sales' && t.status === 'paid').reduce((s, t) => s + Number(t.amount), 0);
    const otherIncome = transactions.filter(t => t.type === 'income' && t.category !== 'sales' && t.status === 'paid').reduce((s, t) => s + Number(t.amount), 0);
    const totalRevenue = salesIncome + otherIncome;
    const grossProfit = totalRevenue - salesCogs;
    const opExpenses = transactions.filter(t => t.type === 'expense' && t.status === 'paid').reduce((s, t) => s + Number(t.amount), 0);
    const netBeforePayroll = grossProfit - opExpenses;
    const netProfit = netBeforePayroll - payrollTotal;

    return [
      { label: 'Receita de Vendas', value: salesIncome },
      { label: 'Outras Receitas', value: otherIncome, indent: true },
      { label: 'RECEITA BRUTA', value: totalRevenue, bold: true, separator: true },
      { label: '(-) Custo dos Produtos Vendidos (CMV)', value: -salesCogs, indent: true },
      { label: 'LUCRO BRUTO', value: grossProfit, bold: true, separator: true },
      { label: '(-) Despesas Operacionais', value: -opExpenses, indent: true },
      { label: '(-) Salários e Encargos', value: -payrollTotal, indent: true },
      { label: 'LUCRO LÍQUIDO', value: netProfit, bold: true, separator: true },
    ];
  }, [transactions, salesCogs, payrollTotal]);

  const cashflow: CashflowPoint[] = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();
    for (const t of transactions) {
      if (t.status !== 'paid') continue;
      const d = t.transaction_date;
      const entry = map.get(d) || { income: 0, expense: 0 };
      if (t.type === 'income') entry.income += Number(t.amount);
      else entry.expense += Number(t.amount);
      map.set(d, entry);
    }
    const sorted = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    let cumulative = 0;
    return sorted.map(([date, vals]) => {
      cumulative += vals.income - vals.expense;
      return { date, income: vals.income, expense: vals.expense, balance: cumulative };
    });
  }, [transactions]);

  const categoryBreakdown: CategoryBreakdown[] = useMemo(() => {
    const map = new Map<string, { amount: number; type: string }>();
    for (const t of transactions) {
      if (t.status !== 'paid') continue;
      const key = `${t.type}-${t.category}`;
      const entry = map.get(key) || { amount: 0, type: t.type };
      entry.amount += Number(t.amount);
      map.set(key, entry);
    }
    return Array.from(map.entries())
      .map(([key, val]) => ({ category: key.split('-').slice(1).join('-'), ...val }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions]);

  const insights: string[] = useMemo(() => {
    const msgs: string[] = [];
    if (kpis.netProfit < 0) msgs.push('⚠️ Fluxo de caixa negativo! Reveja despesas urgentemente.');
    if (kpis.profitMargin < 10 && kpis.totalIncome > 0) msgs.push('📉 Margem de lucro abaixo de 10%. Considere rever preços.');
    if (kpis.pendingPayable > kpis.cashBalance) msgs.push('🔴 Contas a pagar excedem o caixa disponível!');
    if (kpis.totalExpense > kpis.totalIncome * 0.8) msgs.push('⚡ Despesas representam mais de 80% da receita.');
    if (kpis.pendingReceivable > 0) msgs.push(`💡 Você tem ${formatMT(kpis.pendingReceivable)} a receber pendente.`);
    if (kpis.totalIncome === 0) msgs.push('📊 Nenhuma receita registrada no período selecionado.');
    return msgs;
  }, [kpis]);

  return { kpis, dre, cashflow, categoryBreakdown, insights, transactions, loading, refresh: load };
}

function formatMT(v: number) {
  return new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' }).format(v);
}
