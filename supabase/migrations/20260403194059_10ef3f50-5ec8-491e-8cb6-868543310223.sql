
-- Create criadores table
CREATE TABLE public.criadores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  bi_nuit TEXT,
  provincia TEXT,
  distrito TEXT,
  localidade TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  capacidade INTEGER DEFAULT 0,
  tipo_producao TEXT DEFAULT 'corte',
  experiencia_anos INTEGER DEFAULT 0,
  fornecedor_pintos TEXT,
  fornecedor_racao TEXT,
  consumo_racao TEXT,
  plano_semanal TEXT,
  plano_quinzenal TEXT,
  plano_mensal TEXT,
  data_prevista_venda DATE,
  peso_medio NUMERIC DEFAULT 0,
  precisa_tecnico BOOLEAN DEFAULT false,
  cria_sozinho BOOLEAN DEFAULT false,
  num_trabalhadores INTEGER DEFAULT 0,
  tipo_instalacao TEXT,
  fonte_agua TEXT,
  fonte_energia TEXT,
  desafios TEXT,
  tem_mercado BOOLEAN DEFAULT false,
  mercados_atuais TEXT,
  preco_medio NUMERIC DEFAULT 0,
  forma_pagamento TEXT,
  telefone TEXT,
  telefone_alt TEXT,
  email TEXT,
  status TEXT DEFAULT 'ativo',
  confiabilidade INTEGER DEFAULT 3,
  wallet_id TEXT,
  saldo NUMERIC DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.criadores ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can manage criadores in their company
CREATE POLICY "Users can view criadores in their company"
  ON public.criadores FOR SELECT TO authenticated
  USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Admins can insert criadores"
  ON public.criadores FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Admins can update criadores"
  ON public.criadores FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Admins can delete criadores"
  ON public.criadores FOR DELETE TO authenticated
  USING (company_id = public.get_user_company(auth.uid()) AND public.is_manager_or_admin(auth.uid()));

-- Updated_at trigger
CREATE TRIGGER update_criadores_updated_at
  BEFORE UPDATE ON public.criadores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
