-- WorkerGig BD — Ad banners table + payment method toggle settings

-- 1. Dedicated ad_banners table (so admin can manage multiple banners)
CREATE TABLE IF NOT EXISTS public.ad_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  image_url text NOT NULL DEFAULT '',
  link_url text NOT NULL DEFAULT '',
  position text NOT NULL DEFAULT 'job_list_top', -- job_list_top | sidebar | etc
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ad_banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY ad_banners_select_all ON public.ad_banners FOR SELECT USING (true);
CREATE POLICY ad_banners_admin_write ON public.ad_banners FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 2. Payment method enable/disable settings (stored in admin_settings)
INSERT INTO public.admin_settings (key, value) VALUES
  ('payment_bkash_enabled', 'true'),
  ('payment_nagad_enabled', 'false'),
  ('payment_rocket_enabled', 'false')
ON CONFLICT (key) DO NOTHING;

-- 3. bKash logo URL setting (admin can update)
INSERT INTO public.admin_settings (key, value) VALUES
  ('payment_bkash_logo', ''),
  ('payment_nagad_logo', ''),
  ('payment_rocket_logo', '')
ON CONFLICT (key) DO NOTHING;
