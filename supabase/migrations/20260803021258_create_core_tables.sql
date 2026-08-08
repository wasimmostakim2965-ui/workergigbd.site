/*
# Worker Gig BD - Core Database Schema

## Overview
Creates the full database schema for a micro-task platform where users complete small tasks (likes, follows, signups, etc.) for payment, and an admin panel controls everything.

## Tables Created
1. **profiles** — extends Supabase auth.users with platform-specific fields (balance, status, role)
2. **categories** — task categories (Facebook, Twitter, YouTube, etc.) with subcategories
3. **jobs** — tasks posted by users for others to complete
4. **tasks** — records of users working on jobs
5. **deposit_requests** — user deposit requests awaiting admin approval
6. **withdrawal_requests** — user withdrawal requests awaiting admin approval
7. **transactions** — ledger of all financial movements
8. **notifications** — user notifications
9. **tickets** — support tickets
10. **ticket_messages** — messages within support tickets
11. **advertisements** — user-submitted ads
12. **admin_settings** — platform feature toggles and configuration
13. **referrals** — referral tracking for share & earn

## Security
- RLS enabled on every table
- Owner-scoped policies for user data
- Admin role check via profiles table
*/

-- ==================== PROFILES ====================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL DEFAULT '',
  full_name text DEFAULT '',
  avatar_url text DEFAULT '',
  phone text DEFAULT '',
  earning_balance numeric(12,3) NOT NULL DEFAULT 0,
  deposit_balance numeric(12,3) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active', -- active | suspended | blocked
  is_verified boolean NOT NULL DEFAULT false,
  is_premium boolean NOT NULL DEFAULT false,
  premium_expires_at timestamptz,
  referral_code text UNIQUE,
  referred_by text,
  total_earned numeric(12,3) NOT NULL DEFAULT 0,
  total_deposit numeric(12,3) NOT NULL DEFAULT 0,
  total_withdraw numeric(12,3) NOT NULL DEFAULT 0,
  tasks_completed integer NOT NULL DEFAULT 0,
  jobs_posted integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT
  TO authenticated USING (auth.uid() = id OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.status = 'admin'));

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ==================== CATEGORIES ====================
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  icon text DEFAULT '',
  subcategories text[] NOT NULL DEFAULT '{}',
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categories_select_all" ON public.categories;
CREATE POLICY "categories_select_all" ON public.categories FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "categories_admin_insert" ON public.categories;
CREATE POLICY "categories_admin_insert" ON public.categories FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.status = 'admin'));

DROP POLICY IF EXISTS "categories_admin_update" ON public.categories;
CREATE POLICY "categories_admin_update" ON public.categories FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.status = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.status = 'admin'));

DROP POLICY IF EXISTS "categories_admin_delete" ON public.categories;
CREATE POLICY "categories_admin_delete" ON public.categories FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.status = 'admin'));

-- ==================== JOBS ====================
CREATE TABLE IF NOT EXISTS public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL,
  subcategory text NOT NULL DEFAULT '',
  url text NOT NULL DEFAULT '',
  proof_instructions text NOT NULL DEFAULT '',
  reward_per_worker numeric(10,3) NOT NULL DEFAULT 0,
  total_slots integer NOT NULL DEFAULT 1,
  filled_slots integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active', -- active | paused | completed | rejected
  is_premium_only boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "jobs_select_all" ON public.jobs;
CREATE POLICY "jobs_select_all" ON public.jobs FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "jobs_insert_own" ON public.jobs;
CREATE POLICY "jobs_insert_own" ON public.jobs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "jobs_update_own" ON public.jobs;
CREATE POLICY "jobs_update_own" ON public.jobs FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "jobs_delete_own" ON public.jobs;
CREATE POLICY "jobs_delete_own" ON public.jobs FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ==================== TASKS ====================
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  worker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending', -- pending | submitted | approved | rejected
  proof_url text DEFAULT '',
  proof_text text DEFAULT '',
  submitted_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tasks_select_related" ON public.tasks;
CREATE POLICY "tasks_select_related" ON public.tasks FOR SELECT
  TO authenticated USING (
    auth.uid() = worker_id OR
    auth.uid() = (SELECT j.user_id FROM public.jobs j WHERE j.id = job_id) OR
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.status = 'admin')
  );

DROP POLICY IF EXISTS "tasks_insert_own" ON public.tasks;
CREATE POLICY "tasks_insert_own" ON public.tasks FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = worker_id);

DROP POLICY IF EXISTS "tasks_update_owner" ON public.tasks;
CREATE POLICY "tasks_update_owner" ON public.tasks FOR UPDATE
  TO authenticated USING (
    auth.uid() = worker_id OR
    auth.uid() = (SELECT j.user_id FROM public.jobs j WHERE j.id = job_id) OR
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.status = 'admin')
  );

-- ==================== DEPOSIT_REQUESTS ====================
CREATE TABLE IF NOT EXISTS public.deposit_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(12,3) NOT NULL,
  method text NOT NULL DEFAULT 'bkash', -- bkash | nagad | rocket
  sender_number text NOT NULL DEFAULT '',
  transaction_id text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  admin_note text DEFAULT '',
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.deposit_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deposits_select_own" ON public.deposit_requests;
CREATE POLICY "deposits_select_own" ON public.deposit_requests FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.status = 'admin')
  );

DROP POLICY IF EXISTS "deposits_insert_own" ON public.deposit_requests;
CREATE POLICY "deposits_insert_own" ON public.deposit_requests FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "deposits_admin_update" ON public.deposit_requests;
CREATE POLICY "deposits_admin_update" ON public.deposit_requests FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.status = 'admin')
  );

