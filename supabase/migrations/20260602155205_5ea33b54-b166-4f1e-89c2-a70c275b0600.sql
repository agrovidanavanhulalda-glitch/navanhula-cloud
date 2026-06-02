ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'pt';
COMMENT ON COLUMN public.profiles.language IS 'User preferred language code (e.g., pt, en, es)';
