-- ============================================================================
-- Trim notifications: remove task/tip/referral notifications.
-- Keep ONLY: live support messages, reports, deposit/withdraw approve-reject,
-- withdrawal/deposit request submitted (→ admins), account suspend/ban,
-- and admin announcements.
-- ============================================================================

-- 1. process_task — re-define WITHOUT approve/reject notifications
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
  ELSIF p_action = 'reject' THEN
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
  ELSE
    RAISE EXCEPTION 'Unknown action. Use approve or reject.';
  END IF;

  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.process_task(uuid, uuid, text, text) TO authenticated;

-- 2. delete_job — re-define WITHOUT task-approved/cancelled notifications
CREATE OR REPLACE FUNCTION public.delete_job(p_job_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_job RECORD;
  v_refund numeric(12,3);
  v_worker uuid;
  v_reward numeric(12,3);
  v_shot_fee numeric(12,3);
  v_task RECORD;
BEGIN
  SELECT * INTO v_job FROM public.jobs WHERE id = p_job_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job not found.';
  END IF;

  IF v_job.user_id <> auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'You can only delete your own jobs.';
  END IF;

  v_reward := COALESCE(v_job.reward_per_worker, 0)::numeric(12,3);
  v_shot_fee := (COALESCE(v_job.screenshot_count, 0) * 0.0001)::numeric(12,3);

  FOR v_task IN
    SELECT t.* FROM public.tasks t
      WHERE t.job_id = p_job_id AND t.status = 'submitted'
      FOR UPDATE OF t
  LOOP
    UPDATE public.tasks
      SET status = 'approved', reviewed_by = v_job.user_id, reviewed_at = now()
      WHERE id = v_task.id;

    UPDATE public.profiles
      SET earning_balance = earning_balance + v_reward,
          total_earned = total_earned + v_reward,
          tasks_completed = tasks_completed + 1,
          updated_at = now()
      WHERE id = v_task.worker_id;

    INSERT INTO public.transactions (user_id, type, amount, balance_type, description, reference_id)
      VALUES (v_task.worker_id, 'earning', v_reward, 'earning',
              'Task approved (job deleted) - ' || v_job.title, v_task.id);
  END LOOP;

  v_refund := ((v_reward + v_shot_fee)
              * GREATEST(v_job.total_slots - v_job.filled_slots, 0))::numeric(12,3);

  IF v_refund > 0 THEN
    UPDATE public.profiles
      SET deposit_balance = deposit_balance + v_refund, updated_at = now()
      WHERE id = v_job.user_id;

    INSERT INTO public.transactions (user_id, type, amount, balance_type, description, reference_id)
      VALUES (v_job.user_id, 'ad_charge', v_refund, 'deposit',
              'Refund - deleted job "' || v_job.title || '"', p_job_id);
  END IF;

  DELETE FROM public.jobs WHERE id = p_job_id;
  RETURN true;
END;
$function$;

-- 3. auto_approve_stale_tasks — re-define WITHOUT auto-approve notification
CREATE OR REPLACE FUNCTION public.auto_approve_stale_tasks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_task RECORD;
  v_reward numeric(12,3);
  v_shot_fee numeric(12,3);
  v_days integer;
BEGIN
  SELECT value INTO v_days FROM public.admin_settings WHERE key = 'task_auto_approve_days';
  v_days := COALESCE(v_days::integer, 7);

  FOR v_task IN
    SELECT t.*, j.reward_per_worker, j.screenshot_count, j.title, j.user_id AS job_owner_id
      FROM public.tasks t
      JOIN public.jobs j ON j.id = t.job_id
      WHERE t.status = 'submitted'
        AND t.submitted_at IS NOT NULL
        AND t.submitted_at < now() - (v_days || ' days')::interval
      FOR UPDATE OF t
  LOOP
    v_reward := COALESCE(v_task.reward_per_worker, 0)::numeric(12,3);
    v_shot_fee := (COALESCE(v_task.screenshot_count, 0) * 0.0001)::numeric(12,3);

    UPDATE public.tasks
      SET status = 'approved', reviewed_by = v_task.job_owner_id, reviewed_at = now()
      WHERE id = v_task.id;

    UPDATE public.profiles
      SET earning_balance = earning_balance + v_reward,
          total_earned = total_earned + v_reward,
          tasks_completed = tasks_completed + 1,
          updated_at = now()
      WHERE id = v_task.worker_id;

    INSERT INTO public.transactions (user_id, type, amount, balance_type, description, reference_id)
      VALUES (v_task.worker_id, 'earning', v_reward, 'earning',
              'Task auto-approved - ' || v_task.title, v_task.id);
  END LOOP;
END;
$function$;

-- 4. tip_worker — re-define WITHOUT tip notification
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

  IF v_reviewer <> v_task.job_owner_id THEN
    RAISE EXCEPTION 'Only the job owner can tip a worker.';
  END IF;
  IF v_task.status <> 'approved' THEN
    RAISE EXCEPTION 'You can only tip a worker after their task is approved.';
  END IF;
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

  UPDATE public.profiles
    SET deposit_balance = deposit_balance - v_amount, updated_at = now()
    WHERE id = v_reviewer;
  UPDATE public.profiles
    SET earning_balance = earning_balance + v_amount,
        total_earned = total_earned + v_amount,
        updated_at = now()
    WHERE id = v_task.worker_id;
  UPDATE public.tasks SET tip_amount = v_amount WHERE id = p_task_id;

  INSERT INTO public.transactions (user_id, type, amount, balance_type, description, reference_id)
    VALUES (v_reviewer, 'ad_charge', v_amount, 'deposit',
            'Tip sent - ' || v_task.title, p_task_id);
  INSERT INTO public.transactions (user_id, type, amount, balance_type, description, reference_id)
    VALUES (v_task.worker_id, 'earning', v_amount, 'earning',
            'Tip received - ' || v_task.title, p_task_id);

  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.tip_worker(uuid, numeric) TO authenticated;

-- 5. process_deposit — re-define WITHOUT referral bonus notification.
--    KEEP deposit approved/rejected user notifications.
CREATE OR REPLACE FUNCTION public.process_deposit(
  p_deposit_id uuid,
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
  v_req RECORD;
  v_referrer_id uuid;
  v_bonus numeric(12,3);
BEGIN
  SELECT * INTO v_req FROM public.deposit_requests WHERE id = p_deposit_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Deposit request not found.';
  END IF;
  IF v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'This deposit request has already been processed.';
  END IF;

  IF p_action = 'approve' THEN
    UPDATE public.deposit_requests
      SET status = 'approved', admin_note = p_note,
          reviewed_by = p_admin_uid, reviewed_at = now()
      WHERE id = p_deposit_id;

    UPDATE public.profiles
      SET deposit_balance = deposit_balance + v_req.amount, updated_at = now()
      WHERE id = v_req.user_id;

    INSERT INTO public.transactions (user_id, type, amount, balance_type, description, reference_id)
      VALUES (v_req.user_id, 'deposit', v_req.amount, 'deposit',
              'Deposit approved', p_deposit_id);

    -- Process referral bonus silently (no notification).
    SELECT value INTO v_bonus FROM public.admin_settings WHERE key = 'referral_bonus_amount';
    v_bonus := COALESCE(v_bonus::numeric, 0);
    IF v_bonus > 0 THEN
      SELECT referred_by INTO v_referrer_id FROM public.profiles WHERE id = v_req.user_id;
      IF v_referrer_id IS NOT NULL THEN
        UPDATE public.profiles
          SET deposit_balance = deposit_balance + v_bonus, updated_at = now()
          WHERE id = v_referrer_id;
        INSERT INTO public.transactions (user_id, type, amount, balance_type, description)
          VALUES (v_referrer_id, 'referral_bonus', v_bonus, 'deposit',
                  'Referral bonus for referred user''s first deposit');
      END IF;
    END IF;

    PERFORM public.notify_user(
      v_req.user_id,
      'Deposit Approved!',
      'Your deposit of $ ' || v_req.amount || ' has been approved and credited to your account.',
      'success'
    );
  ELSIF p_action = 'reject' THEN
    UPDATE public.deposit_requests
      SET status = 'rejected', admin_note = p_note,
          reviewed_by = v_admin_uid, reviewed_at = now()
      WHERE id = p_deposit_id;

    PERFORM public.notify_user(
      v_req.user_id,
      'Deposit Rejected',
      'Your deposit request of $ ' || v_req.amount || ' was rejected. ' || COALESCE(p_note, ''),
      'error'
    );
  ELSE
    RAISE EXCEPTION 'Unknown action. Use approve or reject.';
  END IF;

  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.process_deposit(uuid, uuid, text, text) TO authenticated;

-- 6. set_user_status — ADD notification on suspend/ban
CREATE OR REPLACE FUNCTION public.set_user_status(
  p_user_uid uuid,
  p_status text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_status text;
  v_username text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin only.';
  END IF;
  IF p_status NOT IN ('active','suspended','blocked') THEN
    RAISE EXCEPTION 'Invalid status. Use active, suspended or blocked.';
  END IF;

  SELECT status, username INTO v_old_status, v_username
    FROM public.profiles WHERE id = p_user_uid AND status <> 'admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target user not found or is an admin account.';
  END IF;

  UPDATE public.profiles
    SET status = p_status, updated_at = now()
    WHERE id = p_user_uid AND status <> 'admin';

  IF p_status = 'suspended' THEN
    PERFORM public.notify_user(
      p_user_uid,
      'Account Suspended',
      'Your account has been suspended. Please contact support for assistance.',
      'warning'
    );
  ELSIF p_status = 'blocked' THEN
    PERFORM public.notify_user(
      p_user_uid,
      'Account Banned',
      'Your account has been banned. Please contact support if you believe this is an error.',
      'error'
    );
  ELSIF p_status = 'active' AND v_old_status IN ('suspended','blocked') THEN
    PERFORM public.notify_user(
      p_user_uid,
      'Account Restored',
      'Your account has been restored and is now active. Welcome back!',
      'success'
    );
  END IF;

  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.set_user_status(uuid, text) TO authenticated;

-- 7. broadcast_announcement — admin sends a notification to ALL users
CREATE OR REPLACE FUNCTION public.broadcast_announcement(
  p_title text,
  p_message text,
  p_type text DEFAULT 'info'
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
  v_uid uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin only.';
  END IF;
  IF p_title IS NULL OR trim(p_title) = '' THEN
    RAISE EXCEPTION 'Title is required.';
  END IF;
  IF p_message IS NULL OR trim(p_message) = '' THEN
    RAISE EXCEPTION 'Message is required.';
  END IF;

  FOR v_uid IN SELECT id FROM public.profiles WHERE status <> 'blocked'
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type)
      VALUES (v_uid, p_title, p_message, p_type);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;
GRANT EXECUTE ON FUNCTION public.broadcast_announcement(text, text, text) TO authenticated;

-- 8. Clean up existing unwanted notifications already in the table
DELETE FROM public.notifications
  WHERE title IN (
    'Task Approved!',
    'Task Rejected',
    'Task Auto-Approved',
    'Task Cancelled',
    'New Task Submission',
    'You received a tip!',
    'Referral Bonus Earned!'
  );
