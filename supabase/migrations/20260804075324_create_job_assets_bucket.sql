INSERT INTO storage.buckets (id, name, public) VALUES ('job-assets', 'job-assets', true);

CREATE POLICY "job_assets_read_all" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'job-assets');
CREATE POLICY "job_assets_insert_own" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'job-assets' AND auth.uid() = owner);
CREATE POLICY "job_assets_update_own" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'job-assets' AND auth.uid() = owner);
CREATE POLICY "job_assets_delete_own" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'job-assets' AND auth.uid() = owner);
