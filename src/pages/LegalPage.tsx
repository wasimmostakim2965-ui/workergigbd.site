import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Shield, Lock, Globe } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useSeo } from '@/lib/useSeo';

interface LegalPageProps {
  title: string;
  description: string;
  path: string;
  updated: string;
  children: ReactNode;
}

export function LegalPage({ title, description, path, updated, children }: LegalPageProps) {
  useSeo({ title, description, path });

  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center">
            <Logo size={32} />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-700 transition-colors hover:text-primary-600"
          >
            Home <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </nav>

      <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="font-heading text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 text-sm text-gray-500">সর্বশেষ আপডেড: {updated}</p>

        <div className="prose prose-gray mt-8 max-w-none text-gray-700">{children}</div>

        <div className="mt-12 grid gap-6 rounded-2xl border border-gray-200 bg-gray-50 p-6 sm:grid-cols-3">
          <div className="flex flex-col items-center text-center">
            <Shield className="h-6 w-6 text-primary-600" />
            <p className="mt-2 text-xs font-medium text-gray-600">নিরাপদ লেনদেন</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <Lock className="h-6 w-6 text-primary-600" />
            <p className="mt-2 text-xs font-medium text-gray-600">ডেটা সুরক্ষিত</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <Globe className="h-6 w-6 text-primary-600" />
            <p className="mt-2 text-xs font-medium text-gray-600">সারা বাংলাদেশে</p>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            to="/signup"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
          >
            সাইন আপ করুন <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            লগইন
          </Link>
        </div>
      </article>

      <footer className="border-t border-gray-200 bg-gray-50 py-8">
        <div className="mx-auto max-w-4xl px-4 text-center text-sm text-gray-500 sm:px-6">
          © 2026 Worker Gig BD. সর্বস্বত্র সংরক্ষিত।
        </div>
      </footer>
    </div>
  );
}
