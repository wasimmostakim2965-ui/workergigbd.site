-- Verification Requests Table
CREATE TABLE IF NOT EXISTS public.verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  admin_note text DEFAULT '',
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their own verification requests
DROP POLICY IF EXISTS "verification_insert_own" ON public.verification_requests;
CREATE POLICY "verification_insert_own" ON public.verification_requests FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- Users can view their own verification requests
DROP POLICY IF EXISTS "verification_select_own" ON public.verification_requests;
CREATE POLICY "verification_select_own" ON public.verification_requests FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

-- Admins can view all verification requests
DROP POLICY IF EXISTS "verification_admin_select" ON public.verification_requests;
CREATE POLICY "verification_admin_select" ON public.verification_requests FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.status = 'admin')
  );

-- Admins can update verification requests
DROP POLICY IF EXISTS "verification_admin_update" ON public.verification_requests;
CREATE POLICY "verification_admin_update" ON public.verification_requests FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.status = 'admin')
  );

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_verification_user ON public.verification_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_status ON public.verification_requests(status);
