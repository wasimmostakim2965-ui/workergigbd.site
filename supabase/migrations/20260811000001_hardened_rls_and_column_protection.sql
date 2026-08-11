-- ============================================================
-- WorkerGig BD — Hardened RLS: column protection + policy tightening
-- ============================================================
-- This migration closes the privilege-escalation / money-manipulation holes
-- found in the audit. The React app exposes the Supabase anon key to the
-- browser, so RLS is the ONLY trust boundary. The previous policies were
-- row-level only (no column restriction), which let any authenticated user
-- set status='admin', earning_balance, is_verified, is_premium, etc. on their
-- own profile via a direct client update.
--
-- Approach: rather than rely on Postgres column GRANTs (brittle with the
-- PostgREST/anon role), enforce column protection with a SECURITY DEFINER
-- BEFORE UPDATE trigger that rejects changes to privileged columns unless the
-- caller is an admin. Users keep their existing UPDATE RLS for the safe,
-- non-privileged columns (username, full_name, avatar_url, phone). A BEFORE
-- INSERT trigger guards the same set on profile creation.
--
-- Idempotent. Safe to re-run.
-- ============================================================
NOTIFY pgrst, 'reload schema_cache';

-- ============================================================
-- 1. Profile column-protection functions
-- ============================================================
-- Privileged columns a user may NOT self-set. Only admins (is_admin) may
-- change them. status is overloaded as the role flag, so it is privileged.
CREATE OR REPLACE FUNCTION public.guard_profile_columns_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin boolean := public.is_admin();
BEGIN
  IF v_admin THEN
    RETURN NEW; -- admins may change anything
  END IF;

  -- A non-admin attempting to change any privileged column is rejected.
  IF NEW.status      IS DISTINCT FROM OLD.status
     OR NEW.earning_balance   IS DISTINCT FROM OLD.earning_balance
     OR NEW.deposit_balance   IS DISTINCT FROM OLD.deposit_balance
     OR NEW.is_verified       IS DISTINCT FROM OLD.is_verified
     OR NEW.is_premium        IS DISTINCT FROM OLD.is_premium
     OR NEW.premium_expires_at IS DISTINCT FROM OLD.premium_expires_at
     OR NEW.email_verified    IS DISTINCT FROM OLD.email_verified
     OR NEW.total_earned      IS DISTINCT FROM OLD.total_earned
     OR NEW.total_deposit     IS DISTINCT FROM OLD.total_deposit
     OR NEW.total_withdraw    IS DISTINCT FROM OLD.total_withdraw
     OR NEW.tasks_completed   IS DISTINCT FROM OLD.tasks_completed
     OR NEW.jobs_posted       IS DISTINCT FROM OLD.jobs_posted
     OR NEW.referral_code     IS DISTINCT FROM OLD.referral_code
     OR NEW.referred_by       IS DISTINCT FROM OLD.referred_by
  THEN
    RAISE EXCEPTION 'You are not allowed to modify protected profile fields.';
  END IF;

  RETURN NEW;
END;
$$;

-- On INSERT (self-service profile creation / self-heal), a non-admin may only
-- set the safe fields. Privileged columns must keep their defaults.
CREATE OR REPLACE FUNCTION public.guard_profile_columns_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;
  -- Force every privileged column to its declared default for non-admins.
  NEW.status             := 'active';
  NEW.earning_balance    := 0;
  NEW.deposit_balance    := 0;
  NEW.is_verified        := false;
  NEW.is_premium         := false;
  NEW.premium_expires_at := NULL;
  NEW.email_verified     := false;
  NEW.total_earned       := 0;
  NEW.total_deposit      := 0;
  NEW.total_withdraw     := 0;
  NEW.tasks_completed    := 0;
  NEW.jobs_posted        := 0;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_profile_update ON public.profiles;
CREATE TRIGGER trg_guard_profile_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_columns_update();

DROP TRIGGER IF EXISTS trg_guard_profile_insert ON public.profiles;
CREATE TRIGGER trg_guard_profile_insert
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_columns_insert();

-- ============================================================
-- 2. Tighten tasks RLS
-- ============================================================
-- Workers may only INSERT a task for themselves in a non-terminal status
-- (pending/submitted). They may not forge status='approved'/'rejected' and
-- may not set reviewed_by/reviewed_at.
DROP POLICY IF EXISTS tasks_insert_own ON public.tasks;
CREATE POLICY tasks_insert_own ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = worker_id
    AND status IN ('pending', 'submitted')
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
  );

-- Workers may only UPDATE the proof fields of their own task (and only while
-- it is still editable). Owners/admins keep broader access but cannot pay
-- themselves — payouts only happen via the process_task admin RPC.
DROP POLICY IF EXISTS tasks_update_owner ON public.tasks;
CREATE POLICY tasks_update_owner ON public.tasks
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = worker_id
    OR auth.uid() = (SELECT j.user_id FROM public.jobs j WHERE j.id = job_id)
    OR public.is_admin()
  )
  WITH CHECK (
    auth.uid() = worker_id
    OR auth.uid() = (SELECT j.user_id FROM public.jobs j WHERE j.id = job_id)
    OR public.is_admin()
  );

