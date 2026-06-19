-- 1. Prevent multiple open cash sessions for the same store (single source of truth)
CREATE UNIQUE INDEX IF NOT EXISTS uq_cash_registers_one_open_per_store
  ON public.cash_registers (store_id)
  WHERE status = 'open';

-- 2. Canonical cash status resolver used by dashboard, history and widgets
CREATE OR REPLACE FUNCTION public.get_cash_status(p_store_id uuid)
RETURNS TABLE (
  cash_register_id uuid,
  status text,
  store_id uuid,
  user_id uuid,
  opening_amount numeric,
  opened_at timestamptz,
  closed_at timestamptz,
  is_open boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    cr.id,
    cr.status::text,
    cr.store_id,
    cr.user_id,
    cr.opening_amount,
    cr.opened_at,
    cr.closed_at,
    (cr.status = 'open') AS is_open
  FROM public.cash_registers cr
  WHERE cr.store_id = p_store_id
  ORDER BY (cr.status = 'open') DESC, cr.opened_at DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_cash_status(uuid) TO authenticated, service_role;