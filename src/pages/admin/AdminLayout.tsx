import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Wallet, ArrowUpFromLine, ArrowDownToLine,
  Briefcase, Settings, Ticket, FolderTree, LogOut, Menu, X,
  ShieldCheck, ChevronDown, Bell, Search,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/Logo';
import { Badge } from '@/components/ui/Badge';

const adminNav = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/users', icon: Users, label: 'Users' },
  { to: '/admin/deposits', icon: ArrowDownToLine, label: 'Deposits' },
  { to: '/admin/withdrawals', icon: ArrowUpFromLine, label: 'Withdrawals' },
  { to: '/admin/jobs', icon: Briefcase, label: 'Jobs' },
  { to: '/admin/tasks', icon: Briefcase, label: 'Task Review' },
  { to: '/admin/tickets', icon: Ticket, label: 'Tickets' },
  { to: '/admin/categories', icon: FolderTree, label: 'Categories' },
  { to: '/admin/settings', icon: Settings, label: 'Settings' },
];

export function AdminLayout() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (profile && profile.status !== 'admin') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-error-50">
            <ShieldCheck className="h-8 w-8 text-error-600" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="mt-2 text-sm text-gray-600">You don't have permission to access the admin panel.</p>
          <Link to="/dashboard" className="mt-4 inline-block text-sm font-semibold text-primary-600 hover:text-primary-700">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-gray-900/50 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 z-40 h-full w-64 transform border-r border-gray-200 bg-gray-900 transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-16 items-center justify-between border-b border-gray-800 px-4">
          <Link to="/admin" onClick={() => setSidebarOpen(false)}>
            <Logo size={36} textColor="text-white" />
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-800 lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-gray-800 p-4">
          <div className="flex items-center gap-2 rounded-lg bg-primary-600/20 px-3 py-2 text-primary-300">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-sm font-semibold">Admin Panel</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {adminNav.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-primary-600 text-white'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    }`
                  }
                >
                  <item.icon className="shrink-0" style={{ width: 18, height: 18 }} />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>

          <div className="mt-4 border-t border-gray-800 pt-4">
            <NavLink
              to="/dashboard"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-400 transition-all hover:bg-gray-800 hover:text-white"
            >
              <LayoutDashboard className="shrink-0" style={{ width: 18, height: 18 }} />
              <span>User Dashboard</span>
            </NavLink>
          </div>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 border-t border-gray-800 p-3">
          <div className="flex items-center gap-3 rounded-lg p-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white uppercase">
              {profile?.username?.charAt(0) ?? 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="truncate text-sm font-semibold text-white">{profile?.username ?? 'Admin'}</div>
              <div className="text-xs text-gray-500">Administrator</div>
            </div>
            <button onClick={handleSignOut} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-800 hover:text-error-400">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-gray-200 bg-white/80 px-4 backdrop-blur-lg sm:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 lg:hidden">
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2">
              <Search className="h-4 w-4 text-gray-400" />
              <input placeholder="Search..." className="bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none w-48" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="success" dot>System Online</Badge>
            <button className="relative rounded-lg p-2 text-gray-600 hover:bg-gray-100">
              <Bell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-error-500" />
            </button>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
