-- ============================================================
-- WorkerGig BD — Set screenshot fee to $0.001 per screenshot per worker
-- ============================================================
-- Reverses the "fee = 0" model and re-introduces a small, fixed
-- per-screenshot fee of $0.001 that the job poster prepays and the
-- worker receives on approval. This recreates the three money-moving
-- RPCs (post_job, process_task, delete_job) so they charge/pay/refund:
--
--   base reward + (screenshot_count * 0.001)   per worker
--
-- Idempotent. Safe to re-run.
-- ============================================================
NOTIFY pgrst, 'reload schema_cache';

-- Constant used by all three functions. Change here to update the fee.
-- ($0.001 = one tenth of a cent per screenshot.)

-- 1. post_job — charge (reward + screenshot fee) * slots
CREATE OR REPLACE FUNCTION public.post_job(
  p_uid uuid,
  p_title text,
  p_description text,
  p_category text,
  p_subcategory text DEFAULT '',
  p_url text DEFAULT '',
  p_proof_instructions text DEFAULT '',
  p_reward_per_worker numeric DEFAULT 0,
  p_total_slots integer DEFAULT 1,
  p_is_premium_only boolean DEFAULT false,
  p_screenshot_count integer DEFAULT 0,
  p_screenshot_instructions text DEFAULT '',
  p_image_url text DEFAULT ''
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_bal numeric(12,3);
  v_cost numeric(12,3);
  v_shot_fee numeric(12,3);
BEGIN
  IF p_uid IS NULL OR auth.uid() IS NULL OR p_uid <> auth.uid() THEN
    RAISE EXCEPTION 'You can only post a job for your own account.';
  END IF;
  IF p_reward_per_worker IS NULL OR p_reward_per_worker < 0 THEN
    RAISE EXCEPTION 'Invalid reward per worker.';
  END IF;
  IF p_total_slots IS NULL OR p_total_slots < 1 THEN
    RAISE EXCEPTION 'Total slots must be at least 1.';
  END IF;
  IF p_screenshot_count IS NULL OR p_screenshot_count < 0 THEN
    RAISE EXCEPTION 'Invalid screenshot count.';
  END IF;

  -- Per-worker cost = base reward + screenshot fee ($0.001 per screenshot).
  v_shot_fee := (GREATEST(p_screenshot_count, 0) * 0.001)::numeric(12,3);
  v_cost := ((p_reward_per_worker + v_shot_fee) * p_total_slots)::numeric(12,3);

  SELECT deposit_balance INTO v_bal FROM public.profiles WHERE id = p_uid FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Account not found.';
  END IF;

  IF v_bal < v_cost THEN
    RAISE EXCEPTION 'Insufficient deposit balance. Need $ %, have $ %.', v_cost, v_bal;
  END IF;

  UPDATE public.profiles
    SET deposit_balance = deposit_balance - v_cost,
        jobs_posted = jobs_posted + 1,
        updated_at = now()
    WHERE id = p_uid;

  INSERT INTO public.jobs (
    user_id, title, description, category, subcategory, url, proof_instructions,
    reward_per_worker, total_slots, status, is_premium_only,
    screenshot_count, screenshot_instructions, image_url
  ) VALUES (
    p_uid, p_title, p_description, p_category, p_subcategory, p_url, p_proof_instructions,
    p_reward_per_worker, p_total_slots, 'active', p_is_premium_only,
    p_screenshot_count, p_screenshot_instructions, p_image_url
  )
  RETURNING id INTO v_id;

  INSERT INTO public.transactions (user_id, type, amount, balance_type, description, reference_id)
    VALUES (p_uid, 'ad_charge', v_cost, 'deposit',
            'Job posted - ' || p_title, v_id);

  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.post_job(uuid, text, text, text, text, text, text, numeric, integer, boolean, integer, text, text) TO authenticated;

-- 2. process_task — pay base reward + screenshot fee on approval
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
  v_task RECORD;
  v_reward numeric(12,3);
  v_admin_uid uuid := auth.uid();
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin only.';
  END IF;

  SELECT t.*, j.reward_per_worker, j.screenshot_count, j.title
    INTO v_task
    FROM public.tasks t
    JOIN public.jobs j ON j.id = t.job_id
    WHERE t.id = p_task_id
    FOR UPDATE OF t;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found.';
  END IF;
  IF v_task.status <> 'submitted' THEN
    RAISE EXCEPTION 'This task is not awaiting review (status: %).', v_task.status;
  END IF;

  -- Full payout = base reward + screenshot fee ($0.001 per screenshot).
  v_reward := (COALESCE(v_task.reward_per_worker, 0)
               + GREATEST(COALESCE(v_task.screenshot_count, 0), 0) * 0.001)::numeric(12,3);

  IF p_action = 'approve' THEN
    UPDATE public.tasks
      SET status = 'approved', reviewed_by = v_admin_uid, reviewed_at = now()
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

    PERFORM public.notify_user(
      v_task.worker_id,
      'Task Approved!',
      'Your task for "' || v_task.title || '" has been approved. $ ' || v_reward || ' credited to your earning balance.',
      'success'
    );
  ELSIF p_action = 'reject' THEN
    UPDATE public.tasks
      SET status = 'rejected', reviewed_by = v_admin_uid, reviewed_at = now()
      WHERE id = p_task_id;

    UPDATE public.jobs
      SET filled_slots = GREATEST(filled_slots - 1, 0),
          status = CASE WHEN status = 'completed' AND filled_slots - 1 < total_slots THEN 'active' ELSE status END,
          updated_at = now()
      WHERE id = v_task.job_id;

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

-- 3. delete_job — refund (reward + screenshot fee) * remaining_slots
CREATE OR REPLACE FUNCTION public.delete_job(p_job_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job RECORD;
  v_refund numeric(12,3);
  v_worker uuid;
  v_shot_fee numeric(12,3);
BEGIN
  SELECT * INTO v_job FROM public.jobs WHERE id = p_job_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job not found.';
  END IF;

  IF v_job.user_id <> auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'You can only delete your own jobs.';
  END IF;

  -- Refund the unspent prepaid reward + screenshot fee for remaining slots.
  v_shot_fee := (GREATEST(COALESCE(v_job.screenshot_count, 0), 0) * 0.001)::numeric(12,3);
  v_refund := ((COALESCE(v_job.reward_per_worker, 0) + v_shot_fee)
               * GREATEST(v_job.total_slots - v_job.filled_slots, 0))::numeric(12,3);

  IF v_refund > 0 THEN
    UPDATE public.profiles
      SET deposit_balance = deposit_balance + v_refund, updated_at = now()
      WHERE id = v_job.user_id;

    INSERT INTO public.transactions (user_id, type, amount, balance_type, description, reference_id)
      VALUES (v_job.user_id, 'ad_charge', v_refund, 'deposit',
              'Refund - deleted job "' || v_job.title || '"', p_job_id);
  END IF;

  FOR v_worker IN
    SELECT DISTINCT worker_id FROM public.tasks
      WHERE job_id = p_job_id AND status IN ('pending','submitted')
  LOOP
    PERFORM public.notify_user(
      v_worker,
      'Task Cancelled',
      'The job "' || v_job.title || '" was removed by its owner/admin, so your in-progress task on it was cancelled.',
      'warning'
    );
  END LOOP;

  DELETE FROM public.jobs WHERE id = p_job_id;
  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.delete_job(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema_cache';
