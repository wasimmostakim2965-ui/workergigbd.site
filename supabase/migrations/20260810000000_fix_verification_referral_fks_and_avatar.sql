/*
# Fix nested-select joins for verification_requests & referrals + duplicate-task guard + avatar bucket

## Why
1. verification_requests.user_id and referrals.referrer_id / referred_id reference auth.users(id),
   not public.profiles(id). The admin Verifications page and the Share & Earn page do
   `select('*, profiles(...)')` nested joins, which PostgREST can only resolve through a FK to
   the profiles table. Without it the join returns a 400 (schema error) and the page silently
   shows "no data". Add FKs to public.profiles(id) (profiles.id is itself a FK to auth.users,
   so the relationship is valid) — mirroring what fix_fk_to_profiles.sql already did for the
   other tables.
2. FindJobsPage guards against a worker taking the same job twice with a read-then-insert,
   which races under double-click / concurrency. Add a partial unique index so the DB rejects
   duplicates atomically.
3. ProfilePage lets users set an avatar, but no storage bucket exists. Add a public avatars
   bucket with per-user insert/update/delete + public read policies.
*/

-- ============================================================
-- 1. verification_requests.user_id -> profiles(id)
-- ============================================================
ALTER TABLE public.verification_requests DROP CONSTRAINT IF EXISTS verification_requests_user_id_fkey;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                 WHERE constraint_name = 'verification_requests_user_profile' AND table_name = 'verification_requests') THEN
    ALTER TABLE public.verification_requests
      ADD CONSTRAINT verification_requests_user_profile
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- reviewed_by is nullable; leave it pointing at auth.users (admins).

-- ============================================================
-- 2. referrals.referrer_id / referred_id -> profiles(id)
-- ============================================================
ALTER TABLE public.referrals DROP CONSTRAINT IF EXISTS referrals_referrer_id_fkey;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                 WHERE constraint_name = 'referrals_referrer_profile' AND table_name = 'referrals') THEN
    ALTER TABLE public.referrals
      ADD CONSTRAINT referrals_referrer_profile
      FOREIGN KEY (referrer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE public.referrals DROP CONSTRAINT IF EXISTS referrals_referred_id_fkey;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                 WHERE constraint_name = 'referrals_referred_profile' AND table_name = 'referrals') THEN
    ALTER TABLE public.referrals
      ADD CONSTRAINT referrals_referred_profile
      FOREIGN KEY (referred_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================================
-- 3. A worker may only have ONE active (pending/submitted) task per job.
--    Partial unique index so duplicate inserts are rejected atomically.
-- ============================================================
DROP INDEX IF EXISTS tasks_one_active_per_job;
CREATE UNIQUE INDEX tasks_one_active_per_job
  ON public.tasks (job_id, worker_id)
  WHERE status IN ('pending', 'submitted');

-- ============================================================
-- 4. Public avatars storage bucket + RLS
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "avatars_read_all" ON storage.objects;
CREATE POLICY "avatars_read_all" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_insert_own" ON storage.objects;
CREATE POLICY "avatars_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND auth.uid() = owner);

DROP POLICY IF EXISTS "avatars_update_own" ON storage.objects;
CREATE POLICY "avatars_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid() = owner)
  WITH CHECK (bucket_id = 'avatars' AND auth.uid() = owner);

DROP POLICY IF EXISTS "avatars_delete_own" ON storage.objects;
CREATE POLICY "avatars_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid() = owner);
