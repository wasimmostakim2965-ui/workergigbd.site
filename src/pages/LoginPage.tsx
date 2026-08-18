import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/Button';
import { useSeo } from '@/lib/useSeo';

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z" />
    </svg>
  );
}

export function LoginPage() {
  useSeo({
    title: 'লগইন — WORKER GIG BD | অনলাইন মাইক্রো-টাস্ক প্ল্যাটফর্ম',
    description: 'WORKER GIG BD-তে লগইন করুন এবং অনলাইন মাইক্রো-টাস্ক সম্পন্ন করে আয় করা শুরু করুন। বাংলাদেশের শীর্ষ মাইক্রো-টাস্ক প্ল্যাটফর্ম।',
    path: '/login',
  });
  const navigate = useNavigate();
  const { signInWithGoogle, user, loading: authLoading } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // If a session is restored (e.g. right after the OAuth callback, or on a
  // return visit) send the user straight to the dashboard instead of leaving
  // them stranded on the login screen.
  useEffect(() => {
    if (!authLoading && user) navigate('/dashboard', { replace: true });
  }, [authLoading, user, navigate]);

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    const { error: googleError } = await signInWithGoogle();
    if (googleError) {
      setError(googleError);
      setLoading(false);
    }
    // On success the browser leaves for Google; no client-side navigate needed.
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left side - Brand panel */}
      <div className="relative hidden lg:flex lg:w-1/2 flex-col justify-between bg-gradient-to-br from-primary-700 via-primary-800 to-primary-950 p-12">
        <div className="absolute -right-20 top-20 h-72 w-72 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -left-20 bottom-20 h-72 w-72 rounded-full bg-accent-500/10 blur-3xl" />

        <Link to="/" className="relative">
          <Logo size={44} textColor="text-white" />
        </Link>

        <div className="relative">
          <h1 className="font-heading text-4xl font-extrabold leading-tight text-white">
            Welcome back to<br />your earning journey
          </h1>
          <p className="mt-4 max-w-md text-lg text-primary-100">
            Sign in to access your dashboard, complete tasks, and manage your earnings.
          </p>

          <div className="mt-10 space-y-4">
            {['Complete tasks and earn instantly', 'Track your earnings in real-time', 'Withdraw to bKash, Nagad, Rocket'].map((item) => (
              <div key={item} className="flex items-center gap-3 text-primary-100">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10">
                  <ArrowRight className="h-3 w-3" />
                </div>
                {item}
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-sm text-primary-200">
          © 2026 WORKER GIG BD. All rights reserved.
        </p>
      </div>

      {/* Right side - Form */}
      <div className="flex flex-1 items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <Link to="/">
              <Logo size={40} />
            </Link>
          </div>

          <h2 className="font-heading text-2xl font-bold text-gray-900">Sign in to your account</h2>
          <p className="mt-2 text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/signup" className="font-semibold text-primary-600 hover:text-primary-700">
              Create one free
            </Link>
          </p>

          {error && (
            <div className="mt-6 flex items-center gap-2.5 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="mt-8">
            <Button
              type="button"
              fullWidth
              size="lg"
              variant="secondary"
              loading={loading}
              onClick={handleGoogle}
            >
              <GoogleIcon className="h-5 w-5 shrink-0" /> Sign in with Email
            </Button>
          </div>

          <p className="mt-6 text-center text-xs text-gray-500">
            For admin access, sign in with your admin credentials.
          </p>
        </div>
      </div>
    </div>
  );
}
