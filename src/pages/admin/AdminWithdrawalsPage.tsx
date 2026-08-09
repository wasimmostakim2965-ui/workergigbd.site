import { useEffect, useState, useCallback } from 'react';
import { Check, X, ArrowUpFromLine } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Tabs } from '@/components/ui/Tabs';
import { LoadingSpinner, EmptyState } from '@/components/ui/EmptyState';
import { WithdrawalRequest, Profile } from '@/types';

export function AdminWithdrawalsPage() {
  const { profile: admin } = useAuth();
  const [withdrawals, setWithdrawals] = useState<(WithdrawalRequest & { profiles?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pending');
  const [selected, setSelected] = useState<WithdrawalRequest | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [processing, setProcessing] = useState(false);

  const loadWithdrawals = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('withdrawal_requests')
        .select('*, profiles(username, phone, referral_code, status, earning_balance, deposit_balance)')
        .order('created_at', { ascending: false });
      if (tab === 'pending') query = query.eq('status', 'pending');
      else if (tab === 'approved') query = query.eq('status', 'approved');
      else if (tab === 'rejected') query = query.eq('status', 'rejected');
      const { data, error } = await query.limit(100);
      if (error) {
        console.error('Load withdrawals error:', error);
        setWithdrawals([]);
      } else {
        setWithdrawals((data as (WithdrawalRequest & { profiles?: Profile })[]) ?? []);
      }
    } catch (err) {
      console.error('Load withdrawals error:', err);
      setWithdrawals([]);
    }
    setLoading(false);
  }, [tab]);

  useEffect(() => { loadWithdrawals(); }, [loadWithdrawals]);

  const handleApprove = async () => {
    if (!selected || !admin) return;
    setProcessing(true);

    // Atomic RPC: updates balances, total_withdraw, status + notification
    // inside a single DB transaction. Re-approval is prevented by a status guard.
    const { error } = await supabase.rpc('process_withdrawal_request', {
      p_wd_id: selected.id,
      p_admin_uid: admin.id,
      p_action: 'approve',
      p_note: adminNote,
    });

    if (error) {
      alert(error.message);
      setProcessing(false);
      return;
    }

    setProcessing(false);
    setSelected(null);
    setAdminNote('');
    loadWithdrawals();
  };

  const handleReject = async () => {
    if (!selected || !admin) return;
    setProcessing(true);

    // Atomic RPC: refunds the held amount + sets rejected + notifies.
    const { error } = await supabase.rpc('process_withdrawal_request', {
      p_wd_id: selected.id,
      p_admin_uid: admin.id,
      p_action: 'reject',
      p_note: adminNote,
    });

    if (error) {
      alert(error.message);
      setProcessing(false);
      return;
    }

    setProcessing(false);
    setSelected(null);
    setAdminNote('');
    loadWithdrawals();
  };

  const tabs = [
    { id: 'pending', label: 'Pending' },
    { id: 'approved', label: 'Approved' },
    { id: 'rejected', label: 'Rejected' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-gray-900">Withdrawal Requests</h1>
        <p className="mt-1 text-sm text-gray-600">Review and process user withdrawal requests</p>
      </div>

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {loading ? (
        <LoadingSpinner size={40} className="py-20" />
      ) : withdrawals.length === 0 ? (
        <Card><EmptyState icon={<ArrowUpFromLine className="h-8 w-8" />} title="No withdrawal requests" /></Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-left text-xs text-gray-500">
                <tr>
                  <th className="px-5 py-3 font-medium">User</th>
                  <th className="px-5 py-3 font-medium">UID</th>
                  <th className="px-5 py-3 font-medium">Amount</th>
                  <th className="px-5 py-3 font-medium">Method</th>
                  <th className="px-5 py-3 font-medium">Account/Phone</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {withdrawals.map((wd) => (
                  <tr key={wd.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <div className="font-medium text-gray-900">{wd.profiles?.username ?? 'Unknown'}</div>
                      <div className="text-xs text-gray-400">{wd.profiles?.phone || '—'}</div>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-gray-500">{wd.user_id.slice(0, 8)}</td>
                    <td className="px-5 py-3 font-bold text-gray-900">৳ {wd.amount.toFixed(3)}</td>
                    <td className="px-5 py-3 capitalize text-gray-600">{wd.method}</td>
                    <td className="px-5 py-3 text-gray-600">{wd.account_number}</td>
                    <td className="px-5 py-3">
                      <Badge variant={wd.status === 'approved' ? 'success' : wd.status === 'rejected' ? 'error' : 'warning'} dot>
                        {wd.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-gray-500">{new Date(wd.created_at).toLocaleDateString()}</td>
                    <td className="px-5 py-3">
                      {wd.status === 'pending' ? (
                        <Button size="sm" variant="secondary" onClick={() => { setSelected(wd); setAdminNote(''); }}>
                          Review
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => { setSelected(wd); setAdminNote(wd.admin_note || ''); }}>
                          View
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Withdrawal Request Review" size="md">
        {selected && (
          <div className="space-y-4">
            <div className="rounded-lg bg-gray-50 p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">User:</span><span className="font-semibold text-gray-900">{(selected as any).profiles?.username ?? 'Unknown'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">UID:</span><span className="font-mono text-xs text-gray-700">{selected.user_id}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Phone:</span><span className="text-gray-700">{(selected as any).profiles?.phone || '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Referral:</span><span className="text-gray-700">{(selected as any).profiles?.referral_code || '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Amount:</span><span className="font-bold text-gray-900">৳ {selected.amount.toFixed(3)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Method:</span><span className="capitalize text-gray-700">{selected.method}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Account:</span><span className="text-gray-700">{selected.account_number}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Date:</span><span className="text-gray-700">{new Date(selected.created_at).toLocaleString()}</span></div>
            </div>

            <Textarea label="Admin Note" placeholder="Add a note..." value={adminNote} onChange={(e) => setAdminNote(e.target.value)} rows={2} />

            {selected.status === 'pending' ? (
              <div className="flex gap-3">
                <Button variant="danger" fullWidth loading={processing} onClick={handleReject}>
                  <X className="h-4 w-4" /> Reject
                </Button>
                <Button variant="primary" fullWidth loading={processing} onClick={handleApprove}>
                  <Check className="h-4 w-4" /> Approve & Send
                </Button>
              </div>
            ) : (
              <div className="rounded-lg border border-gray-200 p-3 text-sm">
                <span className="text-gray-500">Status: </span>
                <Badge variant={selected.status === 'approved' ? 'success' : 'error'} dot>{selected.status}</Badge>
                {selected.admin_note && <p className="mt-2 text-gray-600">Note: {selected.admin_note}</p>}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
