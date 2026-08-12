import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ShieldCheck, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/Logo';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useSeo } from '@/lib/useSeo';

// The admin panel uses a single dedicated admin account. Visitors only need
// the password (no email) to unlock it; the login email is bound here on
// purpose so the gate is a simple password field. This account is excluded
// from the admin Users list (filtered by status != 'admin') so it never
// appears as a normal user.
const ADMIN_LOGIN_EMAIL = 'adminworkergig@gmail.com';

export function AdminGatePage() {
  useSeo({
    title: 'Admin Access — WORKER GIG BD',
    description: 'Restricted admin access panel for WORKER GIG BD.',
    path: '/admin-login',
    noindex: true,
  });
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: ADMIN_LOGIN_EMAIL,
      password,
    });
    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }
    // Confirm the signed-in account really is an admin before opening the panel.
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from('profiles')
      .select('status')
      .eq('id', authUser?.id ?? '')
      .maybeSingle();
    if (profile?.status !== 'admin') {
      await supabase.auth.signOut();
      setError('This password does not unlock the admin panel.');
      setLoading(false);
      return;
    }
    // Make sure the AuthContext has the admin profile loaded BEFORE we navigate,
    // otherwise AdminRoute sees profile === null and bounces to /dashboard.
    await refreshProfile?.();
    navigate('/admin', { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center">
          <Logo />
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-col items-center text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-600">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h1 className="font-heading text-xl font-bold text-gray-900">Admin Access</h1>
            <p className="mt-1 text-sm text-gray-500">Enter the admin password to continue</p>
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-error-50 p-3 text-sm text-error-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="password"
              placeholder="Admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock className="h-4 w-4" />}
              autoFocus
            />
            <Button type="submit" className="w-full" loading={loading}>
              Unlock Admin Panel
            </Button>
          </form>
        </div>
        <p className="mt-6 text-center text-xs text-gray-400">Restricted area · authorized access only</p>
      </div>
    </div>
  );
}
