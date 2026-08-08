import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ReactNode } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { LoadingSpinner } from '@/components/ui/EmptyState';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/LoginPage';
import { SignupPage } from '@/pages/SignupPage';
import { DashboardLayout } from '@/pages/dashboard/DashboardLayout';
import { DashboardHome } from '@/pages/dashboard/DashboardHome';
import { FindJobsPage } from '@/pages/dashboard/FindJobsPage';
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
import { AdminLayout } from '@/pages/admin/AdminLayout';
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage';
import { AdminDepositsPage } from '@/pages/admin/AdminDepositsPage';
import { AdminWithdrawalsPage } from '@/pages/admin/AdminWithdrawalsPage';
import { AdminJobsPage } from '@/pages/admin/AdminJobsPage';
import { AdminTasksPage } from '@/pages/admin/AdminTasksPage';
import { AdminTicketsPage } from '@/pages/admin/AdminTicketsPage';
import { AdminCategoriesPage } from '@/pages/admin/AdminCategoriesPage';
import { AdminSettingsPage } from '@/pages/admin/AdminSettingsPage';

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

  if (profile?.status !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<DashboardHome />} />
        <Route path="find-jobs" element={<FindJobsPage />} />
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
        <Route path="tickets" element={<AdminTicketsPage />} />
        <Route path="categories" element={<AdminCategoriesPage />} />
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
