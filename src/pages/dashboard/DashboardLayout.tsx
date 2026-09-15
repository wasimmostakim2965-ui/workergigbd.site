import { useState, useEffect } from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Home, Search, PlusCircle, Crown, Briefcase, Bell, Wallet,
  Share2, ArrowDownToLine, ArrowUpFromLine, Megaphone, Ticket,
  User, LogOut, Menu, X, ShieldCheck, ChevronDown, Settings,
  Zap, MessageSquare, RefreshCw,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { AdminSetting } from '@/types';

// Color constants matching the spec
const COLORS = {
  headerBlue: '#173B7A',
  bodyBg: '#F5F7FB',
  cardBg: '#FFFFFF',
  primaryGreen: '#0F8A4B',
  darkNavy: '#10213F',
  filterBlue: '#2563EB',
  badgePurple: '#6D5CE7',
};

const navItems = [
  { to: '/dashboard', icon: Home, label: 'Dashboard', end: true },
  { to: '/dashboard/post-job', icon: PlusCircle, label: 'Post New Job' },
  { to: '/dashboard/my-tasks', icon: Briefcase, label: 'My Tasks' },
  { to: '/dashboard/my-jobs', icon: Briefcase, label: 'My Jobs' },
  { to: '/dashboard/deposit', icon: Wallet, label: 'Deposit' },
  { to: '/dashboard/withdraw', icon: ArrowUpFromLine, label: 'Withdraw' },
  { to: '/dashboard/deposit-history', icon: ArrowDownToLine, label: 'Deposit History' },
  { to: '/dashboard/advertisement', icon: Megaphone, label: 'Advertisement' },
  { to: '/dashboard/share-earn', icon: Share2, label: 'Share & Earn' },
  { to: '/dashboard/premium', icon: Crown, label: 'Premium', badge: 'PRO' },
  { to: '/dashboard/notifications', icon: Bell, label: 'Notifications' },
  { to: '/dashboard/ticket', icon: Ticket, label: 'Support Ticket' },
  { to: '/dashboard/live-chat', icon: MessageSquare, label: 'Live Chat' },
];

