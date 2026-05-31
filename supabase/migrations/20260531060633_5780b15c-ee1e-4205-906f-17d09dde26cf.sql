-- Add timezone column to stores table
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Africa/Maputo';

-- Update existing stores to have the default timezone if null
UPDATE public.stores SET timezone = 'Africa/Maputo' WHERE timezone IS NULL;

-- Ensure companies also have a default timezone if null (it already exists but good to be sure)
UPDATE public.companies SET timezone = 'Africa/Maputo' WHERE timezone IS NULL;
