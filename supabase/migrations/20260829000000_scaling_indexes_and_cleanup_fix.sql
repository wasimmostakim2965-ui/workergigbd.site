-- ============================================================
-- WorkerGig BD — Scaling hardening (read path) + cleanup bug fix
-- Date: 2026-08-29
-- Safe to run on a live database:
--   * Indexes are plain CREATE INDEX (no CONCURRENTLY): the tables are small now so
--   they build in milliseconds with a brief write lock. Switch to CONCURRENTLY
--   only when a table is large enough that the lock would be felt.
--   * cleanup_finished_jobs is CREATE OR REPLACE (no DROP, no data touched)
--   * No wallet / RLS / financial logic is modified.
-- ============================================================

-- 1. Jobs list query: WHERE status='active' ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_jobs_status_created
  ON public.jobs (status, created_at DESC);

-- 2. Jobs list with category filter: WHERE status AND category, sorted by recency
CREATE INDEX IF NOT EXISTS idx_jobs_status_category_created
  ON public.jobs (status, category, created_at DESC);

-- 3. Jobs list sorted by price (high/low price tabs)
CREATE INDEX IF NOT EXISTS idx_jobs_status_reward
  ON public.jobs (status, reward_per_worker DESC);

-- 4. Worker's recent tasks lookup for the done-job filter, newest first
CREATE INDEX IF NOT EXISTS idx_tasks_worker_created
  ON public.tasks (worker_id, created_at DESC);

-- 5. Unread-notification badge + notifications page (user, unread, newest)
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created
  ON public.notifications (user_id, is_read, created_at DESC);

-- 6. Live chat message history (per conversation, chronological)
CREATE INDEX IF NOT EXISTS idx_chat_messages_conv_created
  ON public.chat_messages (conversation_id, created_at);

-- ============================================================
-- Fix cleanup_finished_jobs storage path mismatch.
--
-- Job images were uploaded to   job-images/{user_id}/{ts}.{ext}
-- but cleanup looked for        job-images/{job_id}%
-- so job images were never deleted and piled up forever. There is no job_id
-- in the stored path, so we now delete by the job's saved image_url (which we
-- can map back to its storage object name). Proof screenshots used the
-- correct task-proofs/{user}/{job_id}/% path already; that part is unchanged.
-- Images now hosted on ImgBB simply won't match any storage.objects row, so
-- this stays a no-op for them — safe for both old and new data.
-- ============================================================
CREATE OR REPLACE FUNCTION public.cleanup_finished_jobs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  j RECORD;
BEGIN
  -- (a) Stamp completion time for jobs that are finished but not yet stamped.
  FOR j IN
    SELECT id FROM public.jobs
      WHERE completed_at IS NULL
        AND filled_slots >= total_slots
        AND NOT EXISTS (
          SELECT 1 FROM public.tasks
            WHERE job_id = public.jobs.id
              AND status IN ('pending', 'submitted')
        )
  LOOP
    UPDATE public.jobs SET completed_at = now() WHERE id = j.id;
  END LOOP;

  -- (b) Delete jobs finished more than 2 days ago.
  FOR j IN
    SELECT id, image_url FROM public.jobs
      WHERE completed_at IS NOT NULL
        AND completed_at < now() - interval '2 days'
  LOOP
    -- Proof screenshots for this job (path contains the job id).
    DELETE FROM storage.objects
      WHERE bucket_id = 'job-assets'
        AND name LIKE 'task-proofs/%/' || j.id::text || '/%';

    -- Job image: match the object by the public URL we stored (old Supabase
    -- uploads only; ImgBB URLs do not resolve to a storage object).
    IF j.image_url IS NOT NULL AND position('/job-assets/' IN j.image_url) > 0 THEN
      DELETE FROM storage.objects
        WHERE bucket_id = 'job-assets'
          AND name = substring(j.image_url FROM '/job-assets/(.+)$');
    END IF;

    DELETE FROM public.jobs WHERE id = j.id; -- cascades to tasks
  END LOOP;
END;
$$;

-- ============================================================
-- Admin dashboard stats RPC: returns one JSON object with every count and
-- financial total computed in SQL, so the dashboard no longer downloads
-- 10,000-row amounts into the browser. Read-only, admin-only.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today_start timestamptz := date_trunc('day', now());
  month_start timestamptz := date_trunc('month', now());
  year_start  timestamptz := date_trunc('year', now());
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN json_build_object(
    'totalUsers',        (SELECT count(*) FROM profiles WHERE status <> 'admin'),
    'activeUsers',       (SELECT count(*) FROM profiles WHERE status = 'active'),
    'todayNewUsers',     (SELECT count(*) FROM profiles WHERE status <> 'admin' AND created_at >= today_start),
    'pendingDeposits',   (SELECT count(*) FROM deposit_requests WHERE status = 'pending'),
    'pendingWithdrawals',(SELECT count(*) FROM withdrawal_requests WHERE status = 'pending'),
    'totalDeposits',     (SELECT COALESCE(sum(amount),0) FROM deposit_requests WHERE status = 'approved'),
    'totalWithdrawals',  (SELECT COALESCE(sum(amount),0) FROM withdrawal_requests WHERE status = 'approved'),
    'yearDeposits',      (SELECT COALESCE(sum(amount),0) FROM deposit_requests WHERE status = 'approved' AND created_at >= year_start),
    'monthEarnings',     (SELECT COALESCE(sum(amount),0) FROM transactions WHERE type = 'earning' AND created_at >= month_start),
    'totalJobsPosted',   (SELECT count(*) FROM jobs),
    'activeJobs',        (SELECT count(*) FROM jobs WHERE status = 'active'),
    'completedTasks',    (SELECT count(*) FROM tasks WHERE status = 'approved'),
    'todayDeposits',     (SELECT COALESCE(sum(amount),0) FROM deposit_requests WHERE status = 'approved' AND created_at >= today_start),
    'todayWithdrawals',  (SELECT COALESCE(sum(amount),0) FROM withdrawal_requests WHERE status = 'approved' AND created_at >= today_start)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_stats() TO authenticated;