-- ==================== WITHDRAWAL_REQUESTS ====================
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(12,3) NOT NULL,
  method text NOT NULL DEFAULT 'bkash',
  account_number text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  admin_note text DEFAULT '',
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "withdrawals_select_own" ON public.withdrawal_requests;
CREATE POLICY "withdrawals_select_own" ON public.withdrawal_requests FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.status = 'admin')
  );

DROP POLICY IF EXISTS "withdrawals_insert_own" ON public.withdrawal_requests;
CREATE POLICY "withdrawals_insert_own" ON public.withdrawal_requests FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "withdrawals_admin_update" ON public.withdrawal_requests;
CREATE POLICY "withdrawals_admin_update" ON public.withdrawal_requests FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.status = 'admin')
  );

-- ==================== TRANSACTIONS ====================
CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL, -- deposit | withdrawal | earning | referral_bonus | premium_charge | ad_charge
  amount numeric(12,3) NOT NULL,
  balance_type text NOT NULL DEFAULT 'earning', -- earning | deposit
  description text DEFAULT '',
  reference_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transactions_select_own" ON public.transactions;
CREATE POLICY "transactions_select_own" ON public.transactions FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.status = 'admin')
  );

DROP POLICY IF EXISTS "transactions_insert_own" ON public.transactions;
CREATE POLICY "transactions_insert_own" ON public.transactions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- ==================== NOTIFICATIONS ====================
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info', -- info | success | warning | error
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own" ON public.notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_insert_own" ON public.notifications;
CREATE POLICY "notifications_insert_own" ON public.notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;
CREATE POLICY "notifications_delete_own" ON public.notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ==================== TICKETS ====================
CREATE TABLE IF NOT EXISTS public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  status text NOT NULL DEFAULT 'open', -- open | answered | closed
  priority text NOT NULL DEFAULT 'normal',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tickets_select_own" ON public.tickets;
CREATE POLICY "tickets_select_own" ON public.tickets FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.status = 'admin')
  );

DROP POLICY IF EXISTS "tickets_insert_own" ON public.tickets;
CREATE POLICY "tickets_insert_own" ON public.tickets FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "tickets_update_own" ON public.tickets;
CREATE POLICY "tickets_update_own" ON public.tickets FOR UPDATE
  TO authenticated USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.status = 'admin')
  );

-- ==================== TICKET_MESSAGES ====================
CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  is_admin_reply boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ticket_messages_select_related" ON public.ticket_messages;
CREATE POLICY "ticket_messages_select_related" ON public.ticket_messages FOR SELECT
  TO authenticated USING (
    auth.uid() = sender_id OR
    auth.uid() = (SELECT t.user_id FROM public.tickets t WHERE t.id = ticket_id) OR
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.status = 'admin')
  );

DROP POLICY IF EXISTS "ticket_messages_insert_related" ON public.ticket_messages;
CREATE POLICY "ticket_messages_insert_related" ON public.ticket_messages FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = sender_id);

-- ==================== ADVERTISEMENTS ====================
CREATE TABLE IF NOT EXISTS public.advertisements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  url text NOT NULL,
  image_url text DEFAULT '',
  clicks integer NOT NULL DEFAULT 0,
  impressions integer NOT NULL DEFAULT 0,
  budget numeric(10,3) NOT NULL DEFAULT 0,
  spent numeric(10,3) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending', -- pending | active | paused | completed | rejected
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ads_select_all" ON public.advertisements;
CREATE POLICY "ads_select_all" ON public.advertisements FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "ads_insert_own" ON public.advertisements;
CREATE POLICY "ads_insert_own" ON public.advertisements FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ads_update_own" ON public.advertisements;
CREATE POLICY "ads_update_own" ON public.advertisements FOR UPDATE
  TO authenticated USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.status = 'admin')
  );

DROP POLICY IF EXISTS "ads_delete_own" ON public.advertisements;
CREATE POLICY "ads_delete_own" ON public.advertisements FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ==================== ADMIN_SETTINGS ====================
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  description text DEFAULT '',
  is_boolean boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings_select_all" ON public.admin_settings;
CREATE POLICY "settings_select_all" ON public.admin_settings FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "settings_admin_update" ON public.admin_settings;
CREATE POLICY "settings_admin_update" ON public.admin_settings FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.status = 'admin')
  );

DROP POLICY IF EXISTS "settings_admin_insert" ON public.admin_settings;
CREATE POLICY "settings_admin_insert" ON public.admin_settings FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.status = 'admin')
  );

-- ==================== REFERRALS ====================
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bonus_amount numeric(10,3) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending', -- pending | completed
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "referrals_select_own" ON public.referrals;
CREATE POLICY "referrals_select_own" ON public.referrals FOR SELECT
  TO authenticated USING (
    auth.uid() = referrer_id OR
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.status = 'admin')
  );

DROP POLICY IF EXISTS "referrals_insert_own" ON public.referrals;
CREATE POLICY "referrals_insert_own" ON public.referrals FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = referrer_id);

-- ==================== INDEXES ====================
CREATE INDEX IF NOT EXISTS idx_jobs_category ON public.jobs(category);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_user ON public.jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_worker ON public.tasks(worker_id);
CREATE INDEX IF NOT EXISTS idx_tasks_job ON public.tasks(job_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_deposits_user ON public.deposit_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_deposits_status ON public.deposit_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON public.withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON public.withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user ON public.tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_ads_user ON public.advertisements(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_referral ON public.profiles(referral_code);
