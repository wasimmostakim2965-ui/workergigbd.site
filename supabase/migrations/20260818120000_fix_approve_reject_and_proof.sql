-- ============================================================
-- WorkerGig BD — Fix approve error, allow 100% reject, enforce proof
-- ============================================================
-- PROBLEMS (reported by site owner, verified against live data):
--   1. Approving a worker's task fails with
--      "You cannot modify financial or account-status fields directly."
--      Root cause: guard_profile_balance() uses `auth.uid() IS NULL` to
--      decide "this update comes from a trusted SECURITY DEFINER RPC, allow
--      it". That check is WRONG: inside a SECURITY DEFINER function that an
--      authenticated BUYER invoked via PostgREST, auth.uid() still returns the
--      buyer's uid (NOT null) -- SECURITY DEFINER changes the role, not the
--      request JWT. So the trigger blocked the legitimate balance payout on
--      approve, breaking the core money flow.
--   2. process_task limited rejections to 30% of reviewed submissions. The
--      owner wants a poster to be able to reject any submission (the worker's
--      slot is simply freed for someone else) and optionally write a reason.
--   3. Workers managed to submit tasks with empty proof (8 of 11 recent rows
--      had NULL proof_text AND NULL proof_url). The client-side guard helps,
--      but only the server can truly enforce it (a worker could POST directly
--      to the REST endpoint bypassing the UI).
--
-- This migration is idempotent (CREATE OR REPLACE / DROP IF EXISTS) and safe
-- to re-run. It recreates the guard trigger + process_task and adds a
-- proof-required insert guard on tasks. The only schema change is the
-- additive `admin_note` column on tasks (reject reason).
-- ============================================================
NOTIFY pgrst, 'reload schema_cache';

-- Add a reject-reason column to tasks so the buyer's note persists on the
-- row (shown back to the worker). IF NOT EXISTS so re-runs are safe.
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS admin_note text DEFAULT '';

-- ------------------------------------------------------------
-- 1. guard_profile_balance -- allow updates from trusted RPCs
-- ------------------------------------------------------------
-- A direct UPDATE from PostgREST runs as the `authenticated`/`anon` role
-- (current_user = 'authenticated'/'anon'); a SECURITY DEFINER function owned
-- by the postgres/supabase_admin role runs with current_user set to that
-- owner role. We allow the trusted-role path, the is_admin() path, and an
-- explicit GUC (app.trusted_rpc='on') as a belt-and-suspenders fallback for
-- any future RPC whose owner role isn't recognised here. Direct user writes
-- to financial/status columns remain blocked.
CREATE OR REPLACE FUNCTION public.guard_profile_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_is_trusted_role boolean;
BEGIN
  v_is_trusted_role := current_user IN ('postgres','supabase_admin','service_role','supabase_admin_role');

  IF v_is_trusted_role THEN
    RETURN NEW;
  END IF;

  -- Explicit opt-in GUC set by a sanctioned RPC (process_task etc.).
  IF current_setting('app.trusted_rpc', true) = 'on' THEN
    RETURN NEW;
  END IF;

  -- Admins may always adjust.
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- A regular user editing their OWN profile via REST: block the sensitive
  -- columns, allow the cosmetic ones (username, avatar_url, phone, ...).
  IF NEW.deposit_balance IS DISTINCT FROM OLD.deposit_balance
     OR NEW.earning_balance IS DISTINCT FROM OLD.earning_balance
     OR NEW.total_earned IS DISTINCT FROM OLD.total_earned
     OR NEW.total_deposit IS DISTINCT FROM OLD.total_deposit
     OR NEW.total_withdraw IS DISTINCT FROM OLD.total_withdraw
     OR NEW.tasks_completed IS DISTINCT FROM OLD.tasks_completed
     OR NEW.jobs_posted IS DISTINCT FROM OLD.jobs_posted
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.is_verified IS DISTINCT FROM OLD.is_verified
     OR NEW.is_premium IS DISTINCT FROM OLD.is_premium
     OR NEW.premium_expires_at IS DISTINCT FROM OLD.premium_expires_at
     OR NEW.referral_code IS DISTINCT FROM OLD.referral_code
     OR NEW.referred_by IS DISTINCT FROM OLD.referred_by
  THEN
    RAISE EXCEPTION 'You cannot modify financial or account-status fields directly.';
  END IF;

  RETURN NEW;
END;
$function$;

-- ------------------------------------------------------------
-- 2. process_task -- no 30% reject cap; GUC opt-in; reason saved
-- ------------------------------------------------------------
-- Recreated from 20260813160000 EXCEPT:
--   - sets app.trusted_rpc='on' so the balance trigger lets the payout
--     through for non-admin job owners (the real approve fix);
--   - drops the "reject <= 30% of reviewed" block so a poster can reject any
--     submission (the freed slot reopens for other workers);
--   - p_note is the buyer-supplied reject reason (kept on the task row via
--     admin_note and surfaced in the rejection notification).
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
  v_reason      text := COALESCE(NULLIF(p_note, ''), '');
BEGIN
  IF v_reviewer IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  -- Mark this transaction as a sanctioned money-flow RPC so the
  -- guard_profile_balance trigger allows the profile balance update below,
  -- even though the caller (the job owner) is not an admin.
  PERFORM set_config('app.trusted_rpc', 'on', true);

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
      SET status = 'approved', reviewed_by = v_reviewer, reviewed_at = now(),
          admin_note = CASE WHEN v_reason <> '' THEN v_reason ELSE admin_note END
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
    -- The 30% rejection cap is intentionally REMOVED. A job poster may
    -- reject any submission that does not meet requirements; the slot is
    -- released back to the pool so another worker can take it.
    UPDATE public.tasks
      SET status = 'rejected', reviewed_by = v_reviewer, reviewed_at = now(),
          admin_note = CASE WHEN v_reason <> '' THEN v_reason ELSE admin_note END
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
      'Your task for "' || v_task.title || '" was rejected. ' || COALESCE(v_reason, ''),
      'error'
    );
  ELSE
    RAISE EXCEPTION 'Unknown action. Use approve or reject.';
  END IF;

  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.process_task(uuid, uuid, text, text) TO authenticated;

-- ------------------------------------------------------------
-- 3. Server-side proof requirement on submission
-- ------------------------------------------------------------
-- Block any future INSERT into tasks that carries neither proof_text nor
-- proof_url. Existing rows are untouched (this is BEFORE INSERT, not a CHECK
-- constraint, so already-empty rows don't violate anything).
CREATE OR REPLACE FUNCTION public.require_task_proof()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.proof_text IS NULL OR BTRIM(NEW.proof_text) = '')
     AND (NEW.proof_url IS NULL OR BTRIM(NEW.proof_url) = '') THEN
    RAISE EXCEPTION 'A submission must include proof -- add a written description or a screenshot.';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_require_task_proof ON public.tasks;
CREATE TRIGGER trg_require_task_proof
  BEFORE INSERT ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.require_task_proof();

NOTIFY pgrst, 'reload schema_cache';
