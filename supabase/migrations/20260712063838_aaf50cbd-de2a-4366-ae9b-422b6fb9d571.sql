-- Pre-Fiscal Quality Gate: drop the legacy 14-arg overload of pos_complete_sale.
-- Only the idempotent 15-arg version (with p_client_sale_id) is the single source
-- of truth for sales. Removing the dead overload eliminates any ambiguous resolution
-- risk from stale callers or PostgREST signature disambiguation.
DROP FUNCTION IF EXISTS public.pos_complete_sale(
  uuid, uuid, text, jsonb, numeric, numeric, numeric, numeric,
  text, text, text, text, text, text
);