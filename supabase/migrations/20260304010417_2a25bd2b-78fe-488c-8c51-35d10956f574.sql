
CREATE OR REPLACE FUNCTION public.auto_accounting_entry_on_sale()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_company_id uuid;
  v_fiscal_rate numeric;
  v_tax_amount numeric;
BEGIN
  IF NEW.status = 'completed' THEN
    SELECT company_id INTO v_company_id FROM stores WHERE id = NEW.store_id;
    IF v_company_id IS NOT NULL THEN
      -- 1. Revenue entry (total da venda)
      INSERT INTO accounting_entries (company_id, store_id, type, category, amount, description, reference_id, reference_type, created_by)
      VALUES (v_company_id, NEW.store_id, 'revenue', 'sales', NEW.total, 'Venda #' || LEFT(NEW.id::text, 8), NEW.id, 'sale', NEW.user_id);

      -- 2. Expense entry (custo dos produtos vendidos)
      IF NEW.cost_total > 0 THEN
        INSERT INTO accounting_entries (company_id, store_id, type, category, amount, description, reference_id, reference_type, created_by)
        VALUES (v_company_id, NEW.store_id, 'expense', 'cogs', NEW.cost_total, 'Custo Venda #' || LEFT(NEW.id::text, 8), NEW.id, 'sale', NEW.user_id);
      END IF;

      -- 3. Tax entry (imposto estimado sobre a venda)
      SELECT COALESCE(fiscal_rate, 3) INTO v_fiscal_rate FROM companies WHERE id = v_company_id;
      v_tax_amount := NEW.total * (v_fiscal_rate / 100);
      IF v_tax_amount > 0 THEN
        INSERT INTO accounting_entries (company_id, store_id, type, category, amount, description, reference_id, reference_type, created_by)
        VALUES (v_company_id, NEW.store_id, 'tax', 'fiscal', v_tax_amount, 'Imposto Venda #' || LEFT(NEW.id::text, 8), NEW.id, 'sale', NEW.user_id);
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
