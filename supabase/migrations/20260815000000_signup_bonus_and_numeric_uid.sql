/*
# Sign-up bonus (first 100 users) + numeric 8-digit referral UID

## Overview
Two requested changes to the `handle_new_user()` trigger:

1. SIGN-UP BONUS — first 100 users get ৳10 automatically added to their
   `deposit_balance` at signup, with a matching `transactions` ledger row.
   Users after #100 get no bonus. "First" is determined by the current
   profile count at the moment of insert (<=100 means this user qualifies).

2. NUMERIC 8-DIGIT REFERRAL UID — the referral code is now
   'WG' + an 8-digit numeric string (digits 0-9 only), generated randomly
   with a uniqueness-retry loop. Keeps the existing 'WG' prefix so current
   SignupPage placeholder (WGXXXXXXXX) and any already-typed referral codes
   remain compatible.

## Safety
- Fully idempotent: CREATE OR REPLACE FUNCTION + DROP/CREATE TRIGGER.
- No table schema changes — only the trigger function body changes.
- deposit_balance / transactions updates use SECURITY DEFINER so the bonus
  works even though the brand-new user cannot yet write those rows via RLS.
- Bonus is skipped silently for users beyond #100 (no error, no row).
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing  integer;
  v_bonus     numeric(12,3) := 10;   -- ৳10 sign-up bonus for the first 100 users
  v_referred  text;
  v_code      text;
  v_digits    text;
BEGIN
  v_referred := NEW.raw_user_meta_data->>'referred_by';

  -- Generate a UNIQUE 8-digit numeric referral code (digits 0-9 only).
  -- 'WG' prefix is kept so existing referral entries / SignupPage
  -- placeholder (WGXXXXXXXX) keep working. Only the part after 'WG'
  -- changes from hex UUID chars to pure digits.
  v_digits := '';
  FOR i IN 1..8 LOOP
    v_digits := v_digits || floor(random() * 10)::int::text;
  END LOOP;
  v_code := 'WG' || v_digits;

  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = v_code) LOOP
    v_digits := '';
    FOR i IN 1..8 LOOP
      v_digits := v_digits || floor(random() * 10)::int::text;
    END LOOP;
    v_code := 'WG' || v_digits;
  END LOOP;

  INSERT INTO public.profiles (id, username, referral_code, referred_by, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    v_code,
    v_referred,
    'active'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    username      = COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    referral_code = COALESCE(public.profiles.referral_code, v_code),
    updated_at    = now();

  -- Early-bird welcome bonus for the first 100 users only. Counting existing
  -- profiles here (BEFORE this row would be counted) gives the registrant's
  -- position; if they are among the first 100, credit the ৳10 bonus.
  SELECT count(*) INTO v_existing FROM public.profiles WHERE id <> NEW.id;
  IF v_existing < 100 THEN
    UPDATE public.profiles
      SET deposit_balance = deposit_balance + v_bonus,
          total_deposit   = total_deposit   + v_bonus,
          updated_at      = now()
      WHERE id = NEW.id;
    INSERT INTO public.transactions (user_id, type, amount, balance_type, description, reference_id)
      VALUES (NEW.id, 'deposit', v_bonus, 'deposit',
              'Welcome bonus — early bird (৳10)', NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
