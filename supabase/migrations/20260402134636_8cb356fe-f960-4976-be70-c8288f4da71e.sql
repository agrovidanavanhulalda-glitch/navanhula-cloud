
-- ============================================
-- CHART OF ACCOUNTS (Plano de Contas)
-- ============================================
CREATE TABLE public.chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'asset',
  parent_id UUID REFERENCES public.chart_of_accounts(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, code)
);

ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company accounts" ON public.chart_of_accounts
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Admins can manage accounts" ON public.chart_of_accounts
  FOR ALL TO authenticated
  USING (company_id = public.get_user_company(auth.uid()) AND public.is_manager_or_admin(auth.uid()))
  WITH CHECK (company_id = public.get_user_company(auth.uid()) AND public.is_manager_or_admin(auth.uid()));

-- ============================================
-- JOURNAL ENTRIES (Lançamentos Contábeis)
-- ============================================
CREATE TABLE public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  entry_number SERIAL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  reference TEXT,
  reference_type TEXT,
  reference_id UUID,
  status TEXT NOT NULL DEFAULT 'draft',
  total_debit NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_credit NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company journal entries" ON public.journal_entries
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Admins can manage journal entries" ON public.journal_entries
  FOR ALL TO authenticated
  USING (company_id = public.get_user_company(auth.uid()) AND public.is_manager_or_admin(auth.uid()))
  WITH CHECK (company_id = public.get_user_company(auth.uid()) AND public.is_manager_or_admin(auth.uid()));

-- ============================================
-- JOURNAL LINES (Linhas de Lançamento)
-- ============================================
CREATE TABLE public.journal_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id),
  description TEXT,
  debit NUMERIC(15,2) NOT NULL DEFAULT 0,
  credit NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.journal_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view journal lines" ON public.journal_lines
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.journal_entries je
    WHERE je.id = journal_entry_id
    AND je.company_id = public.get_user_company(auth.uid())
  ));

CREATE POLICY "Admins can manage journal lines" ON public.journal_lines
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.journal_entries je
    WHERE je.id = journal_entry_id
    AND je.company_id = public.get_user_company(auth.uid())
    AND public.is_manager_or_admin(auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.journal_entries je
    WHERE je.id = journal_entry_id
    AND je.company_id = public.get_user_company(auth.uid())
    AND public.is_manager_or_admin(auth.uid())
  ));

-- ============================================
-- ATTENDANCE (Presenças e Faltas)
-- ============================================
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'present',
  check_in TIME,
  check_out TIME,
  hours_worked NUMERIC(5,2),
  overtime_hours NUMERIC(5,2) DEFAULT 0,
  absences INTEGER DEFAULT 0,
  late_minutes INTEGER DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(employee_id, record_date)
);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company attendance" ON public.attendance
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Admins can manage attendance" ON public.attendance
  FOR ALL TO authenticated
  USING (company_id = public.get_user_company(auth.uid()) AND public.is_manager_or_admin(auth.uid()))
  WITH CHECK (company_id = public.get_user_company(auth.uid()) AND public.is_manager_or_admin(auth.uid()));

