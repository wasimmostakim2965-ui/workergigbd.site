-- WorkerGig BD — task moderation, safe task controls, and professional categories
-- New jobs are charged as before but remain pending_review until an admin approves them.
-- High-risk task patterns are rejected server-side before any balance is charged.

CREATE OR REPLACE FUNCTION public.post_job(
  p_uid uuid,
  p_title text,
  p_description text,
  p_category text,
  p_subcategory text DEFAULT '',
  p_url text DEFAULT '',
  p_proof_instructions text DEFAULT '',
  p_reward_per_worker numeric DEFAULT 0,
  p_total_slots integer DEFAULT 1,
  p_is_premium_only boolean DEFAULT false,
  p_screenshot_count integer DEFAULT 0,
  p_screenshot_instructions text DEFAULT '',
  p_image_url text DEFAULT ''
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_bal numeric(12,3);
  v_cost numeric(12,3);
  v_per_worker numeric(12,3);
  v_text text := lower(coalesce(p_title, '') || ' ' || coalesce(p_description, '') || ' ' || coalesce(p_proof_instructions, ''));
BEGIN
  IF p_uid IS NULL OR auth.uid() IS NULL OR p_uid <> auth.uid() THEN
    RAISE EXCEPTION 'You can only post a job for your own account.';
  END IF;
  IF nullif(trim(coalesce(p_title, '')), '') IS NULL THEN
    RAISE EXCEPTION 'A job title is required.';
  END IF;
  IF nullif(trim(coalesce(p_description, '')), '') IS NULL THEN
    RAISE EXCEPTION 'A job description is required.';
  END IF;
  IF p_reward_per_worker IS NULL OR p_reward_per_worker < 0.02 THEN
    RAISE EXCEPTION 'Minimum reward per worker is $0.02.';
  END IF;
  IF p_total_slots IS NULL OR p_total_slots < 1 THEN
    RAISE EXCEPTION 'Total slots must be at least 1.';
  END IF;
  IF p_screenshot_count IS NULL OR p_screenshot_count < 0 OR p_screenshot_count > 4 THEN
    RAISE EXCEPTION 'Screenshot count must be between 0 and 4.';
  END IF;

  -- These patterns are not permitted because they create invalid-traffic,
  -- fraud, credential, privacy, or deceptive-engagement risk.
  IF v_text ~* '(ads?[[:space:]_-]*click|click[[:space:]_-]*ads?|google[[:space:]_-]*adsense|fake[[:space:]_-]*(account|review|like|follower)|gmail[[:space:]_-]*(account|creation|create)|otp|one[[:space:]_-]*time[[:space:]_-]*password|password|recovery[[:space:]_-]*code|nid|national[[:space:]_-]*id|passport|identity[[:space:]_-]*document|kyc[[:space:]_-]*(submit|verification|verify)|five[[:space:]_-]*star[[:space:]_-]*review|5[[:space:]_-]*star[[:space:]_-]*review|buy[[:space:]_-]*account|old[[:space:]_-]*account)' THEN
    RAISE EXCEPTION 'This task includes a restricted activity. Ads clicks, fake engagement or reviews, account creation, credentials, OTPs, and identity-document requests are not allowed.';
  END IF;

  v_per_worker := (p_reward_per_worker + (p_screenshot_count * 0.0001))::numeric(12,3);
  v_cost := (v_per_worker * p_total_slots)::numeric(12,3);

  SELECT deposit_balance INTO v_bal FROM public.profiles WHERE id = p_uid FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Account not found.';
  END IF;
  IF v_bal < v_cost THEN
    RAISE EXCEPTION 'Insufficient deposit balance. Need $ %, have $ %.', v_cost, v_bal;
  END IF;

  UPDATE public.profiles
    SET deposit_balance = deposit_balance - v_cost,
        jobs_posted = jobs_posted + 1,
        updated_at = now()
    WHERE id = p_uid;

  INSERT INTO public.jobs (
    user_id, title, description, category, subcategory, url, proof_instructions,
    reward_per_worker, total_slots, status, is_premium_only,
    screenshot_count, screenshot_instructions, image_url
  ) VALUES (
    p_uid, trim(p_title), trim(p_description), p_category, p_subcategory, p_url, p_proof_instructions,
    p_reward_per_worker, p_total_slots, 'pending_review', p_is_premium_only,
    p_screenshot_count, p_screenshot_instructions, p_image_url
  )
  RETURNING id INTO v_id;

  INSERT INTO public.transactions (user_id, type, amount, balance_type, description, reference_id)
    VALUES (p_uid, 'ad_charge', v_cost, 'deposit', 'Job submitted for review - ' || p_title, v_id);

  PERFORM public.notify_user(
    p_uid,
    'Job submitted for review',
    'Your job was received and will become visible after an admin review.',
    'info'
  );

  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.post_job(uuid, text, text, text, text, text, text, numeric, integer, boolean, integer, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.review_job(
  p_job_id uuid,
  p_action text,
  p_note text DEFAULT ''
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job record;
  v_refund numeric(12,3);
  v_action text := lower(trim(coalesce(p_action, '')));
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin only.';
  END IF;

  SELECT * INTO v_job FROM public.jobs WHERE id = p_job_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job not found.';
  END IF;
  IF v_job.status <> 'pending_review' THEN
    RAISE EXCEPTION 'Only jobs pending review can be reviewed.';
  END IF;

  IF v_action = 'approve' THEN
    UPDATE public.jobs SET status = 'active', updated_at = now() WHERE id = p_job_id;
    PERFORM public.notify_user(
      v_job.user_id,
      'Job approved',
      'Your job "' || v_job.title || '" was approved and is now visible to workers.',
      'success'
    );
    RETURN true;
  END IF;

  IF v_action = 'reject' THEN
    v_refund := ((coalesce(v_job.reward_per_worker, 0)
      + coalesce(v_job.screenshot_count, 0) * 0.0001)
      * greatest(v_job.total_slots - v_job.filled_slots, 0))::numeric(12,3);

    IF v_refund > 0 THEN
      UPDATE public.profiles
        SET deposit_balance = deposit_balance + v_refund, updated_at = now()
        WHERE id = v_job.user_id;
      INSERT INTO public.transactions (user_id, type, amount, balance_type, description, reference_id)
        VALUES (v_job.user_id, 'ad_charge', v_refund, 'deposit',
          'Refund - rejected job "' || v_job.title || '"', p_job_id);
    END IF;

    UPDATE public.jobs SET status = 'rejected', updated_at = now() WHERE id = p_job_id;
    PERFORM public.notify_user(
      v_job.user_id,
      'Job rejected',
      'Your job "' || v_job.title || '" was rejected. ' || coalesce(nullif(trim(p_note), ''), 'Please review the task rules before submitting again.') || CASE WHEN v_refund > 0 THEN ' The unused prepaid amount was refunded.' ELSE '' END,
      'warning'
    );
    RETURN true;
  END IF;

  RAISE EXCEPTION 'Unknown action. Use approve or reject.';
END;
$$;
GRANT EXECUTE ON FUNCTION public.review_job(uuid, text, text) TO authenticated;

-- Professional, lower-risk categories. Existing categories remain intact.
INSERT INTO public.categories (name, icon, subcategories, display_order, is_active)
SELECT name, icon, subcategories, display_order, true
FROM (VALUES
  ('Data Entry', 'clipboard-list', ARRAY['Spreadsheet', 'Form Filling', 'Catalog Update'], 60),
  ('Research & Data Collection', 'search', ARRAY['Web Research', 'Lead Research', 'Data Verification'], 61),
  ('Content Writing', 'pen-tool', ARRAY['Product Description', 'Blog Writing', 'Proofreading'], 62),
  ('Translation', 'languages', ARRAY['Bangla to English', 'English to Bangla', 'Localization'], 63),
  ('Transcription', 'headphones', ARRAY['Audio Transcription', 'Video Transcription', 'Timestamping'], 64),
  ('Graphic Design', 'palette', ARRAY['Social Graphic', 'Banner', 'Presentation'], 65),
  ('Website & App Testing', 'smartphone', ARRAY['Usability Test', 'Bug Report', 'Accessibility Check'], 66),
  ('Data Labeling', 'tags', ARRAY['Image Labeling', 'Text Classification', 'Quality Review'], 67),
  ('Document Formatting', 'file-text', ARRAY['PDF to Word', 'Spreadsheet Cleanup', 'Presentation Formatting'], 68)
) AS v(name, icon, subcategories, display_order)
WHERE NOT EXISTS (SELECT 1 FROM public.categories c WHERE lower(c.name) = lower(v.name));

NOTIFY pgrst, 'reload schema_cache';
