ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS screenshot_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS screenshot_instructions text DEFAULT '',
  ADD COLUMN IF NOT EXISTS image_url text DEFAULT '';
