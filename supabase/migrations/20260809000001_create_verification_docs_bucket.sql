/*
# Create verification-docs storage bucket

## Problem
VerifyPage uploads verification documents to a storage bucket named `verification-docs`,
but only the `job-assets` bucket was ever created. Uploads therefore fail with
"Bucket not found", which blocks the whole account-verification flow.

## Solution
Create the `verification-docs` bucket (public so admin can review images) and
add RLS policies mirroring job-assets: users manage their own uploads, everyone
can read (public bucket).
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-docs', 'verification-docs', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "verification_docs_read_all" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'verification-docs');

CREATE POLICY "verification_docs_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'verification-docs' AND auth.uid() = owner);

CREATE POLICY "verification_docs_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'verification-docs' AND auth.uid() = owner);

CREATE POLICY "verification_docs_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'verification-docs' AND auth.uid() = owner);
