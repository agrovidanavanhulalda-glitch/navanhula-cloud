CREATE TYPE public.fiscal_document_type AS ENUM ('quotation', 'proforma', 'invoice', 'invoice_receipt', 'receipt', 'credit_note', 'debit_note');

CREATE TABLE public.document_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  store_id UUID NULL REFERENCES public.stores(id) ON DELETE SET NULL,
  document_type public.fiscal_document_type NOT NULL,
  prefix TEXT NOT NULL,
  next_number INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  default_notes TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (company_id, document_type, prefix)
);

CREATE TABLE public.fiscal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  store_id UUID NULL REFERENCES public.stores(id) ON DELETE SET NULL,
  series_id UUID NULL REFERENCES public.document_series(id) ON DELETE SET NULL,
  issued_by UUID NOT NULL,
  document_type public.fiscal_document_type NOT NULL,
  document_number TEXT NOT NULL,
  number INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'issued',
  issue_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  valid_until DATE NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NULL,
  customer_email TEXT NULL,
  customer_nuit TEXT NULL,
  customer_address TEXT NULL,
  notes TEXT NULL,
  currency TEXT NOT NULL DEFAULT 'MZN',
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax_rate NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  discount_amount NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (company_id, document_number)
);

CREATE TABLE public.fiscal_document_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.fiscal_documents(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  tax_rate NUMERIC NOT NULL DEFAULT 0,
  line_total NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.document_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_document_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers manage document series"
ON public.document_series
FOR ALL
USING (
  company_id = public.get_user_company(auth.uid())
  AND (public.is_manager_or_admin(auth.uid()) OR public.has_role(auth.uid(), 'ceo'))
)
WITH CHECK (
  company_id = public.get_user_company(auth.uid())
  AND (public.is_manager_or_admin(auth.uid()) OR public.has_role(auth.uid(), 'ceo'))
);

CREATE POLICY "Users view company document series"
ON public.document_series
FOR SELECT
USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Managers manage fiscal documents"
ON public.fiscal_documents
FOR ALL
USING (
  company_id = public.get_user_company(auth.uid())
  AND (public.is_manager_or_admin(auth.uid()) OR public.has_role(auth.uid(), 'ceo'))
)
WITH CHECK (
  company_id = public.get_user_company(auth.uid())
  AND (public.is_manager_or_admin(auth.uid()) OR public.has_role(auth.uid(), 'ceo'))
);

CREATE POLICY "Users view company fiscal documents"
ON public.fiscal_documents
FOR SELECT
USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Managers manage fiscal document items"
ON public.fiscal_document_items
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.fiscal_documents fd
    WHERE fd.id = fiscal_document_items.document_id
      AND fd.company_id = public.get_user_company(auth.uid())
      AND (public.is_manager_or_admin(auth.uid()) OR public.has_role(auth.uid(), 'ceo'))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.fiscal_documents fd
    WHERE fd.id = fiscal_document_items.document_id
      AND fd.company_id = public.get_user_company(auth.uid())
      AND (public.is_manager_or_admin(auth.uid()) OR public.has_role(auth.uid(), 'ceo'))
  )
);

CREATE POLICY "Users view company fiscal document items"
ON public.fiscal_document_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.fiscal_documents fd
    WHERE fd.id = fiscal_document_items.document_id
      AND fd.company_id = public.get_user_company(auth.uid())
  )
);

CREATE INDEX idx_document_series_company_type ON public.document_series(company_id, document_type);
CREATE INDEX idx_fiscal_documents_company_date ON public.fiscal_documents(company_id, issue_date DESC);
CREATE INDEX idx_fiscal_document_items_document ON public.fiscal_document_items(document_id);

