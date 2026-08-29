-- ============================================================
-- WorkerGig BD — follow-up fixes after self-review
-- Date: 2026-08-29
-- Safe to run on a live database: CREATE OR REPLACE only, no data touched.
-- ============================================================

-- 1. Exact + bounded lookup for the "jobs this worker already did" filter:
--    tasks WHERE worker_id = ? AND job_id IN (page of 50 job ids).
CREATE INDEX IF NOT EXISTS idx_tasks_worker_job
  ON public.tasks (worker_id, job_id);

-- 2. get_admin_stats: day/month/year boundaries were computed in the server
--    timezone (UTC). The dashboard audience is Bangladesh (UTC+6), and the old
--    client-side code used the admin browser's local midnight, so "today"
--    previously reset at midnight Dhaka time. With UTC it reset at 6 AM Dhaka
--    and numbers did not match what admins expect. Now computed in Asia/Dhaka.
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- (date_trunc on the Dhaka wall clock) converted back to an absolute instant
  today_start timestamptz := (date_trunc('day',   now() AT TIME ZONE 'Asia/Dhaka')) AT TIME ZONE 'Asia/Dhaka';
  month_start timestamptz := (date_trunc('month', now() AT TIME ZONE 'Asia/Dhaka')) AT TIME ZONE 'Asia/Dhaka';
  year_start  timestamptz := (date_trunc('year',  now() AT TIME ZONE 'Asia/Dhaka')) AT TIME ZONE 'Asia/Dhaka';
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
