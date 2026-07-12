
-- 1) Extend task_status enum
ALTER TYPE public.task_status ADD VALUE IF NOT EXISTS 'CANCELLED';
ALTER TYPE public.task_status ADD VALUE IF NOT EXISTS 'ARCHIVED';

-- 2) Performance indexes
CREATE INDEX IF NOT EXISTS idx_background_tasks_status_type_created
  ON public.background_tasks (status, task_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fiscal_audit_log_finished_at
  ON public.fiscal_audit_log (finished_at DESC);
CREATE INDEX IF NOT EXISTS idx_fiscal_audit_log_status_created
  ON public.fiscal_audit_log (status, created_at DESC);

-- 3) Register artifacts RPC (called by worker)
CREATE OR REPLACE FUNCTION public.fiscal_document_register_artifacts(
  p_document_id uuid,
  p_artifacts jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_integrity text;
BEGIN
  v_integrity := COALESCE(p_artifacts->>'integrity_status', 'verified');

  UPDATE public.fiscal_documents SET
    pdf_path              = COALESCE(p_artifacts->>'pdf_path', pdf_path),
    xml_path              = COALESCE(p_artifacts->>'xml_path', xml_path),
    json_path             = COALESCE(p_artifacts->>'json_path', json_path),
    qr_path               = COALESCE(p_artifacts->>'qr_path', qr_path),
    metadata_path         = COALESCE(p_artifacts->>'metadata_path', metadata_path),
    checksum_sha256_path  = COALESCE(p_artifacts->>'checksum_sha256_path', checksum_sha256_path),
    checksum_md5_path     = COALESCE(p_artifacts->>'checksum_md5_path', checksum_md5_path),
    content_hash          = COALESCE(p_artifacts->>'sha256', content_hash),
    md5_hash              = COALESCE(p_artifacts->>'md5', md5_hash),
    checksum              = COALESCE(p_artifacts->>'crc32', checksum),
    file_size_bytes       = COALESCE((p_artifacts->>'file_size_bytes')::bigint, file_size_bytes),
    metadata_json         = COALESCE(p_artifacts->'metadata', metadata_json),
    storage_paths         = COALESCE(p_artifacts->'storage_paths', storage_paths),
    storage_version       = COALESCE(storage_version, 0) + 1,
    integrity_status      = v_integrity,
    integrity_checked_at  = now(),
    updated_at            = now()
  WHERE id = p_document_id;

  RETURN jsonb_build_object('success', true, 'document_id', p_document_id, 'integrity', v_integrity);
END;
$$;

REVOKE ALL ON FUNCTION public.fiscal_document_register_artifacts(uuid, jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.fiscal_document_register_artifacts(uuid, jsonb) TO authenticated, service_role;

-- 4) Founder fiscal metrics
CREATE OR REPLACE FUNCTION public.founder_fiscal_metrics(p_hours integer DEFAULT 24)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_since timestamptz := now() - make_interval(hours => GREATEST(p_hours, 1));
  v_result jsonb;
  v_docs_total bigint; v_docs_period bigint;
  v_pending bigint; v_processing bigint; v_completed bigint; v_failed bigint; v_retry bigint;
  v_success_rate numeric; v_failure_rate numeric; v_retry_rate numeric;
  v_avg numeric; v_min numeric; v_max numeric; v_p95 numeric; v_p99 numeric;
  v_storage_bytes bigint;
  v_last_worker timestamptz;
  v_recent jsonb;
BEGIN
  IF NOT public.is_founder(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT count(*) INTO v_docs_total FROM public.fiscal_documents;
  SELECT count(*) INTO v_docs_period FROM public.fiscal_documents WHERE created_at >= v_since;

  SELECT
    count(*) FILTER (WHERE status='PENDING'),
    count(*) FILTER (WHERE status='PROCESSING'),
    count(*) FILTER (WHERE status='COMPLETED' AND created_at >= v_since),
    count(*) FILTER (WHERE status='FAILED'),
    count(*) FILTER (WHERE status='RETRY')
  INTO v_pending, v_processing, v_completed, v_failed, v_retry
  FROM public.background_tasks
  WHERE task_type = 'ISSUE_FISCAL_DOCUMENT';

  SELECT
    avg(duration_ms), min(duration_ms), max(duration_ms),
    percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms),
    percentile_cont(0.99) WITHIN GROUP (ORDER BY duration_ms)
  INTO v_avg, v_min, v_max, v_p95, v_p99
  FROM public.fiscal_audit_log
  WHERE status='SUCCESS' AND finished_at >= v_since;

  SELECT COALESCE(sum(file_size_bytes),0) INTO v_storage_bytes FROM public.fiscal_documents;

  SELECT max(finished_at) INTO v_last_worker FROM public.fiscal_audit_log;

  v_success_rate := CASE WHEN (v_completed + v_failed) > 0 THEN round(100.0 * v_completed / (v_completed + v_failed), 2) ELSE 100 END;
  v_failure_rate := CASE WHEN (v_completed + v_failed) > 0 THEN round(100.0 * v_failed / (v_completed + v_failed), 2) ELSE 0 END;
  v_retry_rate   := CASE WHEN v_completed > 0 THEN round(100.0 * v_retry / GREATEST(v_completed,1), 2) ELSE 0 END;

  SELECT jsonb_agg(row_to_json(x)) INTO v_recent FROM (
    SELECT id, document_number, document_type, status, integrity_status, total, currency,
           company_id, store_id, created_at, pdf_path, xml_path, json_path, qr_path
    FROM public.fiscal_documents
    ORDER BY created_at DESC LIMIT 20
  ) x;

  v_result := jsonb_build_object(
    'window_hours', p_hours,
    'docs_total', v_docs_total,
    'docs_period', v_docs_period,
    'throughput_per_hour', round(v_docs_period::numeric / p_hours, 2),
    'queue', jsonb_build_object(
      'pending', v_pending, 'processing', v_processing, 'retry', v_retry,
      'failed_dlq', v_failed, 'completed_period', v_completed,
      'queue_size', v_pending + v_processing + v_retry
    ),
    'rates', jsonb_build_object(
      'success', v_success_rate, 'failure', v_failure_rate, 'retry', v_retry_rate
    ),
    'timings_ms', jsonb_build_object(
      'avg', COALESCE(v_avg,0), 'min', COALESCE(v_min,0), 'max', COALESCE(v_max,0),
      'p95', COALESCE(v_p95,0), 'p99', COALESCE(v_p99,0)
    ),
    'storage_bytes', v_storage_bytes,
    'worker_last_seen', v_last_worker,
    'worker_healthy', (v_last_worker IS NULL OR v_last_worker >= now() - interval '15 minutes'),
    'recent_documents', COALESCE(v_recent, '[]'::jsonb),
    'generated_at', now()
  );

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.founder_fiscal_metrics(integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.founder_fiscal_metrics(integer) TO authenticated, service_role;

-- 5) DLQ list
CREATE OR REPLACE FUNCTION public.founder_fiscal_dlq(
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0,
  p_search text DEFAULT NULL,
  p_status text DEFAULT 'FAILED'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total bigint;
  v_rows jsonb;
BEGIN
  IF NOT public.is_founder(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT count(*) INTO v_total
  FROM public.background_tasks
  WHERE task_type='ISSUE_FISCAL_DOCUMENT'
    AND status::text = p_status
    AND (p_search IS NULL OR p_search = '' OR
         id::text ILIKE '%'||p_search||'%' OR
         COALESCE(last_error,'') ILIKE '%'||p_search||'%' OR
         COALESCE(payload::text,'') ILIKE '%'||p_search||'%');

  SELECT jsonb_agg(row_to_json(x)) INTO v_rows FROM (
    SELECT id, task_type, status, attempts, max_attempts, last_error, next_retry_at,
           started_at, completed_at, created_at, updated_at, payload, company_id
    FROM public.background_tasks
    WHERE task_type='ISSUE_FISCAL_DOCUMENT'
      AND status::text = p_status
      AND (p_search IS NULL OR p_search = '' OR
           id::text ILIKE '%'||p_search||'%' OR
           COALESCE(last_error,'') ILIKE '%'||p_search||'%' OR
           COALESCE(payload::text,'') ILIKE '%'||p_search||'%')
    ORDER BY created_at DESC
    LIMIT GREATEST(p_limit,1) OFFSET GREATEST(p_offset,0)
  ) x;

  RETURN jsonb_build_object('total', v_total, 'rows', COALESCE(v_rows,'[]'::jsonb));
END;
$$;

REVOKE ALL ON FUNCTION public.founder_fiscal_dlq(integer, integer, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.founder_fiscal_dlq(integer, integer, text, text) TO authenticated, service_role;

-- 6) DLQ actions
CREATE OR REPLACE FUNCTION public.founder_fiscal_reprocess(p_task_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task record;
BEGIN
  IF NOT public.is_founder(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO v_task FROM public.background_tasks WHERE id=p_task_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  UPDATE public.background_tasks
  SET status='PENDING', attempts=0, last_error=NULL, next_retry_at=now(),
      started_at=NULL, completed_at=NULL, updated_at=now()
  WHERE id=p_task_id;

  INSERT INTO public.fiscal_audit_log (job_id, status, source, actor_id, result, worker)
  VALUES (p_task_id, 'REPROCESS_REQUESTED', 'founder_manual', auth.uid(),
          jsonb_build_object('previous_status', v_task.status), 'founder_ui');

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.founder_fiscal_cancel(p_task_id uuid, p_reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_founder(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.background_tasks
  SET status='CANCELLED', next_retry_at=NULL,
      last_error=COALESCE(p_reason, 'cancelled by founder'), updated_at=now()
  WHERE id=p_task_id;

  INSERT INTO public.fiscal_audit_log (job_id, status, source, actor_id, result, worker, error_code)
  VALUES (p_task_id, 'CANCELLED', 'founder_manual', auth.uid(),
          jsonb_build_object('reason', p_reason), 'founder_ui', 'MANUAL_CANCEL');

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.founder_fiscal_archive(p_task_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_founder(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.background_tasks
  SET status='ARCHIVED', next_retry_at=NULL, updated_at=now()
  WHERE id=p_task_id;

  INSERT INTO public.fiscal_audit_log (job_id, status, source, actor_id, worker)
  VALUES (p_task_id, 'ARCHIVED', 'founder_manual', auth.uid(), 'founder_ui');

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.founder_fiscal_reprocess(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.founder_fiscal_cancel(uuid, text) FROM public, anon;
REVOKE ALL ON FUNCTION public.founder_fiscal_archive(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.founder_fiscal_reprocess(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.founder_fiscal_cancel(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.founder_fiscal_archive(uuid) TO authenticated, service_role;

-- 7) Fiscal health check → creates system_alerts on degradation
CREATE OR REPLACE FUNCTION public.check_fiscal_health()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dlq bigint; v_retry bigint; v_completed bigint;
  v_last timestamptz; v_corrupted bigint;
  v_alerts jsonb := '[]'::jsonb;
  v_retry_rate numeric;
BEGIN
  IF NOT public.is_founder(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT count(*) INTO v_dlq
  FROM public.background_tasks
  WHERE task_type='ISSUE_FISCAL_DOCUMENT' AND status='FAILED'
    AND updated_at >= now() - interval '60 minutes';

  SELECT
    count(*) FILTER (WHERE status='RETRY'),
    count(*) FILTER (WHERE status='COMPLETED' AND completed_at >= now() - interval '60 minutes')
  INTO v_retry, v_completed
  FROM public.background_tasks
  WHERE task_type='ISSUE_FISCAL_DOCUMENT';

  SELECT max(finished_at) INTO v_last FROM public.fiscal_audit_log;

  SELECT count(*) INTO v_corrupted
  FROM public.fiscal_documents WHERE integrity_status='corrupted';

  v_retry_rate := CASE WHEN v_completed > 0 THEN 100.0 * v_retry / v_completed ELSE 0 END;

  IF v_dlq > 10 THEN
    INSERT INTO public.system_alerts (type, message, status)
    VALUES ('fiscal_dlq_growing', format('DLQ fiscal cresceu para %s jobs na última hora', v_dlq), 'open');
    v_alerts := v_alerts || jsonb_build_object('type','fiscal_dlq_growing','value',v_dlq);
  END IF;

  IF v_retry_rate > 30 THEN
    INSERT INTO public.system_alerts (type, message, status)
    VALUES ('fiscal_retry_high', format('Retry rate fiscal em %s%%', round(v_retry_rate,1)), 'open');
    v_alerts := v_alerts || jsonb_build_object('type','fiscal_retry_high','value',v_retry_rate);
  END IF;

  IF v_last IS NOT NULL AND v_last < now() - interval '15 minutes' THEN
    INSERT INTO public.system_alerts (type, message, status)
    VALUES ('fiscal_worker_stalled', format('Worker fiscal sem atividade há %s', now()-v_last), 'open');
    v_alerts := v_alerts || jsonb_build_object('type','fiscal_worker_stalled','last_seen',v_last);
  END IF;

  IF v_corrupted > 0 THEN
    INSERT INTO public.system_alerts (type, message, status)
    VALUES ('fiscal_document_corrupted', format('%s documento(s) fiscal(is) com integridade comprometida', v_corrupted), 'open');
    v_alerts := v_alerts || jsonb_build_object('type','fiscal_document_corrupted','value',v_corrupted);
  END IF;

  RETURN jsonb_build_object('alerts_created', v_alerts, 'checked_at', now());
END;
$$;

REVOKE ALL ON FUNCTION public.check_fiscal_health() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.check_fiscal_health() TO authenticated, service_role;
