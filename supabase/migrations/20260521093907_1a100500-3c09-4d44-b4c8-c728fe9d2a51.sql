-- Add WMS fields to products
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS unit_type TEXT DEFAULT 'unit',
ADD COLUMN IF NOT EXISTS conversion_factor NUMERIC DEFAULT 1,
ADD COLUMN IF NOT EXISTS min_stock_level INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_stock_level INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS weight NUMERIC,
ADD COLUMN IF NOT EXISTS dimensions JSONB;

-- Create serial numbers tracking
CREATE TABLE public.serial_numbers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id),
    product_id UUID NOT NULL REFERENCES public.products(id),
    serial_number TEXT NOT NULL,
    status TEXT DEFAULT 'available', -- available, sold, returned, defective
    warranty_expiry TIMESTAMP WITH TIME ZONE,
    current_store_id UUID REFERENCES public.stores(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(company_id, serial_number)
);

ALTER TABLE public.serial_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view serial numbers of their company" 
ON public.serial_numbers FOR SELECT USING (auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = serial_numbers.company_id));

-- Create inventory audits
CREATE TABLE public.inventory_audits (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id),
    store_id UUID REFERENCES public.stores(id),
    status TEXT DEFAULT 'draft', -- draft, completed, cancelled
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE public.inventory_audit_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    audit_id UUID NOT NULL REFERENCES public.inventory_audits(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id),
    system_qty INTEGER NOT NULL,
    physical_qty INTEGER NOT NULL,
    discrepancy_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.inventory_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_audit_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view audits of their company" 
ON public.inventory_audits FOR SELECT USING (auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = inventory_audits.company_id));

CREATE POLICY "Users can view audit items" 
ON public.inventory_audit_items FOR SELECT USING (EXISTS (SELECT 1 FROM inventory_audits WHERE id = audit_id));
