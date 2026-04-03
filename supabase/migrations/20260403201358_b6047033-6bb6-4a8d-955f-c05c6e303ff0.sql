
-- Table: compradores (buyers)
CREATE TABLE public.compradores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT DEFAULT 'mercado',
  provincia TEXT,
  distrito TEXT,
  localizacao TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  capacidade_compra INTEGER DEFAULT 0,
  frequencia_compra TEXT DEFAULT 'mensal',
  preferencia_tipo TEXT DEFAULT 'corte',
  peso_min NUMERIC DEFAULT 0,
  peso_max NUMERIC DEFAULT 0,
  preco_alvo NUMERIC DEFAULT 0,
  forma_pagamento TEXT,
  prazo_pagamento TEXT,
  telefone TEXT,
  telefone_alt TEXT,
  email TEXT,
  status TEXT DEFAULT 'ativo',
  confiabilidade INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);

ALTER TABLE public.compradores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "compradores_select" ON public.compradores FOR SELECT TO authenticated
  USING (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "compradores_insert" ON public.compradores FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "compradores_update" ON public.compradores FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "compradores_delete" ON public.compradores FOR DELETE TO authenticated
  USING (company_id = public.get_user_company(auth.uid()));

-- Table: pedidos_marketplace
CREATE TABLE public.pedidos_marketplace (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  comprador_id UUID NOT NULL REFERENCES public.compradores(id) ON DELETE CASCADE,
  quantidade INTEGER DEFAULT 0,
  tipo_producao TEXT DEFAULT 'corte',
  peso_desejado NUMERIC DEFAULT 0,
  preco_oferecido NUMERIC DEFAULT 0,
  data_entrega DATE,
  status TEXT DEFAULT 'aberto',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);

ALTER TABLE public.pedidos_marketplace ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pedidos_mp_select" ON public.pedidos_marketplace FOR SELECT TO authenticated
  USING (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "pedidos_mp_insert" ON public.pedidos_marketplace FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "pedidos_mp_update" ON public.pedidos_marketplace FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "pedidos_mp_delete" ON public.pedidos_marketplace FOR DELETE TO authenticated
  USING (company_id = public.get_user_company(auth.uid()));

-- Table: marketplace_matches
CREATE TABLE public.marketplace_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  criador_id UUID NOT NULL REFERENCES public.criadores(id) ON DELETE CASCADE,
  comprador_id UUID NOT NULL REFERENCES public.compradores(id) ON DELETE CASCADE,
  pedido_id UUID REFERENCES public.pedidos_marketplace(id) ON DELETE SET NULL,
  score NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'sugerido',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.marketplace_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "matches_select" ON public.marketplace_matches FOR SELECT TO authenticated
  USING (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "matches_insert" ON public.marketplace_matches FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "matches_update" ON public.marketplace_matches FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "matches_delete" ON public.marketplace_matches FOR DELETE TO authenticated
  USING (company_id = public.get_user_company(auth.uid()));
