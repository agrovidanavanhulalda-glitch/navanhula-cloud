-- Função robusta para lidar com novos utilizadores
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
    v_company_id UUID;
    v_branch_id UUID;
    v_full_name TEXT;
    v_role TEXT;
    v_store_id UUID;
BEGIN
    -- Extrair metadados passados no signUp/invite
    v_company_id := (NEW.raw_user_meta_data->>'company_id')::UUID;
    v_branch_id := (NEW.raw_user_meta_data->>'branch_id')::UUID;
    v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'seller');

    -- Se não houver company_id nos metadados, tentar pegar a empresa padrão ou do criador
    IF v_company_id IS NULL THEN
        SELECT id INTO v_company_id FROM public.companies WHERE is_system_owner = true LIMIT 1;
        IF v_company_id IS NULL THEN
            SELECT id INTO v_company_id FROM public.companies ORDER BY created_at LIMIT 1;
        END IF;
    END IF;

    -- Buscar uma loja válida para a empresa
    SELECT id INTO v_store_id FROM public.stores 
    WHERE company_id = v_company_id 
    ORDER BY created_at LIMIT 1;

    -- 1. Criar perfil
    INSERT INTO public.profiles (
        id, 
        email, 
        full_name, 
        company_id, 
        branch_id,
        store_id, 
        status, 
        onboarding_completed
    )
    VALUES (
        NEW.id, 
        NEW.email, 
        v_full_name, 
        v_company_id, 
        v_branch_id,
        v_store_id,
        'active',
        true
    )
    ON CONFLICT (id) DO UPDATE SET
        company_id = EXCLUDED.company_id,
        branch_id = EXCLUDED.branch_id,
        store_id = EXCLUDED.store_id,
        full_name = EXCLUDED.full_name;

    -- 2. Vincular à empresa com role correto
    INSERT INTO public.company_users (
        user_id, 
        company_id, 
        branch_id,
        role, 
        status
    )
    VALUES (
        NEW.id, 
        v_company_id, 
        v_branch_id,
        v_role,
        'active'
    )
    ON CONFLICT (user_id, company_id) DO UPDATE SET
        role = EXCLUDED.role,
        branch_id = EXCLUDED.branch_id,
        status = 'active';

    -- 3. Garantir role em user_roles (se existir a tabela)
    BEGIN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, v_role)
        ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
    EXCEPTION WHEN OTHERS THEN
        -- Tabela user_roles pode não existir ou ter estrutura diferente
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger no Auth schema (requer permissões especiais, mas executado via migração)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Corrigir permissões de RLS para permitir que o trigger funcione sem restrições
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;

-- Garantir que o sistema possa ler perfis para sincronização
DROP POLICY IF EXISTS "System can manage profiles" ON public.profiles;
CREATE POLICY "System can manage profiles" ON public.profiles
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "System can manage company_users" ON public.company_users;
CREATE POLICY "System can manage company_users" ON public.company_users
    FOR ALL USING (true) WITH CHECK (true);
