import { Link, useParams, Navigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Clock } from 'lucide-react';
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
    <div className="min-h-screen bg-white">
      <nav className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center">
            <Logo size={32} />
          </Link>
          <Link
            to="/blog"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-700 transition-colors hover:text-primary-600"
          >
            <ArrowLeft className="h-4 w-4" /> All articles
          </Link>
        </div>
      </nav>

      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <span className="text-xs font-semibold uppercase tracking-wide text-primary-600">
          {post.category}
        </span>
        <h1 className="mt-2 font-heading text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
          {post.title}
        </h1>
        <p className="mt-3 flex items-center gap-1.5 text-sm text-gray-500">
          <Clock className="h-4 w-4" /> {post.readingTime} read · Published {post.date}
        </p>

        <div className="prose prose-gray mt-8 max-w-none text-gray-700">
          {post.content.map((block, i) => {
            if (block.type === 'h2') return <h2 key={i}>{block.text}</h2>;
            if (block.type === 'ul')
              return (
                <ul key={i}>
                  {block.items?.map((item, j) => <li key={j}>{item}</li>)}
                </ul>
              );
            return <p key={i}>{block.text}</p>;
          })}
        </div>

        <div className="mt-12 rounded-2xl border border-primary-100 bg-primary-50 p-6 text-center">
          <p className="font-semibold text-gray-900">Ready to start earning?</p>
          <p className="mt-1 text-sm text-gray-600">
            Join thousands of Bangladeshis earning online with simple tasks.
          </p>
          <Link
            to="/signup"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
          >
            Create free account <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </article>

      <footer className="border-t border-gray-200 bg-gray-50 py-8">
        <div className="mx-auto max-w-3xl px-4 text-center text-sm text-gray-500 sm:px-6">
          © 2026 WORKER GIG BD. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
