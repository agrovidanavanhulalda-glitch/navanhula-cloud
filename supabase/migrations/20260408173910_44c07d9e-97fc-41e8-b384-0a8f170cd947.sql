
-- Add expiration tracking fields to obligation_documents
ALTER TABLE public.obligation_documents
ADD COLUMN IF NOT EXISTS expiration_date date,
ADD COLUMN IF NOT EXISTS alert_level text DEFAULT 'none',
ADD COLUMN IF NOT EXISTS last_alert_sent_at timestamptz;

-- Index for efficient alert queries
CREATE INDEX IF NOT EXISTS idx_obligation_docs_expiration
ON public.obligation_documents (expiration_date)
WHERE expiration_date IS NOT NULL;
