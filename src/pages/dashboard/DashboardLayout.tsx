import { useState, useEffect } from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Home, Search, PlusCircle, Crown, Briefcase, Bell, Wallet,
  Share2, ArrowDownToLine, ArrowUpFromLine, Megaphone, Ticket,
  User, LogOut, Menu, X, ShieldCheck, ChevronDown, Settings,
  Zap, MessageSquare, RefreshCw, Filter, MapPin,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { AdminSetting } from '@/types';

// Color constants matching the spec
const COLORS = {
  headerBlue: '#2B70E4',
  bodyBg: '#E8F4F8',
  cardBg: '#FFFFFF',
  primaryGreen: '#058824',
  darkNavy: '#0A0E3F',
  filterBlue: '#1EA3EE',
  badgePurple: '#5865F2',
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
    const channel = supabase.channel('notifications-unread')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` }, fetchUnread)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
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
      <div style={{ maxWidth: '480px', margin: '0 auto', minHeight: '100vh' }}>
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
            <div className="flex items-center justify-between px-4 py-3">
              {/* Left: Hamburger Menu */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="flex flex-col gap-1 p-1"
              >
                <span className="block h-0.5 w-6 bg-white"></span>
                <span className="block h-0.5 w-6 bg-white"></span>
                <span className="block h-0.5 w-6 bg-white"></span>
              </button>

              {/* Center-Left: Notification Bell */}
              <Link to="/dashboard/notifications" className="relative p-2">
                <Bell className="h-5.5 w-5.5 text-white" />
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>

              {/* Center: User ID */}
              <span className="text-base font-bold text-white">
                ID: {profile?.id?.slice(0, 8) ?? '—'}
              </span>

              {/* Mid-Right: Refresh Icon */}
              <button onClick={() => window.location.reload()} className="p-2" title="Refresh">
                <RefreshCw className="h-5 w-5 text-white" />
              </button>

              {/* Right: Avatar */}
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="relative"
              >
                <div 
                  className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-green-400 bg-white text-sm font-bold"
                  style={{ color: COLORS.headerBlue }}
                >
                  {profile?.username?.charAt(0)?.toUpperCase() ?? 'U'}
                </div>
              </button>
            </div>
          </header>

          {/* SECTION B: BALANCE CARDS */}
          <div style={{ backgroundColor: COLORS.headerBlue }}>
            <div className="flex justify-center gap-3 px-4 pb-5">
              {/* Earning Card */}
              <div 
                className="rounded-lg px-5 py-2.5 text-center"
                style={{ backgroundColor: COLORS.darkNavy }}
              >
                <div className="text-sm font-bold text-white">
                  Earning: {profile?.earning_balance?.toFixed(3) ?? '0.000'}
                </div>
              </div>
              {/* Deposit Card */}
              <div 
                className="rounded-lg px-5 py-2.5 text-center"
                style={{ backgroundColor: COLORS.primaryGreen }}
              >
                <div className="text-sm font-bold text-white">
                  Deposit: {profile?.deposit_balance?.toFixed(3) ?? '0.000'}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION C: PAID AD BANNER */}
          {showBanner && bannerTitle && (
            <div className="mx-4 mb-4 rounded-xl bg-white p-3 shadow-sm">
              <div className="text-center text-sm font-medium" style={{ color: '#666' }}>
                Paid
              </div>
              {bannerUrl ? (
                <a href={bannerUrl} target="_blank" rel="noopener noreferrer" className="block mt-2">
                  {bannerImage ? (
                    <img src={bannerImage} alt={bannerTitle} className="w-full rounded-lg" />
                  ) : (
                    <div className="rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-3 text-center text-white font-semibold">
                      {bannerTitle}
                    </div>
                  )}
                </a>
              ) : (
                <div className="mt-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-3 text-center text-white font-semibold">
                  {bannerTitle}
                </div>
              )}
            </div>
          )}

          {/* SECTION D: FILTER & SORT SECTION */}
          <div className="px-4 pt-4 pb-2" style={{ backgroundColor: COLORS.bodyBg }}>
            <Link to="/dashboard" className="block">
              <button className="w-full rounded-lg py-3 text-sm font-bold text-white" style={{ backgroundColor: COLORS.filterBlue }}>
                <Filter className="inline-block h-4 w-4 mr-1.5" />
                Browse Available Jobs
              </button>
            </Link>
          </div>

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
          <main className="px-4 pb-24 pt-4 animate-fade-in" style={{ backgroundColor: COLORS.bodyBg }}>
            <Outlet />
          </main>

          {/* Bottom Navigation - Mobile Only */}
          <nav 
            className="fixed bottom-0 left-0 right-0 flex items-center justify-around border-t border-gray-200 bg-white px-2 py-2"
            style={{ maxWidth: '480px', margin: '0 auto' }}
          >
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
