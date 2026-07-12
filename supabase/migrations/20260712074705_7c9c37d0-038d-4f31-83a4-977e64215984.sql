
REVOKE EXECUTE ON FUNCTION public.get_fiscal_document_url(UUID, TEXT, INT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.rebuild_fiscal_document_metadata(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.repair_fiscal_document_metadata(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.verify_fiscal_document_checksum(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fiscal_document_request_regeneration(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fiscal_document_storage_prefix(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fiscal_is_founder(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_fiscal_document_url(UUID, TEXT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.rebuild_fiscal_document_metadata(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.repair_fiscal_document_metadata(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_fiscal_document_checksum(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.fiscal_document_request_regeneration(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.fiscal_document_storage_prefix(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.fiscal_is_founder(UUID) TO service_role;
