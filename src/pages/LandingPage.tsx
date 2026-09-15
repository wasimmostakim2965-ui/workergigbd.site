import { Link } from 'react-router-dom';
import { useState } from 'react';
import {
  ArrowRight, CheckCircle2, ClipboardCheck, ShieldCheck, Wallet,
  Search, Users, Zap, ChevronDown, LockKeyhole, BadgeCheck,
  Briefcase, Sparkles, Menu, X, CircleDollarSign,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { GoogleIcon } from '@/components/GoogleIcon';
import { useAuth } from '@/context/AuthContext';
import { useSeo } from '@/lib/useSeo';

const benefits = [
  {
    icon: ShieldCheck,
    title: 'Work with clear expectations',
    desc: 'See the requirements, reward, and proof instructions before you decide to start a task.',
  },
  {
    icon: ClipboardCheck,
    title: 'Complete and submit proof',
    desc: 'Follow the task instructions, submit the requested proof, and keep the process easy to understand.',
  },
  {
    icon: Wallet,
    title: 'Keep your work organised',
    desc: 'Track approved work, balance activity, and withdrawal requests from your account dashboard.',
  },
];

const steps = [
  {
    number: '01',
    icon: Users,
    title: 'Create your account',
    desc: 'Sign up with Google and complete the account information required by the platform.',
  },
  {
    number: '02',
    icon: Search,
    title: 'Find a suitable task',
    desc: 'Review the available work, reward, requirements, and proof instructions before starting.',
  },
  {
    number: '03',
    icon: ClipboardCheck,
    title: 'Complete & submit proof',
    desc: 'Follow the instructions honestly, submit the requested proof, and let the job owner review it.',
  },
  {
    number: '04',
    icon: CircleDollarSign,
    title: 'Track your balance',
    desc: 'Approved work is reflected in your account so you can manage your earnings and withdrawals.',
  },
];

const faqs = [
  {
    q: 'WORKER GIG BD কী?',
    a: 'WORKER GIG BD একটি বাংলাদেশ-কেন্দ্রিক মাইক্রো-টাস্ক মার্কেটপ্লেস। এখানে ব্যবহারকারীরা উপলভ্য কাজের শর্ত ও পুরস্কার দেখে উপযুক্ত কাজ বেছে নিয়ে সম্পন্ন করতে পারেন।',
  },
  {
    q: 'সাইন আপ করতে কি টাকা লাগে?',
    a: 'না। অ্যাকাউন্ট তৈরি করা ফ্রি। সাইন আপ করতে Google ব্যবহার করতে পারেন এবং প্রয়োজনে একটি referral code দিতে পারেন।',
  },
  {
    q: 'কাজ শুরু করার আগে কী দেখতে পারব?',
    a: 'প্রতিটি কাজের নির্দেশনা, প্রয়োজনীয় proof এবং প্রাসঙ্গিক reward/শর্ত দেখে তারপর কাজটি নেওয়ার সিদ্ধান্ত নিতে পারবেন।',
  },
  {
    q: 'টাকা কীভাবে তুলব?',
    a: 'আপনার অ্যাকাউন্টের বর্তমান withdrawal rules পূরণ হলে dashboard থেকে available withdrawal method ব্যবহার করে request করতে পারবেন।',
  },
];

export function LandingPage() {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const { signUpWithGoogle } = useAuth();

  const handleGoogleSignUp = async () => {
    setGoogleError('');
    setGoogleLoading(true);
    const { error } = await signUpWithGoogle();
    if (error) {
      setGoogleError(error);
      setGoogleLoading(false);
    }
  };

  useSeo({
    title: 'WORKER GIG BD — Bangladesh Micro-task Marketplace',
    description: 'Find suitable micro-tasks, review requirements, submit proof, and manage your earnings on WORKER GIG BD.',
    path: '/',
  });

  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-slate-950">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <nav className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8" aria-label="Main navigation">
          <Link to="/" aria-label="WORKER GIG BD home" onClick={closeMobile}>
            <Logo size={40} />
          </Link>

          <div className="hidden items-center gap-7 lg:flex">
            <a href="#how-it-works" className="text-sm font-semibold text-slate-600 transition hover:text-primary-600">How it works</a>
            <a href="#why-us" className="text-sm font-semibold text-slate-600 transition hover:text-primary-600">Why us</a>
            <a href="#faq" className="text-sm font-semibold text-slate-600 transition hover:text-primary-600">FAQ</a>
            <Link to="/blog" className="text-sm font-semibold text-slate-600 transition hover:text-primary-600">Blog</Link>
          </div>

          <div className="hidden items-center gap-3 sm:flex">
            <Link to="/login" className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100">Log in</Link>
            <Link to="/signup" className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-primary-700 hover:shadow-lg">
              Create account <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <button
            type="button"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
            className="rounded-xl p-2 text-slate-700 hover:bg-slate-100 sm:hidden"
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </nav>

        {mobileOpen && (
          <div className="border-t border-slate-200 bg-white px-5 py-4 sm:hidden">
            <div className="flex flex-col gap-1">
              <a href="#how-it-works" onClick={closeMobile} className="rounded-lg px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">How it works</a>
              <a href="#why-us" onClick={closeMobile} className="rounded-lg px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Why us</a>
              <a href="#faq" onClick={closeMobile} className="rounded-lg px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">FAQ</a>
              <Link to="/login" onClick={closeMobile} className="mt-2 rounded-xl border border-slate-200 px-4 py-3 text-center text-sm font-bold text-slate-700">Log in</Link>
              <Link to="/signup" onClick={closeMobile} className="rounded-xl bg-primary-600 px-4 py-3 text-center text-sm font-bold text-white">Create account</Link>
            </div>
          </div>
        )}
      </header>

      <main>
        <section className="relative isolate overflow-hidden border-b border-slate-100 bg-slate-50/70">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(37,99,235,0.12),transparent_45%)]" />
          <div className="mx-auto max-w-7xl px-5 pb-20 pt-16 sm:px-6 sm:pb-24 sm:pt-20 lg:px-8 lg:pb-28 lg:pt-24">
            <div className="mx-auto max-w-4xl text-center">
              <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-primary-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-primary-700 shadow-sm">
                <Sparkles className="h-4 w-4" />
                Bangladesh-focused micro-task marketplace
              </div>

              <h1 className="mt-7 font-heading text-4xl font-extrabold leading-[1.05] tracking-[-0.045em] text-slate-950 sm:text-6xl lg:text-7xl">
                A clearer way to
                <span className="block bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">find and complete work.</span>
              </h1>

              <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                Discover suitable work, understand the requirements before you begin, submit proof when the work is complete, and manage your account from one place.
              </p>

              <div className="mt-9 flex flex-col items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleGoogleSignUp}
                  disabled={googleLoading}
                  className="group inline-flex min-w-[250px] items-center justify-center gap-3 rounded-2xl bg-primary-600 px-7 py-4 text-base font-extrabold text-white shadow-[0_16px_35px_rgba(37,99,235,0.22)] transition hover:-translate-y-1 hover:bg-primary-700 hover:shadow-[0_20px_45px_rgba(37,99,235,0.28)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <GoogleIcon className="h-5 w-5 rounded-full bg-white" />
                  {googleLoading ? 'Connecting…' : 'Start with Google'}
                  {!googleLoading && <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />}
                </button>

                <Link to="/signup" className="text-sm font-bold text-slate-500 transition hover:text-primary-600">
                  Prefer a referral code? Create an account
                </Link>

                {googleError && (
                  <p role="alert" className="max-w-md text-sm font-medium text-error-600">{googleError}</p>
                )}
              </div>

              <div className="mx-auto mt-9 flex max-w-2xl flex-wrap items-center justify-center gap-x-7 gap-y-3 text-xs font-semibold text-slate-500">
                <span className="inline-flex items-center gap-1.5"><LockKeyhole className="h-4 w-4 text-primary-600" /> Google authentication</span>
                <span className="inline-flex items-center gap-1.5"><BadgeCheck className="h-4 w-4 text-primary-600" /> Clear task requirements</span>
                <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-primary-600" /> Proof-based review</span>
              </div>
            </div>

            <div className="mx-auto mt-14 max-w-5xl">
              <div className="rounded-[28px] border border-slate-200 bg-white p-2 shadow-[0_28px_80px_rgba(15,23,42,0.10)] sm:p-3">
                <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-5 sm:p-8">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary-600">A simpler workflow</p>
                      <p className="mt-2 font-heading text-xl font-extrabold text-slate-950 sm:text-2xl">Everything stays clear from start to finish.</p>
                    </div>
                    <div className="hidden h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm sm:flex">
                      <CheckCircle2 className="h-5 w-5 text-primary-600" />
                    </div>
                  </div>
                  <div className="mt-7 grid gap-3 sm:grid-cols-4">
                    {steps.map((step, index) => (
                      <div key={step.number} className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
                            <step.icon className="h-4 w-4" />
                          </div>
                          <span className="text-[11px] font-extrabold tracking-wider text-slate-300">{step.number}</span>
                        </div>
                        <p className="mt-4 text-sm font-extrabold text-slate-900">{step.title}</p>
                        {index < steps.length - 1 && (
                          <ArrowRight className="absolute -right-3 top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 rounded-full bg-white p-0.5 text-slate-300 sm:block" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-24 py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-primary-600">Simple by design</p>
              <h2 className="mt-3 font-heading text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">A clear path from task to completion</h2>
              <p className="mt-4 text-base leading-7 text-slate-600">Everything important happens in a straightforward sequence.</p>
            </div>
            <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {steps.map((step) => (
                <div key={step.number} className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-700"><step.icon className="h-5 w-5" /></div>
                    <span className="font-heading text-4xl font-extrabold text-slate-100">{step.number}</span>
                  </div>
                  <h3 className="mt-6 font-heading text-lg font-extrabold text-slate-900">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>


        <section id="why-us" className="scroll-mt-24 py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-primary-600">Built around the work</p>
              <h2 className="mt-3 font-heading text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">Everything you need to get started.</h2>
              <p className="mt-4 text-base leading-7 text-slate-600">A focused marketplace experience: understand the task, do the work, submit proof, and manage your account.</p>
            </div>
            <div className="mx-auto mt-12 grid max-w-5xl gap-5 md:grid-cols-3">
              {benefits.map((benefit) => (
                <article key={benefit.title} className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-700"><benefit.icon className="h-5 w-5" /></div>
                  <h3 className="mt-5 font-heading text-lg font-extrabold text-slate-900">{benefit.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{benefit.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-slate-950 py-20 text-white sm:py-24">
          <div className="mx-auto max-w-4xl px-5 text-center sm:px-6">
            <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-primary-300">Ready when you are</p>
            <h2 className="mt-3 font-heading text-3xl font-extrabold tracking-tight sm:text-5xl">Find work that fits your time.</h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              Create your account, review the available work, and choose tasks based on their actual requirements.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={handleGoogleSignUp}
                disabled={googleLoading}
                className="inline-flex min-w-[250px] items-center justify-center gap-3 rounded-2xl bg-white px-7 py-4 text-base font-extrabold text-slate-950 shadow-xl transition hover:-translate-y-1 hover:bg-slate-100 disabled:opacity-60"
              >
                <GoogleIcon className="h-5 w-5" />
                {googleLoading ? 'Connecting…' : 'Create account with Google'}
                {!googleLoading && <ArrowRight className="h-5 w-5" />}
              </button>
              <Link to="/login" className="text-sm font-semibold text-slate-400 hover:text-white">Already registered? Log in</Link>
            </div>
          </div>
        </section>

        <section id="faq" className="scroll-mt-24 py-20 sm:py-24">
          <div className="mx-auto max-w-3xl px-5 sm:px-6">
            <div className="text-center">
              <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-primary-600">FAQ</p>
              <h2 className="mt-3 font-heading text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">Questions, answered clearly.</h2>
            </div>
            <div className="mt-10 space-y-3">
              {faqs.map((faq) => (
                <details key={faq.q} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-5 font-bold text-slate-900 [&::-webkit-details-marker]:hidden">
                    {faq.q}
                    <ChevronDown className="h-5 w-5 shrink-0 text-slate-400 transition group-open:rotate-180" />
                  </summary>
                  <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div>
              <Logo size={40} />
              <p className="mt-4 max-w-sm text-sm leading-6 text-slate-600">
                A focused marketplace for people who want to discover tasks, understand the requirements, and manage completed work from one account.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Platform</h3>
              <ul className="mt-4 space-y-3 text-sm text-slate-600">
                <li><a href="#how-it-works" className="hover:text-primary-600">How it works</a></li>
                <li><a href="#why-us" className="hover:text-primary-600">Why us</a></li>
                <li><Link to="/for-employers" className="hover:text-primary-600">For employers</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Company</h3>
              <ul className="mt-4 space-y-3 text-sm text-slate-600">
                <li><Link to="/about" className="hover:text-primary-600">About</Link></li>
                <li><Link to="/blog" className="hover:text-primary-600">Blog</Link></li>
                <li><Link to="/contact" className="hover:text-primary-600">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Legal</h3>
              <ul className="mt-4 space-y-3 text-sm text-slate-600">
                <li><Link to="/terms-of-service" className="hover:text-primary-600">Terms of Service</Link></li>
                <li><Link to="/privacy-policy" className="hover:text-primary-600">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-10 flex flex-col gap-3 border-t border-slate-200 pt-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>© 2026 WORKER GIG BD. All rights reserved.</p>
            <p>Clear requirements. Real proof. Account-based earnings.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
