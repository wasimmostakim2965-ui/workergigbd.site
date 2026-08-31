import { Link } from 'react-router-dom';
import { Clock, ArrowRight } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useSeo } from '@/lib/useSeo';
import { BLOG_POSTS } from '@/data/blogPosts';

export function BlogPage() {
  useSeo({
    title: 'Blog — Earning Guides & Tips | WORKER GIG BD',
    description:
      'Guides on earning money online in Bangladesh: micro-tasks, bKash withdrawals, job posting, safety tips, and more from WORKER GIG BD.',
    path: '/blog',
  });

  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center">
            <Logo size={32} />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-700 transition-colors hover:text-primary-600"
          >
            Home
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="font-heading text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
          Blog &amp; Guides
        </h1>
        <p className="mt-3 max-w-2xl text-gray-600">
          Practical guides on earning online, posting jobs, safe payments, and getting the most
          out of WORKER GIG BD.
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {BLOG_POSTS.map((post) => (
            <Link
              key={post.slug}
              to={`/blog/${post.slug}`}
              className="group flex flex-col rounded-2xl border border-gray-200 p-6 transition-shadow hover:shadow-md"
            >
              <span className="text-xs font-semibold uppercase tracking-wide text-primary-600">
                {post.category}
              </span>
              <h2 className="mt-2 text-lg font-bold text-gray-900 group-hover:text-primary-700">
                {post.title}
              </h2>
              <p className="mt-2 flex-1 text-sm text-gray-600">{post.excerpt}</p>
              <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> {post.readingTime} read · {post.date}
                </span>
                <span className="inline-flex items-center gap-1 font-semibold text-primary-600">
                  Read <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <footer className="border-t border-gray-200 bg-gray-50 py-8">
        <div className="mx-auto max-w-4xl px-4 text-center text-sm text-gray-500 sm:px-6">
          © 2026 WORKER GIG BD. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
