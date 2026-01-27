-- NAVANHULA POS Database Schema

-- ==========================================
-- ENUMS
-- ==========================================

-- User roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'seller');

-- Payment method enum
CREATE TYPE public.payment_method AS ENUM ('cash', 'mpesa', 'emola', 'card');

-- Sale status enum
CREATE TYPE public.sale_status AS ENUM ('pending', 'completed', 'cancelled', 'refunded');

-- Cash register status enum
CREATE TYPE public.cash_register_status AS ENUM ('open', 'closed');

-- Stock adjustment reason enum
CREATE TYPE public.stock_adjustment_reason AS ENUM ('loss', 'theft', 'breakage', 'admin_adjustment', 'inventory_correction');

-- ==========================================
-- TABLES
-- ==========================================

-- Stores table (multi-store support)
CREATE TABLE public.stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- User profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    store_id UUID REFERENCES public.stores(id),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- User roles table (separate as per security guidelines)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'seller',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Categories table
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#3B82F6',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Products table
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category_id UUID REFERENCES public.categories(id),
    cost_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    sale_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    image_url TEXT,
    barcode TEXT,
    is_active BOOLEAN DEFAULT true,
    low_stock_threshold INTEGER DEFAULT 10,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Product stock by store (inventory per location)
CREATE TABLE public.product_stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
    quantity INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (product_id, store_id)
);

-- Price history table
CREATE TABLE public.price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    old_cost_price DECIMAL(12,2),
    new_cost_price DECIMAL(12,2),
    old_sale_price DECIMAL(12,2),
    new_sale_price DECIMAL(12,2),
    changed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Stock adjustments table
CREATE TABLE public.stock_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
    quantity_change INTEGER NOT NULL,
    reason stock_adjustment_reason NOT NULL,
    notes TEXT,
    adjusted_by UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Cash registers table
CREATE TABLE public.cash_registers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    status cash_register_status DEFAULT 'open',
    opening_amount DECIMAL(12,2) DEFAULT 0,
    closing_amount DECIMAL(12,2),
    expected_amount DECIMAL(12,2),
    difference DECIMAL(12,2),
    notes TEXT,
    opened_at TIMESTAMPTZ DEFAULT now(),
    closed_at TIMESTAMPTZ
);

-- Cash register movements (entries/exits)
CREATE TABLE public.cash_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cash_register_id UUID REFERENCES public.cash_registers(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('in', 'out')),
    amount DECIMAL(12,2) NOT NULL,
    description TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Sales table
CREATE TABLE public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    cash_register_id UUID REFERENCES public.cash_registers(id),
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    total DECIMAL(12,2) NOT NULL DEFAULT 0,
    payment_method payment_method NOT NULL DEFAULT 'cash',
    status sale_status DEFAULT 'completed',
    customer_name TEXT,
    customer_phone TEXT,
    notes TEXT,
    synced BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Sale items table
CREATE TABLE public.sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) NOT NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(12,2) NOT NULL,
    cost_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    total DECIMAL(12,2) NOT NULL,
    profit DECIMAL(12,2) GENERATED ALWAYS AS (total - (cost_price * quantity)) STORED,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Audit log table
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    table_name TEXT,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- INDEXES
-- ==========================================

CREATE INDEX idx_profiles_store ON public.profiles(store_id);
CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_products_code ON public.products(code);
CREATE INDEX idx_product_stock_store ON public.product_stock(store_id);
CREATE INDEX idx_product_stock_product ON public.product_stock(product_id);
CREATE INDEX idx_sales_store ON public.sales(store_id);
CREATE INDEX idx_sales_user ON public.sales(user_id);
CREATE INDEX idx_sales_created ON public.sales(created_at);
CREATE INDEX idx_sale_items_sale ON public.sale_items(sale_id);
CREATE INDEX idx_sale_items_product ON public.sale_items(product_id);
CREATE INDEX idx_cash_registers_store ON public.cash_registers(store_id);
CREATE INDEX idx_cash_registers_user ON public.cash_registers(user_id);
CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at);

