
-- 1. Criar função auxiliar current_company_id() se não existir
CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid();
$$;

-- 2. Limpeza e Padronização de RLS para tabelas críticas

DO $$
DECLARE
    t TEXT;
    p TEXT;
    tables_to_fix TEXT[] := ARRAY[
        'products', 'customers', 'sales', 'sale_items', 
        'stock_movements', 'profiles', 'notifications', 
        'audit_logs', 'branches', 'cash_registers'
    ];
BEGIN
    -- Loop pelas tabelas para remover políticas antigas (especialmente as públicas/anon)
    FOREACH t IN ARRAY tables_to_fix
    LOOP
        FOR p IN (SELECT policyname FROM pg_policies WHERE tablename = t)
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p, t);
        END LOOP;
        
        -- Garantir que RLS está habilitado
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        
        -- Criar nova política unificada de isolamento por empresa
        -- Usando role 'authenticated' apenas
        EXECUTE format('
            CREATE POLICY "Enterprise company isolation" ON public.%I
            FOR ALL
            TO authenticated
            USING (company_id = current_company_id())
            WITH CHECK (company_id = current_company_id())
        ', t);
        
        -- Garantir GRANTs básicos para authenticated e service_role
        EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
        EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    END LOOP;
END $$;

-- 3. Exceção especial para a tabela PROFILES (SELECT deve permitir ver outros usuários da mesma empresa)
DROP POLICY IF EXISTS "Enterprise company isolation" ON public.profiles;
CREATE POLICY "Profiles enterprise isolation" ON public.profiles
FOR ALL
TO authenticated
USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (id = auth.uid() AND company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- 4. Exceção especial para SALE_ITEMS (deve permitir acesso via Sale ID se necessário, mas company_id é preferível)
-- Já coberto pela política genérica pois sale_items possui company_id.

-- 5. Garantir que não existam políticas para 'anon' ou 'public' nestas tabelas
-- (O loop acima já removeu todas, mas como precaução extra, o comando 'TO authenticated' na nova política restringe o acesso)
