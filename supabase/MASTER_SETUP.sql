-- ============================================================================
-- WorkerGig BD — MASTER DATABASE SETUP (run this ONE script)
-- ============================================================================
-- This is a SINGLE, self-contained, idempotent script. Paste the ENTIRE
-- thing into the Supabase SQL Editor and Run. It will:
--   * Create EVERY table the app needs (if missing).
--   * Add RLS policies for every table.
--   * Seed categories + admin settings.
--   * Create all functions/triggers (is_admin, handle_new_user, notify_user,
--     handle_task_insert, handle_ticket_message_insert).
--   * Create the live-chat tables + atomic money RPCs + search helper.
--   * Create storage buckets + backfill profiles for existing auth users.
-- Existing data is preserved (CREATE TABLE IF NOT EXISTS + ON CONFLICT).
-- Safe to re-run any number of times.
-- ============================================================================

NOTIFY pgrst, 'reload schema_cache';

-- ---- Move legacy mismatched tables out of the way (backup, if present) ----
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='users') THEN
    ALTER TABLE IF EXISTS public.users RENAME TO legacy_users_backup;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='deposits') THEN
    ALTER TABLE IF EXISTS public.deposits RENAME TO legacy_deposits_backup;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='earnings') THEN
    ALTER TABLE IF EXISTS public.earnings RENAME TO legacy_earnings_backup;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='jobs')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='jobs' AND column_name='reward_per_worker') THEN
    ALTER TABLE public.jobs RENAME TO legacy_jobs_backup;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='notifications')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='notifications' AND column_name='user_id') THEN
    ALTER TABLE public.notifications RENAME TO legacy_notifications_backup;
  END IF;
END $$;

-- ============================================================================
-- 1. HELPER FUNCTIONS
-- ============================================================================
-- is_admin MUST be LANGUAGE plpgsql: plpgsql does NOT validate the body at
-- CREATE time (unlike LANGUAGE sql), so this function can be created BEFORE
-- the profiles table exists. Otherwise the whole script aborts on the first
-- statement ("relation public.profiles does not exist") and nothing is created.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'admin');
END;
$$;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ============================================================================
-- 2. TABLES
-- ============================================================================
-- ---- profiles ----
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL DEFAULT '',
  full_name text DEFAULT '',
  avatar_url text DEFAULT '',
  phone text DEFAULT '',
  email_verified boolean NOT NULL DEFAULT false,
  earning_balance numeric(12,3) NOT NULL DEFAULT 0,
  deposit_balance numeric(12,3) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
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
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id OR public.is_admin());
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id OR public.is_admin()) WITH CHECK (auth.uid() = id OR public.is_admin());

-- ---- categories ----
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
CREATE POLICY "categories_select_all" ON public.categories FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "categories_admin_insert" ON public.categories;
CREATE POLICY "categories_admin_insert" ON public.categories FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "categories_admin_update" ON public.categories;
CREATE POLICY "categories_admin_update" ON public.categories FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "categories_admin_delete" ON public.categories;
CREATE POLICY "categories_admin_delete" ON public.categories FOR DELETE TO authenticated USING (public.is_admin());

-- ---- jobs ----
CREATE TABLE IF NOT EXISTS public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL,
  subcategory text NOT NULL DEFAULT '',
  url text NOT NULL DEFAULT '',
  proof_instructions text NOT NULL DEFAULT '',
  screenshot_count integer NOT NULL DEFAULT 0,
  screenshot_instructions text NOT NULL DEFAULT '',
  image_url text NOT NULL DEFAULT '',
  reward_per_worker numeric(10,3) NOT NULL DEFAULT 0,
  total_slots integer NOT NULL DEFAULT 1,
  filled_slots integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  is_premium_only boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "jobs_select_all" ON public.jobs;
CREATE POLICY "jobs_select_all" ON public.jobs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "jobs_insert_own" ON public.jobs;
CREATE POLICY "jobs_insert_own" ON public.jobs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "jobs_update_own" ON public.jobs;
CREATE POLICY "jobs_update_own" ON public.jobs FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.is_admin()) WITH CHECK (auth.uid() = user_id OR public.is_admin());
DROP POLICY IF EXISTS "jobs_delete_own" ON public.jobs;
CREATE POLICY "jobs_delete_own" ON public.jobs FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.is_admin());

