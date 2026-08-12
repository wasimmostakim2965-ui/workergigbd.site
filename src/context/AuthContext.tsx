import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signUpWithGoogle: (referralCode?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (uid: string, retry = 0): Promise<void> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle();

    // Table missing / RLS blocked → don't retry forever; leave profile null.
    // (Pages guard on `!profile` and the SQL setup must exist.)
    if (error) {
      console.error('Profile load error:', error);
      return;
    }
    if (data) {
      setProfile(data as Profile);
      return;
    }
    // No profile row yet. Try to self-heal by inserting a minimal profile,
    // so the user is never stuck on an endless spinner.
    if (retry === 0) {
      const username = user?.email ? user.email.split('@')[0] : 'user';
      const { error: insertError } = await supabase.from('profiles').insert({
        id: uid,
        username,
        referral_code: 'WG' + uid.replace(/-/g, '').slice(0, 8).toUpperCase(),
        status: 'active',
      });
      if (!insertError) {
        await loadProfile(uid, 1);
        return;
      }
    }
    if (retry < 3) {
      await new Promise((r) => setTimeout(r, 1000));
      await loadProfile(uid, retry + 1);
    }
  };

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id).finally(() => mounted && setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      (async () => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.user) {
          await loadProfile(newSession.user.id);
        } else {
          setProfile(null);
        }
        setLoading(false);
      })();
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    // Read the CURRENT logged-in user from the live Supabase session instead
    // of relying on the `user` React state, which is a stale closure right
    // after signIn (the onAuthStateChange setUser hasn't re-rendered yet).
    // This was the admin-gate bug: refreshProfile was a no-op, so `profile`
    // stayed null and AdminRoute redirected admins to /dashboard.
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) await loadProfile(currentUser.id);
  };

  // Get the correct redirect URL based on environment
  const getRedirectUrl = (): string => {
    const prodUrl = import.meta.env.VITE_AUTH_REDIRECT_URL;
    
    // If production URL is set in env, use it
    if (prodUrl && import.meta.env.PROD) {
      return `${prodUrl}/dashboard`;
    }
    
    // Otherwise use current origin (for localhost development)
    return `${window.location.origin}/dashboard`;
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: getRedirectUrl() },
    });
    return { error: error?.message ?? null };
  };

  const signUpWithGoogle = async (referralCode?: string) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getRedirectUrl(),
        queryParams: referralCode ? { ref: referralCode } : undefined,
      },
    });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signInWithGoogle, signUpWithGoogle, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
