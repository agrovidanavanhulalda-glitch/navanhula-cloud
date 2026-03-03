
-- =====================================================
-- CRM: Enhance customers with VIP tracking
-- =====================================================
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS total_spent numeric DEFAULT 0;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS total_purchases integer DEFAULT 0;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS vip_level text DEFAULT 'regular';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS last_purchase_at timestamp with time zone;

-- =====================================================
-- SUPPLIERS / FORNECEDORES
-- =====================================================
CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  contact_name text,
  phone text,
  email text,
  address text,
  notes text,
  is_active boolean DEFAULT true,
  total_debt numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view company suppliers" ON public.suppliers FOR SELECT USING (company_id = get_user_company(auth.uid()));
CREATE POLICY "Admins manage suppliers" ON public.suppliers FOR ALL USING (company_id = get_user_company(auth.uid()) AND is_manager_or_admin(auth.uid()));

-- =====================================================
-- PURCHASE ORDERS / PEDIDOS DE COMPRA
-- =====================================================
CREATE TYPE public.purchase_order_status AS ENUM ('draft', 'pending', 'approved', 'received', 'cancelled');

CREATE TABLE public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  store_id uuid REFERENCES public.stores(id) NOT NULL,
  supplier_id uuid REFERENCES public.suppliers(id) NOT NULL,
  status purchase_order_status DEFAULT 'draft',
  total numeric DEFAULT 0,
  notes text,
  ordered_by uuid NOT NULL,
  approved_by uuid,
  received_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view company orders" ON public.purchase_orders FOR SELECT USING (company_id = get_user_company(auth.uid()));
CREATE POLICY "Managers manage orders" ON public.purchase_orders FOR ALL USING (company_id = get_user_company(auth.uid()) AND is_manager_or_admin(auth.uid()));

CREATE TABLE public.purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.purchase_orders(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES public.products(id) NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_cost numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  received_quantity integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view order items" ON public.purchase_order_items FOR SELECT USING (EXISTS(SELECT 1 FROM purchase_orders po WHERE po.id = purchase_order_items.order_id AND po.company_id = get_user_company(auth.uid())));
CREATE POLICY "Managers manage order items" ON public.purchase_order_items FOR ALL USING (EXISTS(SELECT 1 FROM purchase_orders po WHERE po.id = purchase_order_items.order_id AND po.company_id = get_user_company(auth.uid()) AND is_manager_or_admin(auth.uid())));

-- =====================================================
-- ACCOUNTING ENTRIES / CONTABILIDADE
-- =====================================================
CREATE TYPE public.accounting_entry_type AS ENUM ('revenue', 'expense', 'tax', 'transfer');

CREATE TABLE public.accounting_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  store_id uuid REFERENCES public.stores(id),
  type accounting_entry_type NOT NULL,
  category text NOT NULL DEFAULT 'general',
  amount numeric NOT NULL DEFAULT 0,
  description text,
  reference_id uuid,
  reference_type text,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.accounting_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view company entries" ON public.accounting_entries FOR SELECT USING (company_id = get_user_company(auth.uid()));
CREATE POLICY "Admins manage entries" ON public.accounting_entries FOR ALL USING (company_id = get_user_company(auth.uid()) AND is_manager_or_admin(auth.uid()));

-- =====================================================
-- EMPLOYEE MANAGEMENT / GESTÃO FUNCIONÁRIOS
-- =====================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS commission_rate numeric DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS shift_start time;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS shift_end time;

-- =====================================================
-- COMMISSION TRACKING
-- =====================================================
CREATE TABLE public.commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  sale_id uuid REFERENCES public.sales(id),
  store_id uuid REFERENCES public.stores(id) NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  rate numeric NOT NULL DEFAULT 0,
  status text DEFAULT 'pending',
  paid_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own commissions" ON public.commissions FOR SELECT USING (user_id = auth.uid() OR is_manager_or_admin(auth.uid()));
CREATE POLICY "System inserts commissions" ON public.commissions FOR INSERT WITH CHECK (is_manager_or_admin(auth.uid()));
CREATE POLICY "Admins manage commissions" ON public.commissions FOR ALL USING (is_admin(auth.uid()));

-- =====================================================
-- AUTO-UPDATE CRM on sale completion
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_customer_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND NEW.customer_name IS NOT NULL THEN
    UPDATE customers
    SET total_spent = total_spent + NEW.total,
        total_purchases = total_purchases + 1,
        last_purchase_at = now(),
        vip_level = CASE 
          WHEN total_spent + NEW.total >= 100000 THEN 'platinum'
          WHEN total_spent + NEW.total >= 50000 THEN 'gold'
          WHEN total_spent + NEW.total >= 10000 THEN 'silver'
          ELSE 'regular'
        END
    WHERE full_name = NEW.customer_name
      AND store_id = NEW.store_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_customer_stats
  AFTER INSERT ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_stats();

-- =====================================================
-- AUTO-CREATE accounting entry on sale
-- =====================================================
CREATE OR REPLACE FUNCTION public.auto_accounting_entry_on_sale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
BEGIN
  IF NEW.status = 'completed' THEN
    SELECT company_id INTO v_company_id FROM stores WHERE id = NEW.store_id;
    IF v_company_id IS NOT NULL THEN
      INSERT INTO accounting_entries (company_id, store_id, type, category, amount, description, reference_id, reference_type, created_by)
      VALUES (v_company_id, NEW.store_id, 'revenue', 'sales', NEW.total, 'Venda #' || LEFT(NEW.id::text, 8), NEW.id, 'sale', NEW.user_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_accounting_sale
  AFTER INSERT ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION auto_accounting_entry_on_sale();
