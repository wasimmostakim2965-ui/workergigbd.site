-- ============================================================
-- WorkerGig BD — Currency model: dollar-scale minima
-- ============================================================
-- The app stores all monetary amounts in DOLLAR scale (small decimals:
-- rewards 0.020, screenshot fee 0.050, balances 1.000). Conceptually
-- $1 = 100 BDT (withdraw) / 110 BDT (deposit, the 10 BDT margin is the
-- platform spread). The previous seed used taka-scale minima
-- (min_deposit=100, min_withdrawal=500) which was inconsistent with the
-- dollar-scale rewards and made a $1 minimum impossible to express.
-- This corrects them to 1 ($1).
--
-- Idempotent. Safe to re-run.
-- ============================================================

INSERT INTO public.admin_settings (key, value, category, description, is_boolean)
VALUES
  ('min_deposit', '1', 'limits', 'Minimum deposit in dollars (1 = $1)', false),
  ('min_withdrawal', '1', 'limits', 'Minimum withdrawal in dollars (1 = $1)', false)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  is_boolean = EXCLUDED.is_boolean;

