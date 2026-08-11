-- ============================================================
-- WorkerGig BD — verification-docs bucket made private (PII protection)
-- ============================================================
-- The verification-docs bucket stored National ID / government-issued ID
-- photos and was created public, so anyone with a URL could read other
-- users' KYC documents. Make the bucket PRIVATE and restrict reads to
-- admins (the only legitimate consumer) + the owner. The frontend now
-- fetches signed URLs instead of public URLs.
-- ============================================================

UPDATE storage.buckets SET public = false WHERE id = 'verification-docs';

DROP POLICY IF EXISTS verification_docs_read_all ON storage.objects;
-- Only the owner or an admin may read verification documents.
CREATE POLICY verification_docs_read_owner_or_admin ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'verification-docs'
    AND (auth.uid() = owner OR public.is_admin())
  );

DROP POLICY IF EXISTS verification_docs_insert_own ON storage.objects;
CREATE POLICY verification_docs_insert_own ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'verification-docs' AND auth.uid() = owner);

DROP POLICY IF EXISTS verification_docs_update_own ON storage.objects;
CREATE POLICY verification_docs_update_own ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'verification-docs' AND auth.uid() = owner)
  WITH CHECK (bucket_id = 'verification-docs' AND auth.uid() = owner);

DROP POLICY IF EXISTS verification_docs_delete_own ON storage.objects;
CREATE POLICY verification_docs_delete_own ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'verification-docs' AND (auth.uid() = owner OR public.is_admin()));
