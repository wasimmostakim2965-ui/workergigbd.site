/*
# Fix admin insert policies for notifications and transactions

## Problem
When admin approves a deposit/withdrawal, it creates notifications and transactions for the user.
But the INSERT policy checks `auth.uid() = user_id`, which fails because admin's uid != user's uid.
The SELECT policy also checks `auth.uid() = user_id`, so the user can't read admin-created records.

## Solution
1. Allow authenticated users to INSERT notifications/transactions where user_id can be any user (admin creates for others).
   - For notifications: admin inserts for users, so WITH CHECK should be `auth.uid() = user_id OR is_admin()`
   - For transactions: same pattern
2. SELECT policies already allow `auth.uid() = user_id OR is_admin()` which is correct.

## Tables Modified
- notifications: update INSERT policy
- transactions: update INSERT policy
*/

-- notifications: allow admin to insert for any user
DROP POLICY IF EXISTS "notifications_insert_own" ON public.notifications;
CREATE POLICY "notifications_insert_own" ON public.notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- transactions: allow admin to insert for any user
DROP POLICY IF EXISTS "transactions_insert_own" ON public.transactions;
CREATE POLICY "transactions_insert_own" ON public.transactions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- Also fix tickets: allow admin to insert ticket messages for any user
DROP POLICY IF EXISTS "ticket_messages_insert_related" ON public.ticket_messages;
CREATE POLICY "ticket_messages_insert_related" ON public.ticket_messages FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = sender_id OR public.is_admin());

-- Allow admin to insert tickets for any user (if needed)
DROP POLICY IF EXISTS "tickets_insert_own" ON public.tickets;
CREATE POLICY "tickets_insert_own" ON public.tickets FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- Allow admin to update tickets for any user
DROP POLICY IF EXISTS "tickets_update_own" ON public.tickets;
CREATE POLICY "tickets_update_own" ON public.tickets FOR UPDATE
  TO authenticated USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- Allow admin to insert deposit/withdrawal status updates (already covered by is_admin() USING)
-- But also need to allow admin to insert referral records
DROP POLICY IF EXISTS "referrals_insert_own" ON public.referrals;
CREATE POLICY "referrals_insert_own" ON public.referrals FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = referrer_id OR public.is_admin());
