import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, AlertCircle, Gift } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/Logo';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export function SignupPage() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [searchParams] = useSearchParams();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState(searchParams.get('ref') ?? '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    const { error: signUpError } = await signUp(email, password, username, referralCode || undefined);
    if (signUpError) {
      setError(signUpError);
      setLoading(false);
    } else {
      navigate('/dashboard');
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

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <Input
              label="Username"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              icon={<User className="h-4 w-4" />}
            />
            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              icon={<Mail className="h-4 w-4" />}
            />
            <Input
              label="Password"
              type="password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              icon={<Lock className="h-4 w-4" />}
            />
            <Input
              label="Confirm Password"
              type="password"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              icon={<Lock className="h-4 w-4" />}
            />
            <Input
              label="Referral Code (Optional)"
              type="text"
              placeholder="WGXXXXXXXX"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              icon={<Gift className="h-4 w-4" />}
              hint="Enter a friend's referral code to earn bonus"
            />

            <label className="flex items-start gap-2 text-sm text-gray-600">
              <input type="checkbox" required className="mt-0.5 rounded border-gray-300 text-primary-600 focus:ring-primary-200" />
              <span>I agree to the Terms of Service and Privacy Policy</span>
            </label>

            <Button type="submit" fullWidth size="lg" loading={loading}>
              Create Account <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
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
          © 2026 Worker Gig BD. All rights reserved.
        </p>
      </div>
    </div>
  );
}
