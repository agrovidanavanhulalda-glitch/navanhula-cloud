-- Optimized indexes for Enterprise Performance
CREATE INDEX IF NOT EXISTS idx_products_company_id ON public.products (company_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products (is_active);
CREATE INDEX IF NOT EXISTS idx_sales_company_id ON public.sales (company_id);
CREATE INDEX IF NOT EXISTS idx_sales_store_id ON public.sales (store_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON public.sales (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_stock_company_id ON public.product_stock (company_id);
CREATE INDEX IF NOT EXISTS idx_product_stock_store_id ON public.product_stock (store_id);
CREATE INDEX IF NOT EXISTS idx_product_stock_product_id ON public.product_stock (product_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON public.sale_items (sale_id);
CREATE INDEX IF NOT EXISTS idx_cash_registers_company_id ON public.cash_registers (company_id);
CREATE INDEX IF NOT EXISTS idx_cash_registers_user_id ON public.cash_registers (user_id);
CREATE INDEX IF NOT EXISTS idx_cash_registers_status ON public.cash_registers (status);

-- Create optimized view or function for dashboard KPIs to avoid client-side calculations
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(p_company_id UUID, p_store_id UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
    v_today_start TIMESTAMP WITH TIME ZONE := date_trunc('day', now());
    v_week_start TIMESTAMP WITH TIME ZONE := date_trunc('day', now() - interval '6 days');
    v_month_start TIMESTAMP WITH TIME ZONE := date_trunc('month', now());
    v_last_month_start TIMESTAMP WITH TIME ZONE := date_trunc('month', now() - interval '1 month');
    v_last_month_end TIMESTAMP WITH TIME ZONE := v_month_start - interval '1 second';
    
    v_today_revenue DECIMAL(12,2);
    v_today_sales_count INTEGER;
    v_month_revenue DECIMAL(12,2);
    v_last_month_revenue DECIMAL(12,2);
    v_low_stock_count INTEGER;
    v_result JSON;
BEGIN
    -- Today revenue
    SELECT coalesce(sum(total), 0), count(*)
    INTO v_today_revenue, v_today_sales_count
    FROM public.sales
    WHERE company_id = p_company_id
      AND (p_store_id IS NULL OR store_id = p_store_id)
      AND created_at >= v_today_start;

    -- Month revenue
    SELECT coalesce(sum(total), 0)
    INTO v_month_revenue
    FROM public.sales
    WHERE company_id = p_company_id
      AND (p_store_id IS NULL OR store_id = p_store_id)
      AND created_at >= v_month_start;

    -- Last month revenue
    SELECT coalesce(sum(total), 0)
    INTO v_last_month_revenue
    FROM public.sales
    WHERE company_id = p_company_id
      AND (p_store_id IS NULL OR store_id = p_store_id)
      AND created_at >= v_last_month_start
      AND created_at <= v_last_month_end;

    -- Low stock count
    SELECT count(*)
    INTO v_low_stock_count
    FROM public.product_stock ps
    JOIN public.products p ON p.id = ps.product_id
    WHERE ps.company_id = p_company_id
      AND (p_store_id IS NULL OR ps.store_id = p_store_id)
      AND ps.quantity <= 10
      AND p.is_active = true;

    v_result := json_build_object(
        'today_revenue', v_today_revenue,
        'today_sales_count', v_today_sales_count,
        'month_revenue', v_month_revenue,
        'last_month_revenue', v_last_month_revenue,
        'low_stock_count', v_low_stock_count
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_dashboard_stats(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats(UUID, UUID) TO service_role;