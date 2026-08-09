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
- Verification documents upload to the `verification-docs` storage bucket (migration `20260809000001`).
- Referral flow: signup stores the referrer's code in `profiles.referred_by`; the bonus is credited in `AdminDepositsPage.handleApprove` on the referred user's first approved deposit.
