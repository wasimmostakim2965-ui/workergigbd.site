import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Clock, Sparkles } from 'lucide-react';
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
    <div className="min-h-screen bg-slate-50">
      <nav className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" aria-label="WORKER GIG BD home"><Logo size={36} /></Link>
          <div className="flex items-center gap-3">
            <Link to="/" className="hidden text-sm font-semibold text-slate-600 hover:text-primary-600 sm:block">Home</Link>
            <Link to="/signup" className="btn-primary !px-4 !py-2.5">Get started <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </nav>

      <main>
        <section className="relative overflow-hidden border-b border-slate-200 bg-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.12),transparent_35%)]" />
          <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary-100 bg-primary-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-primary-700">
                <Sparkles className="h-3.5 w-3.5" /> Learning Center
              </div>
              <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">Learn smarter. Work better.</h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">Clear, practical guides for workers and employers—from understanding micro-tasks to submitting proof and posting better jobs.</p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          {featured && (
            <Link to={`/blog/${featured.slug}`} className="group grid overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl md:grid-cols-[1.25fr_1fr]">
              <div className="flex min-h-[300px] flex-col justify-center bg-slate-950 p-8 text-white sm:p-10">
                <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary-200">Featured guide</span>
                <h2 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-4xl">{featured.title}</h2>
                <p className="mt-4 max-w-xl leading-7 text-slate-300">{featured.excerpt}</p>
                <span className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-white">Read guide <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
              </div>
              <div className="flex items-center justify-center bg-primary-50 p-10">
                <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-white text-primary-600 shadow-lg"><BookOpen className="h-10 w-10" /></div>
              </div>
            </Link>
          )}

          <div className="mt-14 flex items-end justify-between gap-4">
            <div><p className="text-sm font-bold uppercase tracking-wider text-primary-600">Explore</p><h2 className="mt-1 text-2xl font-extrabold text-slate-950">Latest guides</h2></div>
            <span className="text-sm text-slate-500">{BLOG_POSTS.length} practical articles</span>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {remaining.map((post) => (
              <Link key={post.slug} to={`/blog/${post.slug}`} className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary-200 hover:shadow-lg">
                <div className="flex items-center justify-between gap-3"><span className="rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-primary-700">{post.category}</span><ArrowRight className="h-4 w-4 text-slate-300 transition-all group-hover:translate-x-1 group-hover:text-primary-600" /></div>
                <h3 className="mt-5 text-lg font-bold leading-7 text-slate-950 group-hover:text-primary-700">{post.title}</h3>
                <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">{post.excerpt}</p>
                <div className="mt-6 flex items-center gap-1.5 border-t border-slate-100 pt-4 text-xs font-medium text-slate-500"><Clock className="h-3.5 w-3.5" /> {post.readingTime} read · {post.date}</div>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-8"><div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 text-sm text-slate-500 sm:px-6 lg:px-8 sm:flex-row sm:items-center sm:justify-between"><span>© 2026 WORKER GIG BD. All rights reserved.</span><Link to="/" className="font-semibold hover:text-primary-600">Back to home</Link></div></footer>
    </div>
  );
}
