/*
# Fix RLS infinite recursion on profiles table

## Problem
The `profiles_select_own` policy queries the `profiles` table itself to check admin status:
`EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.status = 'admin')`
This causes infinite recursion because reading profiles triggers RLS, which reads profiles again.

## Solution
1. Create a SECURITY DEFINER function `is_admin()` that checks admin status BYPASSING RLS.
2. Replace all policies that self-reference `profiles` with calls to `is_admin()`.
3. This breaks the recursion cycle while keeping the same security logic.

## Tables Modified
- profiles (policies rewritten)
- jobs (policies rewritten)
- tasks (policies rewritten)
- deposit_requests (policies rewritten)
- withdrawal_requests (policies rewritten)
- transactions (policies rewritten)
- notifications (no change needed)
- tickets (policies rewritten)
- ticket_messages (policies rewritten)
- advertisements (policies rewritten)
- admin_settings (policies rewritten)
- categories (policies rewritten)
- referrals (policies rewritten)
*/

-- ==================== HELPER FUNCTION ====================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND status = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ==================== PROFILES ====================
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT
  TO authenticated USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- ==================== JOBS ====================
DROP POLICY IF EXISTS "jobs_select_all" ON public.jobs;
CREATE POLICY "jobs_select_all" ON public.jobs FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "jobs_insert_own" ON public.jobs;
CREATE POLICY "jobs_insert_own" ON public.jobs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "jobs_update_own" ON public.jobs;
CREATE POLICY "jobs_update_own" ON public.jobs FOR UPDATE
  TO authenticated USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "jobs_delete_own" ON public.jobs;
CREATE POLICY "jobs_delete_own" ON public.jobs FOR DELETE
  TO authenticated USING (auth.uid() = user_id OR public.is_admin());

-- ==================== TASKS ====================
DROP POLICY IF EXISTS "tasks_select_related" ON public.tasks;
CREATE POLICY "tasks_select_related" ON public.tasks FOR SELECT
  TO authenticated USING (
    auth.uid() = worker_id OR
    auth.uid() = (SELECT j.user_id FROM public.jobs j WHERE j.id = job_id) OR
    public.is_admin()
  );

DROP POLICY IF EXISTS "tasks_insert_own" ON public.tasks;
CREATE POLICY "tasks_insert_own" ON public.tasks FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = worker_id);

DROP POLICY IF EXISTS "tasks_update_owner" ON public.tasks;
CREATE POLICY "tasks_update_owner" ON public.tasks FOR UPDATE
  TO authenticated USING (
    auth.uid() = worker_id OR
    auth.uid() = (SELECT j.user_id FROM public.jobs j WHERE j.id = job_id) OR
    public.is_admin()
  );

-- ==================== DEPOSIT_REQUESTS ====================
DROP POLICY IF EXISTS "deposits_select_own" ON public.deposit_requests;
CREATE POLICY "deposits_select_own" ON public.deposit_requests FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "deposits_insert_own" ON public.deposit_requests;
CREATE POLICY "deposits_insert_own" ON public.deposit_requests FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "deposits_admin_update" ON public.deposit_requests;
CREATE POLICY "deposits_admin_update" ON public.deposit_requests FOR UPDATE
  TO authenticated USING (public.is_admin());

-- ==================== WITHDRAWAL_REQUESTS ====================
DROP POLICY IF EXISTS "withdrawals_select_own" ON public.withdrawal_requests;
CREATE POLICY "withdrawals_select_own" ON public.withdrawal_requests FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "withdrawals_insert_own" ON public.withdrawal_requests;
CREATE POLICY "withdrawals_insert_own" ON public.withdrawal_requests FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "withdrawals_admin_update" ON public.withdrawal_requests;
CREATE POLICY "withdrawals_admin_update" ON public.withdrawal_requests FOR UPDATE
  TO authenticated USING (public.is_admin());

-- ==================== TRANSACTIONS ====================
DROP POLICY IF EXISTS "transactions_select_own" ON public.transactions;
CREATE POLICY "transactions_select_own" ON public.transactions FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "transactions_insert_own" ON public.transactions;
CREATE POLICY "transactions_insert_own" ON public.transactions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- ==================== TICKETS ====================
DROP POLICY IF EXISTS "tickets_select_own" ON public.tickets;
CREATE POLICY "tickets_select_own" ON public.tickets FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "tickets_insert_own" ON public.tickets;
CREATE POLICY "tickets_insert_own" ON public.tickets FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "tickets_update_own" ON public.tickets;
CREATE POLICY "tickets_update_own" ON public.tickets FOR UPDATE
  TO authenticated USING (auth.uid() = user_id OR public.is_admin());

-- ==================== TICKET_MESSAGES ====================
DROP POLICY IF EXISTS "ticket_messages_select_related" ON public.ticket_messages;
CREATE POLICY "ticket_messages_select_related" ON public.ticket_messages FOR SELECT
  TO authenticated USING (
    auth.uid() = sender_id OR
    auth.uid() = (SELECT t.user_id FROM public.tickets t WHERE t.id = ticket_id) OR
    public.is_admin()
  );

DROP POLICY IF EXISTS "ticket_messages_insert_related" ON public.ticket_messages;
CREATE POLICY "ticket_messages_insert_related" ON public.ticket_messages FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = sender_id);

-- ==================== ADVERTISEMENTS ====================
DROP POLICY IF EXISTS "ads_select_all" ON public.advertisements;
CREATE POLICY "ads_select_all" ON public.advertisements FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "ads_insert_own" ON public.advertisements;
CREATE POLICY "ads_insert_own" ON public.advertisements FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ads_update_own" ON public.advertisements;
CREATE POLICY "ads_update_own" ON public.advertisements FOR UPDATE
  TO authenticated USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "ads_delete_own" ON public.advertisements;
CREATE POLICY "ads_delete_own" ON public.advertisements FOR DELETE
  TO authenticated USING (auth.uid() = user_id OR public.is_admin());

-- ==================== ADMIN_SETTINGS ====================
DROP POLICY IF EXISTS "settings_select_all" ON public.admin_settings;
CREATE POLICY "settings_select_all" ON public.admin_settings FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "settings_admin_update" ON public.admin_settings;
CREATE POLICY "settings_admin_update" ON public.admin_settings FOR UPDATE
  TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "settings_admin_insert" ON public.admin_settings;
CREATE POLICY "settings_admin_insert" ON public.admin_settings FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

-- ==================== CATEGORIES ====================
DROP POLICY IF EXISTS "categories_select_all" ON public.categories;
CREATE POLICY "categories_select_all" ON public.categories FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "categories_admin_insert" ON public.categories;
CREATE POLICY "categories_admin_insert" ON public.categories FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "categories_admin_update" ON public.categories;
CREATE POLICY "categories_admin_update" ON public.categories FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "categories_admin_delete" ON public.categories;
CREATE POLICY "categories_admin_delete" ON public.categories FOR DELETE
  TO authenticated USING (public.is_admin());

-- ==================== REFERRALS ====================
DROP POLICY IF EXISTS "referrals_select_own" ON public.referrals;
CREATE POLICY "referrals_select_own" ON public.referrals FOR SELECT
  TO authenticated USING (auth.uid() = referrer_id OR public.is_admin());

DROP POLICY IF EXISTS "referrals_insert_own" ON public.referrals;
CREATE POLICY "referrals_insert_own" ON public.referrals FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = referrer_id);

-- ==================== NOTIFICATIONS (no change needed, no self-reference) ====================
-- Already correct: auth.uid() = user_id with no self-reference
