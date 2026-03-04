
-- Add cost_total and profit columns to sales table
ALTER TABLE public.sales ADD COLUMN cost_total numeric NOT NULL DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN profit numeric NOT NULL DEFAULT 0;

-- Backfill existing sales with calculated values from sale_items
UPDATE public.sales s
SET 
  cost_total = COALESCE(sub.total_cost, 0),
  profit = COALESCE(sub.total_profit, 0)
FROM (
  SELECT 
    sale_id,
    SUM(cost_price * quantity) as total_cost,
    SUM(COALESCE(profit, 0)) as total_profit
  FROM public.sale_items
  GROUP BY sale_id
) sub
WHERE s.id = sub.sale_id;
