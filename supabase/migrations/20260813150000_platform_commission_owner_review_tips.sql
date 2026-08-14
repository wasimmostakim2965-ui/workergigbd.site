-- ============================================================
-- WorkerGig BD — Platform commission on screenshot fee + job-owner review + tips
-- ============================================================
-- Business logic changes (professional revenue model):
--
-- 1. The per-screenshot fee ($0.0001/shot/worker) is NO LONGER paid to the
--    worker. The job poster still prepays it in post_job, but on approval
--    only the base reward goes to the worker. The screenshot fee is kept by
--    the platform as commission and recorded in a new platform_revenue table.
--
-- 2. Task review (approve/reject) is no longer admin-only. The job poster
--    (the user who posted the job) can now review their own workers, in
--    addition to admins. This matches a marketplace model (e.g. Fiverr),
--    where the buyer reviews the seller's work.
--
-- 3. A tip_worker RPC lets a job poster tip an approved worker an extra
--    amount from their deposit balance (one tip per task).
--
-- Idempotent. Safe to re-run.
-- ============================================================
NOTIFY pgrst, 'reload schema_cache';

-- ============================================================
-- 1. platform_revenue — ledger of money the platform keeps
-- ============================================================
CREATE TABLE IF NOT EXISTS public.platform_revenue (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amount      numeric(12,3) NOT NULL DEFAULT 0,
  source      text NOT NULL,           -- screenshot_fee | withdrawal_spread | other
  task_id     uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  job_id      uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  note        text DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_revenue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "platform_revenue_admin_read" ON public.platform_revenue;
CREATE POLICY "platform_revenue_admin_read" ON public.platform_revenue
  FOR SELECT TO authenticated USING (public.is_admin());

-- ============================================================
-- 2. tasks.tip_amount — one optional tip per task
-- ============================================================
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS tip_amount numeric(12,3) NOT NULL DEFAULT 0;

-- ============================================================
-- 3. process_task — job-owner OR admin can review; worker gets reward only;
--    screenshot fee goes to platform_revenue.
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

  -- Permission: platform admin OR the job's poster may review submissions.
  IF NOT public.is_admin() AND v_reviewer <> v_job_owner THEN
    RAISE EXCEPTION 'Only the job owner or an admin can review this task.';
  END IF;

  IF v_task.status <> 'submitted' THEN
    RAISE EXCEPTION 'This task is not awaiting review (status: %).', v_task.status;
  END IF;

  -- Worker payout: base reward ONLY (the screenshot fee is platform revenue).
  v_reward   := COALESCE(v_task.reward_per_worker,0)::numeric(12,3);
  -- Platform commission: $0.0001 per required screenshot.
  v_shot_fee := (COALESCE(v_task.screenshot_count,0) * 0.0001)::numeric(12,3);

  IF p_action = 'approve' THEN
    UPDATE public.tasks
      SET status = 'approved', reviewed_by = v_reviewer, reviewed_at = now()
      WHERE id = p_task_id;

    -- Pay the worker the base reward.
    UPDATE public.profiles
      SET earning_balance = earning_balance + v_reward,
          total_earned = total_earned + v_reward,
          tasks_completed = tasks_completed + 1,
          updated_at = now()
      WHERE id = v_task.worker_id;

    INSERT INTO public.transactions (user_id, type, amount, balance_type, description, reference_id)
      VALUES (v_task.worker_id, 'earning', v_reward, 'earning',
              'Task approved - ' || v_task.title, p_task_id);

    -- Keep the screenshot fee as platform commission.
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
    UPDATE public.tasks
      SET status = 'rejected', reviewed_by = v_reviewer, reviewed_at = now()
      WHERE id = p_task_id;

    -- Free the slot so another worker can take it.
    UPDATE public.jobs
      SET filled_slots = GREATEST(filled_slots - 1, 0),
          status = CASE WHEN status = 'completed' AND filled_slots - 1 < total_slots THEN 'active' ELSE status END,
          updated_at = now()
      WHERE id = v_task.job_id;

    -- The rejected worker's prepaid screenshot fee also stays with the
    -- platform (the poster already paid it; nothing is refunded per-task).
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
-- 4. tip_worker — job poster tips an approved worker (once per task)
-- ============================================================
CREATE OR REPLACE FUNCTION public.tip_worker(
  p_task_id uuid,
  p_amount numeric
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task        RECORD;
  v_bal         numeric(12,3);
  v_amount      numeric(12,3);
  v_reviewer    uuid := auth.uid();
BEGIN
  IF v_reviewer IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Tip amount must be greater than zero.';
  END IF;
  v_amount := p_amount::numeric(12,3);

  SELECT t.*, j.user_id AS job_owner_id, j.title
    INTO v_task
    FROM public.tasks t
    JOIN public.jobs j ON j.id = t.job_id
    WHERE t.id = p_task_id
    FOR UPDATE OF t;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found.';
  END IF;

  -- Only the job poster may tip their own workers.
  IF v_reviewer <> v_task.job_owner_id THEN
    RAISE EXCEPTION 'Only the job owner can tip a worker.';
  END IF;
  -- Tipping is only available on approved work.
  IF v_task.status <> 'approved' THEN
    RAISE EXCEPTION 'You can only tip a worker after their task is approved.';
  END IF;
  -- One tip per task.
  IF COALESCE(v_task.tip_amount,0) > 0 THEN
    RAISE EXCEPTION 'This worker has already been tipped for this task.';
  END IF;

  SELECT deposit_balance INTO v_bal FROM public.profiles WHERE id = v_reviewer FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Account not found.';
  END IF;
  IF v_bal < v_amount THEN
    RAISE EXCEPTION 'Insufficient deposit balance. Need $ %, have $ %.', v_amount, v_bal;
  END IF;

  -- Debit the poster's deposit.
  UPDATE public.profiles
    SET deposit_balance = deposit_balance - v_amount, updated_at = now()
    WHERE id = v_reviewer;
  -- Credit the worker's earnings.
  UPDATE public.profiles
    SET earning_balance = earning_balance + v_amount,
        total_earned = total_earned + v_amount,
        updated_at = now()
    WHERE id = v_task.worker_id;
  -- Record the tip on the task.
  UPDATE public.tasks SET tip_amount = v_amount WHERE id = p_task_id;

  INSERT INTO public.transactions (user_id, type, amount, balance_type, description, reference_id)
    VALUES (v_reviewer, 'ad_charge', v_amount, 'deposit',
            'Tip sent - ' || v_task.title, p_task_id);
  INSERT INTO public.transactions (user_id, type, amount, balance_type, description, reference_id)
    VALUES (v_task.worker_id, 'earning', v_amount, 'earning',
            'Tip received - ' || v_task.title, p_task_id);

  PERFORM public.notify_user(
    v_task.worker_id,
    'You received a tip!',
    'The job owner tipped you $ ' || v_amount || ' for "' || v_task.title || '".',
    'success'
  );

  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.tip_worker(uuid, numeric) TO authenticated;

NOTIFY pgrst, 'reload schema cache';
