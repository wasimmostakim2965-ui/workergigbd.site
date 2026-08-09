import { useEffect, useState, useCallback } from 'react';
import { Check, X, ArrowDownToLine } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Tabs } from '@/components/ui/Tabs';
import { LoadingSpinner, EmptyState } from '@/components/ui/EmptyState';
import { DepositRequest, Profile, AdminSetting } from '@/types';

export function AdminDepositsPage() {
  const { profile: admin } = useAuth();
  const [deposits, setDeposits] = useState<(DepositRequest & { profiles?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pending');
  const [selected, setSelected] = useState<DepositRequest | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [processing, setProcessing] = useState(false);
  const [settings, setSettings] = useState<AdminSetting[]>([]);

  useEffect(() => {
    supabase.from('admin_settings').select('*').then(({ data }) => {
      setSettings((data as AdminSetting[]) ?? []);
    });
  }, []);

  const loadDeposits = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('deposit_requests')
        .select('*, profiles(username, phone, referral_code, status, earning_balance, deposit_balance, referred_by, total_deposit)')
        .order('created_at', { ascending: false });
      if (tab === 'pending') query = query.eq('status', 'pending');
      else if (tab === 'approved') query = query.eq('status', 'approved');
      else if (tab === 'rejected') query = query.eq('status', 'rejected');
      const { data, error } = await query.limit(100);
      if (error) {
        console.error('Load deposits error:', error);
        setDeposits([]);
      } else {
        setDeposits((data as (DepositRequest & { profiles?: Profile })[]) ?? []);
      }
    } catch (err) {
      console.error('Load deposits error:', err);
      setDeposits([]);
    }
    setLoading(false);
  }, [tab]);

  useEffect(() => { loadDeposits(); }, [loadDeposits]);

  const handleApprove = async () => {
    if (!selected || !admin) return;
    setProcessing(true);

    // Atomic RPC: credits deposit_balance + total_deposit, writes the ledger
    // transaction, applies the referral bonus (first deposit only) and notifies
    // the user — all inside one DB transaction. Re-approval is prevented by a
    // status guard. Reads referral_enabled / referral_bonus from admin_settings
    // server-side so it can't be tampered with from the client.
    const { error } = await supabase.rpc('process_deposit', {
      p_deposit_id: selected.id,
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
    loadDeposits();
  };

  const handleReject = async () => {
    if (!selected || !admin) return;
    setProcessing(true);

    const { error } = await supabase.rpc('process_deposit', {
      p_deposit_id: selected.id,
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
    loadDeposits();
  };

  const tabs = [
    { id: 'pending', label: 'Pending' },
    { id: 'approved', label: 'Approved' },
    { id: 'rejected', label: 'Rejected' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-gray-900">Deposit Requests</h1>
        <p className="mt-1 text-sm text-gray-600">Review and approve user deposit requests</p>
      </div>

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {loading ? (
        <LoadingSpinner size={40} className="py-20" />
      ) : deposits.length === 0 ? (
        <Card><EmptyState icon={<ArrowDownToLine className="h-8 w-8" />} title="No deposit requests" /></Card>
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
                  <th className="px-5 py-3 font-medium">Sender</th>
                  <th className="px-5 py-3 font-medium">TxID</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {deposits.map((dep) => (
                  <tr key={dep.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <div className="font-medium text-gray-900">{dep.profiles?.username ?? 'Unknown'}</div>
                      <div className="text-xs text-gray-400">{dep.profiles?.phone || '—'}</div>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-gray-500">{dep.user_id.slice(0, 8)}</td>
                    <td className="px-5 py-3 font-bold text-gray-900">৳ {dep.amount.toFixed(3)}</td>
                    <td className="px-5 py-3 capitalize text-gray-600">{dep.method}</td>
                    <td className="px-5 py-3 text-gray-600">{dep.sender_number}</td>
                    <td className="px-5 py-3 font-mono text-xs text-gray-600">{dep.transaction_id}</td>
                    <td className="px-5 py-3">
                      <Badge variant={dep.status === 'approved' ? 'success' : dep.status === 'rejected' ? 'error' : 'warning'} dot>
                        {dep.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-gray-500">{new Date(dep.created_at).toLocaleDateString()}</td>
                    <td className="px-5 py-3">
                      {dep.status === 'pending' ? (
                        <Button size="sm" variant="secondary" onClick={() => { setSelected(dep); setAdminNote(''); }}>
                          Review
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => { setSelected(dep); setAdminNote(dep.admin_note || ''); }}>
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

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Deposit Request Review" size="md">
        {selected && (
          <div className="space-y-4">
            <div className="rounded-lg bg-gray-50 p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">User:</span><span className="font-semibold text-gray-900">{(selected as any).profiles?.username ?? 'Unknown'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">UID:</span><span className="font-mono text-xs text-gray-700">{selected.user_id}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Phone:</span><span className="text-gray-700">{(selected as any).profiles?.phone || '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Referral:</span><span className="text-gray-700">{(selected as any).profiles?.referral_code || '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Amount:</span><span className="font-bold text-gray-900">৳ {selected.amount.toFixed(3)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Method:</span><span className="capitalize text-gray-700">{selected.method}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Sender Number:</span><span className="text-gray-700">{selected.sender_number}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Transaction ID:</span><span className="font-mono text-xs text-gray-700">{selected.transaction_id}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Date:</span><span className="text-gray-700">{new Date(selected.created_at).toLocaleString()}</span></div>
            </div>

            <Textarea label="Admin Note" placeholder="Add a note (optional for approval, required for rejection)..." value={adminNote} onChange={(e) => setAdminNote(e.target.value)} rows={2} />

            {selected.status === 'pending' ? (
              <div className="flex gap-3">
                <Button variant="danger" fullWidth loading={processing} onClick={handleReject}>
                  <X className="h-4 w-4" /> Reject
                </Button>
                <Button variant="primary" fullWidth loading={processing} onClick={handleApprove}>
                  <Check className="h-4 w-4" /> Approve & Credit
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
