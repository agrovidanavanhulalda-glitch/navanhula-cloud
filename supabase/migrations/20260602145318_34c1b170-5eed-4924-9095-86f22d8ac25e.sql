-- Add unique constraint to key if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'roles_key_unique') THEN
        ALTER TABLE public.roles ADD CONSTRAINT roles_key_unique UNIQUE (key);
    END IF;
END $$;

-- Insert missing roles into the public.roles table to match app_role enum
INSERT INTO public.roles (key, name)
VALUES 
    ('ceo', 'CEO'),
    ('reseller', 'Revendedor'),
    ('director', 'Diretor'),
    ('hr', 'Recursos Humanos'),
    ('cashier', 'Caixa'),
    ('viewer', 'Visualizador')
ON CONFLICT (key) DO NOTHING;

-- Improve map_role_name function
CREATE OR REPLACE FUNCTION public.map_role_name(p_role text)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_key TEXT;
    v_role_lower TEXT := LOWER(TRIM(p_role));
BEGIN
    -- 1. Check if it's already a valid key in the roles table
    SELECT key INTO v_key FROM public.roles WHERE LOWER(key) = v_role_lower LIMIT 1;
    IF v_key IS NOT NULL THEN
        RETURN v_key;
    END IF;

    -- 2. Check if it matches a role name
    SELECT key INTO v_key FROM public.roles WHERE LOWER(name) = v_role_lower LIMIT 1;
    IF v_key IS NOT NULL THEN
        RETURN v_key;
    END IF;

    -- 3. Manual fallbacks/aliases
    RETURN CASE v_role_lower
        WHEN 'owner' THEN 'ceo'
        WHEN 'administrator' THEN 'admin'
        WHEN 'administrador' THEN 'admin'
        WHEN 'gerente' THEN 'manager'
        WHEN 'vendedor' THEN 'seller'
        WHEN 'financeiro' THEN 'admin'
        WHEN 'accountant' THEN 'seller'
        WHEN 'caixa' THEN 'cashier'
        WHEN 'técnico' THEN 'seller'
        WHEN 'tecnico' THEN 'seller'
        ELSE 'seller' -- Default to lowest privilege
    END;
END;
$function$;
