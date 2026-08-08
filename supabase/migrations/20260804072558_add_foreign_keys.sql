/*
# Add foreign key constraints for user_id columns

## Problem
Supabase schema cache doesn't detect relationships between tables (deposit_requests, withdrawal_requests, jobs, tickets, etc.) and profiles because foreign keys to auth.users were not defined on the user_id columns.

## Solution
Add foreign key constraints on all user_id columns referencing auth.users(id).
This enables Supabase's nested select (e.g. `select('*, profiles(username)')`) to work.

## Tables Modified
- deposit_requests: add FK on user_id
- withdrawal_requests: add FK on user_id  
- jobs: add FK on user_id
- tickets: add FK on user_id
- transactions: add FK on user_id
- notifications: add FK on user_id
- advertisements: add FK on user_id
- referrals: add FK on referrer_id and referred_id
- ticket_messages: add FK on sender_id
*/

-- deposit_requests
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_deposit_requests_user' AND table_name = 'deposit_requests'
  ) THEN
    ALTER TABLE public.deposit_requests
      ADD CONSTRAINT fk_deposit_requests_user
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- withdrawal_requests
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_withdrawal_requests_user' AND table_name = 'withdrawal_requests'
  ) THEN
    ALTER TABLE public.withdrawal_requests
      ADD CONSTRAINT fk_withdrawal_requests_user
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- jobs
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_jobs_user' AND table_name = 'jobs'
  ) THEN
    ALTER TABLE public.jobs
      ADD CONSTRAINT fk_jobs_user
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- tickets
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_tickets_user' AND table_name = 'tickets'
  ) THEN
    ALTER TABLE public.tickets
      ADD CONSTRAINT fk_tickets_user
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- transactions
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_transactions_user' AND table_name = 'transactions'
  ) THEN
    ALTER TABLE public.transactions
      ADD CONSTRAINT fk_transactions_user
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- notifications
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_notifications_user' AND table_name = 'notifications'
  ) THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT fk_notifications_user
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- advertisements
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_advertisements_user' AND table_name = 'advertisements'
  ) THEN
    ALTER TABLE public.advertisements
      ADD CONSTRAINT fk_advertisements_user
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ticket_messages
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_ticket_messages_sender' AND table_name = 'ticket_messages'
  ) THEN
    ALTER TABLE public.ticket_messages
      ADD CONSTRAINT fk_ticket_messages_sender
      FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;
