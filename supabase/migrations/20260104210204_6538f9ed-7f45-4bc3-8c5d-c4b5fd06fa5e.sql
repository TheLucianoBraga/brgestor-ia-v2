-- Create storage bucket for tenant assets (logos, etc.)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tenant-assets',
  'tenant-assets',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their tenant folder
CREATE POLICY "Users can upload to their tenant folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'tenant-assets' AND
  (storage.foldername(name))[1] = (SELECT current_tenant_id()::text)
);

-- Allow public read access to tenant assets
CREATE POLICY "Public read access for tenant assets"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'tenant-assets');

-- Allow authenticated users to update their tenant files
CREATE POLICY "Users can update their tenant files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'tenant-assets' AND
  (storage.foldername(name))[1] = (SELECT current_tenant_id()::text)
);

-- Allow authenticated users to delete their tenant files
CREATE POLICY "Users can delete their tenant files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'tenant-assets' AND
  (storage.foldername(name))[1] = (SELECT current_tenant_id()::text)
);