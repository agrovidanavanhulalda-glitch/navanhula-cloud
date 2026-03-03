
-- Community Posts
CREATE TABLE public.community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid REFERENCES public.companies(id),
  title text NOT NULL,
  content text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  image_url text,
  likes_count integer NOT NULL DEFAULT 0,
  comments_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view posts" ON public.community_posts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create own posts" ON public.community_posts
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own posts" ON public.community_posts
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can delete own posts" ON public.community_posts
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Community Comments
CREATE TABLE public.community_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view comments" ON public.community_comments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create own comments" ON public.community_comments
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own comments" ON public.community_comments
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Community Likes
CREATE TABLE public.community_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE public.community_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view likes" ON public.community_likes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create own likes" ON public.community_likes
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own likes" ON public.community_likes
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Function to toggle like and update count
CREATE OR REPLACE FUNCTION public.toggle_post_like(p_post_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_exists boolean;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Não autenticado');
  END IF;

  SELECT EXISTS(SELECT 1 FROM community_likes WHERE post_id = p_post_id AND user_id = v_user_id) INTO v_exists;

  IF v_exists THEN
    DELETE FROM community_likes WHERE post_id = p_post_id AND user_id = v_user_id;
    UPDATE community_posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = p_post_id;
    RETURN json_build_object('success', true, 'liked', false);
  ELSE
    INSERT INTO community_likes (post_id, user_id) VALUES (p_post_id, v_user_id);
    UPDATE community_posts SET likes_count = likes_count + 1 WHERE id = p_post_id;
    RETURN json_build_object('success', true, 'liked', true);
  END IF;
END;
$$;

-- Function to add comment and update count
CREATE OR REPLACE FUNCTION public.add_community_comment(p_post_id uuid, p_content text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_comment_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Não autenticado');
  END IF;

  INSERT INTO community_comments (post_id, user_id, content)
  VALUES (p_post_id, v_user_id, p_content)
  RETURNING id INTO v_comment_id;

  UPDATE community_posts SET comments_count = comments_count + 1 WHERE id = p_post_id;

  RETURN json_build_object('success', true, 'comment_id', v_comment_id);
END;
$$;

-- Enable realtime for posts
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_posts;
