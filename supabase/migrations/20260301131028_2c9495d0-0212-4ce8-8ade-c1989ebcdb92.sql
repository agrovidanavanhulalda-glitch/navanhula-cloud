
-- Subscription status enum
CREATE TYPE public.subscription_status AS ENUM ('active', 'warning', 'blocked', 'cancelled');

-- Payment method for SaaS billing
CREATE TYPE public.billing_payment_method AS ENUM ('mpesa', 'emola', 'manual');

-- Subscriptions table
CREATE TABLE public.subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    status subscription_status NOT NULL DEFAULT 'active',
    price_monthly numeric NOT NULL DEFAULT 1000,
    current_period_start timestamp with time zone NOT NULL DEFAULT now(),
    current_period_end timestamp with time zone NOT NULL DEFAULT (now() + interval '30 days'),
    grace_period_days integer NOT NULL DEFAULT 5,
    blocked_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE(store_id)
);

-- Payment transactions table
CREATE TABLE public.payment_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    amount numeric NOT NULL DEFAULT 1000,
    payment_method billing_payment_method NOT NULL,
    reference_id text,
    phone_number text,
    status text NOT NULL DEFAULT 'pending',
    paid_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- RLS: Subscriptions
CREATE POLICY "Users can view their company subscriptions"
ON public.subscriptions FOR SELECT TO authenticated
USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Admins can manage their company subscriptions"
ON public.subscriptions FOR ALL TO authenticated
USING (company_id = public.get_user_company(auth.uid()) AND public.is_admin(auth.uid()));

-- RLS: Payment transactions
CREATE POLICY "Users can view their company payments"
ON public.payment_transactions FOR SELECT TO authenticated
USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Admins can manage their company payments"
ON public.payment_transactions FOR ALL TO authenticated
USING (company_id = public.get_user_company(auth.uid()) AND public.is_admin(auth.uid()));

-- Auto-create subscription when store is created
CREATE OR REPLACE FUNCTION public.auto_create_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.company_id IS NOT NULL THEN
        INSERT INTO public.subscriptions (company_id, store_id, status)
        VALUES (NEW.company_id, NEW.id, 'active')
        ON CONFLICT (store_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_create_subscription
AFTER INSERT ON public.stores
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_subscription();

-- Function to check subscription status
CREATE OR REPLACE FUNCTION public.check_subscription_status(p_store_id uuid)
RETURNS subscription_status
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_sub record;
BEGIN
    SELECT * INTO v_sub FROM public.subscriptions WHERE store_id = p_store_id;
    
    IF NOT FOUND THEN RETURN 'active'; END IF;
    IF v_sub.status = 'cancelled' THEN RETURN 'cancelled'; END IF;
    
    IF now() <= v_sub.current_period_end THEN
        RETURN 'active';
    ELSIF now() <= (v_sub.current_period_end + (v_sub.grace_period_days || ' days')::interval) THEN
        RETURN 'warning';
    ELSE
        RETURN 'blocked';
    END IF;
END;
$$;

-- Function to process payment and renew subscription
CREATE OR REPLACE FUNCTION public.process_subscription_payment(
    p_subscription_id uuid,
    p_payment_method billing_payment_method,
    p_reference_id text DEFAULT NULL,
    p_phone_number text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_sub record;
    v_tx_id uuid;
BEGIN
    SELECT * INTO v_sub FROM public.subscriptions WHERE id = p_subscription_id;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Assinatura não encontrada');
    END IF;

    -- Create payment transaction
    INSERT INTO public.payment_transactions (subscription_id, company_id, amount, payment_method, reference_id, phone_number, status, paid_at)
    VALUES (p_subscription_id, v_sub.company_id, v_sub.price_monthly, p_payment_method, p_reference_id, p_phone_number, 'completed', now())
    RETURNING id INTO v_tx_id;

    -- Renew subscription
    UPDATE public.subscriptions
    SET status = 'active',
        current_period_start = now(),
        current_period_end = now() + interval '30 days',
        blocked_at = NULL,
        updated_at = now()
    WHERE id = p_subscription_id;

    RETURN json_build_object('success', true, 'transaction_id', v_tx_id, 'message', 'Pagamento processado com sucesso');
END;
$$;

-- Timestamps trigger
CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payment_transactions_updated_at
BEFORE UPDATE ON public.payment_transactions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