-- ==========================================
-- SECURITY FUNCTIONS
-- ==========================================

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get user's store
CREATE OR REPLACE FUNCTION public.get_user_store(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT store_id FROM public.profiles WHERE id = _user_id
$$;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

-- Function to check if user is manager or admin
CREATE OR REPLACE FUNCTION public.is_manager_or_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin') OR public.has_role(_user_id, 'manager')
$$;

-- ==========================================
-- ROW LEVEL SECURITY
-- ==========================================

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Stores policies
CREATE POLICY "Admins can do everything with stores" ON public.stores
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can view their store" ON public.stores
    FOR SELECT TO authenticated
    USING (id = public.get_user_store(auth.uid()));

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT TO authenticated
    USING (id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

CREATE POLICY "Allow insert during signup" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT TO authenticated
    USING (public.is_admin(auth.uid()));

-- User roles policies
CREATE POLICY "Admins can manage roles" ON public.user_roles
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can view own role" ON public.user_roles
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- Categories policies
CREATE POLICY "All authenticated users can view categories" ON public.categories
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Managers and admins can manage categories" ON public.categories
    FOR ALL TO authenticated
    USING (public.is_manager_or_admin(auth.uid()));

-- Products policies
CREATE POLICY "All authenticated users can view products" ON public.products
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Managers and admins can manage products" ON public.products
    FOR ALL TO authenticated
    USING (public.is_manager_or_admin(auth.uid()));

-- Product stock policies
CREATE POLICY "Users can view stock for their store" ON public.product_stock
    FOR SELECT TO authenticated
    USING (store_id = public.get_user_store(auth.uid()) OR public.is_admin(auth.uid()));

CREATE POLICY "Managers and admins can update stock" ON public.product_stock
    FOR ALL TO authenticated
    USING (public.is_manager_or_admin(auth.uid()));

-- Price history policies
CREATE POLICY "Managers and admins can view price history" ON public.price_history
    FOR SELECT TO authenticated
    USING (public.is_manager_or_admin(auth.uid()));

CREATE POLICY "Managers and admins can insert price history" ON public.price_history
    FOR INSERT TO authenticated
    WITH CHECK (public.is_manager_or_admin(auth.uid()));

-- Stock adjustments policies
CREATE POLICY "Managers can view adjustments for their store" ON public.stock_adjustments
    FOR SELECT TO authenticated
    USING (store_id = public.get_user_store(auth.uid()) OR public.is_admin(auth.uid()));

CREATE POLICY "Managers and admins can create adjustments" ON public.stock_adjustments
    FOR INSERT TO authenticated
    WITH CHECK (public.is_manager_or_admin(auth.uid()));

-- Cash registers policies
CREATE POLICY "Users can view their own registers" ON public.cash_registers
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.is_manager_or_admin(auth.uid()));

CREATE POLICY "Users can manage their own registers" ON public.cash_registers
    FOR ALL TO authenticated
    USING (user_id = auth.uid());

-- Cash movements policies
CREATE POLICY "Users can view movements for their registers" ON public.cash_movements
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.cash_registers cr
            WHERE cr.id = cash_register_id
            AND (cr.user_id = auth.uid() OR public.is_manager_or_admin(auth.uid()))
        )
    );

CREATE POLICY "Users can create movements for their registers" ON public.cash_movements
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.cash_registers cr
            WHERE cr.id = cash_register_id
            AND cr.user_id = auth.uid()
        )
    );

-- Sales policies
CREATE POLICY "Sellers can view own sales" ON public.sales
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.is_manager_or_admin(auth.uid()));

CREATE POLICY "All authenticated users can create sales" ON public.sales
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own sales" ON public.sales
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid() OR public.is_manager_or_admin(auth.uid()));

-- Sale items policies
CREATE POLICY "Users can view sale items for their sales" ON public.sale_items
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.sales s
            WHERE s.id = sale_id
            AND (s.user_id = auth.uid() OR public.is_manager_or_admin(auth.uid()))
        )
    );

CREATE POLICY "Users can create sale items" ON public.sale_items
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.sales s
            WHERE s.id = sale_id
            AND s.user_id = auth.uid()
        )
    );

-- Audit logs policies
CREATE POLICY "Admins can view all audit logs" ON public.audit_logs
    FOR SELECT TO authenticated
    USING (public.is_admin(auth.uid()));

