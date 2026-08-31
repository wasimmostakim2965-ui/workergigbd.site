import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, MessageCircle, LifeBuoy, Send } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useSeo } from '@/lib/useSeo';

const EMAIL = 'wasimmostakim2965@gmail.com';
const WHATSAPP_NUMBER = '8801338882758';

export function ContactUsPage() {
  useSeo({
    title: 'Contact Us — WORKER GIG BD',
    description:
      'Get in touch with the WORKER GIG BD team. Email us, message us on WhatsApp, or open a support ticket — we reply to every message.',
    path: '/contact',
  });

  const [name, setName] = useState('');
  const [message, setMessage] = useState('');

  const sendViaWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    const text = encodeURIComponent(`Hello WORKER GIG BD,\n\nMy name: ${name || '(not given)'}\n\n${message}`);
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${text}`, '_blank', 'noopener');
  };

  const sendViaEmail = () => {
    const subject = encodeURIComponent(`Support request from ${name || 'a visitor'}`);
    const body = encodeURIComponent(message);
    window.location.href = `mailto:${EMAIL}?subject=${subject}&body=${body}`;
  };

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
            Home
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="font-heading text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
          Contact Us
        </h1>
        <p className="mt-3 text-gray-600">
          Questions about earning, posting jobs, deposits or withdrawals? We are happy to help.
          Choose any channel below — we reply to every genuine message.
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          <a
            href={`mailto:${EMAIL}`}
            className="rounded-2xl border border-gray-200 p-6 text-center transition-shadow hover:shadow-md"
          >
            <Mail className="mx-auto h-8 w-8 text-primary-600" />
            <h2 className="mt-3 font-semibold text-gray-900">Email</h2>
            <p className="mt-1 break-all text-sm text-gray-600">{EMAIL}</p>
          </a>
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-2xl border border-gray-200 p-6 text-center transition-shadow hover:shadow-md"
          >
            <MessageCircle className="mx-auto h-8 w-8 text-success-600" />
            <h2 className="mt-3 font-semibold text-gray-900">WhatsApp</h2>
            <p className="mt-1 text-sm text-gray-600">+880 1338-882758</p>
          </a>
          <Link
            to="/dashboard/ticket"
            className="rounded-2xl border border-gray-200 p-6 text-center transition-shadow hover:shadow-md"
          >
            <LifeBuoy className="mx-auto h-8 w-8 text-primary-600" />
            <h2 className="mt-3 font-semibold text-gray-900">Support Ticket</h2>
            <p className="mt-1 text-sm text-gray-600">For registered users — fastest for account issues</p>
          </Link>
        </div>

        <div className="mt-12 rounded-2xl border border-gray-200 bg-gray-50 p-6 sm:p-8">
          <h2 className="text-xl font-bold text-gray-900">Send us a message</h2>
          <p className="mt-1 text-sm text-gray-500">
            This opens WhatsApp with your message ready to send — no account needed.
          </p>
          <form onSubmit={sendViaWhatsApp} className="mt-5 space-y-4">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="How can we help you?"
              required
              rows={5}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-success-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-success-700"
              >
                <Send className="h-4 w-4" /> Send via WhatsApp
              </button>
              <button
                type="button"
                onClick={sendViaEmail}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100"
              >
                <Mail className="h-4 w-4" /> Send via Email
              </button>
            </div>
          </form>
        </div>

        <p className="mt-10 text-sm text-gray-500">
          For payment or account disputes, registered users get the fastest resolution through the
          in-platform <Link to="/dashboard/ticket" className="text-primary-600 hover:underline">support ticket</Link> system.
        </p>
      </main>

      <footer className="border-t border-gray-200 bg-gray-50 py-8">
        <div className="mx-auto max-w-4xl px-4 text-center text-sm text-gray-500 sm:px-6">
          © 2026 WORKER GIG BD. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
