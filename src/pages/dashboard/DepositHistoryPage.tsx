import { useEffect, useState, useCallback } from 'react';
import { ArrowDownToLine, Wallet } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState, LoadingSpinner } from '@/components/ui/EmptyState';
import { DepositRequest } from '@/types';

export function DepositHistoryPage() {
  const { profile } = useAuth();
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDeposits = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from('deposit_requests')
        .select('*').eq('user_id', profile.id)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Load deposits error:', error);
        setDeposits([]);
      } else {
        setDeposits((data as DepositRequest[]) ?? []);
      }
    } catch (err) {
      console.error('Load deposits error:', err);
      setDeposits([]);
    }
    setLoading(false);
  }, [profile]);

  useEffect(() => { loadDeposits(); }, [loadDeposits]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-gray-900">Deposit History</h1>
        <p className="mt-1 text-sm text-gray-600">View all your deposit requests</p>
      </div>

      {loading ? (
        <LoadingSpinner size={40} className="py-20" />
      ) : deposits.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Wallet className="h-8 w-8" />}
            title="No deposit history"
            description="Your deposit transactions will appear here."
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-left text-xs text-gray-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Amount</th>
                  <th className="px-5 py-3 font-medium">Method</th>
                  <th className="px-5 py-3 font-medium">TxID</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {deposits.map((dep) => (
                  <tr key={dep.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-semibold text-gray-900">৳ {dep.amount.toFixed(3)}</td>
                    <td className="px-5 py-3 text-gray-600 capitalize">{dep.method}</td>
                    <td className="px-5 py-3 text-gray-600 font-mono text-xs">{dep.transaction_id}</td>
                    <td className="px-5 py-3">
                      <Badge
                        variant={dep.status === 'approved' ? 'success' : dep.status === 'rejected' ? 'error' : 'warning'}
                        dot
                      >
                        {dep.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-gray-500">{new Date(dep.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
