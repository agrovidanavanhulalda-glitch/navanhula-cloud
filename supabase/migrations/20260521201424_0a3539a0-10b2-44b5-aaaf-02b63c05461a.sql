ALTER TABLE public.audit_logs
ADD CONSTRAINT fk_audit_logs_user_id
FOREIGN KEY (user_id)
REFERENCES public.profiles(id)
ON DELETE SET NULL;
