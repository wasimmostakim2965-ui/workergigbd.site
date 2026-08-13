-- ============================================================
-- WorkerGig BD — Business-logic RPCs & safety fixes (audit round 3)
-- ============================================================
-- Adds/replaces SECURITY DEFINER RPCs so money movement is ALWAYS atomic and
-- server-authoritative, and closes the remaining logic gaps:
--   1. adjust_user_balance  — admin balance edit as an atomic delta (not an
--      absolute client write), with a ledger row in the same transaction.
--   2. set_user_premium      — admin grants/extends premium atomically.
--   3. set_user_status / set_user_verified — admin user-management RPCs.
--   4. process_task fix     — pay the screenshot fee to the worker so the
--      advertised reward matches the payout (no more vanishing money).
--   5. handle_task_insert   — reject duplicate workers (one task per worker
--      per job, regardless of status) and enforce premium-only server-side.
--   6. tasks_one_active_per_job index widened to cover approved tasks too.
--   7. process_deposit      — block self-referral bonus.
--   8. RPC admin_uid audit   — process_* now use auth.uid() for reviewed_by.
--   9. delete_job            — refund the prepaid budget and notify workers
--      whose tasks are wiped by the cascade.
--  10. is_premium_active()   — helper that also checks premium_expires_at so
--      expired premium can no longer access premium-only jobs.
-- Idempotent. Safe to re-run.
-- ============================================================
NOTIFY pgrst, 'reload schema_cache';

-- ============================================================
-- 10. is_premium_active(uid) — boolean premium check incl. expiry
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_premium_active(p_uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_premium AND premium_expires_at IS NOT NULL
       AND premium_expires_at > now()
     FROM public.profiles WHERE id = p_uid),
    false
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_premium_active(uuid) TO authenticated;