-- ---- tasks ----
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  worker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  proof_url text DEFAULT '',
  proof_text text DEFAULT '',
  submitted_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- audit fix: reviewed_by / reviewed_at columns for AdminTasksPage
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id);
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tasks_select_related" ON public.tasks;
CREATE POLICY "tasks_select_related" ON public.tasks FOR SELECT TO authenticated USING (auth.uid() = worker_id OR auth.uid() = (SELECT j.user_id FROM public.jobs j WHERE j.id = job_id) OR public.is_admin());
DROP POLICY IF EXISTS "tasks_insert_own" ON public.tasks;
CREATE POLICY "tasks_insert_own" ON public.tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() = worker_id);
DROP POLICY IF EXISTS "tasks_update_owner" ON public.tasks;
CREATE POLICY "tasks_update_owner" ON public.tasks FOR UPDATE TO authenticated USING (auth.uid() = worker_id OR auth.uid() = (SELECT j.user_id FROM public.jobs j WHERE j.id = job_id) OR public.is_admin());

-- ---- deposit_requests ----
CREATE TABLE IF NOT EXISTS public.deposit_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount numeric(12,3) NOT NULL,
  method text NOT NULL DEFAULT 'bkash',
  sender_number text NOT NULL DEFAULT '',
  transaction_id text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  admin_note text DEFAULT '',
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.deposit_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deposits_select_own" ON public.deposit_requests;
CREATE POLICY "deposits_select_own" ON public.deposit_requests FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin());
DROP POLICY IF EXISTS "deposits_insert_own" ON public.deposit_requests;
CREATE POLICY "deposits_insert_own" ON public.deposit_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "deposits_admin_update" ON public.deposit_requests;
CREATE POLICY "deposits_admin_update" ON public.deposit_requests FOR UPDATE TO authenticated USING (public.is_admin());

-- ---- withdrawal_requests ----
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
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
CREATE POLICY "withdrawals_select_own" ON public.withdrawal_requests FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin());
DROP POLICY IF EXISTS "withdrawals_insert_own" ON public.withdrawal_requests;
CREATE POLICY "withdrawals_insert_own" ON public.withdrawal_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "withdrawals_admin_update" ON public.withdrawal_requests;
CREATE POLICY "withdrawals_admin_update" ON public.withdrawal_requests FOR UPDATE TO authenticated USING (public.is_admin());

-- ---- transactions ----
CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  amount numeric(12,3) NOT NULL,
  balance_type text NOT NULL DEFAULT 'earning',
  description text DEFAULT '',
  reference_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "transactions_select_own" ON public.transactions;
CREATE POLICY "transactions_select_own" ON public.transactions FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin());
DROP POLICY IF EXISTS "transactions_insert_own" ON public.transactions;
CREATE POLICY "transactions_insert_own" ON public.transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- ---- notifications ----
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
-- audit fix: widened so admins can read user notifications
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin());
DROP POLICY IF EXISTS "notifications_insert_own" ON public.notifications;
CREATE POLICY "notifications_insert_own" ON public.notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR public.is_admin());
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;
CREATE POLICY "notifications_delete_own" ON public.notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ---- notify_user() RPC (cross-user notifications, bypasses RLS) ----
CREATE OR REPLACE FUNCTION public.notify_user(target_uid uuid, n_title text, n_message text, n_type text DEFAULT 'info')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type) VALUES (target_uid, n_title, n_message, n_type);
END;
$$;
GRANT EXECUTE ON FUNCTION public.notify_user(uuid, text, text, text) TO authenticated;

-- ---- tickets ----
CREATE TABLE IF NOT EXISTS public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'normal',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tickets_select_own" ON public.tickets;
CREATE POLICY "tickets_select_own" ON public.tickets FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin());
DROP POLICY IF EXISTS "tickets_insert_own" ON public.tickets;
CREATE POLICY "tickets_insert_own" ON public.tickets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR public.is_admin());
DROP POLICY IF EXISTS "tickets_update_own" ON public.tickets;
CREATE POLICY "tickets_update_own" ON public.tickets FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.is_admin()) WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- ---- ticket_messages ----
CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  is_admin_reply boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ticket_messages_select_related" ON public.ticket_messages;
CREATE POLICY "ticket_messages_select_related" ON public.ticket_messages FOR SELECT TO authenticated USING (auth.uid() = sender_id OR auth.uid() = (SELECT t.user_id FROM public.tickets t WHERE t.id = ticket_id) OR public.is_admin());
DROP POLICY IF EXISTS "ticket_messages_insert_related" ON public.ticket_messages;
CREATE POLICY "ticket_messages_insert_related" ON public.ticket_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id OR public.is_admin());

-- ---- advertisements ----
CREATE TABLE IF NOT EXISTS public.advertisements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  url text NOT NULL,
  image_url text DEFAULT '',
  clicks integer NOT NULL DEFAULT 0,
  impressions integer NOT NULL DEFAULT 0,
  budget numeric(10,3) NOT NULL DEFAULT 0,
  spent numeric(10,3) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ads_select_all" ON public.advertisements;
