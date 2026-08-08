import { useState, useEffect } from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Home, Search, PlusCircle, Crown, Briefcase, Bell, Wallet,
  Share2, ArrowDownToLine, ArrowUpFromLine, Megaphone, Ticket,
  User, LogOut, Menu, X, ShieldCheck, ChevronDown, Settings,
  TrendingUp, Zap, MessageSquare,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/Logo';
import { Badge } from '@/components/ui/Badge';
import { supabase } from '@/lib/supabase';
import { AdminSetting } from '@/types';

const navItems = [
  { to: '/dashboard', icon: Home, label: 'Dashboard', end: true },
  { to: '/dashboard/find-jobs', icon: Search, label: 'Find Jobs' },
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
];

export function DashboardLayout() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [settings, setSettings] = useState<AdminSetting[]>([]);

  const isAdmin = profile?.status === 'admin';

  useEffect(() => {
    supabase.from('admin_settings').select('*').then(({ data }) => {
      setSettings((data as AdminSetting[]) ?? []);
    });
  }, []);

  const marqueeActive = settings.find(s => s.key === 'marquee_active')?.value === 'true';
  const marqueeMessage = settings.find(s => s.key === 'marquee_message')?.value || '';
  const marqueeColor = settings.find(s => s.key === 'marquee_color')?.value || 'primary';

  const marqueeColorMap: Record<string, string> = {
    primary: 'bg-primary-600',
    success: 'bg-success-600',
    warning: 'bg-warning-600',
    error: 'bg-error-600',
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-gray-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-40 h-full w-64 transform border-r border-gray-200 bg-white transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-gray-100 px-4">
          <Link to="/" onClick={() => setSidebarOpen(false)}>
            <Logo size={36} />
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
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
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`
                  }
                >
                  <item.icon className="h-4.5 w-4.5 shrink-0" style={{ width: 18, height: 18 }} />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <Badge variant="accent" size="sm">{item.badge}</Badge>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>

          {isAdmin && (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Admin Panel</p>
              <NavLink
                to="/admin"
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                  location.pathname.startsWith('/admin')
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <ShieldCheck className="shrink-0" style={{ width: 18, height: 18 }} />
                <span className="flex-1">Admin Panel</span>
              </NavLink>
            </div>
          )}
        </nav>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 bg-white border-b border-gray-200">
          {/* Row 1: hamburger + logo (mobile) | spacer (desktop) + balance bar + icons */}
          <div className="flex items-center justify-between gap-2 px-3 sm:px-6 h-14">
            {/* Left: hamburger (mobile) / spacer (desktop) */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setSidebarOpen(true)}
                className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
              <Link to="/dashboard" className="lg:hidden">
                <Logo size={30} />
              </Link>
            </div>

            {/* Center: Balance bar - always visible, grows to fill space */}
            <div className="flex items-stretch rounded-lg border border-gray-200 shadow-sm overflow-hidden shrink-0">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-success-50 to-success-100/50">
                <TrendingUp className="h-3.5 w-3.5 text-success-600" />
                <div className="text-left">
                  <div className="text-[9px] font-medium text-success-700 uppercase tracking-wide leading-none">Earning</div>
                  <div className="text-xs font-bold text-success-700 leading-tight">৳ {profile?.earning_balance?.toFixed(3) ?? '0.000'}</div>
                </div>
              </div>
              <div className="w-px bg-gray-200" />
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-primary-50 to-primary-100/50">
                <Wallet className="h-3.5 w-3.5 text-primary-600" />
                <div className="text-left">
                  <div className="text-[9px] font-medium text-primary-700 uppercase tracking-wide leading-none">Deposit</div>
                  <div className="text-xs font-bold text-primary-700 leading-tight">৳ {profile?.deposit_balance?.toFixed(3) ?? '0.000'}</div>
                </div>
              </div>
            </div>

            {/* Right: notifications + profile */}
            <div className="flex items-center gap-1 shrink-0">
              <Link
                to="/dashboard/notifications"
                className="relative rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-error-500" />
              </Link>

              {/* Profile dropdown */}
              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-1 rounded-lg p-1 transition-colors hover:bg-gray-100"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white uppercase">
                    {profile?.username?.charAt(0) ?? 'U'}
                  </div>
                  <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
                </button>

                {profileOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl z-20 animate-scale-in">
                      <div className="px-3 py-2 border-b border-gray-100 mb-1">
                        <div className="text-sm font-semibold text-gray-900">{profile?.username ?? 'User'}</div>
                        <div className="text-xs text-gray-500">ID: {profile?.id?.slice(0, 8) ?? '—'}</div>
                      </div>
                      {!profile?.is_verified && (
                        <Link
                          to="/dashboard/verify"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-error-600 transition-colors hover:bg-error-50"
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
                      {isAdmin && (
                        <Link
                          to="/admin"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                        >
                          <Settings className="h-4 w-4" /> Admin Settings
                        </Link>
                      )}
                      <Link
                        to="/dashboard/ticket"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                      >
                        <MessageSquare className="h-4 w-4" /> Support
                      </Link>
                      <div className="border-t border-gray-100 my-1" />
                      <button
                        onClick={handleSignOut}
                        className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-error-600 transition-colors hover:bg-error-50"
                      >
                        <LogOut className="h-4 w-4" /> Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Admin marquee message */}
          {marqueeActive && marqueeMessage && (
            <div className={`${marqueeColorMap[marqueeColor] || 'bg-primary-600'} text-white overflow-hidden`}>
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
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
