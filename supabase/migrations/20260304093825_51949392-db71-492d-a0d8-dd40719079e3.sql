-- Create storage bucket for company assets (logos, product images)
INSERT INTO storage.buckets (id, name, public)
VALUES ('company_assets', 'company_assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to company_assets
CREATE POLICY "Authenticated users can upload company assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'company_assets');

-- Allow public read access
CREATE POLICY "Public can view company assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'company_assets');

-- Allow authenticated users to update their uploads
CREATE POLICY "Users can update company assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'company_assets');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Users can delete company assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'company_assets');