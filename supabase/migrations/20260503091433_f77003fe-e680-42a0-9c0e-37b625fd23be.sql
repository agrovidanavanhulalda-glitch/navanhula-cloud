-- 1. Identificar o CEO
DO $$
DECLARE
    ceo_id UUID := 'd9b128a1-e0f1-40c3-8ea8-616f83ccd10c';
BEGIN
    -- Garantir que o CEO existe e é super admin
    UPDATE public.profiles 
    SET is_super_admin = true, status = 'active', is_active = true
    WHERE id = ceo_id;

    -- Garantir que a empresa do CEO é Master
    UPDATE public.companies 
    SET is_master = true, is_active = true 
    WHERE id = (SELECT company_id FROM public.profiles WHERE id = ceo_id);

    -- 2. Limpeza de Utilizadores (remover todos exceto o CEO)
    DELETE FROM public.user_roles WHERE user_id != ceo_id;
    DELETE FROM public.user_company WHERE user_id != ceo_id;
    DELETE FROM public.company_users WHERE user_id != ceo_id;
    DELETE FROM public.profiles WHERE id != ceo_id;

    -- 3. Garantir Cargo CEO (limpar primeiro para evitar duplicados se houver outras roles)
    DELETE FROM public.user_roles WHERE user_id = ceo_id;
    INSERT INTO public.user_roles (user_id, role) VALUES (ceo_id, 'ceo');

END $$;

-- 4. Função Helper para bypass de RLS
CREATE OR REPLACE FUNCTION public.is_master_ceo()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_super_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Atualizar políticas RLS para todas as tabelas críticas
-- Produtos
DROP POLICY IF EXISTS "CEO full access" ON public.products;
CREATE POLICY "CEO full access" ON public.products FOR ALL USING (is_master_ceo());

DROP POLICY IF EXISTS "Company users manage products" ON public.products;
CREATE POLICY "Company users manage products" ON public.products 
FOR ALL TO authenticated
USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()) OR is_master_ceo())
WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()) OR is_master_ceo());

-- Stock
DROP POLICY IF EXISTS "Company users manage stock" ON public.product_stock;
CREATE POLICY "Company users manage stock" ON public.product_stock 
FOR ALL TO authenticated
USING (store_id IN (SELECT id FROM stores WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())) OR is_master_ceo());

-- Vendas
DROP POLICY IF EXISTS "CEO view all sales" ON public.sales;
CREATE POLICY "CEO view all sales" ON public.sales FOR SELECT USING (is_master_ceo());

-- Perfis
DROP POLICY IF EXISTS "CEO manages profiles" ON public.profiles;
CREATE POLICY "CEO manages profiles" ON public.profiles FOR ALL USING (is_master_ceo());
