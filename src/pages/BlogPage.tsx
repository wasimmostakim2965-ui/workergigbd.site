import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Clock, Sparkles, ShieldCheck, Briefcase } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useSeo } from '@/lib/useSeo';
import { BLOG_POSTS } from '@/data/blogPosts';

export function BlogPage() {
  useSeo({
    title: 'Learning Center — Earning Guides & Tips | WORKER GIG BD',
    description: 'Practical guides on micro-tasks, online work, safe payments, job posting and using WORKER GIG BD.',
    path: '/blog',
  });

  const featured = BLOG_POSTS[0];
  const remaining = BLOG_POSTS.slice(1);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <nav className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" aria-label="WORKER GIG BD home" className="transition-opacity hover:opacity-80"><Logo size={38} /></Link>
          <div className="hidden items-center gap-7 md:flex">
            <Link to="/" className="text-sm font-semibold text-slate-500 transition-colors hover:text-primary-600">Home</Link>
            <span className="text-sm font-bold text-primary-600">Learning</span>
            <Link to="/about" className="text-sm font-semibold text-slate-500 transition-colors hover:text-primary-600">About</Link>
            <Link to="/contact" className="text-sm font-semibold text-slate-500 transition-colors hover:text-primary-600">Contact</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="hidden text-sm font-semibold text-slate-600 hover:text-primary-600 sm:block">Log in</Link>
            <Link to="/signup" className="btn-primary !px-4 !py-2.5">Get started <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </nav>

      <main>
        <section className="relative isolate overflow-hidden border-b border-slate-200 bg-white">
          <div className="absolute -right-32 -top-40 h-96 w-96 rounded-full bg-primary-100/70 blur-3xl" />
          <div className="absolute -left-24 bottom-0 h-64 w-64 rounded-full bg-cyan-50 blur-3xl" />
          <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-3.5 py-2 text-xs font-extrabold uppercase tracking-[0.16em] text-primary-700">
                <Sparkles className="h-3.5 w-3.5" /> Learning Center
              </div>
              <h1 className="mt-6 max-w-4xl text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">Learn smarter. <span className="text-primary-600">Work better.</span></h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">Practical, beginner-friendly guides for workers and employers—so you can understand tasks, submit better proof, manage opportunities, and use the platform with confidence.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm"><BookOpen className="h-4 w-4 text-primary-600" /> Step-by-step guides</div>
                <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm"><ShieldCheck className="h-4 w-4 text-primary-600" /> Safer participation</div>
                <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm"><Briefcase className="h-4 w-4 text-primary-600" /> Worker + employer tips</div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          {featured && (
            <Link to={`/blog/${featured.slug}`} className="group relative grid overflow-hidden rounded-[28px] border border-slate-200 bg-slate-950 shadow-xl transition duration-300 hover:-translate-y-1 hover:shadow-2xl md:grid-cols-[1.25fr_.75fr]">
              <div className="relative flex min-h-[330px] flex-col justify-center p-8 text-white sm:p-12">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,.28),transparent_45%)]" />
                <div className="relative">
                  <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.15em] text-primary-200">Featured guide</span>
                  <h2 className="mt-5 max-w-2xl text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl lg:text-4xl">{featured.title}</h2>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">{featured.excerpt}</p>
                  <span className="mt-7 inline-flex items-center gap-2 text-sm font-extrabold text-white">Read the guide <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" /></span>
                </div>
              </div>
              <div className="relative flex min-h-[230px] items-center justify-center overflow-hidden bg-gradient-to-br from-primary-50 via-white to-sky-50 p-10">
                <div className="absolute h-56 w-56 rounded-full bg-primary-200/40 blur-3xl" />
                <div className="relative flex h-28 w-28 items-center justify-center rounded-[30px] border border-white bg-white shadow-2xl"><BookOpen className="h-12 w-12 text-primary-600" /></div>
              </div>
            </Link>
          )}

          <div className="mt-14 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-primary-600">Explore the library</p><h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">Latest guides</h2></div>
            <p className="text-sm font-medium text-slate-500">{BLOG_POSTS.length} practical articles</p>
          </div>

          <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {remaining.map((post) => (
              <Link key={post.slug} to={`/blog/${post.slug}`} className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-primary-200 hover:shadow-xl">
                <div className="flex items-center justify-between gap-3"><span className="rounded-full bg-primary-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-primary-700">{post.category}</span><ArrowRight className="h-4 w-4 text-slate-300 transition duration-200 group-hover:translate-x-1 group-hover:text-primary-600" /></div>
                <h3 className="mt-5 text-lg font-extrabold leading-7 text-slate-950 transition-colors group-hover:text-primary-700">{post.title}</h3>
                <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">{post.excerpt}</p>
                <div className="mt-6 flex items-center gap-1.5 border-t border-slate-100 pt-4 text-xs font-semibold text-slate-500"><Clock className="h-3.5 w-3.5" /> {post.readingTime} read <span className="text-slate-300">•</span> {post.date}</div>
              </Link>
            ))}
          </div>
        </section>

        <section className="border-y border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <div><p className="text-lg font-extrabold text-slate-950">Ready to put the guides into practice?</p><p className="mt-1 text-sm text-slate-600">Create an account and explore the marketplace when you’re ready.</p></div>
            <Link to="/signup" className="btn-primary w-fit">Create free account <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </section>
      </main>

      <footer className="bg-slate-950 py-9 text-slate-400"><div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8"><span>© 2026 WORKER GIG BD. All rights reserved.</span><div className="flex gap-5"><Link to="/privacy-policy" className="hover:text-white">Privacy</Link><Link to="/terms-of-service" className="hover:text-white">Terms</Link><Link to="/" className="font-semibold text-white hover:text-primary-300">Back to home</Link></div></div></footer>
    </div>
  );
}
