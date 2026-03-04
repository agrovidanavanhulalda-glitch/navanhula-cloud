
-- Update get_sales_by_store to include profit per store
CREATE OR REPLACE FUNCTION public.get_sales_by_store(p_period text DEFAULT 'today'::text)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      COALESCE(sum(s.profit), 0) as total_profit,
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
$function$;
