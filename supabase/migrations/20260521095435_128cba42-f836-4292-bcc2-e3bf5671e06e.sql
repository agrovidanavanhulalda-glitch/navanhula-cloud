ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Africa/Maputo';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'MZ';
