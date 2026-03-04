
-- Update get_ceo_dashboard_stats to use sales.profit directly instead of joining sale_items
CREATE OR REPLACE FUNCTION public.get_ceo_dashboard_stats()
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result json;
  v_company_id uuid;
BEGIN
  v_company_id := get_user_company(auth.uid());
  
  IF v_company_id IS NULL THEN
    RETURN json_build_object('error', 'No company found');
  END IF;

  IF NOT (has_role(auth.uid(), 'ceo') OR has_role(auth.uid(), 'admin')) THEN
    RETURN json_build_object('error', 'Unauthorized');
  END IF;

  SELECT json_build_object(
    'total_stores', (SELECT count(*) FROM stores WHERE company_id = v_company_id AND is_active = true),
    'total_sales_today', (SELECT COALESCE(count(*), 0) FROM sales s JOIN stores st ON s.store_id = st.id WHERE st.company_id = v_company_id AND s.created_at::date = CURRENT_DATE AND s.status = 'completed'),
    'revenue_today', (SELECT COALESCE(sum(s.total), 0) FROM sales s JOIN stores st ON s.store_id = st.id WHERE st.company_id = v_company_id AND s.created_at::date = CURRENT_DATE AND s.status = 'completed'),
    'revenue_week', (SELECT COALESCE(sum(s.total), 0) FROM sales s JOIN stores st ON s.store_id = st.id WHERE st.company_id = v_company_id AND s.created_at >= date_trunc('week', CURRENT_DATE) AND s.status = 'completed'),
    'revenue_month', (SELECT COALESCE(sum(s.total), 0) FROM sales s JOIN stores st ON s.store_id = st.id WHERE st.company_id = v_company_id AND s.created_at >= date_trunc('month', CURRENT_DATE) AND s.status = 'completed'),
    'profit_month', (SELECT COALESCE(sum(s.profit), 0) FROM sales s JOIN stores st ON s.store_id = st.id WHERE st.company_id = v_company_id AND s.created_at >= date_trunc('month', CURRENT_DATE) AND s.status = 'completed'),
    'total_products', (SELECT count(*) FROM products WHERE is_active = true),
    'low_stock_count', (SELECT count(*) FROM product_stock ps JOIN products p ON ps.product_id = p.id JOIN stores st ON ps.store_id = st.id WHERE st.company_id = v_company_id AND ps.quantity <= COALESCE(p.low_stock_threshold, 10)),
    'stores_online', (SELECT count(*) FROM stores WHERE company_id = v_company_id AND is_active = true AND last_online_at > now() - interval '10 minutes'),
    'active_registers', (SELECT count(*) FROM cash_registers cr JOIN stores st ON cr.store_id = st.id WHERE st.company_id = v_company_id AND cr.status = 'open')
  ) INTO v_result;

  RETURN v_result;
END;
$function$;
