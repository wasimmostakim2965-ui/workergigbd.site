-- ============================================================
-- WorkerGig BD — One-time full database setup
-- ============================================================
-- Run this ENTIRE script ONCE in the Supabase dashboard:
--   SQL Editor → New query → paste everything → Run.
--
-- It is idempotent (safe to re-run) and:
--   1. Backs up + drops legacy tables that don't match the app schema
--      (users, deposits, earnings, and the old-shape jobs/notifications).
--   2. Creates every table the app expects.
--   3. Seeds categories + admin settings.
--   4. Creates the is_admin() + handle_new_user() + notify_user() funcs.
--   5. Adds RLS policies for every table.
--   6. Adds foreign keys + the email_verified column + screenshot fields.
--   7. Creates the verification-docs storage bucket.
--   8. Backfills a profile row for every existing auth.users user.
-- ============================================================

-- ---- 0. Reload PostgREST schema cache so newly created tables are visible ----
NOTIFY pgrst, 'reload schema_cache';

-- ---- 1. Move legacy mismatched tables out of the way (backup) ----
-- These tables belong to an older schema and conflict with the app.
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
  -- Old jobs/notifications had different columns; rename then recreate below.
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='jobs')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='jobs' AND column_name='reward_per_worker') THEN
    ALTER TABLE public.jobs RENAME TO legacy_jobs_backup;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='notifications')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='notifications' AND column_name='user_id') THEN
    ALTER TABLE public.notifications RENAME TO legacy_notifications_backup;
  END IF;
END $$;

-- ---- 2. Helper functions ----
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'admin');
$$;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ---- 3. profiles ----
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

-- ---- 4. categories ----
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

-- ---- 5. jobs ----
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

-- ---- 6. tasks ----
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
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tasks_select_related" ON public.tasks;
CREATE POLICY "tasks_select_related" ON public.tasks FOR SELECT TO authenticated USING (auth.uid() = worker_id OR auth.uid() = (SELECT j.user_id FROM public.jobs j WHERE j.id = job_id) OR public.is_admin());
DROP POLICY IF EXISTS "tasks_insert_own" ON public.tasks;
CREATE POLICY "tasks_insert_own" ON public.tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() = worker_id);
DROP POLICY IF EXISTS "tasks_update_owner" ON public.tasks;
CREATE POLICY "tasks_update_owner" ON public.tasks FOR UPDATE TO authenticated USING (auth.uid() = worker_id OR auth.uid() = (SELECT j.user_id FROM public.jobs j WHERE j.id = job_id) OR public.is_admin());

-- ---- 7. deposit_requests ----
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

-- ---- 8. withdrawal_requests ----
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

-- ---- 9. transactions ----
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

-- ---- 10. notifications ----
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
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "notifications_insert_own" ON public.notifications;
CREATE POLICY "notifications_insert_own" ON public.notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR public.is_admin());
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;
CREATE POLICY "notifications_delete_own" ON public.notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ---- 11. notify_user() RPC (cross-user notifications) ----
CREATE OR REPLACE FUNCTION public.notify_user(target_uid uuid, n_title text, n_message text, n_type text DEFAULT 'info')
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.notifications (user_id, title, message, type) VALUES (target_uid, n_title, n_message, n_type);
$$;
GRANT EXECUTE ON FUNCTION public.notify_user(uuid, text, text, text) TO authenticated;

-- ---- 12. tickets ----
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

-- ---- 13. ticket_messages ----
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

-- ---- 14. advertisements ----
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

-- ---- 15. admin_settings ----
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

-- ---- 16. referrals ----
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

-- ---- 17. verification_requests ----
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

-- ---- 18. Seed categories ----
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

-- ---- 19. Seed admin settings ----
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

-- ---- 20. handle_new_user trigger (creates profile on signup) ----
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

-- ---- 21. Backfill profiles for EXISTING auth users (who signed up before the table existed) ----
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

-- ---- 22. Indexes ----
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

-- ---- 23. verification-docs storage bucket ----
INSERT INTO storage.buckets (id, name, public) VALUES ('verification-docs','verification-docs',true) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "verification_docs_read_all" ON storage.objects;
CREATE POLICY "verification_docs_read_all" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'verification-docs');
DROP POLICY IF EXISTS "verification_docs_insert_own" ON storage.objects;
CREATE POLICY "verification_docs_insert_own" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'verification-docs' AND auth.uid() = owner);
DROP POLICY IF EXISTS "verification_docs_update_own" ON storage.objects;
CREATE POLICY "verification_docs_update_own" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'verification-docs' AND auth.uid() = owner);
DROP POLICY IF EXISTS "verification_docs_delete_own" ON storage.objects;
CREATE POLICY "verification_docs_delete_own" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'verification-docs' AND auth.uid() = owner);

-- job-assets bucket (used by PostJobPage image upload)
INSERT INTO storage.buckets (id, name, public) VALUES ('job-assets','job-assets',true) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "job_assets_read_all" ON storage.objects;
CREATE POLICY "job_assets_read_all" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'job-assets');
DROP POLICY IF EXISTS "job_assets_insert_own" ON storage.objects;
CREATE POLICY "job_assets_insert_own" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'job-assets' AND auth.uid() = owner);
DROP POLICY IF EXISTS "job_assets_update_own" ON storage.objects;
CREATE POLICY "job_assets_update_own" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'job-assets' AND auth.uid() = owner);
DROP POLICY IF EXISTS "job_assets_delete_own" ON storage.objects;
CREATE POLICY "job_assets_delete_own" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'job-assets' AND auth.uid() = owner);

-- ---- 24. Reload schema cache so the API sees everything immediately ----
NOTIFY pgrst, 'reload schema_cache';
