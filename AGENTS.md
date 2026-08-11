# WorkerGig BD — Repository Notes

## Stack
- Frontend: Vite + React 18 + TypeScript + Tailwind CSS + react-router-dom v7 + lucide-react
- Backend: Supabase (Postgres + Auth + Storage). Client: `src/lib/supabase.ts` using `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
- `.env` is gitignored and holds the Supabase credentials. `DATABASE_URL` is present but unused by the app (all DB access is via the Supabase JS client).
- Deploy: changes pushed to `main` go live automatically on the static host. SQL migrations in `supabase/migrations/` are NOT auto-applied — they must be run against the Supabase project (`supabase db push` or the dashboard SQL editor).

## Commands
- `npm run dev` — Vite dev server
- `npm run build` — production build
- `npm run typecheck` — `tsc --noEmit -p tsconfig.app.json` (must stay green)

## Architecture
- `src/context/AuthContext.tsx` — session + profile; `useAuth()` exposes `user` (auth.users) and `profile` (public.profiles). Email lives on `user.email`, NOT on the profile.
- Routes in `src/App.tsx`. Dashboard under `/dashboard/*` (mobile-first, max 480px), admin under `/admin/*` (desktop sidebar). Admin gate: `profile.status === 'admin'`.
- RLS: a `public.is_admin()` SECURITY DEFINER function breaks profile self-reference recursion. Cross-user notifications must go through the `notify_user()` RPC (migration `20260809000002`) because the notifications INSERT policy is `auth.uid() = user_id OR is_admin()`.

## Gotchas
- Balance updates are client-side read-modify-write (no DB transaction). Race conditions are possible under concurrent admin actions.
- Verification documents upload to the `verification-docs` storage bucket (migration `20260809000001`). The bucket is now PRIVATE (migration `20260811000002`) and stores signed URLs, not public URLs.
- Referral flow: signup stores the referrer's code in `profiles.referred_by`; the bonus is credited in `process_deposit` on the referred user's first approved deposit (self-referral blocked by `20260811000003`).

## Hardened RLS & new RPCs (migrations 20260811000xxx)
- `profiles` privileged columns (`status, *_balance, is_verified, is_premium, email_verified, totals, referral_code, referred_by`) are protected by SECURITY DEFINER triggers (`trg_guard_profile_update/insert`). Non-admins cannot set them; admins can. Users edit only username/full_name/avatar_url/phone directly.
- `tasks` INSERT may only use status `pending`/`submitted`; UPDATE of status/reviewed_* is blocked for non-admins (payouts go through `process_task`).
- `jobs` UPDATE blocked from changing `reward_per_worker`/`total_slots`/`filled_slots` (anti-reward-inflation).
- `advertisements` UPDATE blocked from changing `spent`/`budget`/counters; owners may only toggle active/paused once approved.
- `transactions` INSERT now admin-only (users can't forge their own ledger).
- `ticket_messages` INSERT scoped to ticket participants; `is_admin_reply` must match `is_admin()`.
- `verification_requests` RLS migrated from self-referencing to `is_admin()` (recursion-safe).
- Realtime publication now includes `notifications, tasks, deposit_requests, withdrawal_requests` (in addition to chat tables).
- New RPCs: `adjust_user_balance`, `set_user_premium`, `set_user_status`, `set_user_verified`, `is_premium_active`, `delete_job`. `process_task` now pays the full advertised reward (incl. screenshot fee). `process_deposit` blocks self-referral. All `process_*` RPCs use `auth.uid()` for `reviewed_by`.
- `tasks_one_active_per_job` is now a plain UNIQUE index on `(job_id, worker_id)` — a worker may complete a job only once.
- `handle_task_insert` trigger enforces premium-only server-side and rejects duplicate workers.
- Admin panel login: `refreshProfile` reads the live session user (not stale React state) so `AdminRoute` never bounces a real admin to `/dashboard`.
- `.env` is untracked; use `.env.example` as the template. Rotate Supabase credentials (DB password + anon key) — old values were committed in git history.
