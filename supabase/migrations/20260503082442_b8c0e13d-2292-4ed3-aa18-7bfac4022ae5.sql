-- Permitir inserção em profiles para usuários autenticados
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' AND policyname = 'Permitir inserção de novos perfis por usuários autenticados'
    ) THEN
        CREATE POLICY "Permitir inserção de novos perfis por usuários autenticados" 
        ON public.profiles FOR INSERT 
        WITH CHECK (auth.role() = 'authenticated');
    END IF;
END $$;

-- Permitir inserção em user_company para usuários autenticados
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_company' AND policyname = 'Permitir vinculação de utilizadores por usuários autenticados'
    ) THEN
        CREATE POLICY "Permitir vinculação de utilizadores por usuários autenticados" 
        ON public.user_company FOR INSERT 
        WITH CHECK (auth.role() = 'authenticated');
    END IF;
END $$;
