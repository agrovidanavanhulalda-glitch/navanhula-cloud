-- Webhooks table
CREATE TABLE IF NOT EXISTS public.webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}',
  secret TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "webhooks_select" ON public.webhooks FOR SELECT TO authenticated
  USING (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "webhooks_insert" ON public.webhooks FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "webhooks_update" ON public.webhooks FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "webhooks_delete" ON public.webhooks FOR DELETE TO authenticated
  USING (company_id = public.get_user_company(auth.uid()));

-- Webhook deliveries log
CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  response_status INT,
  response_body TEXT,
  attempts INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "webhook_deliveries_select" ON public.webhook_deliveries FOR SELECT TO authenticated
  USING (company_id = public.get_user_company(auth.uid()));

-- Currencies table
CREATE TABLE IF NOT EXISTS public.currencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL DEFAULT '',
  exchange_rate NUMERIC(12,6) NOT NULL DEFAULT 1.0,
  is_base BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "currencies_select" ON public.currencies FOR SELECT TO authenticated USING (true);
CREATE POLICY "currencies_public_select" ON public.currencies FOR SELECT TO anon USING (true);

INSERT INTO public.currencies (code, name, symbol, exchange_rate, is_base) VALUES
  ('MZN', 'Metical Moçambicano', 'MT', 1.0, true),
  ('USD', 'Dólar Americano', '$', 63.50, false),
  ('EUR', 'Euro', '€', 68.20, false),
  ('ZAR', 'Rand Sul-Africano', 'R', 3.45, false),
  ('KES', 'Xelim Queniano', 'KSh', 0.49, false),
  ('TZS', 'Xelim Tanzaniano', 'TSh', 0.025, false)
ON CONFLICT (code) DO NOTHING;

-- API request logs
CREATE TABLE IF NOT EXISTS public.api_request_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  api_key_id UUID REFERENCES public.api_keys(id) ON DELETE SET NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'GET',
  status_code INT,
  ip_address TEXT,
  response_time_ms INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.api_request_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "api_logs_select" ON public.api_request_logs FOR SELECT TO authenticated
  USING (company_id = public.get_user_company(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_webhooks_company ON public.webhooks(company_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON public.webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_api_request_logs_company ON public.api_request_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_api_request_logs_created ON public.api_request_logs(created_at DESC);