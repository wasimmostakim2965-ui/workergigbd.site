-- WorkerGig BD — notifications, auto-approve, job hold/delete, chat notifications
-- Addresses: missing notifications, 7-day auto-approve, job hold/delete with auto-approve,
--            report→admin notification, withdrawal→admin notification, chat→notification

-- ============================================================================
-- 1. Helper: notify all admins
-- ============================================================================
CREATE OR REPLACE FUNCTION public.notify_admins(n_title text, n_message text, n_type text DEFAULT 'info')
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  INSERT INTO public.notifications (user_id, title, message, type)
  SELECT id, n_title, n_message, n_type FROM public.profiles
  WHERE status = 'admin';
$$;

-- ============================================================================
-- 2. create_report — now also notifies admins
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_report(p_task_id uuid DEFAULT NULL::uuid, p_job_id uuid DEFAULT NULL::uuid, p_reason text DEFAULT ''::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_id uuid;
  v_reporter uuid := auth.uid();
  v_reported_uid uuid;
  v_job_title text;
BEGIN
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'A reason is required to file a report.';
  END IF;
  IF p_task_id IS NULL AND p_job_id IS NULL THEN
    RAISE EXCEPTION 'A task or job must be referenced.';
  END IF;

  INSERT INTO public.reports (reporter_id, task_id, job_id, reason)
    VALUES (v_reporter, p_task_id, p_job_id, p_reason)
    RETURNING id INTO v_id;

  -- Resolve target info for the notification message
  SELECT j.title, j.user_id INTO v_job_title, v_reported_uid
    FROM public.jobs j WHERE j.id = p_job_id;
  IF v_job_title IS NULL AND p_task_id IS NOT NULL THEN
    SELECT j.title, j.user_id INTO v_job_title, v_reported_uid
      FROM public.tasks t JOIN public.jobs j ON j.id = t.job_id
      WHERE t.id = p_task_id;
  END IF;

  -- Notify all admins
  PERFORM public.notify_admins(
    'New Report Filed',
    'A report was filed by a user' ||
      CASE WHEN v_job_title IS NOT NULL THEN ' regarding "' || v_job_title || '"' ELSE '' END ||
      '. Review it in the admin reports panel.',
    'warning'
  );

  RETURN v_id;
END;
$function$;

-- ============================================================================
-- 3. request_withdrawal — now also notifies admins
-- ============================================================================
CREATE OR REPLACE FUNCTION public.request_withdrawal(p_uid uuid, p_amount numeric, p_method text DEFAULT 'bkash'::text, p_account text DEFAULT ''::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_id uuid;
  v_bal numeric(12,3);
  v_min numeric;
BEGIN
  IF p_uid IS NULL OR auth.uid() IS NULL OR p_uid <> auth.uid() THEN
    RAISE EXCEPTION 'You can only request a withdrawal for your own account.';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid withdrawal amount.';
  END IF;

  SELECT value INTO v_min FROM public.admin_settings WHERE key = 'min_withdrawal';
  v_min := COALESCE(v_min::numeric, 500);
  IF p_amount < v_min THEN
    RAISE EXCEPTION 'Minimum withdrawal amount is %.', v_min;
  END IF;

  SELECT earning_balance INTO v_bal
    FROM public.profiles
    WHERE id = p_uid
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Account not found.';
  END IF;

  IF v_bal < p_amount THEN
    RAISE EXCEPTION 'Insufficient earning balance. Available: %', v_bal;
  END IF;

  UPDATE public.profiles
    SET earning_balance = earning_balance - p_amount,
        updated_at = now()
    WHERE id = p_uid;

  INSERT INTO public.withdrawal_requests (user_id, amount, method, account_number, status)
    VALUES (p_uid, p_amount, p_method, p_account, 'pending')
    RETURNING id INTO v_id;

  INSERT INTO public.transactions (user_id, type, amount, balance_type, description, reference_id)
    VALUES (p_uid, 'withdrawal', p_amount, 'earning',
            'Withdrawal request (held) - ' || p_method, v_id);

  -- Notify all admins
  PERFORM public.notify_admins(
    'New Withdrawal Request',
    'A withdrawal request for $ ' || p_amount || ' via ' || p_method || ' is pending review.',
    'info'
  );

  RETURN v_id;
END;
$function$;

-- ============================================================================
-- 4. delete_job — now auto-approves submitted tasks before refunding the rest
-- ============================================================================
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

  -- Auto-approve all SUBMITTED tasks (pay the workers)
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

    PERFORM public.notify_user(
      v_task.worker_id,
      'Task Approved!',
      'Your task for "' || v_job.title || '" has been approved. $ ' || v_reward || ' credited to your earning balance.',
      'success'
    );
  END LOOP;

  -- Cancel pending (not-yet-submitted) tasks and notify
  FOR v_worker IN
    SELECT DISTINCT worker_id FROM public.tasks
      WHERE job_id = p_job_id AND status = 'pending'
  LOOP
    PERFORM public.notify_user(
      v_worker,
      'Task Cancelled',
      'The job "' || v_job.title || '" was removed, so your in-progress task was cancelled.',
      'warning'
    );
  END LOOP;

  -- Refund the unspent prepaid amount for unfilled slots (slots that never
  -- had a submitted task). The auto-approved tasks above are already paid
  -- from the job budget, so we only refund truly unfilled slots.
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

-- ============================================================================
-- 5. hold_job / resume_job — pause and resume a job
-- ============================================================================
CREATE OR REPLACE FUNCTION public.hold_job(p_job_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_owner uuid;
BEGIN
  SELECT user_id INTO v_owner FROM public.jobs WHERE id = p_job_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job not found.';
  END IF;
  IF v_owner <> auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'You can only hold your own jobs.';
  END IF;
  UPDATE public.jobs SET status = 'paused', updated_at = now() WHERE id = p_job_id;
  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.resume_job(p_job_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_owner uuid;
  v_status text;
BEGIN
  SELECT user_id, status INTO v_owner, v_status FROM public.jobs WHERE id = p_job_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job not found.';
  END IF;
  IF v_owner <> auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'You can only resume your own jobs.';
  END IF;
  IF v_status <> 'paused' THEN
    RAISE EXCEPTION 'Only paused jobs can be resumed.';
  END IF;
  UPDATE public.jobs SET status = 'active', updated_at = now() WHERE id = p_job_id;
  RETURN true;
END;
$function$;

-- ============================================================================
-- 6. Auto-approve tasks older than 7 days (via pg_cron)
-- ============================================================================
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

    PERFORM public.notify_user(
      v_task.worker_id,
      'Task Auto-Approved',
      'Your task for "' || v_task.title || '" was auto-approved after ' || v_days || ' days. $ ' || v_reward || ' credited to your earning balance.',
      'success'
    );
  END LOOP;
END;
$function$;

-- Schedule the auto-approve to run hourly (pg_cron)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule('auto-approve-stale-tasks');
    EXCEPTION WHEN OTHERS THEN
      NULL; -- job doesn't exist yet
    END;
    PERFORM cron.schedule('auto-approve-stale-tasks', '0 * * * *', 'SELECT public.auto_approve_stale_tasks()');
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

-- ============================================================================
-- 7. Chat message notification trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION public.notify_chat_participant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_recipient uuid;
  v_sender_name text;
  v_message_preview text;
  v_conv_user_id uuid;
BEGIN
  v_message_preview := left(NEW.message, 80);

  IF TG_TABLE_NAME = 'chat_messages' THEN
    -- Find the conversation owner (the user who started the chat)
    SELECT user_id INTO v_conv_user_id FROM public.conversations WHERE id = NEW.conversation_id;
    IF NEW.is_admin_reply = true THEN
      -- Admin sent → notify the conversation user
      v_recipient := v_conv_user_id;
      v_sender_name := 'Support';
    ELSE
      -- User sent → notify all admins
      SELECT username INTO v_sender_name FROM public.profiles WHERE id = NEW.sender_id;
      PERFORM public.notify_admins(
        'New Live Chat Message',
        COALESCE(v_sender_name, 'User') || ': ' || v_message_preview,
        'info'
      );
      RETURN NEW;
    END IF;
  ELSIF TG_TABLE_NAME = 'ticket_messages' THEN
    SELECT user_id INTO v_recipient FROM public.tickets WHERE id = NEW.ticket_id;
    -- Determine if sender is the user or admin
    IF NEW.sender_id = v_recipient THEN
      -- User sent → notify admins
      SELECT username INTO v_sender_name FROM public.profiles WHERE id = NEW.sender_id;
      PERFORM public.notify_admins(
        'New Support Ticket Message',
        COALESCE(v_sender_name, 'User') || ': ' || v_message_preview,
        'info'
      );
      RETURN NEW;
    ELSE
      -- Admin sent → notify the ticket user
      v_sender_name := 'Support';
    END IF;
  END IF;

  IF v_recipient IS NOT NULL THEN
    PERFORM public.notify_user(
      v_recipient,
      'New Message',
      COALESCE(v_sender_name, 'Support') || ': ' || v_message_preview,
      'info'
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Drop and recreate triggers for chat messages
DROP TRIGGER IF EXISTS trg_notify_chat_message ON public.chat_messages;
CREATE TRIGGER trg_notify_chat_message
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_chat_participant();

DROP TRIGGER IF EXISTS trg_notify_ticket_message ON public.ticket_messages;
CREATE TRIGGER trg_notify_ticket_message
  AFTER INSERT ON public.ticket_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_chat_participant();
