
-- 1. Add company_id to products table for multi-tenant isolation
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

-- 2. Backfill company_id from existing product_stock -> stores -> companies
UPDATE public.products p
SET company_id = (
  SELECT s.company_id 
  FROM public.product_stock ps 
  JOIN public.stores s ON ps.store_id = s.id 
  WHERE ps.product_id = p.id 
  LIMIT 1
)
WHERE p.company_id IS NULL;

-- 3. For products with no stock records, assign to first company
UPDATE public.products p
SET company_id = (SELECT id FROM public.companies ORDER BY created_at LIMIT 1)
WHERE p.company_id IS NULL;

-- 4. Drop old permissive RLS policy on products
DROP POLICY IF EXISTS "All authenticated users can view products" ON public.products;
DROP POLICY IF EXISTS "Managers and admins can manage products" ON public.products;

-- 5. Create company-scoped RLS policies for products
CREATE POLICY "Users view company products"
ON public.products FOR SELECT TO authenticated
USING (company_id = public.get_user_company(auth.uid()) OR public.has_role(auth.uid(), 'ceo'));

CREATE POLICY "Managers manage company products"
ON public.products FOR ALL TO authenticated
USING (company_id = public.get_user_company(auth.uid()) AND public.is_manager_or_admin(auth.uid()))
WITH CHECK (company_id = public.get_user_company(auth.uid()) AND public.is_manager_or_admin(auth.uid()));

-- 6. Add company_id to categories for isolation
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

-- Update categories RLS
DROP POLICY IF EXISTS "Anyone can view categories" ON public.categories;
DROP POLICY IF EXISTS "Managers can manage categories" ON public.categories;

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view company categories"
ON public.categories FOR SELECT TO authenticated
USING (company_id = public.get_user_company(auth.uid()) OR company_id IS NULL);

CREATE POLICY "Managers manage company categories"
ON public.categories FOR ALL TO authenticated
USING (public.is_manager_or_admin(auth.uid()))
WITH CHECK (public.is_manager_or_admin(auth.uid()));
