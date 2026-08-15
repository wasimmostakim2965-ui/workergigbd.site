-- WorkerGig BD — Security: prevent balance forgery via direct profile updates
--
-- PROBLEM: profiles_update_own RLS policy lets a user UPDATE their own row
-- with ANY columns, including deposit_balance, earning_balance, total_earned,
-- tasks_completed, etc. A malicious user could set earning_balance = 999999
-- via a direct supabase.from('profiles').update() call.
--
-- FIX: Add a trigger that rejects updates to financial/sensitive columns
-- unless the caller is an admin or the update comes from a SECURITY DEFINER
-- function (which runs as the function owner, bypassing this check via
-- session_user detection). Non-financial columns (username, avatar_url,
-- phone, full_name, etc.) remain freely updatable by the user.

CREATE OR REPLACE FUNCTION public.guard_profile_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
BEGIN
  -- If there is no authenticated caller (invocation comes from a SECURITY
  -- DEFINER function like process_task / process_deposit), allow the update.
  -- Those functions are the ONLY sanctioned way to change balances.
  IF v_caller IS NULL THEN
    RETURN NEW;
  END IF;

  -- Allow if the authenticated caller is an admin
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- Block changes to financial / sensitive columns by regular users
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

DROP TRIGGER IF EXISTS trg_guard_profile_balance ON public.profiles;
CREATE TRIGGER trg_guard_profile_balance
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_balance();
