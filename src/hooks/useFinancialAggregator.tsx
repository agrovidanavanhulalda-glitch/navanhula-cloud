import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/SaaSAuthContext';

export interface FinancialSummary {
  receitas: number;
  custoMercadorias: number;
  despesasOperacionais: number;
  salarios: number;
  impostos: number;
  custosTotal: number;
  lucroLiquido: number;
  lucroMargin: number;
  dadosIncompletos: boolean;
  detalhesIncompletos: string[];
}

export function useFinancialAggregator(periodStart?: Date, periodEnd?: Date) {
  const { company } = useAuth();
  const [raw, setRaw] = useState({ salesTotal: 0, expensesTotal: 0, payrollTotal: 0, taxesTotal: 0, purchaseCost: 0 });
  const [loading, setLoading] = useState(true);

  const companyId = company?.id;

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);

    const start = periodStart || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = periodEnd || new Date();
    const startStr = start.toISOString();
    const endStr = end.toISOString();

    try {
      const { data: stores } = await supabase.from('stores').select('id').eq('company_id', companyId);
      const storeIds = (stores || []).map(s => s.id);

      const [salesRes, expensesRes, payrollRes, financialScoreRes, saleItemsRes] = await Promise.all([
        storeIds.length > 0
          ? supabase.from('sales').select('total').eq('status', 'completed').in('store_id', storeIds).gte('created_at', startStr).lte('created_at', endStr)
          : Promise.resolve({ data: [] as { total: number }[] }),

        supabase.from('expenses').select('amount').eq('company_id', companyId).gte('expense_date', startStr.slice(0, 10)).lte('expense_date', endStr.slice(0, 10)),

        supabase.from('payroll_runs').select('total_cost').eq('company_id', companyId).gte('created_at', startStr).lte('created_at', endStr),

        supabase.from('financial_scores').select('taxes_total').eq('company_id', companyId).order('created_at', { ascending: false }).limit(1),

        storeIds.length > 0
          ? supabase.from('sale_items').select('cost_price, quantity, created_at').gte('created_at', startStr).lte('created_at', endStr)
          : Promise.resolve({ data: [] as { cost_price: number; quantity: number; created_at: string }[] }),
      ]);

      const salesTotal = (salesRes.data || []).reduce((a: number, s: any) => a + Number(s.total || 0), 0);
      const expensesTotal = (expensesRes.data || []).reduce((a: number, e: any) => a + Number(e.amount || 0), 0);
      const payrollTotal = (payrollRes.data || []).reduce((a: number, p: any) => a + Number(p.total_cost || 0), 0);
      const taxesTotal = Number((financialScoreRes.data || [])[0]?.taxes_total || 0);
      const purchaseCost = (saleItemsRes.data || []).reduce((a: number, i: any) => a + (Number(i.cost_price || 0) * Number(i.quantity || 0)), 0);

      setRaw({ salesTotal, expensesTotal, payrollTotal, taxesTotal, purchaseCost });
    } catch (err) {
      console.error('Financial aggregator error:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId, periodStart, periodEnd]);

  useEffect(() => { load(); }, [load]);

  const summary: FinancialSummary = useMemo(() => {
    const custosTotal = raw.purchaseCost + raw.expensesTotal + raw.payrollTotal + raw.taxesTotal;
    const lucroLiquido = raw.salesTotal - custosTotal;
    const lucroMargin = raw.salesTotal > 0 ? (lucroLiquido / raw.salesTotal) * 100 : 0;

    const detalhesIncompletos: string[] = [];
    if (raw.expensesTotal === 0) detalhesIncompletos.push('Despesas operacionais');
    if (raw.payrollTotal === 0) detalhesIncompletos.push('Salários (RH)');
    if (raw.taxesTotal === 0) detalhesIncompletos.push('Impostos');
    if (raw.purchaseCost === 0 && raw.salesTotal > 0) detalhesIncompletos.push('Custo de mercadorias');

    return {
      receitas: raw.salesTotal,
      custoMercadorias: raw.purchaseCost,
      despesasOperacionais: raw.expensesTotal,
      salarios: raw.payrollTotal,
      impostos: raw.taxesTotal,
      custosTotal,
      lucroLiquido,
      lucroMargin,
      dadosIncompletos: detalhesIncompletos.length > 0,
      detalhesIncompletos,
    };
  }, [raw]);

  return { summary, loading, refresh: load };
}
