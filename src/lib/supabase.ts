import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Guard against a missing/empty config so the app fails loudly instead of
// booting to a blank white screen. @supabase/supabase-js throws synchronously
// in createClient when the URL is undefined, which — with no error boundary —
// left #root empty in production if the Vercel env vars were misconfigured.
if (!supabaseUrl || !supabaseAnonKey) {
  const missing = [
    !supabaseUrl && 'VITE_SUPABASE_URL',
    !supabaseAnonKey && 'VITE_SUPABASE_ANON_KEY',
  ].filter(Boolean).join(', ');
  throw new Error(
    `Configuration error: ${missing} is not set. ` +
    `If you are the site owner, set these in Vercel Project Settings → Environment Variables ` +
    `(for both Preview and Production) and redeploy.`
  );
}

// Determine the correct redirect URL based on environment
const getAuthRedirectUrl = (): string => {
  const prodUrl = import.meta.env.VITE_AUTH_REDIRECT_URL;
  
  // In production (Vercel), use the domain from env
  if (prodUrl && import.meta.env.PROD) {
    return prodUrl;
  }
  
  // In development, use localhost
  return window.location.origin;
};

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    redirectTo: getAuthRedirectUrl(),
    flowType: 'pkce', // Use PKCE flow for better security
  },
});
