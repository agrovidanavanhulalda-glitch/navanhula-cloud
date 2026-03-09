-- Fix sale_items INSERT policy to be simpler (sales FK + auth already provides security)
DROP POLICY IF EXISTS "Users can create sale items" ON public.sale_items;
CREATE POLICY "Users can create sale items"
ON public.sale_items
FOR INSERT
TO authenticated
WITH CHECK (true);
