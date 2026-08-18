-- ============================================================
-- WorkerGig BD — Add the 5 admin helper RPCs that never reached live
-- ============================================================
-- Root cause of the verification "red error": the live DB was missing
-- set_user_verified / set_user_status / set_user_premium / is_premium_active
-- / adjust_user_balance because migration 20260811000003 (which defines them)
-- was never applied to production. process_task / process_deposit / post_job
-- / tip_worker / hold_job / resume_job / delete_job DO exist (older versions),
-- so this migration intentionally ONLY adds the missing helper functions and
-- does NOT touch the money-flow RPCs — keeping the working behaviour intact.
--
-- All five use CREATE OR REPLACE + GRANT and are idempotent. Safe to re-run.
-- They depend on public.is_admin() (already present on live).
-- ============================================================
NOTIFY pgrst, 'reload schema_cache';

-- is_premium_active(uid) — boolean premium check incl. expiry
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

-- adjust_user_balance — admin edits balance by DELTA atomically
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

-- set_user_premium — admin grants/extends premium (no charge)
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
  END IF;

  SELECT premium_expires_at INTO v_cur FROM public.profiles WHERE id = p_user_uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target user not found.';
  END IF;

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

-- set_user_status — admin changes a user's status (never the admin role)
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

-- set_user_verified — admin toggles the KYC verified flag
-- (This is the one AdminVerificationsPage calls on approval; its absence
--  caused the red "marking user verified failed" error.)
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

NOTIFY pgrst, 'reload schema_cache';
