-- ============================================================
-- WorkerGig BD — Fixes & extensions (audit round 2)
-- ============================================================
-- Idempotent. Fixes:
--   1. process_deposit crash: read referred_by / total_deposit from profiles
--      (they're not columns on deposit_requests).
--   2. tasks table: add reviewed_by / reviewed_at (AdminTasksPage writes them).
--   3. chat_messages: add UPDATE RLS policy (read receipts were broken).
--   4. Realtime: add chat tables to supabase_realtime publication.
--   5. filled_slots trigger: increment jobs.filled_slots on task insert,
--      and reject when job is full / paused / completed.
--   6. tickets.updated_at trigger: bump on new ticket_messages insert.
--   7. process_task RPC: atomic approve/reject a submitted task (pay worker,
--      increment tasks_completed, ledger row, notification, status guard).
--   8. post_job RPC: atomic job creation (deduct deposit_balance, increment
--      jobs_posted, insert job + transaction).
--   9. subscribe_premium RPC: atomic premium activation.
--  10. create_ad RPC: atomic advertisement creation (deduct budget).
-- ============================================================

NOTIFY pgrst, 'reload schema_cache';

-- ============================================================
-- 1. FIX process_deposit — join profiles for referred_by / total_deposit
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
  v_referred_by text;
  v_user_total_deposit numeric;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin only.';
  END IF;

  -- Join profiles so referred_by + total_deposit are available (they live on
  -- profiles, NOT on deposit_requests).
  SELECT dr.*,
         p.referred_by,
         p.total_deposit,
         p.username
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
          reviewed_by = p_admin_uid, reviewed_at = now()
      WHERE id = p_deposit_id;

    UPDATE public.profiles
      SET deposit_balance = deposit_balance + v_req.amount,
          total_deposit = total_deposit + v_req.amount,
          updated_at = now()
      WHERE id = v_req.user_id;

    INSERT INTO public.transactions (user_id, type, amount, balance_type, description, reference_id)
      VALUES (v_req.user_id, 'deposit', v_req.amount, 'deposit',
              'Deposit approved - ' || v_req.method, p_deposit_id);

    -- Referral bonus on the user's FIRST approved deposit.
    SELECT (value = 'true') INTO v_ref_enabled FROM public.admin_settings WHERE key = 'referral_enabled';
    SELECT value::numeric INTO v_bonus FROM public.admin_settings WHERE key = 'referral_bonus';
    v_bonus := COALESCE(v_bonus, 10);
    v_referred_by := v_req.referred_by;
    v_user_total_deposit := v_req.total_deposit;

    IF v_ref_enabled
       AND v_referred_by IS NOT NULL
       AND v_referred_by <> ''
       AND v_user_total_deposit = 0
    THEN
      SELECT id INTO v_referrer_id FROM public.profiles WHERE referral_code = v_referred_by LIMIT 1;
      IF v_referrer_id IS NOT NULL
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
          'You earned ৳ ' || v_bonus || ' referral bonus. Your referred user just made their first deposit.',
          'success'
        );
      END IF;
    END IF;

    PERFORM public.notify_user(
      v_req.user_id,
      'Deposit Approved!',
      'Your deposit of ৳ ' || v_req.amount || ' has been approved and credited to your account.',
      'success'
    );
  ELSIF p_action = 'reject' THEN
    UPDATE public.deposit_requests
      SET status = 'rejected', admin_note = p_note,
          reviewed_by = p_admin_uid, reviewed_at = now()
      WHERE id = p_deposit_id;

    PERFORM public.notify_user(
      v_req.user_id,
      'Deposit Rejected',
      'Your deposit request of ৳ ' || v_req.amount || ' was rejected. ' || COALESCE(p_note, ''),
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
-- 2. tasks: add reviewed_by / reviewed_at columns
-- ============================================================
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

-- ============================================================
-- 3. chat_messages: add UPDATE RLS policy (read receipts)
-- ============================================================
DROP POLICY IF EXISTS chat_msg_update_related ON public.chat_messages;
CREATE POLICY chat_msg_update_related ON public.chat_messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.chat_conversations c
      WHERE c.id = chat_messages.conversation_id
        AND (c.user_id = auth.uid() OR public.is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_conversations c
      WHERE c.id = chat_messages.conversation_id
        AND (c.user_id = auth.uid() OR public.is_admin())
    )
  );

-- ============================================================
-- 4. Realtime: ensure chat tables are in the realtime publication
--    (Supabase broadcasts via supabase_realtime for postgres_changes)
-- ============================================================
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

-- ============================================================
-- 5. filled_slots trigger — increment jobs.filled_slots on task insert,
--    and prevent working on a full / paused / completed job.
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
  SELECT status, total_slots, filled_slots, reward_per_worker
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
-- 6. tickets.updated_at trigger — bump on new ticket message
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_ticket_message_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.tickets
    SET updated_at = now(),
        status = CASE WHEN NEW.is_admin_reply THEN 'answered' ELSE status END
    WHERE id = NEW.ticket_id;
  RETURN NEW;
END;
$$;
GRANT EXECUTE ON FUNCTION public.handle_ticket_message_insert() TO authenticated;

DROP TRIGGER IF EXISTS trg_ticket_msg_insert ON public.ticket_messages;
CREATE TRIGGER trg_ticket_msg_insert
  AFTER INSERT ON public.ticket_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_ticket_message_insert();

