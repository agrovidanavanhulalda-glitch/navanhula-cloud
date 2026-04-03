
-- Create delivery_drivers table
CREATE TABLE public.delivery_drivers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  telefone TEXT,
  status TEXT NOT NULL DEFAULT 'disponivel',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.delivery_drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage drivers in their company"
  ON public.delivery_drivers
  FOR ALL
  TO authenticated
  USING (company_id = public.get_user_company(auth.uid()))
  WITH CHECK (company_id = public.get_user_company(auth.uid()));

-- Add driver_id and delivery_status to agro_orders
ALTER TABLE public.agro_orders
  ADD COLUMN IF NOT EXISTS driver_id UUID REFERENCES public.delivery_drivers(id),
  ADD COLUMN IF NOT EXISTS delivery_status TEXT NOT NULL DEFAULT 'aguardando';

-- Trigger for updated_at
CREATE TRIGGER update_delivery_drivers_updated_at
  BEFORE UPDATE ON public.delivery_drivers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
