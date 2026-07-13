
CREATE OR REPLACE FUNCTION public.founder_storage_metrics()
RETURNS TABLE (
  bucket_id text,
  objects bigint,
  bytes bigint,
  last_upload timestamptz,
  first_upload timestamptz,
  bytes_last_24h bigint,
  bytes_last_7d bigint,
  bytes_last_30d bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, storage
AS $$
  SELECT
    o.bucket_id,
    COUNT(*)::bigint AS objects,
    COALESCE(SUM((o.metadata->>'size')::bigint), 0)::bigint AS bytes,
    MAX(o.created_at) AS last_upload,
    MIN(o.created_at) AS first_upload,
    COALESCE(SUM((o.metadata->>'size')::bigint) FILTER (WHERE o.created_at > now() - interval '1 day'), 0)::bigint AS bytes_last_24h,
    COALESCE(SUM((o.metadata->>'size')::bigint) FILTER (WHERE o.created_at > now() - interval '7 days'), 0)::bigint AS bytes_last_7d,
    COALESCE(SUM((o.metadata->>'size')::bigint) FILTER (WHERE o.created_at > now() - interval '30 days'), 0)::bigint AS bytes_last_30d
  FROM storage.objects o
  WHERE public.is_founder(auth.uid())
  GROUP BY o.bucket_id
$$;

REVOKE ALL ON FUNCTION public.founder_storage_metrics() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.founder_storage_metrics() TO authenticated;
