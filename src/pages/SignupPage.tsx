import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Gift, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { GoogleIcon } from '@/components/GoogleIcon';
import { useSeo } from '@/lib/useSeo';

export function SignupPage() {
  useSeo({
    title: 'সাইন আপ — WORKER GIG BD | ফ্রি রেজিস্ট্রেশন করুন ও আয় শুরু করুন',
    description: 'WORKER GIG BD-তে বিনামূল্যে সাইন আপ করুন। রেফার করে বোনাস পান, অনলাইন মাইক্রো-টাস্ক করে ঘরে বসে আয় করুন। বাংলাদেশের শীর্ষ মাইক্রো-টাস্ক প্ল্যাটফর্ম।',
    path: '/signup',
  });
  const { signUpWithGoogle, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [referralCode, setReferralCode] = useState(searchParams.get('ref') ?? '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // After the OAuth callback a session may be restored; send an authenticated
  // user straight to the dashboard instead of leaving them on the signup form.
  useEffect(() => {
    if (!authLoading && user) navigate('/dashboard', { replace: true });
  }, [authLoading, user, navigate]);

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    const { error: googleError } = await signUpWithGoogle(referralCode || undefined);
    if (googleError) {
      setError(googleError);
      setLoading(false);
    }
    // On success the browser leaves for Google; no client-side navigate needed.
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left side - Form */}
      <div className="flex flex-1 items-center justify-center p-6 sm:p-12 order-2 lg:order-1">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <Link to="/">
              <Logo size={40} />
            </Link>
          </div>

          <h2 className="font-heading text-2xl font-bold text-gray-900">Create your free account</h2>
          <p className="mt-2 text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700">
              Sign in
            </Link>
          </p>

          {error && (
            <div className="mt-6 flex items-center gap-2.5 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="mt-6 space-y-5">
            <Input
              label="Referral Code (Optional)"
              type="text"
              placeholder="WGXXXXXXXX"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              icon={<Gift className="h-4 w-4" />}
              hint="Enter a friend's referral code to earn bonus"
            />
          </div>

          <div className="mt-6">
            <Button
              type="button"
              fullWidth
              size="lg"
              variant="secondary"
              loading={loading}
              onClick={handleGoogle}
            >
              <GoogleIcon className="h-5 w-5 shrink-0" /> Sign up with Google
            </Button>
          </div>

          <p className="mt-6 text-center text-xs text-gray-500">
            By continuing you agree to the Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>

      {/* Right side - Brand panel */}
      <div className="relative hidden lg:flex lg:w-1/2 flex-col justify-between bg-gradient-to-br from-primary-700 via-primary-800 to-primary-950 p-12 order-1 lg:order-2">
        <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -right-20 bottom-20 h-72 w-72 rounded-full bg-accent-500/10 blur-3xl" />

        <Link to="/" className="relative ml-auto">
          <Logo size={44} textColor="text-white" />
        </Link>

        <div className="relative">
          <h1 className="font-heading text-4xl font-extrabold leading-tight text-white">
            Start earning<br />from today
          </h1>
          <p className="mt-4 max-w-md text-lg text-primary-100">
            Join thousands of Bangladeshis who are already earning money by completing simple online tasks.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-4">
            <div className="rounded-xl bg-white/10 p-4 backdrop-blur-sm">
              <div className="text-2xl font-bold text-white">10K+</div>
              <div className="text-xs text-primary-200">Users</div>
            </div>
            <div className="rounded-xl bg-white/10 p-4 backdrop-blur-sm">
              <div className="text-2xl font-bold text-white">45+</div>
              <div className="text-xs text-primary-200">Categories</div>
            </div>
            <div className="rounded-xl bg-white/10 p-4 backdrop-blur-sm">
              <div className="text-2xl font-bold text-white">500K+</div>
              <div className="text-xs text-primary-200">Tasks</div>
            </div>
          </div>
        </div>

        <p className="relative text-sm text-primary-200">
          © 2026 WORKER GIG BD. All rights reserved.
        </p>
      </div>
    </div>
  );
}
