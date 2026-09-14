import { Link, useParams, Navigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, Clock } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useSeo } from '@/lib/useSeo';
import { BLOG_POSTS } from '@/data/blogPosts';

export function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const post = BLOG_POSTS.find((p) => p.slug === slug);

  useSeo({
    title: post ? `${post.title} | WORKER GIG BD Blog` : 'Blog | WORKER GIG BD',
    description: post?.excerpt ?? 'Earning guides from WORKER GIG BD.',
    path: `/blog/${slug ?? ''}`,
    type: 'article',
  });

  if (!post) return <Navigate to="/blog" replace />;

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" aria-label="WORKER GIG BD home"><Logo size={36} /></Link>
          <Link to="/blog" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-primary-600"><ArrowLeft className="h-4 w-4" /> All guides</Link>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
        <Link to="/blog" className="inline-flex items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-700"><ArrowLeft className="h-4 w-4" /> Learning Center</Link>
        <article className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <header className="border-b border-slate-100 px-6 py-9 sm:px-10 sm:py-12">
            <span className="rounded-full bg-primary-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-primary-700">{post.category}</span>
            <h1 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight text-slate-950 sm:text-5xl">{post.title}</h1>
            <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-slate-500"><span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4" /> {post.readingTime} read</span><span>Published {post.date}</span></div>
          </header>

          <div className="px-6 py-8 sm:px-10 sm:py-12">
            <div className="prose prose-slate max-w-none text-slate-700 prose-headings:font-heading prose-headings:text-slate-950 prose-a:text-primary-600 prose-strong:text-slate-900">
              {post.content.map((block, i) => {
                if (block.type === 'h2') return <h2 key={i}>{block.text}</h2>;
                if (block.type === 'ul') return <ul key={i}>{block.items?.map((item, j) => <li key={j}>{item}</li>)}</ul>;
                return <p key={i}>{block.text}</p>;
              })}
            </div>
          </div>
        </article>

        <section className="mt-8 rounded-3xl bg-slate-950 p-7 text-white sm:p-9">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div><div className="flex items-center gap-2 text-primary-300"><BookOpen className="h-5 w-5" /><span className="text-sm font-bold uppercase tracking-wider">Ready to learn more?</span></div><h2 className="mt-2 text-2xl font-extrabold">Explore more practical guides.</h2><p className="mt-2 text-sm leading-6 text-slate-300">Build your understanding before you start working or posting a task.</p></div>
            <Link to="/blog" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-900 hover:bg-slate-100">Browse guides <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-8"><div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 text-sm text-slate-500 sm:px-6 lg:px-8 sm:flex-row sm:items-center sm:justify-between"><span>© 2026 WORKER GIG BD. All rights reserved.</span><Link to="/" className="font-semibold hover:text-primary-600">Back to home</Link></div></footer>
    </div>
  );
}
