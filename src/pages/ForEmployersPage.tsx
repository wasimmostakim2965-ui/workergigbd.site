import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ClipboardList, Users, WalletCards, ShieldCheck, Zap } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useSeo } from '@/lib/useSeo';

const benefits = [
  { icon: ClipboardList, title: 'সহজে কাজ পোস্ট করুন', desc: 'কাজের বিবরণ, প্রয়োজনীয় যোগ্যতা, পুরস্কার ও প্রমাণের নিয়ম পরিষ্কারভাবে লিখুন।' },
  { icon: Users, title: 'বাংলাদেশের কর্মীদের কাছে পৌঁছান', desc: 'বৈধ ও পরিষ্কারভাবে সংজ্ঞায়িত মাইক্রো-টাস্ক এমন কর্মীদের সামনে দিন যারা অনলাইন কাজ খুঁজছেন।' },
  { icon: ShieldCheck, title: 'সাবমিশন যাচাই করুন', desc: 'কর্মীরা কাজ শেষ করে যে প্রমাণ জমা দেয়, আপনার প্রয়োজন অনুযায়ী তা যাচাই করে অনুমোদন করুন।' },
  { icon: WalletCards, title: 'বাজেট নিয়ন্ত্রণ করুন', desc: 'প্রতি টাস্কের reward, প্রয়োজনীয় worker এবং campaign budget পরিকল্পনা করুন।' },
];

const examples = ['Survey ও গবেষণা', 'Website বা app testing', 'Content research', 'Data collection', 'Community ও social tasks', 'অন্যান্য বৈধ micro-task'];

export function ForEmployersPage() {
  useSeo({
    title: 'বাংলাদেশে Micro Job পোস্ট করুন | WORKER GIG BD',
    description: 'বাংলাদেশের কর্মীদের জন্য বৈধ micro-task পোস্ট করুন। কাজের নিয়ম, reward ও proof requirements সেট করে WORKER GIG BD-তে submission যাচাই করুন।',
    path: '/for-employers',
  });

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <nav className="sticky top-0 z-40 border-b border-gray-100 bg-white/90 backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link to="/" aria-label="WORKER GIG BD home"><Logo size={40} /></Link>
          <div className="flex items-center gap-3">
            <Link to="/login" className="hidden text-sm font-semibold text-gray-700 hover:text-primary-600 sm:inline-flex">লগইন</Link>
            <Link to="/signup" className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700">অ্যাকাউন্ট খুলুন <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </nav>

      <main>
        <section className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-white to-white py-20 sm:py-28">
          <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-primary-200/30 blur-3xl" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary-200 bg-white px-3.5 py-1.5 text-sm font-semibold text-primary-700 shadow-sm">
                <Zap className="h-4 w-4" /> Employer &amp; Task Poster
              </div>
              <h1 className="font-heading text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                বাংলাদেশে ছোট কাজ করানোর জন্য worker খুঁজছেন?
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-600">
                একটি বৈধ micro-task পোস্ট করুন, কাজের নিয়ম ও reward ঠিক করুন, proof requirements দিন এবং WORKER GIG BD-তে জমা পড়া কাজ যাচাই করুন।
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to="/signup" className="btn-primary px-6 py-3">কাজ পোস্ট শুরু করুন <ArrowRight className="h-5 w-5" /></Link>
                <Link to="/login" className="btn-secondary px-6 py-3">আগেই অ্যাকাউন্ট আছে?</Link>
              </div>
              <p className="mt-4 text-sm text-gray-500">অযাচাইকৃত বা বেআইনি কাজ নয়—শুধু পরিষ্কার, বৈধ এবং যাচাইযোগ্য task পোস্ট করুন।</p>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xl sm:p-8">
              <div className="flex items-center justify-between border-b border-gray-100 pb-5">
                <div>
                  <p className="text-sm font-semibold text-primary-600">Task campaign</p>
                  <h2 className="mt-1 text-xl font-bold">কাজ পোস্ট করার সহজ ধাপ</h2>
                </div>
                <ClipboardList className="h-8 w-8 text-primary-600" />
              </div>
              <div className="mt-6 space-y-4">
                {['কাজের বিবরণ লিখুন', 'Reward ও requirements সেট করুন', 'যোগ্য task publish করুন', 'Proof দেখে valid work approve করুন'].map((item, index) => (
                  <div key={item} className="flex items-center gap-3 rounded-xl bg-gray-50 p-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">{index + 1}</span>
                    <span className="text-sm font-semibold text-gray-800">{item}</span>
                    <CheckCircle2 className="ml-auto h-5 w-5 text-emerald-500" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-heading text-3xl font-bold sm:text-4xl">যেসব ছোট ও repeatable কাজের জন্য উপযোগী</h2>
              <p className="mt-3 text-lg text-gray-600">যে কাজগুলোকে পরিষ্কার নির্দেশনা দিয়ে ছোট, যাচাইযোগ্য ধাপে ভাগ করা যায়।</p>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {benefits.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="card p-6 transition-all hover:-translate-y-1 hover:shadow-lg">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-600"><Icon className="h-5 w-5" /></div>
                  <h3 className="mt-5 font-heading text-lg font-bold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-600">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-gray-50 py-20 sm:py-24">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
            <div>
              <h2 className="font-heading text-3xl font-bold sm:text-4xl">কী ধরনের কাজ পোস্ট করতে পারেন?</h2>
              <p className="mt-4 text-gray-600">উদাহরণ হিসেবে এমন task যা সহজ, বৈধ এবং নির্দিষ্ট proof দিয়ে যাচাই করা যায়:</p>
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {examples.map((example) => (
                  <div key={example} className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary-600" />
                    <span className="text-sm font-medium text-gray-800">{example}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl bg-gray-900 p-8 text-white sm:p-10">
              <p className="text-sm font-semibold text-primary-300">ভালো task brief</p>
              <h2 className="mt-3 font-heading text-3xl font-bold">নির্দেশনা যত পরিষ্কার, submission তত ভালো।</h2>
              <ul className="mt-7 space-y-4 text-sm leading-6 text-gray-300">
                <li>• Worker ঠিক কী করবে তা স্পষ্টভাবে লিখুন।</li>
                <li>• কোন proof গ্রহণযোগ্য তা আগে জানান।</li>
                <li>• Eligibility, limits ও deadline উল্লেখ করুন।</li>
                <li>• কাজের পরিমাণ অনুযায়ী fair reward দিন।</li>
                <li>• শুধু lawful ও legitimate task পোস্ট করুন।</li>
              </ul>
              <Link to="/signup" className="mt-8 inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-bold text-gray-900 hover:bg-gray-100">কাজ পোস্ট করুন <ArrowRight className="h-4 w-4" /></Link>
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <h2 className="font-heading text-3xl font-bold sm:text-4xl">আপনার প্রথম task publish করতে প্রস্তুত?</h2>
            <p className="mt-4 text-lg text-gray-600">অ্যাকাউন্ট খুলে dashboard-এর task-posting workflow ব্যবহার করুন।</p>
            <Link to="/signup" className="btn-primary mt-8 px-7 py-3.5">অ্যাকাউন্ট তৈরি করুন <ArrowRight className="h-5 w-5" /></Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-200 bg-gray-50 py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span>© 2026 WORKER GIG BD</span>
          <div className="flex gap-5"><Link to="/privacy-policy" className="hover:text-primary-600">Privacy</Link><Link to="/terms-of-service" className="hover:text-primary-600">Terms</Link><Link to="/contact" className="hover:text-primary-600">Contact</Link></div>
        </div>
      </footer>
    </div>
  );
}