-- ============================================
-- ACCOUNTING RULES (Motor de Automação)
-- ============================================
CREATE TABLE public.accounting_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  description TEXT,
  debit_account_id UUID REFERENCES public.chart_of_accounts(id),
  credit_account_id UUID REFERENCES public.chart_of_accounts(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.accounting_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company rules" ON public.accounting_rules
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Admins can manage rules" ON public.accounting_rules
  FOR ALL TO authenticated
  USING (company_id = public.get_user_company(auth.uid()) AND public.is_manager_or_admin(auth.uid()))
  WITH CHECK (company_id = public.get_user_company(auth.uid()) AND public.is_manager_or_admin(auth.uid()));

-- ============================================
-- FUNCTION: Seed default chart of accounts for a company
-- ============================================
CREATE OR REPLACE FUNCTION public.seed_chart_of_accounts(p_company_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM chart_of_accounts WHERE company_id = p_company_id LIMIT 1) THEN
    RETURN;
  END IF;

  INSERT INTO chart_of_accounts (company_id, code, name, account_type, description) VALUES
  -- ATIVOS
  (p_company_id, '1', 'ACTIVO', 'asset', 'Contas do Activo'),
  (p_company_id, '1.1', 'Activo Corrente', 'asset', 'Activos de curto prazo'),
  (p_company_id, '1.1.1', 'Caixa', 'asset', 'Dinheiro em caixa'),
  (p_company_id, '1.1.2', 'Bancos', 'asset', 'Depósitos bancários'),
  (p_company_id, '1.1.3', 'Clientes', 'asset', 'Contas a receber de clientes'),
  (p_company_id, '1.1.4', 'Estoque', 'asset', 'Mercadorias em estoque'),
  (p_company_id, '1.2', 'Activo Não Corrente', 'asset', 'Activos de longo prazo'),
  (p_company_id, '1.2.1', 'Equipamentos', 'asset', 'Equipamentos e maquinaria'),
  (p_company_id, '1.2.2', 'Imóveis', 'asset', 'Terrenos e edifícios'),
  -- PASSIVO
  (p_company_id, '2', 'PASSIVO', 'liability', 'Contas do Passivo'),
  (p_company_id, '2.1', 'Passivo Corrente', 'liability', 'Obrigações de curto prazo'),
  (p_company_id, '2.1.1', 'Fornecedores', 'liability', 'Contas a pagar a fornecedores'),
  (p_company_id, '2.1.2', 'Salários a Pagar', 'liability', 'Salários pendentes'),
  (p_company_id, '2.1.3', 'INSS a Pagar', 'liability', 'Contribuições INSS pendentes'),
  (p_company_id, '2.1.4', 'IRPS a Pagar', 'liability', 'Imposto IRPS pendente'),
  (p_company_id, '2.1.5', 'IVA a Pagar', 'liability', 'IVA pendente'),
  -- CAPITAL PRÓPRIO
  (p_company_id, '3', 'CAPITAL PRÓPRIO', 'equity', 'Patrimônio líquido'),
  (p_company_id, '3.1', 'Capital Social', 'equity', 'Capital investido'),
  (p_company_id, '3.2', 'Lucros Retidos', 'equity', 'Lucros acumulados'),
  -- RECEITAS
  (p_company_id, '4', 'RECEITAS', 'revenue', 'Contas de Receita'),
  (p_company_id, '4.1', 'Vendas de Mercadorias', 'revenue', 'Receita de vendas'),
  (p_company_id, '4.2', 'Prestação de Serviços', 'revenue', 'Receita de serviços'),
  (p_company_id, '4.3', 'Outras Receitas', 'revenue', 'Receitas diversas'),
  -- DESPESAS
  (p_company_id, '5', 'DESPESAS', 'expense', 'Contas de Despesa'),
  (p_company_id, '5.1', 'Custos com Pessoal', 'expense', 'Salários e encargos'),
  (p_company_id, '5.1.1', 'Salários', 'expense', 'Vencimentos de funcionários'),
  (p_company_id, '5.1.2', 'INSS Empresa', 'expense', 'Contribuição patronal INSS'),
  (p_company_id, '5.2', 'Custo de Mercadorias', 'expense', 'CMV - Custo mercadoria vendida'),
  (p_company_id, '5.3', 'Despesas Operacionais', 'expense', 'Despesas de operação'),
  (p_company_id, '5.3.1', 'Aluguer', 'expense', 'Renda de imóveis'),
  (p_company_id, '5.3.2', 'Electricidade', 'expense', 'Energia eléctrica'),
  (p_company_id, '5.3.3', 'Água', 'expense', 'Consumo de água'),
  (p_company_id, '5.3.4', 'Transporte', 'expense', 'Gastos com transporte'),
  (p_company_id, '5.4', 'Impostos e Taxas', 'expense', 'Encargos fiscais');
END;
$$;

-- ============================================
-- FUNCTION: Create journal entry with validation
-- ============================================
CREATE OR REPLACE FUNCTION public.create_journal_entry(
  p_description TEXT,
  p_lines JSONB,
  p_reference TEXT DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_entry_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
  v_entry_id UUID;
  v_total_debit NUMERIC := 0;
  v_total_credit NUMERIC := 0;
  v_line JSONB;
BEGIN
  v_company_id := get_user_company(auth.uid());
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Empresa não encontrada';
  END IF;

  IF NOT is_manager_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissão para criar lançamentos';
  END IF;

  IF p_lines IS NULL OR jsonb_typeof(p_lines) <> 'array' OR jsonb_array_length(p_lines) < 2 THEN
    RAISE EXCEPTION 'Um lançamento precisa de pelo menos 2 linhas';
  END IF;

  -- Calculate totals
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    v_total_debit := v_total_debit + COALESCE((v_line ->> 'debit')::NUMERIC, 0);
    v_total_credit := v_total_credit + COALESCE((v_line ->> 'credit')::NUMERIC, 0);
  END LOOP;

  -- Validate debit = credit
  IF ROUND(v_total_debit, 2) <> ROUND(v_total_credit, 2) THEN
    RAISE EXCEPTION 'Débito (%) deve ser igual ao Crédito (%)', v_total_debit, v_total_credit;
  END IF;

  IF v_total_debit <= 0 THEN
    RAISE EXCEPTION 'O valor do lançamento deve ser positivo';
  END IF;

  -- Create journal entry
  INSERT INTO journal_entries (company_id, entry_date, description, reference, reference_type, reference_id, total_debit, total_credit, status, created_by)
  VALUES (v_company_id, p_entry_date, p_description, p_reference, p_reference_type, p_reference_id, v_total_debit, v_total_credit, 'posted', auth.uid())
  RETURNING id INTO v_entry_id;

  -- Create journal lines
  INSERT INTO journal_lines (journal_entry_id, account_id, description, debit, credit)
  SELECT
    v_entry_id,
    (line ->> 'account_id')::UUID,
    COALESCE(line ->> 'description', ''),
    COALESCE((line ->> 'debit')::NUMERIC, 0),
    COALESCE((line ->> 'credit')::NUMERIC, 0)
  FROM jsonb_array_elements(p_lines) AS line;

  RETURN json_build_object('success', true, 'entry_id', v_entry_id, 'total', v_total_debit);
END;
$$;
