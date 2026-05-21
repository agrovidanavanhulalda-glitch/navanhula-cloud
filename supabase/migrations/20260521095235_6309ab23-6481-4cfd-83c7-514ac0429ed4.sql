-- Ensure extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Security: Set search_path for critical functions
ALTER FUNCTION public.bootstrap_current_user() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;

-- 2. Performance: Optimize indexes
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON public.profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_stores_company_id ON public.stores(company_id);
CREATE INDEX IF NOT EXISTS idx_products_company_id ON public.products(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_company_id ON public.sales(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_store_id ON public.sales(store_id);
CREATE INDEX IF NOT EXISTS idx_cash_registers_company_id ON public.cash_registers(company_id);

-- 3. RLS Refinement: CEO/Master full access
-- We use user_roles table for role checks
CREATE POLICY "CEO full company access" ON public.companies
    FOR ALL USING (
        auth.uid() IN (
            SELECT user_id FROM public.user_roles 
            WHERE role IN ('ceo', 'admin')
        )
    );

-- 4. Global Error Handling Table
CREATE TABLE IF NOT EXISTS public.system_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    company_id UUID REFERENCES public.companies(id),
    error_message TEXT NOT NULL,
    error_stack TEXT,
    component_name TEXT,
    url TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.system_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own errors" ON public.system_errors
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view company errors" ON public.system_errors
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        ) AND (
            SELECT count(*) FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'ceo')
        ) > 0
    );
