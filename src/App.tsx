import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ReactNode, useEffect } from 'react';
import { Ban } from 'lucide-react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { LoadingSpinner } from '@/components/ui/EmptyState';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/LoginPage';
import { SignupPage } from '@/pages/SignupPage';
import { PrivacyPolicyPage } from '@/pages/PrivacyPolicyPage';
import { TermsOfServicePage } from '@/pages/TermsOfServicePage';
import { DashboardLayout } from '@/pages/dashboard/DashboardLayout';
import { DashboardHome } from '@/pages/dashboard/DashboardHome';
import { PostJobPage } from '@/pages/dashboard/PostJobPage';
import { MyTasksPage } from '@/pages/dashboard/MyTasksPage';
import { MyJobsPage } from '@/pages/dashboard/MyJobsPage';
import { DepositPage } from '@/pages/dashboard/DepositPage';
import { WithdrawPage } from '@/pages/dashboard/WithdrawPage';
import { DepositHistoryPage } from '@/pages/dashboard/DepositHistoryPage';
import { NotificationsPage } from '@/pages/dashboard/NotificationsPage';
import { ShareEarnPage } from '@/pages/dashboard/ShareEarnPage';
import { PremiumPage } from '@/pages/dashboard/PremiumPage';
import { ProfilePage } from '@/pages/dashboard/ProfilePage';
import { TicketPage } from '@/pages/dashboard/TicketPage';
import { AdvertisementPage } from '@/pages/dashboard/AdvertisementPage';
import { VerifyPage } from '@/pages/dashboard/VerifyPage';
import { LiveChatPage } from '@/pages/dashboard/LiveChatPage';
import { AdminLayout } from '@/pages/admin/AdminLayout';
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage';
import { AdminDepositsPage } from '@/pages/admin/AdminDepositsPage';
import { AdminWithdrawalsPage } from '@/pages/admin/AdminWithdrawalsPage';
import { AdminJobsPage } from '@/pages/admin/AdminJobsPage';
import { AdminGatePage } from '@/pages/admin/AdminGatePage';
import { AdminTasksPage } from '@/pages/admin/AdminTasksPage';
import { AdminReportsPage } from '@/pages/admin/AdminReportsPage';
import { AdminTicketsPage } from '@/pages/admin/AdminTicketsPage';
import { AdminCategoriesPage } from '@/pages/admin/AdminCategoriesPage';
import { AdminSettingsPage } from '@/pages/admin/AdminSettingsPage';
import { AdminLiveChatPage } from '@/pages/admin/AdminLiveChatPage';
import { AdminVerificationsPage } from '@/pages/admin/AdminVerificationsPage';
import { AdminAdsPage } from '@/pages/admin/AdminAdsPage';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner size={48} className="min-h-screen" />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

function AdminRoute({ children }: { children: ReactNode }) {
  const { profile, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner size={48} className="min-h-screen" />;
  }

  // Suspended/blocked users must never reach the admin panel.
  if (!profile || profile.status !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// A blocked account is fully locked out (auto sign-out). A suspended account
// is read-only: the dashboard renders a locked screen instead of the page.
function AccountStatusGate({ children }: { children: ReactNode }) {
  const { profile, loading, signOut } = useAuth();

  useEffect(() => {
    if (!loading && profile?.status === 'blocked') {
      signOut();
    }
  }, [loading, profile?.status, signOut]);

  if (loading || !profile) {
    return <LoadingSpinner size={48} className="min-h-screen" />;
  }

  if (profile.status === 'blocked') {
    return <LoadingSpinner size={48} className="min-h-screen" />;
  }

  if (profile.status === 'suspended') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-warning-50">
          <Ban className="h-8 w-8 text-warning-600" />
        </div>
        <h1 className="font-heading text-2xl font-bold text-gray-900">Account Suspended</h1>
        <p className="mt-2 max-w-md text-sm text-gray-600">
          Your account has been suspended by an administrator. You can still log in
          to view your balance, but posting jobs, withdrawals and other actions
          are disabled until your account is reactivated.
        </p>
        <button
          onClick={() => signOut()}
          className="mt-6 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
      <Route path="/terms-of-service" element={<TermsOfServicePage />} />
      <Route path="/admin-login" element={<AdminGatePage />} />

      <Route path="/dashboard" element={<ProtectedRoute><AccountStatusGate><DashboardLayout /></AccountStatusGate></ProtectedRoute>}>
        <Route index element={<DashboardHome />} />
        <Route path="find-jobs" element={<Navigate to="/dashboard" replace />} />
        <Route path="find-jobs/:jobId" element={<Navigate to="/dashboard" replace />} />
        <Route path="post-job" element={<PostJobPage />} />
        <Route path="my-tasks" element={<MyTasksPage />} />
        <Route path="my-jobs" element={<MyJobsPage />} />
        <Route path="deposit" element={<DepositPage />} />
        <Route path="withdraw" element={<WithdrawPage />} />
        <Route path="deposit-history" element={<DepositHistoryPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="share-earn" element={<ShareEarnPage />} />
        <Route path="premium" element={<PremiumPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="ticket" element={<TicketPage />} />
        <Route path="live-chat" element={<LiveChatPage />} />
        <Route path="advertisement" element={<AdvertisementPage />} />
        <Route path="verify" element={<VerifyPage />} />
      </Route>

      <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="deposits" element={<AdminDepositsPage />} />
        <Route path="withdrawals" element={<AdminWithdrawalsPage />} />
        <Route path="jobs" element={<AdminJobsPage />} />
        <Route path="tasks" element={<AdminTasksPage />} />
        <Route path="reports" element={<AdminReportsPage />} />
        <Route path="tickets" element={<AdminTicketsPage />} />
        <Route path="live-chat" element={<AdminLiveChatPage />} />
        <Route path="verifications" element={<AdminVerificationsPage />} />
        <Route path="categories" element={<AdminCategoriesPage />} />
        <Route path="ads" element={<AdminAdsPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
