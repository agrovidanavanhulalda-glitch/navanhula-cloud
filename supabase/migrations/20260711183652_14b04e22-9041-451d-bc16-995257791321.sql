CREATE OR REPLACE FUNCTION public.auto_financial_tx_on_sale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_company_id UUID;
BEGIN
  IF NEW.status = 'completed' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'completed') THEN
    SELECT company_id INTO v_company_id FROM stores WHERE id = NEW.store_id;
    IF v_company_id IS NOT NULL THEN
      INSERT INTO financial_transactions (company_id, store_id, type, category, amount, description, reference_id, reference_type, payment_method, status, transaction_date, created_by)
      VALUES (v_company_id, NEW.store_id, 'income', 'sales', NEW.total, 'Venda #' || LEFT(NEW.id::text, 8), NEW.id, 'sale', COALESCE(NEW.payment_method, 'cash'), 'paid', NEW.created_at::date, COALESCE(NEW.created_by, NEW.user_id))
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;