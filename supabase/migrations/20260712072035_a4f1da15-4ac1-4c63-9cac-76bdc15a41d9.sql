
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.fiscal_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid, sale_id uuid, company_id uuid, store_id uuid,
  fiscal_document_id uuid, document_number text,
  worker text NOT NULL DEFAULT 'process-task-queue',
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz, duration_ms integer,
  retry_count integer NOT NULL DEFAULT 0,
  status text NOT NULL CHECK (status IN ('STARTED','SUCCESS','RETRY','FAILED','SKIPPED','REQUEUED','CANCELLED','ARCHIVED')),
  result jsonb, error_code text, error_stack text,
  checksum text, hash text, actor_id uuid,
  source text NOT NULL DEFAULT 'worker',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.fiscal_audit_log TO authenticated;
GRANT ALL ON public.fiscal_audit_log TO service_role;
ALTER TABLE public.fiscal_audit_log ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.user_has_company_access(_company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.get_user_company_ids() c WHERE c = _company_id);
$$;
GRANT EXECUTE ON FUNCTION public.user_has_company_access(uuid) TO authenticated, service_role;

CREATE POLICY "fiscal_audit_company_read" ON public.fiscal_audit_log
FOR SELECT TO authenticated
USING (public.user_has_company_access(company_id) OR public.is_founder(auth.uid()));

CREATE POLICY "fiscal_audit_service_all" ON public.fiscal_audit_log
FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_fiscal_audit_company_time ON public.fiscal_audit_log (company_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_fiscal_audit_status ON public.fiscal_audit_log (status);
CREATE INDEX IF NOT EXISTS idx_fiscal_audit_sale ON public.fiscal_audit_log (sale_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_audit_doc ON public.fiscal_audit_log (fiscal_document_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_audit_job ON public.fiscal_audit_log (job_id);

ALTER TABLE public.fiscal_documents
  ADD COLUMN IF NOT EXISTS content_hash text,
  ADD COLUMN IF NOT EXISTS checksum text,
  ADD COLUMN IF NOT EXISTS integrity_status text NOT NULL DEFAULT 'unverified'
    CHECK (integrity_status IN ('unverified','valid','corrupted')),
  ADD COLUMN IF NOT EXISTS integrity_checked_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_fiscal_documents_integrity
  ON public.fiscal_documents (integrity_status) WHERE integrity_status <> 'valid';

CREATE OR REPLACE FUNCTION public.fiscal_document_canonical(p_document_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'document_number', d.document_number,
    'document_type', d.document_type,
    'company_id', d.company_id, 'store_id', d.store_id,
    'customer_name', d.customer_name, 'customer_nuit', d.customer_nuit,
    'subtotal', d.subtotal, 'tax_amount', d.tax_amount,
    'discount_amount', d.discount_amount, 'total', d.total,
    'issue_date', d.issue_date,
    'items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'description', i.description, 'quantity', i.quantity,
        'unit_price', i.unit_price, 'tax_rate', i.tax_rate, 'line_total', i.line_total
      ) ORDER BY i.id)
      FROM public.fiscal_document_items i WHERE i.document_id = d.id
    ), '[]'::jsonb)
  )::text
  FROM public.fiscal_documents d WHERE d.id = p_document_id;
$$;

CREATE OR REPLACE FUNCTION public.verify_fiscal_document_integrity(p_document_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_canonical text; v_hash text; v_current text; v_status text; v_company uuid;
BEGIN
  SELECT content_hash, company_id INTO v_current, v_company
  FROM public.fiscal_documents WHERE id = p_document_id;
  IF v_company IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'DOCUMENT_NOT_FOUND');
  END IF;
  v_canonical := public.fiscal_document_canonical(p_document_id);
  v_hash := encode(digest(v_canonical, 'sha256'), 'hex');

  IF v_current IS NULL THEN
    v_status := 'valid';
    UPDATE public.fiscal_documents
      SET content_hash = v_hash, checksum = md5(v_canonical),
          integrity_status = v_status, integrity_checked_at = now()
      WHERE id = p_document_id;
  ELSIF v_current = v_hash THEN
    v_status := 'valid';
    UPDATE public.fiscal_documents SET integrity_status = v_status, integrity_checked_at = now() WHERE id = p_document_id;
  ELSE
    v_status := 'corrupted';
    UPDATE public.fiscal_documents SET integrity_status = v_status, integrity_checked_at = now() WHERE id = p_document_id;

    INSERT INTO public.system_alerts (company_id, alert_type, severity, title, description, metadata)
    VALUES (v_company, 'FISCAL_INTEGRITY', 'critical',
      'Documento fiscal corrompido',
      'Hash não corresponde ao conteúdo canónico.',
      jsonb_build_object('document_id', p_document_id, 'expected', v_hash, 'stored', v_current));

    INSERT INTO public.fiscal_audit_log (fiscal_document_id, company_id, status, source, error_code, hash, result)
    VALUES (p_document_id, v_company, 'FAILED', 'integrity_check', 'HASH_MISMATCH', v_hash,
      jsonb_build_object('expected', v_hash, 'stored', v_current));
  END IF;

  RETURN jsonb_build_object('success', true, 'document_id', p_document_id,
    'integrity_status', v_status, 'hash', v_hash);
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_fiscal_document_integrity(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fiscal_document_canonical(uuid) TO authenticated, service_role;
