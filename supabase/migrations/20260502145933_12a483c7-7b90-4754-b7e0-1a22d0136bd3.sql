-- Update get_platform_stats to be more robust
CREATE OR REPLACE FUNCTION public.get_platform_stats()
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result json;
BEGIN
  IF NOT public.is_global_ceo() THEN
    RETURN json_build_object('error', 'unauthorized', 'message', 'Acesso restrito à administração da plataforma');
  END IF;

  SELECT json_build_object(
    'total_companies', (SELECT count(*) FROM companies),
    'total_stores', (SELECT count(*) FROM stores),
    'total_users', (SELECT count(*) FROM profiles),
    'total_sales_all', (SELECT COALESCE(count(*), 0) FROM sales WHERE status = 'completed'),
    'revenue_all_month', (SELECT COALESCE(sum(total), 0) FROM sales WHERE status = 'completed' AND created_at >= date_trunc('month', now())),
    'profit_consolidated', (SELECT COALESCE(sum(profit), 0) FROM sales WHERE status = 'completed'),
    'active_subscriptions', (SELECT count(*) FROM companies WHERE subscription_status = 'active' AND is_master = false),
    'trial_subscriptions', (SELECT count(*) FROM companies WHERE subscription_status = 'trial' AND is_master = false),
    'platform_revenue_month', (SELECT COALESCE(sum(total), 0) FROM sales WHERE status = 'completed' AND created_at >= date_trunc('month', now())), -- Simplified for now
    'total_products', (SELECT count(*) FROM products),
    'sales_today', (SELECT COALESCE(count(*), 0) FROM sales WHERE status = 'completed' AND created_at::date = CURRENT_DATE)
  ) INTO v_result;

  RETURN v_result;
END;
$function$;

-- Function to get sales trend
CREATE OR REPLACE FUNCTION public.get_global_sales_trend(days_count int DEFAULT 30)
RETURNS TABLE (sale_date date, total_sales numeric, sale_count bigint) AS $$
BEGIN
  IF NOT public.is_global_ceo() THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  RETURN QUERY
  SELECT 
    created_at::date as s_date,
    sum(total) as t_sales,
    count(*) as s_count
  FROM public.sales
  WHERE status = 'completed' AND created_at >= (now() - (days_count || ' days')::interval)
  GROUP BY created_at::date
  ORDER BY created_at::date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Function to get revenue by company
CREATE OR REPLACE FUNCTION public.get_revenue_by_company()
RETURNS TABLE (company_name text, revenue numeric) AS $$
BEGIN
  IF NOT public.is_global_ceo() THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  RETURN QUERY
  SELECT 
    c.name,
    sum(s.total) as total_revenue
  FROM public.companies c
  JOIN public.stores st ON st.company_id = c.id
  JOIN public.sales s ON s.store_id = st.id
  WHERE s.status = 'completed'
  GROUP BY c.id, c.name
  ORDER BY total_revenue DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Function to get global users list
CREATE OR REPLACE FUNCTION public.get_global_users()
RETURNS TABLE (
    user_id uuid,
    name text,
    email text,
    company_name text,
    role text,
    status text,
    created_at timestamptz
) AS $$
BEGIN
  IF NOT public.is_global_ceo() THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.full_name as name,
    p.email,
    c.name as company_name,
    p.status as role, -- Assuming role mapping or using status for now
    p.status,
    p.created_at
  FROM public.profiles p
  LEFT JOIN public.companies c ON p.company_id = c.id
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Alert for global low stock
CREATE OR REPLACE FUNCTION public.get_global_low_stock()
RETURNS TABLE (
    company_name text,
    product_name text,
    current_stock numeric,
    min_stock int
) AS $$
BEGIN
  IF NOT public.is_global_ceo() THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  RETURN QUERY
  SELECT 
    c.name as company_name,
    p.name as product_name,
    COALESCE((SELECT sum(stock) FROM public.product_stock ps WHERE ps.product_id = p.id), 0) as current_stock,
    p.low_stock_threshold as min_stock
  FROM public.products p
  JOIN public.companies c ON p.company_id = c.id
  WHERE (SELECT sum(stock) FROM public.product_stock ps WHERE ps.product_id = p.id) <= p.low_stock_threshold;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';