CREATE POLICY "ads_select_all" ON public.advertisements FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "ads_insert_own" ON public.advertisements;
CREATE POLICY "ads_insert_own" ON public.advertisements FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "ads_update_own" ON public.advertisements;
CREATE POLICY "ads_update_own" ON public.advertisements FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.is_admin());
DROP POLICY IF EXISTS "ads_delete_own" ON public.advertisements;
CREATE POLICY "ads_delete_own" ON public.advertisements FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.is_admin());

-- ---- admin_settings ----
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
CREATE POLICY "settings_select_all" ON public.admin_settings FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "settings_admin_update" ON public.admin_settings;
CREATE POLICY "settings_admin_update" ON public.admin_settings FOR UPDATE TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS "settings_admin_insert" ON public.admin_settings;
CREATE POLICY "settings_admin_insert" ON public.admin_settings FOR INSERT TO authenticated WITH CHECK (public.is_admin());

-- ---- referrals ----
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  bonus_amount numeric(10,3) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "referrals_select_own" ON public.referrals;
CREATE POLICY "referrals_select_own" ON public.referrals FOR SELECT TO authenticated USING (auth.uid() = referrer_id OR public.is_admin());
DROP POLICY IF EXISTS "referrals_insert_own" ON public.referrals;
CREATE POLICY "referrals_insert_own" ON public.referrals FOR INSERT TO authenticated WITH CHECK (auth.uid() = referrer_id OR public.is_admin());

-- ---- verification_requests ----
CREATE TABLE IF NOT EXISTS public.verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  document_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_note text DEFAULT '',
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "verification_insert_own" ON public.verification_requests;
CREATE POLICY "verification_insert_own" ON public.verification_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "verification_select_own" ON public.verification_requests;
CREATE POLICY "verification_select_own" ON public.verification_requests FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin());
DROP POLICY IF EXISTS "verification_admin_update" ON public.verification_requests;
CREATE POLICY "verification_admin_update" ON public.verification_requests FOR UPDATE TO authenticated USING (public.is_admin());

-- ---- email_otps (gap fix — was missing from the original setup.sql) ----
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

-- ============================================================================
-- 3. LIVE CHAT TABLES (admin sees every conversation; click to chat in realtime)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'open',
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
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chat_msg_conv ON public.chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_msg_conv_created ON public.chat_messages(conversation_id, created_at);

ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS chat_msg_select_related ON public.chat_messages;
CREATE POLICY chat_msg_select_related ON public.chat_messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.chat_conversations c
      WHERE c.id = chat_messages.conversation_id
        AND (c.user_id = auth.uid() OR public.is_admin()))
  );
DROP POLICY IF EXISTS chat_msg_insert_related ON public.chat_messages;
CREATE POLICY chat_msg_insert_related ON public.chat_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (SELECT 1 FROM public.chat_conversations c
      WHERE c.id = chat_messages.conversation_id
        AND (c.user_id = auth.uid() OR public.is_admin()))
  );
-- audit fix: UPDATE policy so read receipts (read_at) can be set
DROP POLICY IF EXISTS chat_msg_update_related ON public.chat_messages;
CREATE POLICY chat_msg_update_related ON public.chat_messages
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.chat_conversations c
      WHERE c.id = chat_messages.conversation_id
        AND (c.user_id = auth.uid() OR public.is_admin()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.chat_conversations c
      WHERE c.id = chat_messages.conversation_id
        AND (c.user_id = auth.uid() OR public.is_admin()))
  );

-- Realtime: make sure chat tables broadcast changes
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

-- ============================================================================
-- 4. SEED DATA
-- ============================================================================
INSERT INTO public.categories (name, icon, subcategories, display_order) VALUES
('Facebook','facebook','{"Picture Like","Page Like","Follower","Join Group","Like + Comment"}',1),
('Twitter','twitter','{"Follow","Favourite","Retweet"}',2),
('Instagram','instagram','{"Follow","Like","Comment"}',3),
('YouTube/Toffe','youtube','{"Subscribe","Watch Video","Comment","Share"}',4),
('TikTok','tiktok','{"Video Watch","Follow","Like"}',5),
('Sign Up','user-plus','{"Simple","Complex"}',6),
('Ads Click','mouse-pointer-click','{"Click 1x","Click 2x","Click 3x","Click 4x","Click 5x","Click 6x","Click 7x","Click 8x"}',7),
('Survey','clipboard-list','{"Short","Long"}',8),
('Gmail Account','mail','{"New Gmail","Old Gmail"}',9),
('Mobile Application','smartphone','{"Download","Download + Install","Download + Install + Review"}',10),
('Write an Article','pen-tool','{"75 words","150 words","300 words","500 words"}',11),
('Comment','message-square','{"Facebook","YouTube","Reddit"}',12),
('LinkedIn','linkedin','{"Connect","Follow","Profile Create"}',13),
('Reddit','reddit','{"Upvote","Downvote","Comment"}',14)
ON CONFLICT DO NOTHING;

