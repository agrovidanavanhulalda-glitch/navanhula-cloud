
-- =============================================
-- FIX 1: agro_producers - remove open SELECT, already has company-scoped write policies
-- =============================================
DROP POLICY IF EXISTS "Authenticated users can view producers" ON public.agro_producers;

CREATE POLICY "Users can view own company producers"
ON public.agro_producers
FOR SELECT TO authenticated
USING (company_id = get_user_company(auth.uid()));

-- =============================================
-- FIX 2: categories - remove open SELECT (company-scoped SELECT already exists)
-- =============================================
DROP POLICY IF EXISTS "All authenticated users can view categories" ON public.categories;

-- =============================================
-- FIX 3: payment_vouchers - remove open SELECT (store-scoped SELECT already exists)
-- =============================================
DROP POLICY IF EXISTS "Authenticated users can view vouchers" ON public.payment_vouchers;

-- =============================================
-- FIX 4: sale_items - remove dangerous open INSERT (store-scoped INSERT already exists)
-- =============================================
DROP POLICY IF EXISTS "Users can create sale items" ON public.sale_items;

-- =============================================
-- FIX 5: community_posts - scope SELECT to company
-- =============================================
DROP POLICY IF EXISTS "Authenticated users can view posts" ON public.community_posts;

CREATE POLICY "Users can view community posts"
ON public.community_posts
FOR SELECT TO authenticated
USING (
  company_id IS NULL
  OR company_id = get_user_company(auth.uid())
);

-- =============================================
-- FIX 6: community_comments - scope to posts user can see
-- =============================================
DROP POLICY IF EXISTS "Authenticated users can view comments" ON public.community_comments;

CREATE POLICY "Users can view comments on visible posts"
ON public.community_comments
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM community_posts cp
    WHERE cp.id = community_comments.post_id
    AND (cp.company_id IS NULL OR cp.company_id = get_user_company(auth.uid()))
  )
);

-- =============================================
-- FIX 7: community_likes - scope to posts user can see
-- =============================================
DROP POLICY IF EXISTS "Authenticated users can view likes" ON public.community_likes;

CREATE POLICY "Users can view likes on visible posts"
ON public.community_likes
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM community_posts cp
    WHERE cp.id = community_likes.post_id
    AND (cp.company_id IS NULL OR cp.company_id = get_user_company(auth.uid()))
  )
);

-- =============================================
-- FIX 8: role_permissions - keep read for authenticated (config table, no PII)
-- This is intentionally readable by all authenticated users
-- =============================================
-- No change needed for role_permissions
