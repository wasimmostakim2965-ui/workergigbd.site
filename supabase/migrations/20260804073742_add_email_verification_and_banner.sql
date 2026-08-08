/*
# Add email verification + admin banner/marquee support

## Changes
1. Add `email_verified` boolean to profiles (default false) - gates withdrawals
2. Add admin settings for banner and marquee message
*/

-- Add email_verified column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false;

-- Add admin banner settings
INSERT INTO public.admin_settings (key, value, category, description, is_boolean)
VALUES
  ('banner_title', 'Welcome to Worker Gig BD - Earn Money Doing Simple Tasks!', 'banner', 'Dashboard banner title text', false),
  ('banner_url', '', 'banner', 'Dashboard banner link URL (leave empty to hide banner)', false),
  ('banner_active', 'false', 'banner', 'Show/hide the dashboard banner', true),
  ('marquee_message', '', 'marquee', 'Scrolling admin message shown on dashboard (leave empty to hide)', false),
  ('marquee_active', 'false', 'marquee', 'Show/hide the scrolling marquee message', true),
  ('marquee_color', 'primary', 'marquee', 'Color theme for marquee (primary, success, warning, error)', false)
ON CONFLICT (key) DO NOTHING;

-- Create email OTP table for verification
CREATE TABLE IF NOT EXISTS public.email_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- RLS for email_otps
ALTER TABLE public.email_otps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_otps_select_own" ON public.email_otps FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "email_otps_insert_own" ON public.email_otps FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "email_otps_update_own" ON public.email_otps FOR UPDATE
  TO authenticated USING (auth.uid() = user_id OR public.is_admin());

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_otps_user_id ON public.email_otps(user_id);
