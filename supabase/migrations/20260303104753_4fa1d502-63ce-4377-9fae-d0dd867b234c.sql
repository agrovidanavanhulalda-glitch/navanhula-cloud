
-- Notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  message text NOT NULL,
  category text NOT NULL DEFAULT 'system',
  link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_notifications_user_unread ON public.notifications (user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_user_created ON public.notifications (user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can delete own notifications"
ON public.notifications FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Function to create notification for all admins/managers of a company
CREATE OR REPLACE FUNCTION public.notify_company_admins(
  p_company_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_category text DEFAULT 'system',
  p_link text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, category, link)
  SELECT ur.user_id, p_type, p_title, p_message, p_category, p_link
  FROM public.user_roles ur
  JOIN public.profiles p ON p.id = ur.user_id
  WHERE p.company_id = p_company_id
    AND ur.role IN ('admin', 'manager', 'ceo');
END;
$$;

-- Function to notify a specific user
CREATE OR REPLACE FUNCTION public.notify_user(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_category text DEFAULT 'system',
  p_link text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, category, link)
  VALUES (p_user_id, p_type, p_title, p_message, p_category, p_link);
END;
$$;

-- Trigger: notify on low stock
CREATE OR REPLACE FUNCTION public.check_low_stock_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_product record;
  v_company_id uuid;
  v_threshold int;
BEGIN
  -- Only check when quantity decreases
  IF NEW.quantity < OLD.quantity THEN
    SELECT p.name, p.low_stock_threshold INTO v_product
    FROM products p WHERE p.id = NEW.product_id;
    
    v_threshold := COALESCE(v_product.low_stock_threshold, 10);
    
    -- Only notify when crossing the threshold
    IF NEW.quantity <= v_threshold AND OLD.quantity > v_threshold THEN
      SELECT s.company_id INTO v_company_id
      FROM stores s WHERE s.id = NEW.store_id;
      
      IF v_company_id IS NOT NULL THEN
        PERFORM notify_company_admins(
          v_company_id,
          'warning',
          'Estoque Baixo: ' || v_product.name,
          'O produto "' || v_product.name || '" está com apenas ' || NEW.quantity || ' unidades em estoque.',
          'stock',
          '/inventario'
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_low_stock
AFTER UPDATE ON public.product_stock
FOR EACH ROW
EXECUTE FUNCTION public.check_low_stock_notification();

-- Trigger: notify post author on new comment
CREATE OR REPLACE FUNCTION public.notify_on_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_post_author uuid;
  v_post_title text;
  v_commenter_name text;
BEGIN
  SELECT user_id, title INTO v_post_author, v_post_title
  FROM community_posts WHERE id = NEW.post_id;
  
  -- Don't notify yourself
  IF v_post_author != NEW.user_id THEN
    SELECT full_name INTO v_commenter_name
    FROM profiles WHERE id = NEW.user_id;
    
    PERFORM notify_user(
      v_post_author,
      'info',
      'Novo comentário',
      COALESCE(v_commenter_name, 'Alguém') || ' comentou no seu post "' || v_post_title || '"',
      'community',
      '/comunidade'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_comment
AFTER INSERT ON public.community_comments
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_comment();

-- Trigger: notify post author on new like
CREATE OR REPLACE FUNCTION public.notify_on_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_post_author uuid;
  v_post_title text;
  v_liker_name text;
BEGIN
  SELECT user_id, title INTO v_post_author, v_post_title
  FROM community_posts WHERE id = NEW.post_id;
  
  IF v_post_author != NEW.user_id THEN
    SELECT full_name INTO v_liker_name
    FROM profiles WHERE id = NEW.user_id;
    
    PERFORM notify_user(
      v_post_author,
      'info',
      'Novo like',
      COALESCE(v_liker_name, 'Alguém') || ' gostou do seu post "' || v_post_title || '"',
      'community',
      '/comunidade'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_like
AFTER INSERT ON public.community_likes
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_like();

-- Trigger: notify seller on completed sale (daily milestone)
CREATE OR REPLACE FUNCTION public.notify_on_sale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_daily_count int;
BEGIN
  IF NEW.status = 'completed' THEN
    -- Count today's sales for this user
    SELECT count(*) INTO v_daily_count
    FROM sales
    WHERE user_id = NEW.user_id
      AND status = 'completed'
      AND created_at::date = CURRENT_DATE;
    
    -- Notify on milestones: 10, 25, 50, 100
    IF v_daily_count IN (10, 25, 50, 100) THEN
      PERFORM notify_user(
        NEW.user_id,
        'success',
        'Marco de Vendas! 🎉',
        'Parabéns! Você completou ' || v_daily_count || ' vendas hoje!',
        'sales',
        '/vendas'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_sale_milestone
AFTER INSERT ON public.sales
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_sale();
