import { Link } from 'react-router-dom';
import {
  ArrowRight, CheckCircle, Users, TrendingUp, Wallet, Shield,
  Facebook, Youtube, Instagram, Twitter, Smartphone, PenTool,
  MousePointerClick, ClipboardList, Mail, MessageSquare, Linkedin,
  Hash, UserPlus, Zap, BarChart3, Lock, Globe, Music2,
} from 'lucide-react';
import { Logo } from '@/components/Logo';

const categoryIcons: Record<string, typeof Facebook> = {
  Facebook, Twitter, Instagram, 'YouTube/Toffe': Youtube, TikTok: Music2,
  'Sign Up': UserPlus, 'Ads Click': MousePointerClick, Survey: ClipboardList,
  'Gmail Account': Mail, 'Mobile Application': Smartphone, 'Write an Article': PenTool,
  Comment: MessageSquare, LinkedIn: Linkedin, Reddit: Hash,
};

const categories = [
  'Facebook', 'Twitter', 'Instagram', 'YouTube/Toffe', 'TikTok',
  'Sign Up', 'Ads Click', 'Survey', 'Gmail Account', 'Mobile Application',
  'Write an Article', 'Comment', 'LinkedIn', 'Reddit',
];

const features = [
  { icon: Wallet, title: 'Easy Deposits & Withdrawals', desc: 'bKash, Nagad, Rocket — deposit and withdraw your earnings instantly with low fees.' },
  { icon: Shield, title: 'Secure & Trusted', desc: 'Every transaction is protected. Admin-verified deposits and withdrawals keep your money safe.' },
  { icon: TrendingUp, title: 'Unlimited Earning Potential', desc: 'Complete tasks, post jobs, refer friends, and run ads — multiple income streams in one platform.' },
  { icon: Zap, title: 'Fast Task Completion', desc: 'Quick, simple micro-tasks that take minutes. Like, follow, subscribe, watch, and earn.' },
  { icon: Users, title: 'Growing Community', desc: 'Join thousands of Bangladeshi freelancers earning online from home.' },
  { icon: BarChart3, title: 'Detailed Analytics', desc: 'Track your earnings, task completion rate, and growth with a powerful dashboard.' },
];

const steps = [
  { num: '01', title: 'Create Your Account', desc: 'Sign up for free with just your email and username. No verification hassle.' },
  { num: '02', title: 'Choose & Complete Tasks', desc: 'Browse 45+ task categories, pick what you like, complete it, and submit proof.' },
  { num: '03', title: 'Get Your Earnings', desc: 'Withdraw your earnings to bKash, Nagad, or Rocket once you reach the minimum amount.' },
];

export function LandingPage() {
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
                Bangladesh's #1 Micro-Task Platform
              </div>
              <h1 className="font-heading text-4xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
                Earn Money Doing{' '}
                <span className="bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
                  Simple Tasks
                </span>
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-gray-600">
                Like, follow, subscribe, watch videos, complete surveys, and more.
                Join thousands of Bangladeshis earning online from the comfort of home.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-700 hover:shadow-md active:scale-95"
                >
                  Start Earning Now <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:border-gray-400 active:scale-95"
                >
                  Login
                </Link>
              </div>

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
              45+ Task Categories
            </h2>
            <p className="mt-3 text-lg text-gray-600">
              Pick from a wide range of micro-tasks across every major platform
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
            {categories.map((cat) => {
              const Icon = categoryIcons[cat] || CheckCircle;
              return (
                <div
                  key={cat}
                  className="group flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-primary-300 hover:shadow-md hover:-translate-y-0.5"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-600 transition-colors group-hover:bg-primary-600 group-hover:text-white">
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="text-center text-xs font-medium text-gray-700">{cat}</span>
                </div>
              );
            })}
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
              Why Choose Worker Gig BD?
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

      {/* CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="font-heading text-3xl font-bold text-gray-900 sm:text-4xl lg:text-5xl">
            Ready to Start Earning?
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Join Worker Gig BD today and turn your free time into income.
            It's free to sign up and start working immediately.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-primary-600/25 transition-all hover:bg-primary-700 hover:shadow-xl active:scale-95"
            >
              Create Free Account <ArrowRight className="h-5 w-5" />
            </Link>
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
                <li><a href="#" className="hover:text-primary-600">Help Center</a></li>
                <li><a href="#" className="hover:text-primary-600">FAQ</a></li>
                <li><a href="#" className="hover:text-primary-600">Terms of Service</a></li>
                <li><a href="#" className="hover:text-primary-600">Privacy Policy</a></li>
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
            © 2026 Worker Gig BD. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
