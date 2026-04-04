
-- 1. Add commission_rate to employees (default 0, meaning no commission)
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS commission_rate numeric NOT NULL DEFAULT 0;

-- 2. Create trigger function for automatic commission on completed sales
CREATE OR REPLACE FUNCTION public.auto_commission_on_sale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_employee RECORD;
  v_commission_amount numeric;
BEGIN
  -- Only process completed sales
  IF NEW.status != 'completed' THEN
    RETURN NEW;
  END IF;

  -- Skip if already triggered on update and status didn't change
  IF TG_OP = 'UPDATE' AND OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;

  -- Find the employee linked to the sale's user_id with a commission_rate > 0
  SELECT e.id, e.commission_rate INTO v_employee
  FROM employees e
  JOIN profiles p ON p.id = NEW.user_id
  WHERE e.company_id = (SELECT company_id FROM stores WHERE id = NEW.store_id)
    AND e.profile_id = NEW.user_id
    AND e.status = 'active'
    AND e.commission_rate > 0
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Calculate commission
  v_commission_amount := ROUND(NEW.total * v_employee.commission_rate / 100, 2);

  IF v_commission_amount <= 0 THEN
    RETURN NEW;
  END IF;

  -- Insert commission (avoid duplicates)
  INSERT INTO commissions (user_id, sale_id, store_id, rate, amount, status)
  VALUES (NEW.user_id, NEW.id, NEW.store_id, v_employee.commission_rate, v_commission_amount, 'pending')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- 3. Create trigger on sales table
DROP TRIGGER IF EXISTS trg_auto_commission_on_sale ON public.sales;
CREATE TRIGGER trg_auto_commission_on_sale
  AFTER INSERT OR UPDATE OF status ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_commission_on_sale();

-- 4. Add unique constraint on commissions to prevent duplicates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'commissions_sale_id_user_id_unique'
  ) THEN
    ALTER TABLE public.commissions ADD CONSTRAINT commissions_sale_id_user_id_unique UNIQUE (sale_id, user_id);
  END IF;
END $$;
