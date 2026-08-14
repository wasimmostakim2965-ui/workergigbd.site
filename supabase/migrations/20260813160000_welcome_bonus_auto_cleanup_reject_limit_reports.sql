-- ============================================================
-- WorkerGig BD — welcome bonus, job auto-cleanup, reject limit, reports
-- ============================================================
-- Four business-logic additions, all DB-enforced:
--
-- 1. Welcome bonus: the first 100 registered users get $0.20 credited to
--    their deposit balance automatically on signup (early-bird bonus).
--
-- 2. Job auto-cleanup: when a job is fully "finished" (every slot filled and
--    no task still awaiting review), a completion timestamp is set; a pg_cron
--    job then hard-deletes the job, its tasks, and the proof screenshots
--    in storage two days later.
--
-- 3. Reject limit: a job owner (or admin) may not reject more than 30% of
--    the reviewed submissions on a single job. This stops a poster from
--    rejecting everyone to keep slots open or to game payouts.
--
-- 4. Report system: users can report a task or a job; admins review them.
--
-- Idempotent. Safe to re-run.
-- ============================================================
NOTIFY pgrst, 'reload schema cache';

-- pg_cron is already enabled (extensions schema).

-- ============================================================
-- 1. Welcome bonus — first 100 users get $0.20 on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing  integer;
  v_bonus     numeric(12,3) := 0.20;
  v_referred  text;
