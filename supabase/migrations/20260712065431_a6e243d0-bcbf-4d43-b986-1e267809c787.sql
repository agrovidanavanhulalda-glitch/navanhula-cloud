
-- Index for worker polling
CREATE INDEX IF NOT EXISTS idx_background_tasks_poll
  ON public.background_tasks (status, next_retry_at)
  WHERE status IN ('PENDING', 'RETRY');

-- Enqueue fiscal job (idempotent per sale)
CREATE OR REPLACE FUNCTION public.enqueue_fiscal_job(p_sale_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sale RECORD;
  v_task_id uuid;
  v_existing uuid;
BEGIN
  SELECT id, company_id, store_id, status
    INTO v_sale
    FROM public.sales
   WHERE id = p_sale_id;

  IF v_sale.id IS NULL THEN
    RAISE EXCEPTION 'SALE_NOT_FOUND';
  END IF;

  -- Idempotency: reuse pending/processing job for same sale
  SELECT id INTO v_existing
    FROM public.background_tasks
   WHERE task_type = 'ISSUE_FISCAL_DOCUMENT'
     AND payload->>'sale_id' = p_sale_id::text
     AND status IN ('PENDING','PROCESSING','RETRY','COMPLETED')
   LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  INSERT INTO public.background_tasks (
    task_type, payload, company_id, max_attempts, status, next_retry_at, created_by
  ) VALUES (
    'ISSUE_FISCAL_DOCUMENT',
    jsonb_build_object(
      'sale_id',   p_sale_id,
      'store_id',  v_sale.store_id,
      'company_id',v_sale.company_id
    ),
    v_sale.company_id,
    3,
    'PENDING',
    now(),
    auth.uid()
  )
  RETURNING id INTO v_task_id;

  RETURN v_task_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.enqueue_fiscal_job(uuid) TO authenticated, service_role;
