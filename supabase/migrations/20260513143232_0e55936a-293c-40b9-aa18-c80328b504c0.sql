-- unificar sistema de roles
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('ceo', 'admin', 'manager', 'seller', 'cashier', 'accountant', 'director', 'reseller', 'hr', 'super_admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Garantir que tabelas críticas tenham RLS e company_id
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;

-- Funções auxiliares otimizadas
CREATE OR REPLACE FUNCTION public.get_user_company(_user_id uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT company_id FROM public.profiles WHERE id = _user_id;
$function$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$function$;

-- Políticas de Isolamento Enterprise (Exemplo para Products)
DROP POLICY IF EXISTS "Users can view company products" ON public.products;
CREATE POLICY "Users can view company products" 
ON public.products FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

DROP POLICY IF EXISTS "Managers can manage products" ON public.products;
CREATE POLICY "Managers can manage products" 
ON public.products FOR ALL 
USING (
  company_id = get_user_company(auth.uid()) AND 
  (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'ceo') OR has_role(auth.uid(), 'manager'))
);

-- Corrigir trigger de audit para não causar loops ou falhas silenciosas
CREATE OR REPLACE FUNCTION public.process_audit_log()
RETURNS TRIGGER AS $$
BEGIN
  -- Apenas registra se houver uma empresa associada
  IF (NEW.company_id IS NULL) THEN
    NEW.company_id := get_user_company(auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
