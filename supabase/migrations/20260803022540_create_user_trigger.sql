/*
# Create handle_new_user trigger function

## Overview
Creates a trigger function that automatically creates a profile entry when a new user signs up via Supabase Auth. Also updates the profile if it already exists (upsert).

## Changes
1. Creates `handle_new_user()` function that inserts/updates a profile row
2. Attaches the function to the `auth.users` AFTER INSERT trigger
3. The function generates a referral code and sets default values
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, referral_code, referred_by, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    'WG' || UPPER(SUBSTRING(NEW.id::text, 1, 8)),
    NEW.raw_user_meta_data->>'referred_by',
    'active'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    username = COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
