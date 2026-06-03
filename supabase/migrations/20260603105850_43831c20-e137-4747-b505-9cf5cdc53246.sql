-- Adicionar a coluna access_level à tabela employees
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS access_level public.app_role DEFAULT 'seller'::public.app_role;

-- Comentário para documentação
COMMENT ON COLUMN public.employees.access_level IS 'Nível de acesso do funcionário (admin, manager, seller, etc.)';
