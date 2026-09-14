import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ClipboardList, Users, WalletCards, ShieldCheck, Zap } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useSeo } from '@/lib/useSeo';

const benefits = [
  { icon: ClipboardList, title: 'Post a clear task', desc: 'Describe the work, requirements, reward and proof you need so workers know exactly what to do.' },
  { icon: Users, title: 'Reach Bangladesh workers', desc: 'Put legitimate micro-tasks in front of workers looking for flexible online opportunities.' },
  { icon: ShieldCheck, title: 'Review submitted proof', desc: 'Check task submissions against your requirements before approving completed work.' },
  { icon: WalletCards, title: 'Manage your budget', desc: 'Use the platform workflow to plan task rewards and manage your campaign spending.' },
];

const examples = ['Survey responses', 'Website or app testing', 'Content research', 'Data collection', 'Social/community tasks', 'Other legitimate micro-tasks'];

export function ForEmployersPage() {
  useSeo({
    title: 'Post Micro Tasks in Bangladesh | WORKER GIG BD',
    description: 'Post legitimate micro-tasks and reach workers in Bangladesh. Set requirements, rewards and proof rules, then review completed submissions on WORKER GIG BD.',
    path: '/for-employers',
  });

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <nav className="sticky top-0 z-40 border-b border-gray-100 bg-white/90 backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link to="/" aria-label="WORKER GIG BD home"><Logo size={40} /></Link>
          <div className="flex items-center gap-3">
            <Link to="/login" className="hidden text-sm font-semibold text-gray-700 hover:text-primary-600 sm:inline-flex">Login</Link>
            <Link to="/signup" className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700">Create account <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </nav>

      <main>
        <section className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-white to-white py-20 sm:py-28">
          <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-primary-200/30 blur-3xl" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary-200 bg-white px-3.5 py-1.5 text-sm font-semibold text-primary-700 shadow-sm">
                <Zap className="h-4 w-4" /> For employers & task posters
              </div>
              <h1 className="font-heading text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                Need small tasks done by people in Bangladesh?
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-600">
                Post a legitimate micro-task, explain the requirements clearly, set the reward and proof rules, then review submissions through WORKER GIG BD.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to="/signup" className="btn-primary px-6 py-3">Create an account <ArrowRight className="h-5 w-5" /></Link>
                <Link to="/login" className="btn-secondary px-6 py-3">Already have an account?</Link>
              </div>
              <p className="mt-4 text-sm text-gray-500">No paid advertising required to get started. Use the marketplace workflow to publish eligible tasks.</p>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xl sm:p-8">
              <div className="flex items-center justify-between border-b border-gray-100 pb-5">
                <div>
                  <p className="text-sm font-semibold text-primary-600">Task campaign</p>
                  <h2 className="mt-1 text-xl font-bold">A simple posting workflow</h2>
                </div>
                <ClipboardList className="h-8 w-8 text-primary-600" />
              </div>
              <div className="mt-6 space-y-4">
                {['Describe the task', 'Set reward and requirements', 'Publish an eligible task', 'Review proof and approve valid work'].map((item, index) => (
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
              <h2 className="font-heading text-3xl font-bold sm:text-4xl">Built for small, repeatable tasks</h2>
              <p className="mt-3 text-lg text-gray-600">Useful when you need many people to complete a clearly defined piece of work.</p>
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
              <h2 className="font-heading text-3xl font-bold sm:text-4xl">What can you post?</h2>
              <p className="mt-4 text-gray-600">Examples of legitimate tasks that can be broken into simple, verifiable actions:</p>
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
              <p className="text-sm font-semibold text-primary-300">A better task brief</p>
              <h2 className="mt-3 font-heading text-3xl font-bold">Clear requirements mean better submissions.</h2>
              <ul className="mt-7 space-y-4 text-sm leading-6 text-gray-300">
                <li>• State exactly what the worker must do.</li>
                <li>• Explain what counts as acceptable proof.</li>
                <li>• Specify eligibility, limits and deadlines.</li>
                <li>• Set a fair reward that matches the work.</li>
                <li>• Only post lawful and legitimate tasks.</li>
              </ul>
              <Link to="/signup" className="mt-8 inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-bold text-gray-900 hover:bg-gray-100">Start posting <ArrowRight className="h-4 w-4" /></Link>
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <h2 className="font-heading text-3xl font-bold sm:text-4xl">Ready to publish your first task?</h2>
            <p className="mt-4 text-lg text-gray-600">Create your account and use the dashboard to access the task-posting workflow.</p>
            <Link to="/signup" className="btn-primary mt-8 px-7 py-3.5">Create account <ArrowRight className="h-5 w-5" /></Link>
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
