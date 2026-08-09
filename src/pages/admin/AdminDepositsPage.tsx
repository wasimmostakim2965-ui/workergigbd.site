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

  const referralEnabled = settings.find(s => s.key === 'referral_enabled')?.value === 'true';
  const referralBonus = parseFloat(settings.find(s => s.key === 'referral_bonus')?.value || '10');

  useEffect(() => {
    supabase.from('admin_settings').select('*').then(({ data }) => {
      setSettings((data as AdminSetting[]) ?? []);
    });
  }, []);

  const loadDeposits = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('deposit_requests').select('*, profiles(username)').order('created_at', { ascending: false });
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

    const { error: depError } = await supabase.from('deposit_requests').update({
      status: 'approved',
      admin_note: adminNote,
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
    }).eq('id', selected.id);

    if (depError) { console.error(depError); setProcessing(false); return; }

    const { data: userProfile } = await supabase.from('profiles').select('*').eq('id', selected.user_id).maybeSingle();
    if (userProfile) {
      const up = userProfile as Profile;
      const newBalance = up.deposit_balance + selected.amount;
      await supabase.from('profiles').update({
        deposit_balance: newBalance,
        total_deposit: up.total_deposit + selected.amount,
        updated_at: new Date().toISOString(),
      }).eq('id', selected.user_id);

      await supabase.from('transactions').insert({
        user_id: selected.user_id,
        type: 'deposit',
        amount: selected.amount,
        balance_type: 'deposit',
        description: `Deposit approved - ${selected.method}`,
      });

      await supabase.rpc('notify_user', {
        target_uid: selected.user_id,
        n_title: 'Deposit Approved!',
        n_message: `Your deposit of ৳ ${selected.amount.toFixed(3)} has been approved and credited to your account.`,
        n_type: 'success',
      });

      // Referral bonus: when a user's FIRST deposit is approved and they were
      // referred by someone, credit the referrer once. Uses notify_user RPC
      // because the referrer is a different user.
      if (referralEnabled && up.referred_by && up.total_deposit === 0) {
        const { data: referrer } = await supabase.from('profiles')
          .select('id')
          .eq('referral_code', up.referred_by)
          .maybeSingle();

        if (referrer) {
          const ref = referrer as { id: string };

          // Avoid double-crediting if a referral record already exists.
          const { data: existing } = await supabase.from('referrals')
            .select('id')
            .eq('referred_id', selected.user_id)
            .maybeSingle();

          if (!existing) {
            await supabase.from('referrals').insert({
              referrer_id: ref.id,
              referred_id: selected.user_id,
              bonus_amount: referralBonus,
              status: 'completed',
            });

            const { data: refProfile } = await supabase.from('profiles')
              .select('deposit_balance')
              .eq('id', ref.id)
              .maybeSingle();
            const refBal = (refProfile as { deposit_balance: number } | null)?.deposit_balance ?? 0;

            await supabase.from('profiles').update({
              deposit_balance: refBal + referralBonus,
              updated_at: new Date().toISOString(),
            }).eq('id', ref.id);

            await supabase.from('transactions').insert({
              user_id: ref.id,
              type: 'referral_bonus',
              amount: referralBonus,
              balance_type: 'deposit',
              description: `Referral bonus for ${up.username || 'a new user'}'s first deposit`,
            });

            await supabase.rpc('notify_user', {
              target_uid: ref.id,
              n_title: 'Referral Bonus Earned!',
              n_message: `You earned ৳ ${referralBonus.toFixed(3)} referral bonus. Your referred user just made their first deposit.`,
              n_type: 'success',
            });
          }
        }
      }
    }

    setProcessing(false);
    setSelected(null);
    setAdminNote('');
    loadDeposits();
  };

  const handleReject = async () => {
    if (!selected || !admin) return;
    setProcessing(true);

    await supabase.from('deposit_requests').update({
      status: 'rejected',
      admin_note: adminNote,
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
    }).eq('id', selected.id);

    await supabase.from('notifications').insert({
      user_id: selected.user_id,
      title: 'Deposit Rejected',
      message: `Your deposit request of ৳ ${selected.amount.toFixed(3)} was rejected. ${adminNote}`,
      type: 'error',
    });

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
                    <td className="px-5 py-3 font-medium text-gray-900">{dep.profiles?.username ?? 'Unknown'}</td>
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
