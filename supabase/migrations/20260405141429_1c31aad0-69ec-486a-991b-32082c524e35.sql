
-- Add plan_tier enum
CREATE TYPE public.plan_tier AS ENUM ('starter', 'pro', 'enterprise');

-- Add plan_tier column to subscriptions
ALTER TABLE public.subscriptions 
ADD COLUMN plan_tier plan_tier NOT NULL DEFAULT 'pro';

-- Add max limits columns
ALTER TABLE public.subscriptions
ADD COLUMN max_products integer NOT NULL DEFAULT 1000,
ADD COLUMN max_sellers integer NOT NULL DEFAULT 10,
ADD COLUMN max_stores integer NOT NULL DEFAULT 5;

-- Function to sync plan limits when tier changes
CREATE OR REPLACE FUNCTION public.sync_plan_limits()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  CASE NEW.plan_tier
    WHEN 'starter' THEN
      NEW.max_products := 100;
      NEW.max_sellers := 2;
      NEW.max_stores := 1;
      NEW.price_monthly := 750;
    WHEN 'pro' THEN
      NEW.max_products := 1000;
      NEW.max_sellers := 10;
      NEW.max_stores := 5;
      NEW.price_monthly := 1500;
    WHEN 'enterprise' THEN
      NEW.max_products := -1;
      NEW.max_sellers := -1;
      NEW.max_stores := -1;
      NEW.price_monthly := 3500;
  END CASE;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_plan_limits
BEFORE INSERT OR UPDATE OF plan_tier ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.sync_plan_limits();