BEGIN
  v_referred := NEW.raw_user_meta_data->>'referred_by';

  INSERT INTO public.profiles (id, username, referral_code, referred_by, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    'WG' || UPPER(SUBSTRING(NEW.id::text, 1, 8)),
    v_referred,
    'active'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    username = COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    updated_at = now();

  -- Early-bird welcome bonus for the first 100 users only. Counting existing
  -- profiles here (BEFORE this row would be counted) gives the registrant's
  -- position; if they are among the first 100, credit the bonus.
  SELECT count(*) INTO v_existing FROM public.profiles WHERE id <> NEW.id;
  IF v_existing < 100 THEN
    UPDATE public.profiles
      SET deposit_balance = deposit_balance + v_bonus,
          total_deposit = total_deposit + v_bonus,
          updated_at = now()
      WHERE id = NEW.id;
    INSERT INTO public.transactions (user_id, type, amount, balance_type, description, reference_id)
      VALUES (NEW.id, 'deposit', v_bonus, 'deposit',
              'Welcome bonus — early bird ($0.20)', NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================
-- 2. jobs.completed_at — when a job is truly finished
-- ============================================================
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- ============================================================
-- 3. cleanup_finished_jobs — mark finished jobs + delete old ones
-- ============================================================
-- A job is "finished" when every slot is filled AND none of its tasks are
-- still pending review. We record completed_at the first time that becomes
-- true, then hard-delete the job (cascade deletes tasks) and its proof
-- screenshots two days later.
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

  -- (b) Delete jobs finished more than 2 days ago: storage screenshots first,
  -- then the job row (cascade removes its tasks).
  FOR j IN
    SELECT id FROM public.jobs
      WHERE completed_at IS NOT NULL
        AND completed_at < now() - interval '2 days'
  LOOP
    -- Remove proof screenshots + job image from the job-assets bucket.
    DELETE FROM storage.objects
      WHERE bucket_id = 'job-assets'
        AND (name LIKE 'task-proofs/%/' || j.id::text || '/%'
             OR name LIKE 'job-images/' || j.id::text || '%');
    DELETE FROM public.jobs WHERE id = j.id;
  END LOOP;
END;
$$;
GRANT EXECUTE ON FUNCTION public.cleanup_finished_jobs() TO authenticated, service_role;

-- Schedule the cleanup every hour (idempotent schedule replace).
DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup_finished_jobs') THEN
    PERFORM cron.alter_job(
      job_id => (SELECT jobid FROM cron.job WHERE jobname = 'cleanup_finished_jobs'),
      schedule => '0 * * * *'
    );
  ELSE
    PERFORM cron.schedule(
      'cleanup_finished_jobs',
      '0 * * * *',
      'SELECT public.cleanup_finished_jobs();'
    );
  END IF;
END $do$;

-- ============================================================
-- 4. process_task — reject no more than 30% of reviewed submissions
-- ============================================================
CREATE OR REPLACE FUNCTION public.process_task(
  p_task_id uuid,
  p_admin_uid uuid,
  p_action text,
  p_note text DEFAULT ''
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task        RECORD;
  v_reward      numeric(12,3);
  v_shot_fee    numeric(12,3);
  v_job_owner   uuid;
  v_reviewer    uuid := auth.uid();
  v_total       integer;
  v_rejected    integer;
BEGIN
  IF v_reviewer IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  SELECT t.*, j.reward_per_worker, j.screenshot_count, j.title, j.user_id AS job_owner_id
    INTO v_task
    FROM public.tasks t
    JOIN public.jobs j ON j.id = t.job_id
    WHERE t.id = p_task_id
    FOR UPDATE OF t;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found.';
  END IF;

  v_job_owner := v_task.job_owner_id;

  IF NOT public.is_admin() AND v_reviewer <> v_job_owner THEN
    RAISE EXCEPTION 'Only the job owner or an admin can review this task.';
  END IF;

  IF v_task.status <> 'submitted' THEN
    RAISE EXCEPTION 'This task is not awaiting review (status: %).', v_task.status;
  END IF;

  v_reward   := COALESCE(v_task.reward_per_worker,0)::numeric(12,3);
  v_shot_fee := (COALESCE(v_task.screenshot_count,0) * 0.0001)::numeric(12,3);

  IF p_action = 'approve' THEN
    UPDATE public.tasks
      SET status = 'approved', reviewed_by = v_reviewer, reviewed_at = now()
      WHERE id = p_task_id;

    UPDATE public.profiles
      SET earning_balance = earning_balance + v_reward,
          total_earned = total_earned + v_reward,
          tasks_completed = tasks_completed + 1,
          updated_at = now()
      WHERE id = v_task.worker_id;

    INSERT INTO public.transactions (user_id, type, amount, balance_type, description, reference_id)
      VALUES (v_task.worker_id, 'earning', v_reward, 'earning',
              'Task approved - ' || v_task.title, p_task_id);

    IF v_shot_fee > 0 THEN
      INSERT INTO public.platform_revenue (amount, source, task_id, note)
        VALUES (v_shot_fee, 'screenshot_fee', p_task_id,
                'Screenshot fee kept by platform for "' || v_task.title || '"');
    END IF;

    PERFORM public.notify_user(
      v_task.worker_id,
      'Task Approved!',
      'Your task for "' || v_task.title || '" has been approved. $ ' || v_reward || ' credited to your earning balance.',
      'success'
    );
  ELSIF p_action = 'reject' THEN
    -- Fraud protection: a poster may not reject more than 30% of the
    -- submissions already reviewed on this job (approved + rejected). The
    -- very first submission can always be rejected (denominator guards 0).
    SELECT count(*) FILTER (WHERE status IN ('approved','rejected')),
           count(*) FILTER (WHERE status = 'rejected')
      INTO v_total, v_rejected
      FROM public.tasks
      WHERE job_id = v_task.job_id
        AND id <> p_task_id;

    IF v_total > 0 AND (v_rejected + 1) * 100 > v_total * 30 THEN
      RAISE EXCEPTION
        'Reject limit reached: you cannot reject more than 30%% of reviewed submissions for this job.';
    END IF;

    UPDATE public.tasks
      SET status = 'rejected', reviewed_by = v_reviewer, reviewed_at = now()
      WHERE id = p_task_id;

    UPDATE public.jobs
      SET filled_slots = GREATEST(filled_slots - 1, 0),
          status = CASE WHEN status = 'completed' AND filled_slots - 1 < total_slots THEN 'active' ELSE status END,
          completed_at = NULL,
          updated_at = now()
      WHERE id = v_task.job_id;

    IF v_shot_fee > 0 THEN
      INSERT INTO public.platform_revenue (amount, source, task_id, note)
        VALUES (v_shot_fee, 'screenshot_fee', p_task_id,
                'Screenshot fee kept by platform (rejected task) for "' || v_task.title || '"');
    END IF;

    PERFORM public.notify_user(
      v_task.worker_id,
      'Task Rejected',
      'Your task for "' || v_task.title || '" was rejected. ' || COALESCE(p_note, ''),
      'error'
    );
  ELSE
    RAISE EXCEPTION 'Unknown action. Use approve or reject.';
  END IF;

  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.process_task(uuid, uuid, text, text) TO authenticated;

-- ============================================================
-- 5. Reports — users can report a task or a job
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id     uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  job_id      uuid REFERENCES public.jobs(id) ON DELETE CASCADE,
  reason      text NOT NULL,
  status      text NOT NULL DEFAULT 'open',  -- open | resolved
  created_at  timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  CHECK (task_id IS NOT NULL OR job_id IS NOT NULL)
);
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reports_insert_own" ON public.reports;
CREATE POLICY "reports_insert_own" ON public.reports
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
DROP POLICY IF EXISTS "reports_select_own_or_admin" ON public.reports;
CREATE POLICY "reports_select_own_or_admin" ON public.reports
  FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id OR public.is_admin());
DROP POLICY IF EXISTS "reports_admin_update" ON public.reports;
CREATE POLICY "reports_admin_update" ON public.reports
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.create_report(
  p_task_id uuid DEFAULT NULL,
  p_job_id  uuid DEFAULT NULL,
  p_reason  text DEFAULT ''
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'A reason is required to file a report.';
  END IF;
  IF p_task_id IS NULL AND p_job_id IS NULL THEN
    RAISE EXCEPTION 'A task or job must be referenced.';
  END IF;
  INSERT INTO public.reports (reporter_id, task_id, job_id, reason)
    VALUES (auth.uid(), p_task_id, p_job_id, p_reason)
    RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_report(uuid, uuid, text) TO authenticated;

NOTIFY pgrst, 'reload schema cache';
