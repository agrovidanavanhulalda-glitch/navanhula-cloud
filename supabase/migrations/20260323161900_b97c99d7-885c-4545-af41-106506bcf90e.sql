
-- Fix search_path security warnings
ALTER FUNCTION public.update_stock_after_sale() SET search_path = public;
ALTER FUNCTION public.update_last_sale_date() SET search_path = public;
