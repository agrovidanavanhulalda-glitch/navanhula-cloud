-- Enable RLS on core tables if not already enabled
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_invitations ENABLE ROW LEVEL SECURITY;

-- Drop existing complex policies to avoid conflicts
DROP POLICY IF EXISTS "CEO can see all products" ON public.products;
DROP POLICY IF EXISTS "CEO full access" ON public.products;
DROP POLICY IF EXISTS "Company users manage products" ON public.products;
DROP POLICY IF EXISTS "Managers manage company products" ON public.products;
DROP POLICY IF EXISTS "Users can view products of their company" ON public.products;

DROP POLICY IF EXISTS "Managers and admins can update stock" ON public.product_stock;
DROP POLICY IF EXISTS "Users can manage stock of their company" ON public.product_stock;
DROP POLICY IF EXISTS "Users can view stock of their company" ON public.product_stock;

DROP POLICY IF EXISTS "Company admins manage invitations" ON public.company_invitations;
DROP POLICY IF EXISTS "Company members can view their invitations" ON public.company_invitations;

DROP POLICY IF EXISTS "Admins can insert company_users records" ON public.company_users;
DROP POLICY IF EXISTS "Owners/admins delete company users" ON public.company_users;
DROP POLICY IF EXISTS "Owners/admins manage company users" ON public.company_users;
DROP POLICY IF EXISTS "Owners/admins update company users" ON public.company_users;
DROP POLICY IF EXISTS "Users see their company memberships" ON public.company_users;

-- Products Policies
CREATE POLICY "Users can view products of their company" 
ON public.products FOR SELECT 
USING (
  company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  OR (SELECT role FROM public.company_users WHERE user_id = auth.uid() LIMIT 1) = 'ceo'
);

CREATE POLICY "Users can insert products of their company" 
ON public.products FOR INSERT 
WITH CHECK (
  company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can update products of their company" 
ON public.products FOR UPDATE 
USING (
  company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can delete products of their company" 
ON public.products FOR DELETE 
USING (
  company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);

-- Product Stock Policies
CREATE POLICY "Users can view stock of their company" 
ON public.product_stock FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.products p
    JOIN public.profiles pr ON p.company_id = pr.company_id
    WHERE p.id = product_stock.product_id AND pr.id = auth.uid()
  )
);

CREATE POLICY "Users can manage stock of their company" 
ON public.product_stock FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.products p
    JOIN public.profiles pr ON p.company_id = pr.company_id
    WHERE p.id = product_stock.product_id AND pr.id = auth.uid()
  )
);

-- Company Users Policies
CREATE POLICY "Users can see colleagues" 
ON public.company_users FOR SELECT 
USING (
  company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Admins can manage company users" 
ON public.company_users FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.company_users cu 
    WHERE cu.user_id = auth.uid() 
    AND cu.company_id = public.company_users.company_id 
    AND cu.role IN ('admin', 'ceo', 'owner')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.company_users cu 
    WHERE cu.user_id = auth.uid() 
    AND cu.company_id = public.company_users.company_id 
    AND cu.role IN ('admin', 'ceo', 'owner')
  )
);

-- Company Invitations Policies
CREATE POLICY "Admins can manage invitations" 
ON public.company_invitations FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.company_users cu 
    WHERE cu.user_id = auth.uid() 
    AND cu.company_id = public.company_invitations.company_id 
    AND cu.role IN ('admin', 'ceo', 'owner')
  )
);

CREATE POLICY "Anyone can view invitation by token" 
ON public.company_invitations FOR SELECT 
USING (true);

-- Profile Policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by company members" 
ON public.profiles FOR SELECT 
USING (
  company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  OR id = auth.uid()
);

CREATE POLICY "Admins can update company profiles" 
ON public.profiles FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.company_users cu 
    WHERE cu.user_id = auth.uid() 
    AND cu.company_id = public.profiles.company_id 
    AND cu.role IN ('admin', 'ceo', 'owner')
  )
);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (id = auth.uid());

-- Allow initial profile creation during signup
CREATE POLICY "Allow profile insertion during signup" 
ON public.profiles FOR INSERT 
WITH CHECK (true);
