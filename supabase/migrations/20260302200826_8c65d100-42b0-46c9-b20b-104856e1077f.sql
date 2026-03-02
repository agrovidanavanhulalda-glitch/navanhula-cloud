
-- Add 'ceo' role to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'ceo';

-- Add fiscal regime to companies
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS fiscal_regime text DEFAULT 'irpc' CHECK (fiscal_regime IN ('irpc', 'ispc', 'iva')),
ADD COLUMN IF NOT EXISTS fiscal_rate numeric DEFAULT 3,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS logo_url text;

-- Add city/coordinates to stores for map visualization
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS latitude numeric,
ADD COLUMN IF NOT EXISTS longitude numeric,
ADD COLUMN IF NOT EXISTS last_online_at timestamp with time zone DEFAULT now();

-- Create CEO dashboard stats view (security definer function)
CREATE OR REPLACE FUNCTION public.get_ceo_dashboard_stats()
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
  v_company_id uuid;
BEGIN
  v_company_id := get_user_company(auth.uid());
  
  IF v_company_id IS NULL THEN
    RETURN json_build_object('error', 'No company found');
  END IF;

  -- Only CEO or admin can access
  IF NOT (has_role(auth.uid(), 'ceo') OR has_role(auth.uid(), 'admin')) THEN
    RETURN json_build_object('error', 'Unauthorized');
  END IF;

  SELECT json_build_object(
    'total_stores', (SELECT count(*) FROM stores WHERE company_id = v_company_id AND is_active = true),
    'total_sales_today', (SELECT COALESCE(count(*), 0) FROM sales s JOIN stores st ON s.store_id = st.id WHERE st.company_id = v_company_id AND s.created_at::date = CURRENT_DATE AND s.status = 'completed'),
    'revenue_today', (SELECT COALESCE(sum(s.total), 0) FROM sales s JOIN stores st ON s.store_id = st.id WHERE st.company_id = v_company_id AND s.created_at::date = CURRENT_DATE AND s.status = 'completed'),
    'revenue_week', (SELECT COALESCE(sum(s.total), 0) FROM sales s JOIN stores st ON s.store_id = st.id WHERE st.company_id = v_company_id AND s.created_at >= date_trunc('week', CURRENT_DATE) AND s.status = 'completed'),
    'revenue_month', (SELECT COALESCE(sum(s.total), 0) FROM sales s JOIN stores st ON s.store_id = st.id WHERE st.company_id = v_company_id AND s.created_at >= date_trunc('month', CURRENT_DATE) AND s.status = 'completed'),
    'profit_month', (SELECT COALESCE(sum(si.profit), 0) FROM sale_items si JOIN sales s ON si.sale_id = s.id JOIN stores st ON s.store_id = st.id WHERE st.company_id = v_company_id AND s.created_at >= date_trunc('month', CURRENT_DATE) AND s.status = 'completed'),
    'total_products', (SELECT count(*) FROM products WHERE is_active = true),
    'low_stock_count', (SELECT count(*) FROM product_stock ps JOIN products p ON ps.product_id = p.id JOIN stores st ON ps.store_id = st.id WHERE st.company_id = v_company_id AND ps.quantity <= COALESCE(p.low_stock_threshold, 10)),
    'stores_online', (SELECT count(*) FROM stores WHERE company_id = v_company_id AND is_active = true AND last_online_at > now() - interval '10 minutes'),
    'active_registers', (SELECT count(*) FROM cash_registers cr JOIN stores st ON cr.store_id = st.id WHERE st.company_id = v_company_id AND cr.status = 'open')
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Function to get sales by store for CEO
CREATE OR REPLACE FUNCTION public.get_sales_by_store(p_period text DEFAULT 'today')
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
  v_company_id uuid;
  v_start_date timestamp with time zone;
BEGIN
  v_company_id := get_user_company(auth.uid());
  
  IF NOT (has_role(auth.uid(), 'ceo') OR has_role(auth.uid(), 'admin')) THEN
    RETURN '[]'::json;
  END IF;

  v_start_date := CASE p_period
    WHEN 'today' THEN date_trunc('day', now())
    WHEN 'week' THEN date_trunc('week', now())
    WHEN 'month' THEN date_trunc('month', now())
    ELSE date_trunc('day', now())
  END;

  SELECT json_agg(row_to_json(t)) INTO v_result
  FROM (
    SELECT 
      st.id as store_id,
      st.name as store_name,
      st.city,
      st.is_active,
      st.last_online_at,
      COALESCE(count(s.id), 0) as total_sales,
      COALESCE(sum(s.total), 0) as total_revenue,
      COALESCE(sum(CASE WHEN s.payment_method = 'cash' THEN s.total ELSE 0 END), 0) as cash_revenue,
      COALESCE(sum(CASE WHEN s.payment_method = 'mpesa' THEN s.total ELSE 0 END), 0) as mpesa_revenue,
      COALESCE(sum(CASE WHEN s.payment_method = 'emola' THEN s.total ELSE 0 END), 0) as emola_revenue,
      COALESCE(sum(CASE WHEN s.payment_method = 'card' THEN s.total ELSE 0 END), 0) as card_revenue
    FROM stores st
    LEFT JOIN sales s ON s.store_id = st.id AND s.created_at >= v_start_date AND s.status = 'completed'
    WHERE st.company_id = v_company_id
    GROUP BY st.id, st.name, st.city, st.is_active, st.last_online_at
    ORDER BY total_revenue DESC
  ) t;

  RETURN COALESCE(v_result, '[]'::json);
END;
$$;

-- Function to get top products across all stores
CREATE OR REPLACE FUNCTION public.get_top_products_national(p_limit integer DEFAULT 10)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
  v_company_id uuid;
BEGIN
  v_company_id := get_user_company(auth.uid());
  
  IF NOT (has_role(auth.uid(), 'ceo') OR has_role(auth.uid(), 'admin')) THEN
    RETURN '[]'::json;
  END IF;

  SELECT json_agg(row_to_json(t)) INTO v_result
  FROM (
    SELECT 
      si.product_name,
      sum(si.quantity) as total_quantity,
      sum(si.total) as total_revenue,
      sum(si.profit) as total_profit
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.id
    JOIN stores st ON s.store_id = st.id
    WHERE st.company_id = v_company_id
      AND s.created_at >= date_trunc('month', now())
      AND s.status = 'completed'
    GROUP BY si.product_name
    ORDER BY total_revenue DESC
    LIMIT p_limit
  ) t;

  RETURN COALESCE(v_result, '[]'::json);
END;
$$;