-- Block non-admins from changing task status / review columns directly. The
-- legitimate path (status flips on approve/reject) goes through process_task,
-- which runs as SECURITY DEFINER (bypassing RLS) so it can update status.
CREATE OR REPLACE FUNCTION public.guard_task_columns_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;
  -- A non-admin (worker or job owner) may edit proof_url/proof_text and
  -- submitted_at only. Touching status/reviewed_* is forbidden.
  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by
     OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
  THEN
    RAISE EXCEPTION 'You may not change task status or review fields.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_task_update ON public.tasks;
CREATE TRIGGER trg_guard_task_update
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.guard_task_columns_update();

-- ============================================================
-- 3. Tighten jobs RLS — owner may only edit non-financial fields
-- ============================================================
-- The owner may update descriptive/status fields of their own job, but NOT
-- reward_per_worker, total_slots, filled_slots (money-critical). Changing
-- those lets an owner inflate the reward after workers accept and then have
-- the (admin-gated) process_task pay the inflated amount.
CREATE OR REPLACE FUNCTION public.guard_job_columns_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;
  IF NEW.reward_per_worker IS DISTINCT FROM OLD.reward_per_worker
     OR NEW.total_slots    IS DISTINCT FROM OLD.total_slots
     OR NEW.filled_slots   IS DISTINCT FROM OLD.filled_slots
  THEN
    RAISE EXCEPTION 'You may not change job reward or slot fields.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_job_update ON public.jobs;
CREATE TRIGGER trg_guard_job_update
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.guard_job_columns_update();

-- ============================================================
-- 4. Tighten advertisements RLS — owner may NOT self-activate or reset spend
-- ============================================================
-- create_ad deducts the budget and inserts status='pending' (admin must
-- activate). Without this guard the owner could .update({status:'active',
-- spent:0}) to run forever for free. Owner may only pause/resume an ad that
-- is already active/approved.
CREATE OR REPLACE FUNCTION public.guard_ad_columns_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;
  -- Non-admin may not touch money/spend columns.
  IF NEW.spent IS DISTINCT FROM OLD.spent
     OR NEW.budget IS DISTINCT FROM OLD.budget
     OR NEW.clicks IS DISTINCT FROM OLD.clicks
     OR NEW.impressions IS DISTINCT FROM OLD.impressions
  THEN
    RAISE EXCEPTION 'You may not change ad budget or counters.';
  END IF;
  -- Non-admin may only toggle between 'active' and 'paused' once the ad has
  -- been approved. They cannot set it back to 'pending'/'active' from
  -- 'pending'/'rejected' (that requires admin).
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (
      (OLD.status IN ('active','paused') AND NEW.status IN ('active','paused'))
    ) THEN
      RAISE EXCEPTION 'Only an admin may approve or reject an advertisement.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_ad_update ON public.advertisements;
CREATE TRIGGER trg_guard_ad_update
  BEFORE UPDATE ON public.advertisements
  FOR EACH ROW EXECUTE FUNCTION public.guard_ad_columns_update();

-- ============================================================
-- 5. transactions — restrict INSERT so users cannot forge their own ledger
-- ============================================================
-- Previously any user could INSERT a fake deposit/earning ledger row for
-- themselves. Now only admins may INSERT (all real ledger writes happen in
-- SECURITY DEFINER RPCs, which bypass RLS, so they still work).
DROP POLICY IF EXISTS transactions_insert_own ON public.transactions;
CREATE POLICY transactions_insert_own ON public.transactions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

-- ============================================================
-- 6. ticket_messages — scope INSERT to ticket participants
-- ============================================================
-- Prevents any user from injecting messages into another user's ticket or
-- forging is_admin_reply. Mirrors the chat_messages participant check.
DROP POLICY IF EXISTS ticket_messages_insert_related ON public.ticket_messages;
CREATE POLICY ticket_messages_insert_related ON public.ticket_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_id
        AND (t.user_id = auth.uid() OR public.is_admin())
    )
    AND (is_admin_reply = public.is_admin())
  );

-- ============================================================
-- 7. verification_requests — migrate RLS from recursion-prone self-reference
--    to public.is_admin()
-- ============================================================
DROP POLICY IF EXISTS verification_admin_select ON public.verification_requests;
CREATE POLICY verification_admin_select ON public.verification_requests
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS verification_admin_update ON public.verification_requests;
CREATE POLICY verification_admin_update ON public.verification_requests
  FOR UPDATE TO authenticated USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Keep the user-scoped policies explicit (idempotent re-create).
DROP POLICY IF EXISTS verification_insert_own ON public.verification_requests;
CREATE POLICY verification_insert_own ON public.verification_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS verification_select_own ON public.verification_requests;
CREATE POLICY verification_select_own ON public.verification_requests
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- 8. notifications realtime — add to publication so the live list works
-- ============================================================
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.deposit_requests;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.withdrawal_requests;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

NOTIFY pgrst, 'reload schema_cache';
