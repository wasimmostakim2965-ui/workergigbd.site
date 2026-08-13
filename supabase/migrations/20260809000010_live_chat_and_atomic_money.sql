-- ============================================================
-- WorkerGig BD — Live chat, atomic money RPCs, search helpers, gaps
-- ============================================================
-- Safe to re-run (idempotent). Adds:
--   1. Live chat tables (chat_conversations, chat_messages) + RLS.
--   2. Atomic SECURITY DEFINER RPCs so money can NEVER be double-spent:
--        request_withdrawal(p_uid, p_amount, p_method, p_account)
--        process_deposit(p_deposit_id, p_admin_uid, p_action, p_note)
--        process_withdrawal_request(p_wd_id, p_admin_uid, p_action, p_note)
--   3. email_otps table (missing from setup.sql — gap fix).
--   4. Widen notifications SELECT so admins can read users' notifications.
--   5. Admin user-search helper function (by phone / email / referral_code / id).
-- ============================================================

NOTIFY pgrst, 'reload schema_cache';

-- ============================================================
-- 1. LIVE CHAT TABLES
-- ============================================================
-- A user has ONE conversation with support/admin. Admins see every
-- conversation in their panel and can click into it to chat in realtime.

CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'open',         -- open / closed
  user_unread_count integer NOT NULL DEFAULT 0,
  admin_unread_count integer NOT NULL DEFAULT 0,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  last_message text DEFAULT '',
  last_sender_is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_conv_user ON public.chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_conv_status ON public.chat_conversations(status);
CREATE INDEX IF NOT EXISTS idx_chat_conv_lastmsg ON public.chat_conversations(last_message_at DESC);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  is_admin_reply boolean NOT NULL DEFAULT false,
  read_at timestamptz,                          -- NULL = unread
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_msg_conv ON public.chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_msg_conv_created ON public.chat_messages(conversation_id, created_at);

ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- conversations: owner sees own; admin sees all
DROP POLICY IF EXISTS chat_conv_select_own ON public.chat_conversations;
CREATE POLICY chat_conv_select_own ON public.chat_conversations
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS chat_conv_insert_own ON public.chat_conversations;
CREATE POLICY chat_conv_insert_own ON public.chat_conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS chat_conv_update_own ON public.chat_conversations;
CREATE POLICY chat_conv_update_own ON public.chat_conversations
  FOR UPDATE USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- messages: participants + admin
DROP POLICY IF EXISTS chat_msg_select_related ON public.chat_messages;
CREATE POLICY chat_msg_select_related ON public.chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.chat_conversations c
      WHERE c.id = chat_messages.conversation_id
        AND (c.user_id = auth.uid() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS chat_msg_insert_related ON public.chat_messages;
CREATE POLICY chat_msg_insert_related ON public.chat_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.chat_conversations c
      WHERE c.id = chat_messages.conversation_id
        AND (c.user_id = auth.uid() OR public.is_admin())
    )
  );

-- ============================================================
-- 2. ATOMIC RPC: request_withdrawal
--    Locks the row + deducts earning_balance INSIDE the transaction so
--    two concurrent withdrawals can never drain more than the balance.
--    The withdrawal_requests row is created with status 'pending' and a
--    matching 'holding' ledger transaction is written. On admin approval
--    the holding -> spent; on rejection the amount is refunded.
-- ============================================================
CREATE OR REPLACE FUNCTION public.request_withdrawal(
  p_uid uuid,
  p_amount numeric,
  p_method text DEFAULT 'bkash',
  p_account text DEFAULT ''
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Lock the profile row so concurrent calls serialize on it.
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

  -- Deduct immediately (held until admin decides).
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

  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(uuid, numeric, text, text) TO authenticated;

-- ============================================================
-- 3. ATOMIC RPC: process_withdrawal_request
--    Admin approves or rejects a pending withdrawal. Approve keeps the
--    deduction + writes total_withdraw + marks spent. Reject refunds.
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
          reviewed_by = p_admin_uid, reviewed_at = now()
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
    -- Refund the held amount.
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
-- 4. ATOMIC RPC: process_deposit
--    Admin approves or rejects a pending deposit. Approve credits
--    deposit_balance + total_deposit + referral bonus (first deposit).
--    Re-approval is prevented (status guard).
-- ============================================================
CREATE OR REPLACE FUNCTION public.process_deposit(
  p_deposit_id uuid,
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
  v_referrer_id uuid;
  v_bonus numeric;
  v_ref_enabled boolean;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin only.';
  END IF;

  SELECT * INTO v_req FROM public.deposit_requests WHERE id = p_deposit_id FOR UPDATE;
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

    IF v_ref_enabled AND v_req.referred_by IS NOT NULL AND v_req.referred_by <> '' AND v_req.total_deposit = 0 THEN
      SELECT id INTO v_referrer_id FROM public.profiles WHERE referral_code = v_req.referred_by LIMIT 1;
      IF v_referrer_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM public.referrals WHERE referred_id = v_req.user_id) THEN
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
          reviewed_by = p_admin_uid, reviewed_at = now()
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
-- 5. email_otps table (gap fix — exists in migrations, missing from setup.sql)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.email_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_otps_user_id ON public.email_otps(user_id);

ALTER TABLE public.email_otps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS email_otps_select_own ON public.email_otps;
CREATE POLICY email_otps_select_own ON public.email_otps
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS email_otps_insert_own ON public.email_otps;
CREATE POLICY email_otps_insert_own ON public.email_otps
  FOR INSERT WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS email_otps_update_own ON public.email_otps;
CREATE POLICY email_otps_update_own ON public.email_otps
  FOR UPDATE USING (auth.uid() = user_id OR public.is_admin());

-- ============================================================
-- 6. Widen notifications SELECT so admins can read user notifications
-- ============================================================
DROP POLICY IF EXISTS notifications_select_own ON public.notifications;
CREATE POLICY notifications_select_own ON public.notifications
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

-- ============================================================
-- 7. Admin user-search helper (by phone / username / full_name /
--    referral_code / email-from-auth / id). Returns profiles.
--    Search term is matched case-insensitively across all fields.
-- ============================================================
CREATE OR REPLACE FUNCTION public.search_users(p_term text)
RETURNS SETOF public.profiles
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.*
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  WHERE public.is_admin()
    AND p.status <> 'admin'
    AND (
      p.username ILIKE '%' || p_term || '%'
      OR p.full_name ILIKE '%' || p_term || '%'
      OR p.phone ILIKE '%' || p_term || '%'
      OR p.referral_code ILIKE '%' || p_term || '%'
      OR CAST(p.id AS text) ILIKE '%' || p_term || '%'
      OR u.email ILIKE '%' || p_term || '%'
    )
  ORDER BY p.created_at DESC
  LIMIT 50;
$$;
GRANT EXECUTE ON FUNCTION public.search_users(text) TO authenticated;

-- ============================================================
-- 8. Convenience: get-or-create a chat conversation for the current user
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_or_create_chat_conversation()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated.';
  END IF;

  SELECT id INTO v_id FROM public.chat_conversations WHERE user_id = auth.uid();
  IF v_id IS NULL THEN
    INSERT INTO public.chat_conversations (user_id) VALUES (auth.uid()) RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_or_create_chat_conversation() TO authenticated;

NOTIFY pgrst, 'reload schema_cache';