-- ============================================================
-- 7. process_task RPC — atomic approve/reject a submitted task
--    Approve: pay worker (earning_balance + total_earned), increment
--    tasks_completed, write ledger, notify, set status + reviewed_by.
--    Reject: set status + reviewed_by + notify. Status guard prevents
--    double-payment.
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
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin only.';
  END IF;

  SELECT t.*, j.reward_per_worker, j.title
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

  IF p_action = 'approve' THEN
    UPDATE public.tasks
      SET status = 'approved', reviewed_by = p_admin_uid, reviewed_at = now()
      WHERE id = p_task_id;

    UPDATE public.profiles
      SET earning_balance = earning_balance + v_task.reward_per_worker,
          total_earned = total_earned + v_task.reward_per_worker,
          tasks_completed = tasks_completed + 1,
          updated_at = now()
      WHERE id = v_task.worker_id;

    INSERT INTO public.transactions (user_id, type, amount, balance_type, description, reference_id)
      VALUES (v_task.worker_id, 'earning', v_task.reward_per_worker, 'earning',
              'Task approved - ' || v_task.title, p_task_id);

    PERFORM public.notify_user(
      v_task.worker_id,
      'Task Approved!',
      'Your task for "' || v_task.title || '" has been approved. ৳ ' || v_task.reward_per_worker || ' credited to your earning balance.',
      'success'
    );
  ELSIF p_action = 'reject' THEN
    UPDATE public.tasks
      SET status = 'rejected', reviewed_by = p_admin_uid, reviewed_at = now()
      WHERE id = p_task_id;

    -- Free up the slot so another worker can take it.
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
-- 8. post_job RPC — atomic job creation
--    Deducts total cost from deposit_balance, increments jobs_posted,
--    inserts the job + a ledger transaction. Prevents overdraft atomically.
-- ============================================================
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

  v_cost := ((p_reward_per_worker * p_total_slots)
            + (p_screenshot_count  * 0.001 * p_total_slots))::numeric(12,3);

  SELECT deposit_balance INTO v_bal FROM public.profiles WHERE id = p_uid FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Account not found.';
  END IF;

  IF v_bal < v_cost THEN
    RAISE EXCEPTION 'Insufficient deposit balance. Need ৳ %, have ৳ %.', v_cost, v_bal;
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

-- ============================================================
-- 9. subscribe_premium RPC — atomic premium activation
-- ============================================================
CREATE OR REPLACE FUNCTION public.subscribe_premium(p_uid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bal numeric(12,3);
  v_price numeric;
  v_days integer;
BEGIN
  IF p_uid IS NULL OR auth.uid() IS NULL OR p_uid <> auth.uid() THEN
    RAISE EXCEPTION 'You can only activate premium for your own account.';
  END IF;

  SELECT value::numeric INTO v_price FROM public.admin_settings WHERE key = 'premium_price';
  v_price := COALESCE(v_price, 500);
  SELECT value::integer INTO v_days FROM public.admin_settings WHERE key = 'premium_duration_days';
  v_days := COALESCE(v_days, 30);

  SELECT deposit_balance INTO v_bal FROM public.profiles WHERE id = p_uid FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Account not found.';
  END IF;
  IF v_bal < v_price THEN
    RAISE EXCEPTION 'Insufficient deposit balance. Need ৳ %, have ৳ %.', v_price, v_bal;
  END IF;

  UPDATE public.profiles
    SET deposit_balance = deposit_balance - v_price,
        is_premium = true,
        premium_expires_at = now() + make_interval(days => v_days),
        updated_at = now()
    WHERE id = p_uid;

  INSERT INTO public.transactions (user_id, type, amount, balance_type, description)
    VALUES (p_uid, 'premium_charge', v_price, 'deposit', 'Premium subscription activated');

  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.subscribe_premium(uuid) TO authenticated;

-- ============================================================
-- 10. create_ad RPC — atomic advertisement creation (deduct budget)
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_ad(
  p_uid uuid,
  p_title text,
  p_url text,
  p_image_url text DEFAULT '',
  p_budget numeric DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_bal numeric(12,3);
BEGIN
  IF p_uid IS NULL OR auth.uid() IS NULL OR p_uid <> auth.uid() THEN
    RAISE EXCEPTION 'You can only create ads for your own account.';
  END IF;
  IF p_budget IS NULL OR p_budget <= 0 THEN
    RAISE EXCEPTION 'Budget must be greater than zero.';
  END IF;

  SELECT deposit_balance INTO v_bal FROM public.profiles WHERE id = p_uid FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Account not found.';
  END IF;
  IF v_bal < p_budget THEN
    RAISE EXCEPTION 'Insufficient deposit balance. Need ৳ %, have ৳ %.', p_budget, v_bal;
  END IF;

  UPDATE public.profiles
    SET deposit_balance = deposit_balance - p_budget,
        updated_at = now()
    WHERE id = p_uid;

  INSERT INTO public.advertisements (user_id, title, url, image_url, budget, status)
    VALUES (p_uid, p_title, p_url, p_image_url, p_budget, 'pending')
    RETURNING id INTO v_id;

  INSERT INTO public.transactions (user_id, type, amount, balance_type, description, reference_id)
    VALUES (p_uid, 'ad_charge', p_budget, 'deposit', 'Advertisement created - ' || p_title, v_id);

  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_ad(uuid, text, text, text, numeric) TO authenticated;

NOTIFY pgrst, 'reload schema_cache';
