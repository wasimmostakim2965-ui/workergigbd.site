/*
# Add foreign keys to profiles table for nested selects

## Problem
Foreign keys were added to auth.users, but Supabase nested selects need FKs to the profiles table to join `select('*, profiles(username)')`.

## Solution
Add FK constraints from user_id columns to public.profiles(id) instead of auth.users(id).
profiles.id is itself a FK to auth.users(id), so this creates a proper joinable relationship.
*/

-- Drop existing auth.users FKs and replace with profiles FKs

-- deposit_requests
ALTER TABLE public.deposit_requests DROP CONSTRAINT IF EXISTS fk_deposit_requests_user;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_deposit_user_profile' AND table_name = 'deposit_requests') THEN
    ALTER TABLE public.deposit_requests ADD CONSTRAINT fk_deposit_user_profile FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- withdrawal_requests
ALTER TABLE public.withdrawal_requests DROP CONSTRAINT IF EXISTS fk_withdrawal_requests_user;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_withdrawal_user_profile' AND table_name = 'withdrawal_requests') THEN
    ALTER TABLE public.withdrawal_requests ADD CONSTRAINT fk_withdrawal_user_profile FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- jobs
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS fk_jobs_user;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_jobs_user_profile' AND table_name = 'jobs') THEN
    ALTER TABLE public.jobs ADD CONSTRAINT fk_jobs_user_profile FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- tickets
ALTER TABLE public.tickets DROP CONSTRAINT IF EXISTS fk_tickets_user;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_tickets_user_profile' AND table_name = 'tickets') THEN
    ALTER TABLE public.tickets ADD CONSTRAINT fk_tickets_user_profile FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- transactions
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS fk_transactions_user;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_transactions_user_profile' AND table_name = 'transactions') THEN
    ALTER TABLE public.transactions ADD CONSTRAINT fk_transactions_user_profile FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- notifications
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS fk_notifications_user;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_notifications_user_profile' AND table_name = 'notifications') THEN
    ALTER TABLE public.notifications ADD CONSTRAINT fk_notifications_user_profile FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- advertisements
ALTER TABLE public.advertisements DROP CONSTRAINT IF EXISTS fk_advertisements_user;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_ads_user_profile' AND table_name = 'advertisements') THEN
    ALTER TABLE public.advertisements ADD CONSTRAINT fk_ads_user_profile FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ticket_messages
ALTER TABLE public.ticket_messages DROP CONSTRAINT IF EXISTS fk_ticket_messages_sender;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_ticket_msg_sender_profile' AND table_name = 'ticket_messages') THEN
    ALTER TABLE public.ticket_messages ADD CONSTRAINT fk_ticket_msg_sender_profile FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- tasks (worker_id)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_tasks_worker_profile' AND table_name = 'tasks') THEN
    ALTER TABLE public.tasks ADD CONSTRAINT fk_tasks_worker_profile FOREIGN KEY (worker_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;
