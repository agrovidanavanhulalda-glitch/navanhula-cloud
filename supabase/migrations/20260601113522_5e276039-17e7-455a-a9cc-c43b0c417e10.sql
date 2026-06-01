-- 1. Otimização: Criar índices solicitados
CREATE INDEX IF NOT EXISTS idx_products_company_id_v2 ON public.products (company_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active_v2 ON public.products (is_active);

-- 2. Suporte a Galeria de Fotos
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS gallery_urls TEXT[] DEFAULT '{}';

-- 3. Tabela de Logs de Produtos
CREATE TABLE IF NOT EXISTS public.product_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL,
    action TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    user_id UUID,
    company_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Grants para logs
GRANT SELECT, INSERT ON public.product_logs TO authenticated;
GRANT ALL ON public.product_logs TO service_role;

-- RLS para logs
ALTER TABLE public.product_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company product logs"
ON public.product_logs
FOR SELECT
TO authenticated
USING (
    company_id IN (
        SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
);

-- 4. Trigger para Logs Automáticos
CREATE OR REPLACE FUNCTION public.fn_log_product_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_company_id UUID;
BEGIN
    -- Tentar obter user_id do contexto de autenticação
    v_user_id := auth.uid();
    
    IF (TG_OP = 'DELETE') THEN
        v_company_id := OLD.company_id;
    ELSE
        v_company_id := NEW.company_id;
    END IF;

    INSERT INTO public.product_logs (product_id, action, user_id, company_id)
    VALUES (
        CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
        TG_OP,
        v_user_id,
        v_company_id
    );

    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_log_product_changes ON public.products;
CREATE TRIGGER trg_log_product_changes
AFTER INSERT OR UPDATE OR DELETE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.fn_log_product_changes();

-- 5. Bucket para Imagens de Produtos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage para o novo bucket
CREATE POLICY "Public Access to Product Images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can update product images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can delete product images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'product-images');
