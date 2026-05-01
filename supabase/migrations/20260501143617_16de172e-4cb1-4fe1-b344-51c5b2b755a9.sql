ALTER TABLE public.onboarding_progress 
ADD COLUMN IF NOT EXISTS first_cash_opened BOOLEAN DEFAULT false;