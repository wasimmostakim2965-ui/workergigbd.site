/*
# Create notify_user() RPC for cross-user notifications

## Problem
Notifications RLS only allows INSERT where `auth.uid() = user_id OR is_admin()`.
This blocks a worker from notifying a job owner when they submit a task (and any
other case where one authenticated user needs to notify another). The insert is
silently rejected, so the job owner never learns about new task submissions.

## Solution
Add a SECURITY DEFINER function `notify_user(target_uid, title, message, type)`
that inserts a notification row while bypassing RLS. Any authenticated user can
call it, but the function always sets `user_id = target_uid` (the caller cannot
spoof the recipient or read/modify other rows). This is the same trust model
Supabase recommends for user-to-user notifications.
*/

CREATE OR REPLACE FUNCTION public.notify_user(
  target_uid uuid,
  n_title text,
  n_message text,
  n_type text DEFAULT 'info'
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (target_uid, n_title, n_message, n_type);
$$;

GRANT EXECUTE ON FUNCTION public.notify_user(uuid, text, text, text) TO authenticated;