export function DashboardLayout() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [settings, setSettings] = useState<AdminSetting[]>([]);
  const [adBanner, setAdBanner] = useState<{ title: string; image_url: string; link_url: string } | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!profile) return;
    const fetchUnread = () => {
      supabase.from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .eq('is_read', false)
        .then(({ count }) => setUnreadCount(count ?? 0));
    };
    fetchUnread();
    // Refresh the badge on a slow poll instead of holding a live Realtime
    // channel open for every signed-in user on every page. Realtime channels
    // are the scarcest resource on the free tier (~200 concurrent), so they
    // are reserved for pages that actually need them (live chat). 30s is more
    // than fresh enough for a non-blocking count badge.
    const interval = setInterval(fetchUnread, 30000);
    return () => { clearInterval(interval); };
  }, [profile]);

  useEffect(() => {
    supabase.from('admin_settings').select('*').then(({ data }) => {
      setSettings((data as AdminSetting[]) ?? []);
    });
    supabase.from('ad_banners')
      .select('title,image_url,link_url')
      .eq('is_active', true)
      .eq('position', 'job_list_top')
      .order('display_order', { ascending: true })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) setAdBanner(data[0] as any);
      });
  }, []);

  const marqueeActive = settings.find(s => s.key === 'marquee_active')?.value === 'true';
  const marqueeMessage = settings.find(s => s.key === 'marquee_message')?.value || '';
  const marqueeColor = settings.find(s => s.key === 'marquee_color')?.value || 'primary';
  const bannerActive = settings.find(s => s.key === 'banner_active')?.value === 'true';
  const bannerTitle = adBanner?.title || settings.find(s => s.key === 'banner_title')?.value || '';
  const bannerUrl = adBanner?.link_url || settings.find(s => s.key === 'banner_url')?.value || '';
  const bannerImage = adBanner?.image_url || settings.find(s => s.key === 'banner_image')?.value || '';
  const showBanner = adBanner !== null || bannerActive;

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: COLORS.bodyBg }}>
      {/* Mobile Container - Max 480px centered */}
      <div className="mx-auto min-h-screen w-full max-w-7xl">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar - Mobile Drawer */}
        <aside
          className={`fixed left-0 top-0 z-40 h-full w-64 transform transition-transform duration-300 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          style={{ backgroundColor: COLORS.cardBg }}
        >
          <div className="flex h-16 items-center justify-between border-b border-gray-100 px-4">
            <span className="text-xl font-bold" style={{ color: COLORS.headerBlue }}>Menu</span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4" style={{ maxHeight: 'calc(100vh - 120px)' }}>
            <ul className="space-y-1">
              {navItems.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`
                    }
                  >
                    <item.icon className="shrink-0" style={{ width: 18, height: 18 }} />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Main content */}
        <div>
          {/* SECTION A: TOP NAVBAR / HEADER */}
          <header style={{ backgroundColor: COLORS.headerBlue }}>
            <div className="mx-auto flex min-h-[68px] items-center gap-3 px-4 sm:px-6">
              <button
                onClick={() => setSidebarOpen(true)}
                aria-label="Open menu"
                className="shrink-0 rounded-xl p-2 text-white transition hover:bg-white/10"
              >
                <Menu className="h-6 w-6" />
              </button>

              <Link to="/dashboard" aria-label="WORKER GIG BD home" className="min-w-0 flex-1">
                <Logo size={38} showText={true} textColor="text-white" />
              </Link>

              <div className="flex shrink-0 items-center gap-1.5">
                <Link to="/dashboard/notifications" aria-label="Notifications" className="relative rounded-xl p-2 text-white transition hover:bg-white/10">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white ring-2 ring-[#173B7A]">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Link>

                <button onClick={() => setProfileOpen(!profileOpen)} aria-label="Open profile" className="relative">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-emerald-300 bg-white text-sm font-bold text-[#173B7A]">
                    {profile?.username?.charAt(0)?.toUpperCase() ?? 'U'}
                  </div>
                </button>
              </div>
            </div>

            <div className="mx-auto flex items-center justify-between gap-3 px-4 pb-3 sm:px-6">
              <span className="min-w-0 truncate text-[11px] font-semibold tracking-wide text-blue-100">
                ID: {profile?.id?.slice(0, 8) ?? '—'}
              </span>
              <button onClick={() => window.location.reload()} aria-label="Refresh dashboard" className="rounded-lg p-1.5 text-blue-100 transition hover:bg-white/10">
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </header>

          {/* SECTION B: BALANCE SUMMARY — only the two real balances, no duplicate "available balance" */}
          <div className="border-b border-white/10" style={{ backgroundColor: COLORS.headerBlue }}>
            <div className="mx-auto px-4 pb-4 sm:px-6">
              <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-white/10 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.10)]">
                <Link to="/dashboard/withdraw" className="min-w-0 border-r border-slate-200 px-4 py-3.5 transition hover:bg-slate-50 sm:px-6">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Earning balance</div>
                  <div className="mt-1 truncate text-xl font-extrabold tracking-tight text-[#10213F] sm:text-2xl">
                    $ {profile?.earning_balance?.toFixed(3) ?? '0.000'}
                  </div>
                </Link>
                <Link to="/dashboard/deposit" className="min-w-0 px-4 py-3.5 transition hover:bg-slate-50 sm:px-6">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Deposit balance</div>
                  <div className="mt-1 truncate text-xl font-extrabold tracking-tight text-[#0F8A4B] sm:text-2xl">
                    $ {profile?.deposit_balance?.toFixed(3) ?? '0.000'}
                  </div>
                </Link>
              </div>
            </div>
          </div>

          {/* SECTION C: PAID AD BANNER — small screenshot, clickable */}
          {showBanner && bannerImage && (
            <div className="px-4 pt-3">
              <div className="rounded-xl bg-white p-1.5 shadow-sm">
                {bannerUrl ? (
                  <a href={bannerUrl} target="_blank" rel="noopener noreferrer" className="block">
                    <img src={bannerImage} alt={bannerTitle} className="max-h-20 w-full rounded-lg object-cover" />
                  </a>
                ) : (
                  <img src={bannerImage} alt={bannerTitle} className="max-h-20 w-full rounded-lg object-cover" />
                )}
              </div>
            </div>
          )}

          {/* Profile Dropdown */}
          {profileOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
              <div 
                className="absolute right-2 top-44 w-56 rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl z-20"
                style={{ animation: 'scaleIn 0.2s ease-out' }}
              >
                <div className="border-b border-gray-100 px-3 py-2 mb-1">
                  <div className="text-sm font-semibold text-gray-900">{profile?.username ?? 'User'}</div>
                  <div className="text-xs text-gray-500">ID: {profile?.id?.slice(0, 8) ?? '—'}</div>
                </div>
                {!profile?.is_verified && (
                  <Link
                    to="/dashboard/verify"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
                  >
                    <ShieldCheck className="h-4 w-4" /> Verify Account
                  </Link>
                )}
                <Link
                  to="/dashboard/profile"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <User className="h-4 w-4" /> My Profile
                </Link>
                <Link
                  to="/dashboard/live-chat"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <MessageSquare className="h-4 w-4" /> Live Chat
                </Link>
                <Link
                  to="/dashboard/ticket"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <MessageSquare className="h-4 w-4" /> Support
                </Link>
                <div className="my-1 border-t border-gray-100" />
                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" /> Sign Out
                </button>
              </div>
            </>
          )}

          {/* Marquee Message */}
          {marqueeActive && marqueeMessage && (
            <div 
              className="text-white overflow-hidden"
              style={{ backgroundColor: COLORS.headerBlue }}
            >
              <div className="flex items-center gap-2 px-4 py-1.5">
                <Zap className="h-3.5 w-3.5 shrink-0" />
                <div className="flex-1 overflow-hidden">
                  <p className="text-xs font-medium whitespace-nowrap animate-marquee">
                    {marqueeMessage}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Page content */}
          <main className="px-4 pb-24 pt-5 animate-fade-in sm:px-6 sm:pb-10" style={{ backgroundColor: COLORS.bodyBg }}>
            <Outlet />
          </main>

          {/* Bottom Navigation - Mobile Only */}
          <nav className="fixed bottom-0 left-0 right-0 z-30 mx-auto flex max-w-7xl items-center justify-around border-t border-slate-200 bg-white/95 px-2 py-2 shadow-[0_-8px_30px_rgba(15,23,42,0.06)] backdrop-blur sm:hidden">
            {[
              { to: '/dashboard', icon: Home, label: 'Home' },
              { to: '/dashboard', icon: Search, label: 'Jobs' },
              { to: '/dashboard/post-job', icon: PlusCircle, label: 'Post' },
              { to: '/dashboard/my-tasks', icon: Briefcase, label: 'Tasks' },
              { to: '/dashboard/profile', icon: User, label: 'Profile' },
            ].map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/dashboard'}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 px-2 py-1 text-xs ${
                    isActive ? 'text-blue-600' : 'text-gray-500'
                  }`
                }
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}