CREATE TRIGGER update_document_series_updated_at
BEFORE UPDATE ON public.document_series
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fiscal_documents_updated_at
BEFORE UPDATE ON public.fiscal_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.issue_fiscal_document(
  p_document_type public.fiscal_document_type,
  p_customer_name TEXT,
  p_items JSONB,
  p_store_id UUID DEFAULT NULL,
  p_customer_phone TEXT DEFAULT NULL,
  p_customer_email TEXT DEFAULT NULL,
  p_customer_nuit TEXT DEFAULT NULL,
  p_customer_address TEXT DEFAULT NULL,
  p_valid_until DATE DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_tax_rate NUMERIC DEFAULT 0,
  p_discount_amount NUMERIC DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
  v_series RECORD;
  v_document_id UUID;
  v_number INTEGER;
  v_document_number TEXT;
  v_subtotal NUMERIC := 0;
  v_tax_amount NUMERIC := 0;
  v_total NUMERIC := 0;
  v_item JSONB;
  v_qty NUMERIC;
  v_unit_price NUMERIC;
  v_line_total NUMERIC;
  v_prefix TEXT;
BEGIN
  v_company_id := public.get_user_company(auth.uid());

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Empresa não encontrada para o utilizador autenticado';
  END IF;

  IF NOT (public.is_manager_or_admin(auth.uid()) OR public.has_role(auth.uid(), 'ceo')) THEN
    RAISE EXCEPTION 'Sem permissão para emitir documentos';
  END IF;

  IF p_customer_name IS NULL OR length(trim(p_customer_name)) = 0 THEN
    RAISE EXCEPTION 'Nome do cliente é obrigatório';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Adicione pelo menos um item ao documento';
  END IF;

  SELECT *
  INTO v_series
  FROM public.document_series
  WHERE company_id = v_company_id
    AND document_type = p_document_type
    AND is_active = true
  ORDER BY updated_at DESC, created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    v_prefix := CASE p_document_type
      WHEN 'quotation' THEN 'COT'
      WHEN 'proforma' THEN 'PRO'
      WHEN 'invoice' THEN 'FT'
      WHEN 'invoice_receipt' THEN 'FR'
      WHEN 'receipt' THEN 'RC'
      WHEN 'credit_note' THEN 'NC'
      ELSE 'ND'
    END;

    INSERT INTO public.document_series (company_id, store_id, document_type, prefix, next_number)
    VALUES (v_company_id, p_store_id, p_document_type, v_prefix, 2)
    RETURNING * INTO v_series;

    v_number := 1;
  ELSE
    v_number := v_series.next_number;

    UPDATE public.document_series
    SET next_number = v_series.next_number + 1,
        store_id = COALESCE(p_store_id, store_id)
    WHERE id = v_series.id;
  END IF;

  v_document_number := v_series.prefix || '-' || LPAD(v_number::TEXT, 6, '0');

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_qty := GREATEST(COALESCE((v_item ->> 'quantity')::NUMERIC, 0), 0);
    v_unit_price := GREATEST(COALESCE((v_item ->> 'unit_price')::NUMERIC, 0), 0);
    v_line_total := round(v_qty * v_unit_price, 2);
    v_subtotal := v_subtotal + v_line_total;
  END LOOP;

  v_tax_amount := round(v_subtotal * (COALESCE(p_tax_rate, 0) / 100), 2);
  v_total := round(v_subtotal + v_tax_amount - COALESCE(p_discount_amount, 0), 2);

  INSERT INTO public.fiscal_documents (
    company_id,
    store_id,
    series_id,
    issued_by,
    document_type,
    document_number,
    number,
    status,
    issue_date,
    valid_until,
    customer_name,
    customer_phone,
    customer_email,
    customer_nuit,
    customer_address,
    notes,
    subtotal,
    tax_rate,
    tax_amount,
    discount_amount,
    total
  )
  VALUES (
    v_company_id,
    p_store_id,
    v_series.id,
    auth.uid(),
    p_document_type,
    v_document_number,
    v_number,
    'issued',
    now(),
    p_valid_until,
    trim(p_customer_name),
    NULLIF(trim(COALESCE(p_customer_phone, '')), ''),
    NULLIF(trim(COALESCE(p_customer_email, '')), ''),
    NULLIF(trim(COALESCE(p_customer_nuit, '')), ''),
    NULLIF(trim(COALESCE(p_customer_address, '')), ''),
    NULLIF(trim(COALESCE(p_notes, '')), ''),
    v_subtotal,
    COALESCE(p_tax_rate, 0),
    v_tax_amount,
    COALESCE(p_discount_amount, 0),
    v_total
  )
  RETURNING id INTO v_document_id;

  INSERT INTO public.fiscal_document_items (document_id, description, quantity, unit_price, tax_rate, line_total)
  SELECT
    v_document_id,
    trim(COALESCE(item ->> 'description', 'Item')),
    GREATEST(COALESCE((item ->> 'quantity')::NUMERIC, 0), 0),
    GREATEST(COALESCE((item ->> 'unit_price')::NUMERIC, 0), 0),
    COALESCE((item ->> 'tax_rate')::NUMERIC, COALESCE(p_tax_rate, 0)),
    round(GREATEST(COALESCE((item ->> 'quantity')::NUMERIC, 0), 0) * GREATEST(COALESCE((item ->> 'unit_price')::NUMERIC, 0), 0), 2)
  FROM jsonb_array_elements(p_items) AS item;

  RETURN json_build_object(
    'success', true,
    'document_id', v_document_id,
    'document_number', v_document_number,
    'series_id', v_series.id,
    'subtotal', v_subtotal,
    'tax_amount', v_tax_amount,
    'total', v_total
  );
END;
$$;