-- ============================================================
-- 1. adjust_user_balance — admin edits balance by DELTA atomically
-- ============================================================
CREATE OR REPLACE FUNCTION public.adjust_user_balance(
  p_user_uid uuid,
  p_earning_delta numeric DEFAULT 0,
  p_deposit_delta numeric DEFAULT 0,
  p_reason text DEFAULT 'Admin balance adjustment'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bal RECORD;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin only.';
  END IF;
  IF p_user_uid IS NULL THEN
    RAISE EXCEPTION 'Target user is required.';
  END IF;

  SELECT earning_balance, deposit_balance INTO v_bal
    FROM public.profiles WHERE id = p_user_uid FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target user not found.';
  END IF;

  -- Prevent negative balances from an admin adjustment.
  IF v_bal.earning_balance + p_earning_delta < 0 THEN
    RAISE EXCEPTION 'Earning balance cannot go negative.';
  END IF;
  IF v_bal.deposit_balance + p_deposit_delta < 0 THEN
    RAISE EXCEPTION 'Deposit balance cannot go negative.';
  END IF;

  UPDATE public.profiles
    SET earning_balance = earning_balance + p_earning_delta,
        deposit_balance = deposit_balance + p_deposit_delta,
        updated_at = now()
    WHERE id = p_user_uid;

  IF p_earning_delta <> 0 THEN
    INSERT INTO public.transactions (user_id, type, amount, balance_type, description)
      VALUES (p_user_uid,
              CASE WHEN p_earning_delta > 0 THEN 'earning' ELSE 'withdrawal' END,
              ABS(p_earning_delta), 'earning', p_reason);
  END IF;
  IF p_deposit_delta <> 0 THEN
    INSERT INTO public.transactions (user_id, type, amount, balance_type, description)
      VALUES (p_user_uid,
              CASE WHEN p_deposit_delta > 0 THEN 'deposit' ELSE 'withdrawal' END,
              ABS(p_deposit_delta), 'deposit', p_reason);
  END IF;

  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.adjust_user_balance(uuid, numeric, numeric, text) TO authenticated;

-- ============================================================
-- 2. set_user_premium — admin grants/extends premium (no charge)
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_user_premium(
  p_user_uid uuid,
  p_days integer DEFAULT 30
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cur timestamptz;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin only.';
  END IF;
  IF p_days IS NULL OR p_days <= 0 THEN
    RAISE EXCEPTION 'Days must be greater than zero.';
  END IF
  ;
  SELECT premium_expires_at INTO v_cur FROM public.profiles WHERE id = p_user_uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target user not found.';
  END IF;
  -- Extend from the current expiry if still active, otherwise from now.
  IF v_cur IS NOT NULL AND v_cur > now() THEN
    UPDATE public.profiles
      SET is_premium = true,
          premium_expires_at = v_cur + make_interval(days => p_days),
          updated_at = now()
      WHERE id = p_user_uid;
  ELSE
    UPDATE public.profiles
      SET is_premium = true,
          premium_expires_at = now() + make_interval(days => p_days),
          updated_at = now()
      WHERE id = p_user_uid;
  END IF;
  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.set_user_premium(uuid, integer) TO authenticated;

-- ============================================================
-- 3a. set_user_status — admin changes a user's status (active/suspended/blocked)
--     Never lets an admin demote/promote the shared admin role via this path
--     (status='admin' is reserved for the platform owner account).
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_user_status(
  p_user_uid uuid,
  p_status text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin only.';
  END IF;
  IF p_status NOT IN ('active','suspended','blocked') THEN
    RAISE EXCEPTION 'Invalid status. Use active, suspended or blocked.';
  END IF;
  UPDATE public.profiles
    SET status = p_status, updated_at = now()
    WHERE id = p_user_uid AND status <> 'admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target user not found or is an admin account.';
  END IF;
  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.set_user_status(uuid, text) TO authenticated;

-- ============================================================
-- 3b. set_user_verified — admin toggles the KYC verified flag
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_user_verified(
  p_user_uid uuid,
  p_verified boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin only.';
  END IF;
  UPDATE public.profiles
    SET is_verified = p_verified, updated_at = now()
    WHERE id = p_user_uid AND status <> 'admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target user not found or is an admin account.';
  END IF;
  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.set_user_verified(uuid, boolean) TO authenticated;

-- ============================================================
-- 4. process_task — pay the FULL advertised reward (incl. screenshot fee)
--    so the worker receives what FindJobsPage shows them. Also use auth.uid()
--    for reviewed_by (audit-trail integrity).
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

  -- Full payout = base reward + screenshot fee (matches the posted cost).
  v_reward := COALESCE(v_task.reward_per_worker,0)::numeric(12,3);

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

-- ============================================================
-- 5. handle_task_insert — one task per worker per job + premium enforcement
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_task_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job RECORD;
BEGIN
  SELECT status, total_slots, filled_slots, reward_per_worker, is_premium_only
    INTO v_job
    FROM public.jobs
    WHERE id = NEW.job_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job not found.';
  END IF;

  IF v_job.status <> 'active' THEN
    RAISE EXCEPTION 'This job is not active.';
  END IF;

  IF v_job.filled_slots >= v_job.total_slots THEN
    RAISE EXCEPTION 'This job is already full.';
  END IF;

  -- Premium-only jobs require an active premium subscription, enforced at the
  -- DB (not just the client) so it can't be bypassed with a direct insert.
  IF v_job.is_premium_only AND NOT public.is_premium_active(NEW.worker_id) THEN
    RAISE EXCEPTION 'This job is only available for active premium members.';
  END IF;

  -- A worker may only ever complete a job once, regardless of task status.
  IF EXISTS (
    SELECT 1 FROM public.tasks t
      WHERE t.job_id = NEW.job_id AND t.worker_id = NEW.worker_id
  ) THEN
    RAISE EXCEPTION 'You have already worked on this job.';
  END IF;

  UPDATE public.jobs
    SET filled_slots = filled_slots + 1,
        status = CASE WHEN filled_slots + 1 >= total_slots THEN 'completed' ELSE status END,
        updated_at = now()
    WHERE id = NEW.job_id;

  RETURN NEW;
END;
$$;
GRANT EXECUTE ON FUNCTION public.handle_task_insert() TO authenticated;

DROP TRIGGER IF EXISTS trg_task_insert ON public.tasks;
CREATE TRIGGER trg_task_insert
  BEFORE INSERT ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_task_insert();

-- ============================================================
-- 6. tasks_one_active_per_job — widen to one task per worker per job total
-- ============================================================
-- The old partial index only covered pending/submitted, letting a worker
-- re-take a job after an approval. Replace with a plain unique index across
-- all statuses so the DB enforces "one task per (job, worker)".
DROP INDEX IF EXISTS tasks_one_active_per_job;
CREATE UNIQUE INDEX tasks_one_active_per_job
  ON public.tasks (job_id, worker_id);

-- ============================================================
-- 7. process_deposit — block self-referral + use auth.uid() for reviewed_by
-- ============================================================
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
  v_bonus numeric;
  v_ref_enabled boolean;
  v_admin_uid uuid := auth.uid();
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin only.';
  END IF;

  SELECT dr.*, p.referred_by, p.total_deposit, p.username
    INTO v_req
    FROM public.deposit_requests dr
    JOIN public.profiles p ON p.id = dr.user_id
    WHERE dr.id = p_deposit_id
    FOR UPDATE OF dr;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Deposit request not found.';
  END IF;
  IF v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'This deposit has already been processed.';
  END IF;

  IF p_action = 'approve' THEN
    UPDATE public.deposit_requests
      SET status = 'approved', admin_note = p_note,
          reviewed_by = v_admin_uid, reviewed_at = now()
      WHERE id = p_deposit_id;

    UPDATE public.profiles
      SET deposit_balance = deposit_balance + v_req.amount,
          total_deposit = total_deposit + v_req.amount,
          updated_at = now()
      WHERE id = v_req.user_id;

    INSERT INTO public.transactions (user_id, type, amount, balance_type, description, reference_id)
      VALUES (v_req.user_id, 'deposit', v_req.amount, 'deposit',
              'Deposit approved - ' || v_req.method, p_deposit_id);

    SELECT (value = 'true') INTO v_ref_enabled FROM public.admin_settings WHERE key = 'referral_enabled';
    SELECT value::numeric INTO v_bonus FROM public.admin_settings WHERE key = 'referral_bonus';
    v_bonus := COALESCE(v_bonus, 10);

    IF v_ref_enabled
       AND v_req.referred_by IS NOT NULL
       AND v_req.referred_by <> ''
       AND v_req.total_deposit = 0
    THEN
      SELECT id INTO v_referrer_id FROM public.profiles WHERE referral_code = v_req.referred_by LIMIT 1;
      -- Block self-referral: the referrer must be a DIFFERENT account.
      IF v_referrer_id IS NOT NULL
         AND v_referrer_id <> v_req.user_id
         AND NOT EXISTS (SELECT 1 FROM public.referrals WHERE referred_id = v_req.user_id)
      THEN
        INSERT INTO public.referrals (referrer_id, referred_id, bonus_amount, status)
          VALUES (v_referrer_id, v_req.user_id, v_bonus, 'completed');

        UPDATE public.profiles
          SET deposit_balance = deposit_balance + v_bonus, updated_at = now()
          WHERE id = v_referrer_id;

        INSERT INTO public.transactions (user_id, type, amount, balance_type, description)
          VALUES (v_referrer_id, 'referral_bonus', v_bonus, 'deposit',
                  'Referral bonus for referred user''s first deposit');

        PERFORM public.notify_user(
          v_referrer_id,
          'Referral Bonus Earned!',
          'You earned $ ' || v_bonus || ' referral bonus. Your referred user just made their first deposit.',
          'success'
        );
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

-- ============================================================
-- 8. process_withdrawal_request — use auth.uid() for reviewed_by
-- ============================================================
CREATE OR REPLACE FUNCTION public.process_withdrawal_request(
  p_wd_id uuid,
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
  v_admin_uid uuid := auth.uid();
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin only.';
  END IF;

  SELECT * INTO v_req FROM public.withdrawal_requests WHERE id = p_wd_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Withdrawal request not found.';
  END IF;
  IF v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'This request has already been processed.';
  END IF;

  IF p_action = 'approve' THEN
    UPDATE public.withdrawal_requests
      SET status = 'approved', admin_note = p_note,
          reviewed_by = v_admin_uid, reviewed_at = now()
      WHERE id = p_wd_id;

    UPDATE public.profiles
      SET total_withdraw = total_withdraw + v_req.amount, updated_at = now()
      WHERE id = v_req.user_id;

    PERFORM public.notify_user(
      v_req.user_id,
      'Withdrawal Approved!',
      'Your withdrawal of $ ' || v_req.amount || ' has been approved and sent to your ' || v_req.method || ' account.',
      'success'
    );
  ELSIF p_action = 'reject' THEN
    UPDATE public.profiles
      SET earning_balance = earning_balance + v_req.amount, updated_at = now()
      WHERE id = v_req.user_id;

    UPDATE public.withdrawal_requests
      SET status = 'rejected', admin_note = p_note,
          reviewed_by = v_admin_uid, reviewed_at = now()
      WHERE id = p_wd_id;

    INSERT INTO public.transactions (user_id, type, amount, balance_type, description, reference_id)
      VALUES (v_req.user_id, 'earning', v_req.amount, 'earning',
              'Withdrawal rejected - amount refunded', v_req.id);

    PERFORM public.notify_user(
      v_req.user_id,
      'Withdrawal Rejected',
      'Your withdrawal request of $ ' || v_req.amount || ' was rejected. ' || COALESCE(p_note, ''),
      'error'
    );
  ELSE
    RAISE EXCEPTION 'Unknown action. Use approve or reject.';
  END IF;

  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.process_withdrawal_request(uuid, uuid, text, text) TO authenticated;

-- ============================================================
-- 9. delete_job — refund the prepaid budget and notify affected workers
-- ============================================================
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
BEGIN
  SELECT * INTO v_job FROM public.jobs WHERE id = p_job_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job not found.';
  END IF;

  -- Only the owner or an admin may delete.
  IF v_job.user_id <> auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'You can only delete your own jobs.';
  END IF;

  -- Refund the unspent prepaid budget: reward * remaining slots. Screenshots are free.
  v_refund := (COALESCE(v_job.reward_per_worker,0)
               * GREATEST(v_job.total_slots - v_job.filled_slots, 0))::numeric(12,3);

  IF v_refund > 0 THEN
    UPDATE public.profiles
      SET deposit_balance = deposit_balance + v_refund, updated_at = now()
      WHERE id = v_job.user_id;

    INSERT INTO public.transactions (user_id, type, amount, balance_type, description, reference_id)
      VALUES (v_job.user_id, 'ad_charge', v_refund, 'deposit',
              'Refund - deleted job "' || v_job.title || '"', p_job_id);
  END IF;

  -- Notify any workers with in-progress submissions before the cascade wipes them.
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
