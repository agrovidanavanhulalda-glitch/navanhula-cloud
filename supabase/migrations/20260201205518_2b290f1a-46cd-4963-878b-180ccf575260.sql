-- 1. Create companies table for multi-tenant SaaS
CREATE TABLE public.companies (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    nif TEXT,
    phone TEXT,
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Enable RLS on companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- 3. Add company_id and onboarding_completed to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- 4. Add company_id to stores
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- 5. Create function to get user's company
CREATE OR REPLACE FUNCTION public.get_user_company(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE id = _user_id
$$;

-- 6. Create function to check if user completed onboarding
CREATE OR REPLACE FUNCTION public.has_completed_onboarding(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(onboarding_completed, false) FROM public.profiles WHERE id = _user_id
$$;

-- 7. RLS Policies for companies
CREATE POLICY "Users can view their company"
ON public.companies
FOR SELECT
USING (id = get_user_company(auth.uid()));

CREATE POLICY "Admins can manage their company"
ON public.companies
FOR ALL
USING (id = get_user_company(auth.uid()) AND is_admin(auth.uid()));

-- 8. Update stores RLS to include company scope
DROP POLICY IF EXISTS "Users can view their store" ON public.stores;
DROP POLICY IF EXISTS "Admins can do everything with stores" ON public.stores;

CREATE POLICY "Users can view stores in their company"
ON public.stores
FOR SELECT
USING (company_id = get_user_company(auth.uid()) OR is_admin(auth.uid()));

CREATE POLICY "Admins can manage stores in their company"
ON public.stores
FOR ALL
USING (company_id = get_user_company(auth.uid()) AND is_admin(auth.uid()));

-- 9. Create onboarding function (atomic transaction)
CREATE OR REPLACE FUNCTION public.complete_onboarding(
    p_company_name TEXT,
    p_company_nif TEXT DEFAULT NULL,
    p_company_phone TEXT DEFAULT NULL,
    p_company_address TEXT DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_company_id uuid;
    v_store_id uuid;
    v_existing_company uuid;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Check if user already has a company (prevent duplicate onboarding)
    SELECT company_id INTO v_existing_company
    FROM public.profiles
    WHERE id = v_user_id;
    
    IF v_existing_company IS NOT NULL THEN
        RAISE EXCEPTION 'User already has a company assigned';
    END IF;
    
    -- 1. Create company
    INSERT INTO public.companies (name, nif, phone, address)
    VALUES (p_company_name, p_company_nif, p_company_phone, p_company_address)
    RETURNING id INTO v_company_id;
    
    -- 2. Create default store "Loja Principal"
    INSERT INTO public.stores (name, company_id, is_active)
    VALUES ('Loja Principal', v_company_id, true)
    RETURNING id INTO v_store_id;
    
    -- 3. Update user profile with company and mark onboarding complete
    UPDATE public.profiles
    SET 
        company_id = v_company_id,
        store_id = v_store_id,
        onboarding_completed = true,
        is_active = true,
        updated_at = now()
    WHERE id = v_user_id;
    
    -- 4. Ensure user has admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RETURN json_build_object(
        'success', true,
        'company_id', v_company_id,
        'store_id', v_store_id,
        'message', 'Empresa criada com sucesso. Bem-vindo ao NAVANHULA POS.'
    );
END;
$$;

-- 10. Trigger to update updated_at on companies
CREATE TRIGGER update_companies_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();