-- ============================================================
-- WorkerGig BD — Currency model: dollar-scale storage + rates
-- ============================================================
-- The app stores all monetary amounts in DOLLAR scale (small decimals:
-- rewards 0.020, screenshot fee 0.050, balances 1.000). Conceptually
-- $1 = 100 BDT. The previous seed used taka-scale minima (min_deposit=100,
-- min_withdrawal=500) which was inconsistent with the dollar-scale rewards
-- and made a $1 minimum impossible to express. This corrects them to 1 ($1).
--
-- Withdrawal commission: the platform keeps 10% (the user receives 90% of
-- every withdrawal; $1 withdrawn = 90 BDT sent, 10 BDT commission). The
-- commission rate is configurable via admin_settings.
--
-- Idempotent. Safe to re-run.
-- ============================================================

-- Correct the minima to dollar scale ($1 each).
INSERT INTO public.admin_settings (key, value, category, description, is_boolean)
VALUES
  ('min_deposit', '1', 'limits', 'Minimum deposit in dollars ($1 = 100 BDT)', false),
  ('min_withdrawal', '1', 'limits', 'Minimum withdrawal in dollars ($1 = 90 BDT after 10% commission)', false)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  is_boolean = EXCLUDED.is_boolean;

-- Configurable commission rate (fraction). Default 0.10 = 10%.
INSERT INTO public.admin_settings (key, value, category, description, is_boolean)
VALUES ('withdrawal_commission_rate', '0.10', 'limits', 'Platform commission fraction on each withdrawal (0.10 = 10%)', false)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  is_boolean = EXCLUDED.is_boolean;

-- ============================================================
-- Rewrite process_withdrawal_request to apply the commission on approval.
-- At request time the FULL amount was already deducted from earning_balance
-- (held). On approval: the user "receives" 90% (net), 10% is recorded as
-- platform commission income, and total_withdraw tracks the NET received.
-- On rejection the full held amount is refunded (unchanged).
-- ============================================================
CREATE OR REPLACE FUNCTION public.process_withdrawal_request(
  p_wd_id uuid,
  p_admin_uid uuid,
  p_action text,        -- 'approve' | 'reject'
  p_note text DEFAULT ''
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req RECORD;
  v_rate numeric;
  v_commission numeric;
  v_net numeric;
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

  -- Commission rate from settings (default 10%).
  SELECT value INTO v_rate FROM public.admin_settings WHERE key = 'withdrawal_commission_rate';
  v_rate := COALESCE(NULLIF(v_rate, '')::numeric, 0.10);
  IF v_rate IS NULL OR v_rate < 0 OR v_rate > 1 THEN
    v_rate := 0.10;
  END IF;
  v_commission := ROUND((v_req.amount * v_rate)::numeric, 3);
  v_net := v_req.amount - v_commission;

  IF p_action = 'approve' THEN
    UPDATE public.withdrawal_requests
      SET status = 'approved', admin_note = p_note,
          reviewed_by = p_admin_uid, reviewed_at = now()
      WHERE id = p_wd_id;

    -- total_withdraw reflects what the user actually received (net of commission).
    UPDATE public.profiles
      SET total_withdraw = total_withdraw + v_net, updated_at = now()
      WHERE id = v_req.user_id;

    -- Record the platform commission as income on the user's ledger.
    IF v_commission > 0 THEN
      INSERT INTO public.transactions (user_id, type, amount, balance_type, description, reference_id)
        VALUES (v_req.user_id, 'commission', v_commission, 'earning',
                'Withdrawal commission (' || (v_rate * 100)::text || '%)', v_req.id);
    END IF;

    PERFORM public.notify_user(
      v_req.user_id,
      'Withdrawal Approved!',
      'Your withdrawal of ৳ ' || v_net || ' has been approved and sent to your ' || v_req.method || ' account. (10% commission: ৳ ' || v_commission || ')',
      'success'
    );
  ELSIF p_action = 'reject' THEN
    -- Refund the full held amount (no commission on a rejected request).
    UPDATE public.profiles
      SET earning_balance = earning_balance + v_req.amount, updated_at = now()
      WHERE id = v_req.user_id;

    UPDATE public.withdrawal_requests
      SET status = 'rejected', admin_note = p_note,
          reviewed_by = p_admin_uid, reviewed_at = now()
      WHERE id = p_wd_id;

    INSERT INTO public.transactions (user_id, type, amount, balance_type, description, reference_id)
      VALUES (v_req.user_id, 'earning', v_req.amount, 'earning',
              'Withdrawal rejected - amount refunded', v_req.id);

    PERFORM public.notify_user(
      v_req.user_id,
      'Withdrawal Rejected',
      'Your withdrawal request of ৳ ' || v_req.amount || ' was rejected. ' || COALESCE(p_note, ''),
      'error'
    );
  ELSE
    RAISE EXCEPTION 'Unknown action. Use approve or reject.';
  END IF;

  RETURN true;
END;
$$;
-- Preserve the existing grant (CREATE OR REPLACE keeps grants, but be explicit).
GRANT EXECUTE ON FUNCTION public.process_withdrawal_request(uuid, uuid, text, text) TO authenticated;
