
-- 1. Active store tracking (cross-browser consistency)
CREATE TABLE IF NOT EXISTS public.active_store (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.active_store ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own active store"
  ON public.active_store FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can upsert own active store"
  ON public.active_store FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own active store"
  ON public.active_store FOR UPDATE
  USING (user_id = auth.uid());

-- Function to set active store
CREATE OR REPLACE FUNCTION public.set_active_store(p_store_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.active_store (user_id, store_id, updated_at)
  VALUES (auth.uid(), p_store_id, now())
  ON CONFLICT (user_id)
  DO UPDATE SET store_id = p_store_id, updated_at = now();
  
  -- Also update profile store_id
  UPDATE public.profiles SET store_id = p_store_id, updated_at = now()
  WHERE id = auth.uid();
  
  RETURN json_build_object('success', true, 'store_id', p_store_id);
END;
$$;

-- 2. Enable realtime on sales for CEO dashboard
ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;

-- 3. Community media storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('comunidade_media', 'comunidade_media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for community media
CREATE POLICY "Anyone can view community media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'comunidade_media');

CREATE POLICY "Authenticated users can upload community media"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'comunidade_media' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete own community media"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'comunidade_media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 4. Add media columns to community_posts
ALTER TABLE public.community_posts 
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS audio_url text;

-- 5. Add fields to stores for enhanced form
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS business_type text DEFAULT 'retail',
  ADD COLUMN IF NOT EXISTS nuit text,
  ADD COLUMN IF NOT EXISTS plan text DEFAULT 'basic',
  ADD COLUMN IF NOT EXISTS fiscal_regime text DEFAULT 'irpc',
  ADD COLUMN IF NOT EXISTS default_min_stock integer DEFAULT 10;
