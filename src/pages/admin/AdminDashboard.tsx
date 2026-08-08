import { useEffect, useState } from 'react';
import {
  Users, Wallet, ArrowDownToLine, ArrowUpFromLine, Briefcase,
  TrendingUp, CheckCircle, Clock, XCircle, UserCheck, DollarSign,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, StatCard } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/EmptyState';

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
  totalDeposits: number;
  totalWithdrawals: number;
  activeJobs: number;
  completedTasks: number;
  todayDeposits: number;
  todayWithdrawals: number;
}

export function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentDeposits, setRecentDeposits] = useState<any[]>([]);
  const [recentWithdrawals, setRecentWithdrawals] = useState<any[]>([]);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [
        usersCount, activeCount, pendingDep, pendingWd,
        approvedDep, approvedWd, activeJobs, completedTasks,
        todayDep, todayWd, recentDepData, recentWdData, recentUsersData,
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact' }).neq('status', 'admin'),
        supabase.from('profiles').select('id', { count: 'exact' }).eq('status', 'active'),
        supabase.from('deposit_requests').select('id', { count: 'exact' }).eq('status', 'pending'),
        supabase.from('withdrawal_requests').select('id', { count: 'exact' }).eq('status', 'pending'),
        supabase.from('deposit_requests').select('amount').eq('status', 'approved'),
        supabase.from('withdrawal_requests').select('amount').eq('status', 'approved'),
        supabase.from('jobs').select('id', { count: 'exact' }).eq('status', 'active'),
        supabase.from('tasks').select('id', { count: 'exact' }).eq('status', 'approved'),
        supabase.from('deposit_requests').select('amount').eq('status', 'approved').gte('created_at', today.toISOString()),
        supabase.from('withdrawal_requests').select('amount').eq('status', 'approved').gte('created_at', today.toISOString()),
        supabase.from('deposit_requests').select('*, profiles(username)').order('created_at', { ascending: false }).limit(5),
        supabase.from('withdrawal_requests').select('*, profiles(username)').order('created_at', { ascending: false }).limit(5),
        supabase.from('profiles').select('username, created_at, status').neq('status', 'admin').order('created_at', { ascending: false }).limit(5),
      ]);

      const totalDepAmount = (approvedDep.data as any[])?.reduce((sum, d) => sum + d.amount, 0) ?? 0;
      const totalWdAmount = (approvedWd.data as any[])?.reduce((sum, d) => sum + d.amount, 0) ?? 0;
      const todayDepAmount = (todayDep.data as any[])?.reduce((sum, d) => sum + d.amount, 0) ?? 0;
      const todayWdAmount = (todayWd.data as any[])?.reduce((sum, d) => sum + d.amount, 0) ?? 0;

      setStats({
        totalUsers: usersCount.count ?? 0,
        activeUsers: activeCount.count ?? 0,
        pendingDeposits: pendingDep.count ?? 0,
        pendingWithdrawals: pendingWd.count ?? 0,
        totalDeposits: totalDepAmount,
        totalWithdrawals: totalWdAmount,
        activeJobs: activeJobs.count ?? 0,
        completedTasks: completedTasks.count ?? 0,
        todayDeposits: todayDepAmount,
        todayWithdrawals: todayWdAmount,
      });
      setRecentDeposits((recentDepData.data as any[]) ?? []);
      setRecentWithdrawals((recentWdData.data as any[]) ?? []);
      setRecentUsers((recentUsersData.data as any[]) ?? []);
      setLoading(false);
    }
    loadStats();
  }, []);

  if (loading || !stats) return <LoadingSpinner size={40} className="py-20" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">Platform overview and statistics</p>
      </div>

      {/* Main stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Users" value={stats.totalUsers} icon={<Users className="h-6 w-6" />} color="primary" trend={`${stats.activeUsers} active`} trendUp />
        <StatCard label="Active Jobs" value={stats.activeJobs} icon={<Briefcase className="h-6 w-6" />} color="accent" />
        <StatCard label="Pending Deposits" value={stats.pendingDeposits} icon={<ArrowDownToLine className="h-6 w-6" />} color="warning" />
        <StatCard label="Pending Withdrawals" value={stats.pendingWithdrawals} icon={<ArrowUpFromLine className="h-6 w-6" />} color="error" />
      </div>

      {/* Financial stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Deposits" value={`৳ ${stats.totalDeposits.toFixed(2)}`} icon={<DollarSign className="h-6 w-6" />} color="success" />
        <StatCard label="Total Withdrawals" value={`৳ ${stats.totalWithdrawals.toFixed(2)}`} icon={<Wallet className="h-6 w-6" />} color="primary" />
        <StatCard label="Today's Deposits" value={`৳ ${stats.todayDeposits.toFixed(2)}`} icon={<TrendingUp className="h-6 w-6" />} color="success" />
        <StatCard label="Today's Withdrawals" value={`৳ ${stats.todayWithdrawals.toFixed(2)}`} icon={<TrendingUp className="h-6 w-6" />} color="error" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent deposits */}
        <Card>
          <div className="border-b border-gray-100 px-5 py-4">
            <h3 className="font-heading font-bold text-gray-900">Recent Deposit Requests</h3>
          </div>
          <div className="p-5">
            {recentDeposits.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500">No deposit requests yet.</p>
            ) : (
              <div className="space-y-3">
                {recentDeposits.map((dep) => (
                  <div key={dep.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success-50">
                        <ArrowDownToLine className="h-4 w-4 text-success-600" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{dep.profiles?.username ?? 'Unknown'}</div>
                        <div className="text-xs text-gray-500">৳ {dep.amount.toFixed(3)} • {dep.method}</div>
                      </div>
                    </div>
                    <Badge variant={dep.status === 'approved' ? 'success' : dep.status === 'rejected' ? 'error' : 'warning'} dot>
                      {dep.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Recent withdrawals */}
        <Card>
          <div className="border-b border-gray-100 px-5 py-4">
            <h3 className="font-heading font-bold text-gray-900">Recent Withdrawal Requests</h3>
          </div>
          <div className="p-5">
            {recentWithdrawals.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500">No withdrawal requests yet.</p>
            ) : (
              <div className="space-y-3">
                {recentWithdrawals.map((wd) => (
                  <div key={wd.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-error-50">
                        <ArrowUpFromLine className="h-4 w-4 text-error-600" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{wd.profiles?.username ?? 'Unknown'}</div>
                        <div className="text-xs text-gray-500">৳ {wd.amount.toFixed(3)} • {wd.method}</div>
                      </div>
                    </div>
                    <Badge variant={wd.status === 'approved' ? 'success' : wd.status === 'rejected' ? 'error' : 'warning'} dot>
                      {wd.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Recent users */}
      <Card>
        <div className="border-b border-gray-100 px-5 py-4">
          <h3 className="font-heading font-bold text-gray-900">Recent Users</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-left text-xs text-gray-500">
              <tr>
                <th className="px-5 py-3 font-medium">Username</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentUsers.map((user) => (
                <tr key={user.username + user.created_at} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white uppercase">
                        {user.username?.charAt(0)}
                      </div>
                      <span className="font-medium text-gray-900">{user.username}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant={user.status === 'active' ? 'success' : user.status === 'suspended' ? 'warning' : 'error'} dot>
                      {user.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-gray-500">{new Date(user.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
