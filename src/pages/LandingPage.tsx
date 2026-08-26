import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  ArrowRight, CheckCircle, Users, TrendingUp, Wallet, Shield,
  Zap, BarChart3, Lock, Globe, Loader2,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { GoogleIcon } from '@/components/GoogleIcon';
import { useAuth } from '@/context/AuthContext';
import { useSeo } from '@/lib/useSeo';
import { supabase } from '@/lib/supabase';

const features = [
  { icon: Wallet, title: 'Easy Deposits & Withdrawals', desc: 'bKash, Nagad, Rocket — deposit and withdraw your earnings easily with low fees.' },
  { icon: Shield, title: 'Secure & Trusted', desc: 'Every transaction is protected. Admin-verified deposits and withdrawals keep your money safe.' },
  { icon: TrendingUp, title: 'Unlimited Earning Potential', desc: 'Complete tasks, post jobs, refer friends, and run ads — multiple income streams in one platform.' },
  { icon: Zap, title: 'Fast Task Completion', desc: 'Quick, simple micro-tasks that take minutes. Like, follow, subscribe, watch, and earn.' },
  { icon: Users, title: 'Growing Community', desc: 'Join Bangladeshi freelancers earning online from home.' },
  { icon: BarChart3, title: 'Detailed Analytics', desc: 'Track your earnings, task completion rate, and growth with a powerful dashboard.' },
];

const steps = [
  { num: '01', title: 'Create Your Account', desc: 'Sign up for free with just your email and username. No verification hassle.' },
  { num: '02', title: 'Choose & Complete Tasks', desc: 'Browse 45+ task categories, pick what you like, complete it, and submit proof.' },
  { num: '03', title: 'Get Your Earnings', desc: 'Withdraw your earnings to bKash, Nagad, or Rocket once you reach the minimum amount.' },
];

