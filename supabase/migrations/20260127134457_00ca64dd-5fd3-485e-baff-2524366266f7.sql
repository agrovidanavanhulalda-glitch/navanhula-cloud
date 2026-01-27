-- Create customers table
CREATE TABLE public.customers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    full_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    notes TEXT,
    store_id UUID REFERENCES public.stores(id),
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Trigger for updated_at
CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON public.customers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create junction table to track which sellers served which customers
CREATE TABLE public.customer_sellers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL,
    store_id UUID NOT NULL REFERENCES public.stores(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(customer_id, seller_id)
);

-- Enable RLS on junction table
ALTER TABLE public.customer_sellers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customers table

-- Admin can do everything
CREATE POLICY "Admins have full access to customers"
ON public.customers
FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Managers can view customers from their store
CREATE POLICY "Managers can view store customers"
ON public.customers
FOR SELECT
TO authenticated
USING (
    is_manager_or_admin(auth.uid()) 
    AND store_id = get_user_store(auth.uid())
);

-- Managers can insert customers for their store
CREATE POLICY "Managers can insert store customers"
ON public.customers
FOR INSERT
TO authenticated
WITH CHECK (
    is_manager_or_admin(auth.uid()) 
    AND store_id = get_user_store(auth.uid())
);

-- Managers can update customers from their store
CREATE POLICY "Managers can update store customers"
ON public.customers
FOR UPDATE
TO authenticated
USING (
    is_manager_or_admin(auth.uid()) 
    AND store_id = get_user_store(auth.uid())
)
WITH CHECK (
    is_manager_or_admin(auth.uid()) 
    AND store_id = get_user_store(auth.uid())
);

-- Sellers can only view customers they've served
CREATE POLICY "Sellers can view their customers"
ON public.customers
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.customer_sellers cs
        WHERE cs.customer_id = customers.id
        AND cs.seller_id = auth.uid()
    )
);

-- Sellers can insert customers (will be linked via customer_sellers)
CREATE POLICY "Sellers can insert customers"
ON public.customers
FOR INSERT
TO authenticated
WITH CHECK (
    created_by = auth.uid()
    AND store_id = get_user_store(auth.uid())
);

-- RLS Policies for customer_sellers junction table

-- Users can view their own customer links
CREATE POLICY "Users can view own customer links"
ON public.customer_sellers
FOR SELECT
TO authenticated
USING (seller_id = auth.uid() OR is_manager_or_admin(auth.uid()));

-- Users can insert their own customer links
CREATE POLICY "Users can insert own customer links"
ON public.customer_sellers
FOR INSERT
TO authenticated
WITH CHECK (
    seller_id = auth.uid()
    AND store_id = get_user_store(auth.uid())
);

-- Admins can manage all customer links
CREATE POLICY "Admins manage all customer links"
ON public.customer_sellers
FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Create a public view that hides sensitive fields for non-privileged users
-- This view will be used by the application
CREATE OR REPLACE VIEW public.customers_safe
WITH (security_invoker = on)
AS
SELECT 
    id,
    full_name,
    -- Only show contact info to managers and admins
    CASE 
        WHEN is_manager_or_admin(auth.uid()) THEN phone
        ELSE NULL
    END as phone,
    CASE 
        WHEN is_manager_or_admin(auth.uid()) THEN email
        ELSE NULL
    END as email,
    address,
    notes,
    store_id,
    created_by,
    created_at,
    updated_at
FROM public.customers;

-- Grant access to authenticated users only
GRANT SELECT ON public.customers_safe TO authenticated;
GRANT ALL ON public.customers TO authenticated;
GRANT ALL ON public.customer_sellers TO authenticated;

-- Explicitly deny access to anon role
REVOKE ALL ON public.customers FROM anon;
REVOKE ALL ON public.customer_sellers FROM anon;
REVOKE ALL ON public.customers_safe FROM anon;