INSERT INTO public.admin_settings (key, value, category, description, is_boolean) VALUES
('deposit_enabled','true','features','Allow deposit requests',true),
('withdrawal_enabled','true','features','Allow withdrawal requests',true),
('registration_enabled','true','features','Allow registration',true),
('job_posting_enabled','true','features','Allow job posting',true),
('ads_enabled','true','features','Allow advertisements',true),
('premium_enabled','true','features','Allow premium',true),
('referral_enabled','true','features','Allow referrals',true),
('min_deposit','100','limits','Minimum deposit (BDT)',false),
('min_withdrawal','500','limits','Minimum withdrawal (BDT)',false),
('referral_bonus','10','limits','Referral bonus (BDT)',false),
('premium_price','500','limits','Premium price (BDT)',false),
('premium_duration_days','30','limits','Premium duration (days)',false),
('site_name','Worker Gig BD','general','Site name',false),
('site_domain','workergigbd.site','general','Site domain',false),
('support_email','support@workergigbd.site','general','Support email',false),
('payment_bkash','','payment','bKash number',false),
('payment_nagad','','payment','Nagad number',false),
('payment_rocket','','payment','Rocket number',false),
('banner_title','Welcome to Worker Gig BD - Earn Money Doing Simple Tasks!','banner','Banner title',false),
('banner_url','','banner','Banner URL',false),
('banner_active','false','banner','Show banner',true),
('marquee_message','','marquee','Marquee message',false),
('marquee_active','false','marquee','Show marquee',true),
('marquee_color','primary','marquee','Marquee color',false)
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- 5. AUTH TRIGGER + PROFILE BACKFILL
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, username, referral_code, referred_by, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    'WG' || UPPER(SUBSTRING(NEW.id::text, 1, 8)),
    NEW.raw_user_meta_data->>'referred_by',
    'active'
  )
  ON CONFLICT (id) DO UPDATE SET username = COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)), updated_at = now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

INSERT INTO public.profiles (id, username, referral_code, referred_by, status)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1)),
  'WG' || UPPER(SUBSTRING(u.id::text, 1, 8)),
  u.raw_user_meta_data->>'referred_by',
  'active'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 6. BUSINESS TRIGGERS
-- ============================================================================
-- filled_slots: increment jobs.filled_slots on task insert, reject full/inactive jobs
CREATE OR REPLACE FUNCTION public.handle_task_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job RECORD;
BEGIN
  SELECT status, total_slots, filled_slots, reward_per_worker
    INTO v_job FROM public.jobs WHERE id = NEW.job_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Job not found.'; END IF;
  IF v_job.status <> 'active' THEN RAISE EXCEPTION 'This job is not active.'; END IF;
  IF v_job.filled_slots >= v_job.total_slots THEN RAISE EXCEPTION 'This job is already full.'; END IF;
  UPDATE public.jobs
    SET filled_slots = filled_slots + 1,
        status = CASE WHEN filled_slots + 1 >= total_slots THEN 'completed' ELSE status END,
        updated_at = now()
    WHERE id = NEW.job_id;
  RETURN NEW;
END;
$$;
GRANT EXECUTE ON FUNCTION public.handle_task_insert() TO authenticated;
DROP TRIGGER IF EXISTS trg_task_insert ON public.tasks;
CREATE TRIGGER trg_task_insert BEFORE INSERT ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_task_insert();

-- tickets.updated_at: bump on new ticket message + set answered when admin replies
CREATE OR REPLACE FUNCTION public.handle_ticket_message_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.tickets
    SET updated_at = now(),
        status = CASE WHEN NEW.is_admin_reply THEN 'answered' ELSE status END
    WHERE id = NEW.ticket_id;
  RETURN NEW;
END;
$$;
GRANT EXECUTE ON FUNCTION public.handle_ticket_message_insert() TO authenticated;
DROP TRIGGER IF EXISTS trg_ticket_msg_insert ON public.ticket_messages;
CREATE TRIGGER trg_ticket_msg_insert AFTER INSERT ON public.ticket_messages
  FOR EACH ROW EXECUTE FUNCTION public.handle_ticket_message_insert();

