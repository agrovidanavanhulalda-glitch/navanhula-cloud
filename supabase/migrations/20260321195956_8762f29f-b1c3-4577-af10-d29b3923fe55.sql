
CREATE OR REPLACE FUNCTION public.decrement_product_stock(
  p_product_id uuid,
  p_store_id uuid,
  p_quantity integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  UPDATE product_stock
  SET quantity = GREATEST(0, COALESCE(quantity, 0) - p_quantity),
      updated_at = now()
  WHERE product_id = p_product_id
    AND store_id = p_store_id;
END;
$$;
