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

interface RawData {
  salesTotal: number;
  expensesTotal: number;
  payrollTotal: number;
  taxesTotal: number;
  purchaseCost: number;
}

export function useFinancialAggregator(periodStart?: Date, periodEnd?: Date) {
  const { company } = useAuth();
  const [raw, setRaw] = useState<RawData>({ salesTotal: 0, expensesTotal: 0, payrollTotal: 0, taxesTotal: 0, purchaseCost: 0 });
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
      // Fetch stores for this company
      const { data: stores } = await supabase.from('stores').select('id').eq('company_id', companyId);
      const storeIds = (stores || []).map(s => s.id);

      const [salesRes, expensesRes, payrollRes, taxRecordsRes, purchasesRes] = await Promise.all([
        // Revenue from completed sales
        storeIds.length > 0
          ? supabase.from('sales').select('total').eq('status', 'completed').in('store_id', storeIds).gte('created_at', startStr).lte('created_at', endStr)
          : Promise.resolve({ data: [] }),

        // Operational expenses
        supabase.from('expenses').select('amount').eq('company_id', companyId).gte('expense_date', startStr.slice(0, 10)).lte('expense_date', endStr.slice(0, 10)),

        // Payroll (salaries)
        supabase.from('payroll').select('net_salary').eq('company_id', companyId).gte('created_at', startStr).lte('created_at', endStr),

        // Taxes paid
        supabase.from('tax_records').select('amount').eq('company_id', companyId).eq('status', 'paid').gte('created_at', startStr).lte('created_at', endStr),

        // Purchase cost (cost of goods from sale_items)
        storeIds.length > 0
          ? supabase.from('sale_items').select('cost_price, quantity, created_at').gte('created_at', startStr).lte('created_at', endStr)
          : Promise.resolve({ data: [] }),
      ]);

      const salesTotal = (salesRes.data || []).reduce((a, s) => a + Number(s.total || 0), 0);
      const expensesTotal = (expensesRes.data || []).reduce((a, e) => a + Number(e.amount || 0), 0);
      const payrollTotal = (payrollRes.data || []).reduce((a, p) => a + Number(p.net_salary || 0), 0);
      const taxesTotal = (taxRecordsRes.data || []).reduce((a, t) => a + Number(t.amount || 0), 0);
      const purchaseCost = (purchasesRes.data || []).reduce((a, i) => a + (Number(i.cost_price || 0) * Number(i.quantity || 0)), 0);

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