-- ============================================================================
-- 7. ATOMIC MONEY + BUSINESS RPCs (SECURITY DEFINER, FOR UPDATE row locks)
-- ============================================================================

-- get-or-create the current user's chat conversation
CREATE OR REPLACE FUNCTION public.get_or_create_chat_conversation()
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated.'; END IF;
  SELECT id INTO v_id FROM public.chat_conversations WHERE user_id = auth.uid();
  IF v_id IS NULL THEN
    INSERT INTO public.chat_conversations (user_id) VALUES (auth.uid()) RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_or_create_chat_conversation() TO authenticated;

-- request_withdrawal: deduct earning_balance atomically (held until admin decides)
CREATE OR REPLACE FUNCTION public.request_withdrawal(
  p_uid uuid, p_amount numeric, p_method text DEFAULT 'bkash', p_account text DEFAULT ''
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_bal numeric(12,3);
  v_min numeric;
BEGIN
  IF p_uid IS NULL OR auth.uid() IS NULL OR p_uid <> auth.uid() THEN
    RAISE EXCEPTION 'You can only request a withdrawal for your own account.';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Invalid withdrawal amount.'; END IF;
  SELECT value INTO v_min FROM public.admin_settings WHERE key = 'min_withdrawal';
  v_min := COALESCE(v_min::numeric, 500);
  IF p_amount < v_min THEN RAISE EXCEPTION 'Minimum withdrawal amount is %.', v_min; END IF;
  SELECT earning_balance INTO v_bal FROM public.profiles WHERE id = p_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Account not found.'; END IF;
  IF v_bal < p_amount THEN RAISE EXCEPTION 'Insufficient earning balance. Available: %', v_bal; END IF;
  UPDATE public.profiles SET earning_balance = earning_balance - p_amount, updated_at = now() WHERE id = p_uid;
  INSERT INTO public.withdrawal_requests (user_id, amount, method, account_number, status)
    VALUES (p_uid, p_amount, p_method, p_account, 'pending') RETURNING id INTO v_id;
  INSERT INTO public.transactions (user_id, type, amount, balance_type, description, reference_id)
    VALUES (p_uid, 'withdrawal', p_amount, 'earning', 'Withdrawal request (held) - ' || p_method, v_id);
  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(uuid, numeric, text, text) TO authenticated;

-- process_withdrawal_request: approve (finalize) or reject (refund) atomically
CREATE OR REPLACE FUNCTION public.process_withdrawal_request(
  p_wd_id uuid, p_admin_uid uuid, p_action text, p_note text DEFAULT ''
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_req RECORD;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin only.'; END IF;
  SELECT * INTO v_req FROM public.withdrawal_requests WHERE id = p_wd_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Withdrawal request not found.'; END IF;
  IF v_req.status <> 'pending' THEN RAISE EXCEPTION 'This request has already been processed.'; END IF;
  IF p_action = 'approve' THEN
    UPDATE public.withdrawal_requests SET status='approved', admin_note=p_note, reviewed_by=p_admin_uid, reviewed_at=now() WHERE id = p_wd_id;
    UPDATE public.profiles SET total_withdraw = total_withdraw + v_req.amount, updated_at = now() WHERE id = v_req.user_id;
    PERFORM public.notify_user(v_req.user_id, 'Withdrawal Approved!',
      'Your withdrawal of $ ' || v_req.amount || ' has been approved and sent to your ' || v_req.method || ' account.', 'success');
  ELSIF p_action = 'reject' THEN
    UPDATE public.profiles SET earning_balance = earning_balance + v_req.amount, updated_at = now() WHERE id = v_req.user_id;
    UPDATE public.withdrawal_requests SET status='rejected', admin_note=p_note, reviewed_by=p_admin_uid, reviewed_at=now() WHERE id = p_wd_id;
    INSERT INTO public.transactions (user_id, type, amount, balance_type, description, reference_id)
      VALUES (v_req.user_id, 'earning', v_req.amount, 'earning', 'Withdrawal rejected - amount refunded', v_req.id);
    PERFORM public.notify_user(v_req.user_id, 'Withdrawal Rejected',
      'Your withdrawal request of $ ' || v_req.amount || ' was rejected. ' || COALESCE(p_note, ''), 'error');
  ELSE
    RAISE EXCEPTION 'Unknown action. Use approve or reject.';
  END IF;
  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.process_withdrawal_request(uuid, uuid, text, text) TO authenticated;

-- process_deposit: approve (credit + referral bonus) or reject atomically
CREATE OR REPLACE FUNCTION public.process_deposit(
  p_deposit_id uuid, p_admin_uid uuid, p_action text, p_note text DEFAULT ''
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_req RECORD;
  v_referrer_id uuid;
  v_bonus numeric;
  v_ref_enabled boolean;
  v_referred_by text;
  v_user_total_deposit numeric;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin only.'; END IF;
  -- JOIN profiles so referred_by + total_deposit are available (they're on profiles)
  SELECT dr.*, p.referred_by, p.total_deposit, p.username
    INTO v_req
    FROM public.deposit_requests dr
    JOIN public.profiles p ON p.id = dr.user_id
    WHERE dr.id = p_deposit_id FOR UPDATE OF dr;
  IF NOT FOUND THEN RAISE EXCEPTION 'Deposit request not found.'; END IF;
  IF v_req.status <> 'pending' THEN RAISE EXCEPTION 'This deposit has already been processed.'; END IF;

  IF p_action = 'approve' THEN
    UPDATE public.deposit_requests SET status='approved', admin_note=p_note, reviewed_by=p_admin_uid, reviewed_at=now() WHERE id = p_deposit_id;
    UPDATE public.profiles SET deposit_balance = deposit_balance + v_req.amount, total_deposit = total_deposit + v_req.amount, updated_at = now() WHERE id = v_req.user_id;
    INSERT INTO public.transactions (user_id, type, amount, balance_type, description, reference_id)
      VALUES (v_req.user_id, 'deposit', v_req.amount, 'deposit', 'Deposit approved - ' || v_req.method, p_deposit_id);

    SELECT (value = 'true') INTO v_ref_enabled FROM public.admin_settings WHERE key = 'referral_enabled';
    SELECT value::numeric INTO v_bonus FROM public.admin_settings WHERE key = 'referral_bonus';
    v_bonus := COALESCE(v_bonus, 10);
    v_referred_by := v_req.referred_by;
    v_user_total_deposit := v_req.total_deposit;
    IF v_ref_enabled AND v_referred_by IS NOT NULL AND v_referred_by <> '' AND v_user_total_deposit = 0 THEN
      SELECT id INTO v_referrer_id FROM public.profiles WHERE referral_code = v_referred_by LIMIT 1;
      IF v_referrer_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.referrals WHERE referred_id = v_req.user_id) THEN
        INSERT INTO public.referrals (referrer_id, referred_id, bonus_amount, status)
          VALUES (v_referrer_id, v_req.user_id, v_bonus, 'completed');
        UPDATE public.profiles SET deposit_balance = deposit_balance + v_bonus, updated_at = now() WHERE id = v_referrer_id;
        INSERT INTO public.transactions (user_id, type, amount, balance_type, description)
          VALUES (v_referrer_id, 'referral_bonus', v_bonus, 'deposit', 'Referral bonus for referred user''s first deposit');
        PERFORM public.notify_user(v_referrer_id, 'Referral Bonus Earned!',
          'You earned $ ' || v_bonus || ' referral bonus. Your referred user just made their first deposit.', 'success');
      END IF;
    END IF;
    PERFORM public.notify_user(v_req.user_id, 'Deposit Approved!',
      'Your deposit of $ ' || v_req.amount || ' has been approved and credited to your account.', 'success');
  ELSIF p_action = 'reject' THEN
    UPDATE public.deposit_requests SET status='rejected', admin_note=p_note, reviewed_by=p_admin_uid, reviewed_at=now() WHERE id = p_deposit_id;
    PERFORM public.notify_user(v_req.user_id, 'Deposit Rejected',
      'Your deposit request of $ ' || v_req.amount || ' was rejected. ' || COALESCE(p_note, ''), 'error');
  ELSE
    RAISE EXCEPTION 'Unknown action. Use approve or reject.';
  END IF;
  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.process_deposit(uuid, uuid, text, text) TO authenticated;

-- process_task: approve (pay worker) or reject (free slot) atomically
CREATE OR REPLACE FUNCTION public.process_task(
  p_task_id uuid, p_admin_uid uuid, p_action text, p_note text DEFAULT ''
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_task RECORD;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin only.'; END IF;
  SELECT t.*, j.reward_per_worker, j.title INTO v_task
    FROM public.tasks t JOIN public.jobs j ON j.id = t.job_id
    WHERE t.id = p_task_id FOR UPDATE OF t;
  IF NOT FOUND THEN RAISE EXCEPTION 'Task not found.'; END IF;
  IF v_task.status <> 'submitted' THEN RAISE EXCEPTION 'This task is not awaiting review (status: %).', v_task.status; END IF;

  IF p_action = 'approve' THEN
    UPDATE public.tasks SET status='approved', reviewed_by=p_admin_uid, reviewed_at=now() WHERE id = p_task_id;
    UPDATE public.profiles SET earning_balance = earning_balance + v_task.reward_per_worker,
        total_earned = total_earned + v_task.reward_per_worker, tasks_completed = tasks_completed + 1, updated_at = now()
      WHERE id = v_task.worker_id;
    INSERT INTO public.transactions (user_id, type, amount, balance_type, description, reference_id)
      VALUES (v_task.worker_id, 'earning', v_task.reward_per_worker, 'earning', 'Task approved - ' || v_task.title, p_task_id);
    PERFORM public.notify_user(v_task.worker_id, 'Task Approved!',
      'Your task for "' || v_task.title || '" has been approved. $ ' || v_task.reward_per_worker || ' credited to your earning balance.', 'success');
  ELSIF p_action = 'reject' THEN
    UPDATE public.tasks SET status='rejected', reviewed_by=p_admin_uid, reviewed_at=now() WHERE id = p_task_id;
    UPDATE public.jobs SET filled_slots = GREATEST(filled_slots - 1, 0),
        status = CASE WHEN status = 'completed' AND filled_slots - 1 < total_slots THEN 'active' ELSE status END,
        updated_at = now() WHERE id = v_task.job_id;
    PERFORM public.notify_user(v_task.worker_id, 'Task Rejected',
      'Your task for "' || v_task.title || '" was rejected. ' || COALESCE(p_note, ''), 'error');
  ELSE
    RAISE EXCEPTION 'Unknown action. Use approve or reject.';
  END IF;
  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.process_task(uuid, uuid, text, text) TO authenticated;

-- post_job: deduct cost, insert job + transaction atomically
CREATE OR REPLACE FUNCTION public.post_job(
  p_uid uuid, p_title text, p_description text, p_category text,
  p_subcategory text DEFAULT '', p_url text DEFAULT '', p_proof_instructions text DEFAULT '',
  p_reward_per_worker numeric DEFAULT 0, p_total_slots integer DEFAULT 1,
  p_is_premium_only boolean DEFAULT false, p_screenshot_count integer DEFAULT 0,
  p_screenshot_instructions text DEFAULT '', p_image_url text DEFAULT ''
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_id uuid; v_bal numeric(12,3); v_cost numeric(12,3);
BEGIN
  IF p_uid IS NULL OR auth.uid() IS NULL OR p_uid <> auth.uid() THEN
    RAISE EXCEPTION 'You can only post a job for your own account.';
  END IF;
  IF p_reward_per_worker IS NULL OR p_reward_per_worker < 0 THEN RAISE EXCEPTION 'Invalid reward per worker.'; END IF;
  IF p_total_slots IS NULL OR p_total_slots < 1 THEN RAISE EXCEPTION 'Total slots must be at least 1.'; END IF;
  v_cost := ((p_reward_per_worker * p_total_slots))::numeric(12,3);
  SELECT deposit_balance INTO v_bal FROM public.profiles WHERE id = p_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Account not found.'; END IF;
  IF v_bal < v_cost THEN RAISE EXCEPTION 'Insufficient deposit balance. Need $ %, have $ %.', v_cost, v_bal; END IF;
  UPDATE public.profiles SET deposit_balance = deposit_balance - v_cost, jobs_posted = jobs_posted + 1, updated_at = now() WHERE id = p_uid;
  INSERT INTO public.jobs (user_id, title, description, category, subcategory, url, proof_instructions,
      reward_per_worker, total_slots, status, is_premium_only, screenshot_count, screenshot_instructions, image_url)
    VALUES (p_uid, p_title, p_description, p_category, p_subcategory, p_url, p_proof_instructions,
      p_reward_per_worker, p_total_slots, 'active', p_is_premium_only, p_screenshot_count, p_screenshot_instructions, p_image_url)
    RETURNING id INTO v_id;
  INSERT INTO public.transactions (user_id, type, amount, balance_type, description, reference_id)
    VALUES (p_uid, 'ad_charge', v_cost, 'deposit', 'Job posted - ' || p_title, v_id);
  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.post_job(uuid, text, text, text, text, text, text, numeric, integer, boolean, integer, text, text) TO authenticated;

-- subscribe_premium: deduct price, set premium atomically
CREATE OR REPLACE FUNCTION public.subscribe_premium(p_uid uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_bal numeric(12,3); v_price numeric; v_days integer;
BEGIN
  IF p_uid IS NULL OR auth.uid() IS NULL OR p_uid <> auth.uid() THEN
    RAISE EXCEPTION 'You can only activate premium for your own account.';
  END IF;
  SELECT value::numeric INTO v_price FROM public.admin_settings WHERE key = 'premium_price';
  v_price := COALESCE(v_price, 500);
  SELECT value::integer INTO v_days FROM public.admin_settings WHERE key = 'premium_duration_days';
  v_days := COALESCE(v_days, 30);
  SELECT deposit_balance INTO v_bal FROM public.profiles WHERE id = p_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Account not found.'; END IF;
  IF v_bal < v_price THEN RAISE EXCEPTION 'Insufficient deposit balance. Need $ %, have $ %.', v_price, v_bal; END IF;
  UPDATE public.profiles SET deposit_balance = deposit_balance - v_price, is_premium = true,
      premium_expires_at = now() + make_interval(days => v_days), updated_at = now() WHERE id = p_uid;
  INSERT INTO public.transactions (user_id, type, amount, balance_type, description)
    VALUES (p_uid, 'premium_charge', v_price, 'deposit', 'Premium subscription activated');
  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.subscribe_premium(uuid) TO authenticated;

-- create_ad: deduct budget, insert ad + transaction atomically
CREATE OR REPLACE FUNCTION public.create_ad(
  p_uid uuid, p_title text, p_url text, p_image_url text DEFAULT '', p_budget numeric DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_id uuid; v_bal numeric(12,3);
BEGIN
  IF p_uid IS NULL OR auth.uid() IS NULL OR p_uid <> auth.uid() THEN
    RAISE EXCEPTION 'You can only create ads for your own account.';
  END IF;
  IF p_budget IS NULL OR p_budget <= 0 THEN RAISE EXCEPTION 'Budget must be greater than zero.'; END IF;
  SELECT deposit_balance INTO v_bal FROM public.profiles WHERE id = p_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Account not found.'; END IF;
  IF v_bal < p_budget THEN RAISE EXCEPTION 'Insufficient deposit balance. Need $ %, have $ %.', p_budget, v_bal; END IF;
  UPDATE public.profiles SET deposit_balance = deposit_balance - p_budget, updated_at = now() WHERE id = p_uid;
  INSERT INTO public.advertisements (user_id, title, url, image_url, budget, status)
    VALUES (p_uid, p_title, p_url, p_image_url, p_budget, 'pending') RETURNING id INTO v_id;
  INSERT INTO public.transactions (user_id, type, amount, balance_type, description, reference_id)
    VALUES (p_uid, 'ad_charge', p_budget, 'deposit', 'Advertisement created - ' || p_title, v_id);
  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_ad(uuid, text, text, text, numeric) TO authenticated;

-- search_users: admin find users by phone/email/UID/referral_code/username/name
CREATE OR REPLACE FUNCTION public.search_users(p_term text)
RETURNS SETOF public.profiles
LANGUAGE sql SECURITY DEFINER SET search_path = public
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

-- ============================================================================
-- 8. INDEXES
-- ============================================================================
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
CREATE INDEX IF NOT EXISTS idx_verification_user ON public.verification_requests(user_id);

-- ============================================================================
-- 9. STORAGE BUCKETS
-- ============================================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('verification-docs','verification-docs',true) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "verification_docs_read_all" ON storage.objects;
CREATE POLICY "verification_docs_read_all" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'verification-docs');
DROP POLICY IF EXISTS "verification_docs_insert_own" ON storage.objects;
CREATE POLICY "verification_docs_insert_own" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'verification-docs' AND auth.uid() = owner);
DROP POLICY IF EXISTS "verification_docs_update_own" ON storage.objects;
CREATE POLICY "verification_docs_update_own" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'verification-docs' AND auth.uid() = owner);
DROP POLICY IF EXISTS "verification_docs_delete_own" ON storage.objects;
CREATE POLICY "verification_docs_delete_own" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'verification-docs' AND auth.uid() = owner);

INSERT INTO storage.buckets (id, name, public) VALUES ('job-assets','job-assets',true) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "job_assets_read_all" ON storage.objects;
CREATE POLICY "job_assets_read_all" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'job-assets');
DROP POLICY IF EXISTS "job_assets_insert_own" ON storage.objects;
CREATE POLICY "job_assets_insert_own" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'job-assets' AND auth.uid() = owner);
DROP POLICY IF EXISTS "job_assets_update_own" ON storage.objects;
CREATE POLICY "job_assets_update_own" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'job-assets' AND auth.uid() = owner);
DROP POLICY IF EXISTS "job_assets_delete_own" ON storage.objects;
CREATE POLICY "job_assets_delete_own" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'job-assets' AND auth.uid() = owner);

-- ============================================================================
-- 10. FINISH
-- ============================================================================
NOTIFY pgrst, 'reload schema_cache';
-- Done. Every table + function + trigger + policy is now in place.