export function LandingPage() {
  const [categories, setCategories] = useState<string[]>([]);
  const { signUpWithGoogle } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState('');
  useEffect(() => {
    supabase.from('categories').select('name').eq('is_active', true).order('display_order')
      .then(({ data }) => setCategories((data ?? []).map((c: { name: string }) => c.name)));
  }, []);

  const handleGoogleSignUp = async () => {
    setGoogleError('');
    setGoogleLoading(true);
    const { error } = await signUpWithGoogle();
    if (error) {
      setGoogleError(error);
      setGoogleLoading(false);
    }
    // On success the browser leaves for Google; no client-side navigate needed.
  };
  useSeo({
    title: 'WORKER GIG BD: Best Micro Job Site for Earning',
    description: 'WORKER GIG BD (workergigbd.site) বাংলাদেশের শীর্ষ মাইক্রো-টাস্ক ও ফ্রিল্যান্স প্ল্যাটফর্ম। সহজ অনলাইন টাস্ক সম্পন্ন করে ঘরে বসে আয় করুন। সাইন আপ করুন, কাজ করুন, বিকাশ/নগদে টাকা তুলুন। $1 = 100 BDT.',
    path: '/',
  });
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-40 border-b border-gray-100 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Logo size={40} />
          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm font-medium text-gray-600 transition-colors hover:text-primary-600">Features</a>
            <a href="#categories" className="text-sm font-medium text-gray-600 transition-colors hover:text-primary-600">Categories</a>
            <a href="#how-it-works" className="text-sm font-medium text-gray-600 transition-colors hover:text-primary-600">How It Works</a>
            <a href="#faq" className="text-sm font-medium text-gray-600 transition-colors hover:text-primary-600">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-semibold text-gray-700 transition-colors hover:text-primary-600">
              Login
            </Link>
            <Link
              to="/signup"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-700 hover:shadow-md active:scale-95"
            >
              Get Started <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
        <div className="absolute inset-0 bg-gradient-to-b from-primary-50/50 via-white to-white" />
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary-200/30 blur-3xl" />
        <div className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-accent-200/20 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="animate-slide-up">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-sm font-medium text-primary-700">
                <span className="flex h-2 w-2 rounded-full bg-primary-500 animate-pulse" />
                Trusted Micro-Task Platform in Bangladesh
              </div>
              <h1 className="font-heading text-4xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
                Earn Money Doing{' '}
                <span className="bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
                  Simple Tasks
                </span>
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-gray-600">
                Like, follow, subscribe, watch videos, complete surveys, and more.
                Join Bangladeshis earning online from the comfort of home.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-700 hover:shadow-md active:scale-95"
                >
                  Start Earning Now <ArrowRight className="h-4 w-4" />
                </Link>
                <button
                  type="button"
                  onClick={handleGoogleSignUp}
                  disabled={googleLoading}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:border-gray-400 active:scale-95 disabled:opacity-60"
                >
                  {googleLoading
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <GoogleIcon className="h-4 w-4" />}
                  Sign up with Google
                </button>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:border-gray-400 active:scale-95"
                >
                  Login
                </Link>
              </div>
              {googleError && (
                <p className="mt-3 text-sm text-error-600">{googleError}</p>
              )}

              <div className="mt-10 flex items-center gap-8">
                <div>
                  <div className="text-3xl font-bold text-gray-900">45+</div>
                  <div className="text-sm text-gray-500">Task Categories</div>
                </div>
                <div className="h-12 w-px bg-gray-200" />
                <div>
                  <div className="text-3xl font-bold text-gray-900">bKash</div>
                  <div className="text-sm text-gray-500">Nagad & Rocket</div>
                </div>
                <div className="h-12 w-px bg-gray-200" />
                <div>
                  <div className="text-3xl font-bold text-gray-900">Free</div>
                  <div className="text-sm text-gray-500">To Join</div>
                </div>
              </div>
            </div>

            <div className="relative animate-slide-up" style={{ animationDelay: '0.15s' }}>
              <div className="relative rounded-2xl shadow-2xl overflow-hidden">
                <img
                  src="https://images.pexels.com/photos/3183130/pexels-photo-3183130.jpeg?auto=compress&cs=tinysrgb&h=650&w=940"
                  alt="Young people working online"
                  className="w-full h-[420px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary-900/40 to-transparent" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section id="categories" className="py-20 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-heading text-3xl font-bold text-gray-900 sm:text-4xl">
              {categories.length > 0 ? categories.length : 45}+ Task Categories
            </h2>
            <p className="mt-3 text-lg text-gray-600">
              Pick from a wide range of micro-tasks across every major platform
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
            {categories.map((cat) => (
              <div
                key={cat}
                className="group flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-primary-300 hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-600 transition-colors group-hover:bg-primary-600 group-hover:text-white">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <span className="text-center text-xs font-medium text-gray-700">{cat}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="font-heading text-3xl font-bold text-gray-900 sm:text-4xl">
              How It Works
            </h2>
            <p className="mt-3 text-lg text-gray-600">
              Start earning in three simple steps
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.num} className="relative">
                <div className="mb-4 text-5xl font-extrabold text-primary-100">{step.num}</div>
                <h3 className="font-heading text-lg font-bold text-gray-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-gray-50 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="font-heading text-3xl font-bold text-gray-900 sm:text-4xl">
              Why Choose WORKER GIG BD?
            </h2>
            <p className="mt-3 text-lg text-gray-600">
              Everything you need to earn money online — in one platform
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feat) => (
              <div
                key={feat.title}
                className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-primary-200 hover:shadow-lg"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-md transition-transform group-hover:scale-110">
                  <feat.icon className="h-6 w-6" />
                </div>
                <h3 className="font-heading text-lg font-bold text-gray-900">{feat.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 bg-gray-50">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-heading text-3xl font-bold text-gray-900 sm:text-4xl">
              সাধারণ জিজ্ঞাসা
            </h2>
            <p className="mt-3 text-lg text-gray-600">
              WORKER GIG BD সম্পর্কে যে প্রশ্নগুলো সবচেয়ে বেশি করা হয়
            </p>
          </div>
          <div className="space-y-4">
            <details className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <summary className="flex cursor-pointer items-center justify-between font-semibold text-gray-900">
                WORKER GIG BD কী?
                <span className="text-primary-600 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-gray-600">
                WORKER GIG BD বাংলাদেশের একটি মাইক্রো-টাস্ক ও ফ্রিল্যান্স প্ল্যাটফর্ম, যেখানে আপনি সহজ অনলাইন টাস্ক (ফেসবুক লাইক, সাইন আপ, সার্ভে ইত্যাদি) সম্পন্ন করে ঘরে বসে আয় করতে পারেন।
              </p>
            </details>
            <details className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <summary className="flex cursor-pointer items-center justify-between font-semibold text-gray-900">
                আয় করা টাকা কীভাবে তুলব?
                <span className="text-primary-600 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-gray-600">
                ড্যাশবোর্ড থেকে উইথড্র অপশনে গিয়ে বিকাশ, নগদ বা রকেট অ্যাকাউন্ট দিয়ে ন্যূনতম পরিমাণ পূরণ করে টাকা তুলতে পারেন। $1 = 100 BDT.
              </p>
            </details>
            <details className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <summary className="flex cursor-pointer items-center justify-between font-semibold text-gray-900">
                সাইন আপ করতে কি টাকা লাগে?
                <span className="text-primary-600 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-gray-600">
                না, সাইন আপ সম্পূর্ণ ফ্রি। শুধু ইমেইল ও ইউজারনেম দিয়ে অ্যাকাউন্ট খুলে কাজ শুরু করতে পারেন।
              </p>
            </details>
            <details className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <summary className="flex cursor-pointer items-center justify-between font-semibold text-gray-900">
                কী কী ধরনের কাজ পাওয়া যায়?
                <span className="text-primary-600 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-gray-600">
                ফেসবুক, টুইটার, ইনস্টাগ্রাম, ইউটিউব/টফি, টিকটক, সাইন আপ, অ্যাডস ক্লিক, সার্ভে, জিমেইল অ্যাকাউন্ট, মোবাইল অ্যাপ, আর্টিকেল, কমেন্ট, লিংকডইন ও রেডিট — ৪৫+ ক্যাটাগরিতে কাজ পাওয়া যায়।
              </p>
            </details>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="font-heading text-3xl font-bold text-gray-900 sm:text-4xl lg:text-5xl">
            Ready to Start Earning?
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Join WORKER GIG BD today and turn your free time into income.
            It's free to sign up and start working immediately.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-primary-600/25 transition-all hover:bg-primary-700 hover:shadow-xl active:scale-95"
            >
              Create Free Account <ArrowRight className="h-5 w-5" />
            </Link>
            <button
              type="button"
              onClick={handleGoogleSignUp}
              disabled={googleLoading}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-8 py-4 text-base font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 active:scale-95 disabled:opacity-60"
            >
              {googleLoading
                ? <Loader2 className="h-5 w-5 animate-spin" />
                : <GoogleIcon className="h-5 w-5" />}
              Sign up with Google
            </button>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-8 py-4 text-base font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 active:scale-95"
            >
              Login
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-gray-500">
            <span className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-success-500" /> Free to join</span>
            <span className="flex items-center gap-1.5"><Lock className="h-4 w-4 text-primary-500" /> Secure payments</span>
            <span className="flex items-center gap-1.5"><Globe className="h-4 w-4 text-primary-500" /> Available nationwide</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-50 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-4">
            <div className="md:col-span-1">
              <Logo size={36} />
              <p className="mt-4 text-sm text-gray-500">
                Bangladesh's premier micro-task platform. Earn money completing simple online tasks.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Platform</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="#features" className="hover:text-primary-600">Features</a></li>
                <li><a href="#categories" className="hover:text-primary-600">Categories</a></li>
                <li><Link to="/login" className="hover:text-primary-600">Login</Link></li>
                <li><Link to="/signup" className="hover:text-primary-600">Get Started</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Support</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><Link to="/dashboard/ticket" className="hover:text-primary-600">Help Center</Link></li>
                <li><a href="#faq" className="hover:text-primary-600">FAQ</a></li>
                <li><Link to="/terms-of-service" className="hover:text-primary-600">Terms of Service</Link></li>
                <li><Link to="/privacy-policy" className="hover:text-primary-600">Privacy Policy</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Contact</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li>support@workergigbd.site</li>
                <li>workergigbd.site</li>
              </ul>
            </div>
          </div>
          <div className="mt-10 border-t border-gray-200 pt-6 text-center text-sm text-gray-500">
            © 2026 WORKER GIG BD. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
