import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Gift, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
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

export function SignupPage() {
  useSeo({
    title: 'সাইন আপ — WORKER GIG BD | ফ্রি রেজিস্ট্রেশন করুন ও আয় শুরু করুন',
    description: 'WORKER GIG BD-তে বিনামূল্যে সাইন আপ করুন। রেফার করে বোনাস পান, অনলাইন মাইক্রো-টাস্ক করে ঘরে বসে আয় করুন। বাংলাদেশের শীর্ষ মাইক্রো-টাস্ক প্ল্যাটফর্ম।',
    path: '/signup',
  });
  const { signUpWithGoogle } = useAuth();
  const [searchParams] = useSearchParams();
  const [referralCode, setReferralCode] = useState(searchParams.get('ref') ?? '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    const { error: googleError } = await signUpWithGoogle(referralCode || undefined);
    if (googleError) {
      setError(googleError);
      setLoading(false);
    }
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
              loading={loading}
              onClick={handleGoogle}
              className="bg-white text-gray-800 border border-gray-300 hover:bg-gray-50"
            >
              <GoogleIcon className="h-5 w-5" /> Sign up with Email
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