CREATE POLICY "System can insert audit logs" ON public.audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- ==========================================
-- TRIGGERS
-- ==========================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply update triggers
CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON public.stores
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_product_stock_updated_at BEFORE UPDATE ON public.product_stock
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON public.sales
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Price history trigger
CREATE OR REPLACE FUNCTION public.log_price_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.cost_price != NEW.cost_price OR OLD.sale_price != NEW.sale_price THEN
        INSERT INTO public.price_history (product_id, old_cost_price, new_cost_price, old_sale_price, new_sale_price, changed_by)
        VALUES (NEW.id, OLD.cost_price, NEW.cost_price, OLD.sale_price, NEW.sale_price, auth.uid());
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER log_product_price_change BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.log_price_change();

-- Update stock after sale
CREATE OR REPLACE FUNCTION public.update_stock_after_sale()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.product_stock
    SET quantity = quantity - NEW.quantity
    WHERE product_id = NEW.product_id
    AND store_id = (SELECT store_id FROM public.sales WHERE id = NEW.sale_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_stock_on_sale AFTER INSERT ON public.sale_items
    FOR EACH ROW EXECUTE FUNCTION public.update_stock_after_sale();

-- ==========================================
-- SEED DATA
-- ==========================================

-- Insert default stores
INSERT INTO public.stores (id, name, address, phone) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Loja Central', 'Av. Principal, 100', '+258 84 000 0001'),
    ('22222222-2222-2222-2222-222222222222', 'Loja Norte', 'Rua do Norte, 50', '+258 84 000 0002'),
    ('33333333-3333-3333-3333-333333333333', 'Loja Sul', 'Av. Sul, 200', '+258 84 000 0003');

-- Insert default categories
INSERT INTO public.categories (name, description, color) VALUES
    ('Bebidas', 'Refrigerantes, sucos e águas', '#3B82F6'),
    ('Alimentos', 'Snacks, biscoitos e cereais', '#10B981'),
    ('Higiene', 'Produtos de higiene pessoal', '#8B5CF6'),
    ('Limpeza', 'Produtos de limpeza doméstica', '#F59E0B'),
    ('Eletrônicos', 'Acessórios e eletrônicos', '#EF4444'),
    ('Outros', 'Produtos diversos', '#6B7280');

-- Insert sample products
INSERT INTO public.products (code, name, category_id, cost_price, sale_price, low_stock_threshold) VALUES
    ('P001', 'Coca-Cola 500ml', (SELECT id FROM public.categories WHERE name = 'Bebidas'), 25.00, 40.00, 20),
    ('P002', 'Água Mineral 1L', (SELECT id FROM public.categories WHERE name = 'Bebidas'), 10.00, 20.00, 30),
    ('P003', 'Fanta Laranja 500ml', (SELECT id FROM public.categories WHERE name = 'Bebidas'), 25.00, 40.00, 20),
    ('P004', 'Biscoito Cream Cracker', (SELECT id FROM public.categories WHERE name = 'Alimentos'), 35.00, 55.00, 15),
    ('P005', 'Pão de Forma', (SELECT id FROM public.categories WHERE name = 'Alimentos'), 45.00, 70.00, 10),
    ('P006', 'Sabonete Dove', (SELECT id FROM public.categories WHERE name = 'Higiene'), 30.00, 50.00, 25),
    ('P007', 'Shampoo Head & Shoulders', (SELECT id FROM public.categories WHERE name = 'Higiene'), 150.00, 220.00, 10),
    ('P008', 'Detergente Líquido', (SELECT id FROM public.categories WHERE name = 'Limpeza'), 40.00, 65.00, 20),
    ('P009', 'Água Sanitária 1L', (SELECT id FROM public.categories WHERE name = 'Limpeza'), 35.00, 55.00, 15),
    ('P010', 'Carregador USB', (SELECT id FROM public.categories WHERE name = 'Eletrônicos'), 200.00, 350.00, 5);

-- Insert initial stock for all stores
INSERT INTO public.product_stock (product_id, store_id, quantity)
SELECT p.id, s.id, 
    CASE 
        WHEN s.name = 'Loja Central' THEN 100
        WHEN s.name = 'Loja Norte' THEN 75
        ELSE 50
    END
FROM public.products p
CROSS JOIN public.stores s;