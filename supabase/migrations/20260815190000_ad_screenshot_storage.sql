-- Allow admins to upload/delete any object in job-assets bucket (for ad screenshots)
DROP POLICY IF EXISTS "job_assets_insert_admin" ON storage.objects;
CREATE POLICY "job_assets_insert_admin" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'job-assets' AND public.is_admin());

DROP POLICY IF EXISTS "job_assets_delete_admin" ON storage.objects;
CREATE POLICY "job_assets_delete_admin" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'job-assets' AND public.is_admin());

-- Make ad_banners.image_url NOT NULL and link_url nullable (screenshot is primary)
ALTER TABLE public.ad_banners ALTER COLUMN image_url SET NOT NULL;
