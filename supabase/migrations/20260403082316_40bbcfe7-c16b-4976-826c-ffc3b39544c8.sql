
-- Create agro_producers table
CREATE TABLE public.agro_producers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  nome_granja TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  tipo_produto TEXT NOT NULL DEFAULT 'frango',
  quantidade_disponivel INTEGER NOT NULL DEFAULT 0,
  preco NUMERIC(12,2) NOT NULL DEFAULT 0,
  telefone TEXT,
  foto_url TEXT,
  status TEXT NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create agro_orders table
CREATE TABLE public.agro_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  producer_id UUID REFERENCES public.agro_producers(id) ON DELETE CASCADE NOT NULL,
  cliente_nome TEXT NOT NULL,
  cliente_contacto TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  preco_unitario NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pendente',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agro_producers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agro_orders ENABLE ROW LEVEL SECURITY;

-- Producers policies
CREATE POLICY "Authenticated users can view producers"
  ON public.agro_producers FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Company admins can insert producers"
  ON public.agro_producers FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Company admins can update producers"
  ON public.agro_producers FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Company admins can delete producers"
  ON public.agro_producers FOR DELETE TO authenticated
  USING (company_id = public.get_user_company(auth.uid()) AND public.is_manager_or_admin(auth.uid()));

-- Orders policies
CREATE POLICY "Users can view company orders"
  ON public.agro_orders FOR SELECT TO authenticated
  USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Authenticated users can create orders"
  ON public.agro_orders FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Company users can update their orders"
  ON public.agro_orders FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company(auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_agro_producers_updated_at
  BEFORE UPDATE ON public.agro_producers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agro_orders_updated_at
  BEFORE UPDATE ON public.agro_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.agro_producers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agro_orders;
