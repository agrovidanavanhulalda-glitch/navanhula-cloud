
-- Add Founder (Super Owner) mode
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_founder BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_type TEXT NOT NULL DEFAULT 'CLIENT';

-- Bootstrap: mark users of master/system-owner company as founders
UPDATE public.profiles p
SET is_founder = TRUE, account_type = 'FOUNDER'
WHERE p.company_id IN (
  SELECT id FROM public.companies WHERE is_system_owner = TRUE OR company_type = 'master'
);

-- Helper function: is current user a founder?
CREATE OR REPLACE FUNCTION public.is_founder(_user_id uuid DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_founder OR account_type = 'FOUNDER' FROM public.profiles WHERE id = _user_id),
    FALSE
  );
$$;

-- Protect is_founder/account_type: only founders can change them
CREATE OR REPLACE FUNCTION public.protect_founder_flag()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.is_founder IS DISTINCT FROM OLD.is_founder)
     OR (NEW.account_type IS DISTINCT FROM OLD.account_type
         AND (NEW.account_type = 'FOUNDER' OR OLD.account_type = 'FOUNDER')) THEN
    IF NOT public.is_founder(auth.uid()) THEN
      RAISE EXCEPTION 'Only a Founder can modify founder status';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_founder_flag ON public.profiles;
CREATE TRIGGER trg_protect_founder_flag
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_founder_flag();
