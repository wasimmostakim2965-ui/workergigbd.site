import { useEffect, useState, useCallback } from 'react';
import { Check, X, ShieldCheck, FileImage, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Tabs } from '@/components/ui/Tabs';
import { Alert } from '@/components/ui/Alert';
import { LoadingSpinner, EmptyState } from '@/components/ui/EmptyState';
import { VerificationRequest, Profile } from '@/types';

type Row = VerificationRequest & { profiles?: Profile };

export function AdminVerificationsPage() {
  const { profile: admin } = useAuth();
  const [requests, setRequests] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pending');
  const [selected, setSelected] = useState<Row | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [processing, setProcessing] = useState(false);
  const [actionError, setActionError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('verification_requests')
        .select('*, profiles(username, phone, full_name)')
        .order('created_at', { ascending: false });
      if (tab === 'pending') query = query.eq('status', 'pending');
      else if (tab === 'approved') query = query.eq('status', 'approved');
      else if (tab === 'rejected') query = query.eq('status', 'rejected');
      const { data, error } = await query.limit(100);
      if (error) {
        console.error('Load verifications error:', error);
        setRequests([]);
      } else {
        setRequests((data as Row[]) ?? []);
      }
    } catch (err) {
      console.error('Load verifications error:', err);
      setRequests([]);
    }
    setLoading(false);
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const decide = async (action: 'approved' | 'rejected') => {
    if (!selected || !admin) return;
    setProcessing(true);
    setActionError('');

    const { error: updError } = await supabase.from('verification_requests').update({
      status: action,
      admin_note: adminNote,
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
    }).eq('id', selected.id);

    if (updError) {
      setActionError(updError.message);
      setProcessing(false);
      return;
    }

    // Mark the user verified on approval so the verified badge + withdrawal
    // gate reflect the decision immediately. Use the admin RPC so the hardened
    // profile-column guard allows the privileged is_verified change.
    if (action === 'approved') {
      const { error: verifyErr } = await supabase.rpc('set_user_verified', {
        p_user_uid: selected.user_id, p_verified: true,
      });
      if (verifyErr) {
        setActionError(`Verification updated, but marking user verified failed: ${verifyErr.message}`);
        setProcessing(false);
        return;
      }

      await supabase.rpc('notify_user', {
        target_uid: selected.user_id,
        n_title: 'Account Verified!',
        n_message: 'Your identity has been verified. You now have the verified badge.',
        n_type: 'success',
      });
    } else {
      await supabase.rpc('notify_user', {
        target_uid: selected.user_id,
        n_title: 'Verification Rejected',
        n_message: `Your verification request was rejected. ${adminNote}`,
        n_type: 'error',
      });
    }

    setProcessing(false);
    setSelected(null);
    setAdminNote('');
    load();
  };

  const tabs = [
    { id: 'pending', label: 'Pending' },
    { id: 'approved', label: 'Approved' },
    { id: 'rejected', label: 'Rejected' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-gray-900">Verification Requests</h1>
        <p className="mt-1 text-sm text-gray-600">Review identity documents submitted by users</p>
      </div>

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {loading ? (
        <LoadingSpinner size={40} className="py-20" />
      ) : requests.length === 0 ? (
        <Card><EmptyState icon={<ShieldCheck className="h-8 w-8" />} title="No verification requests" /></Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-left text-xs text-gray-500">
                <tr>
                  <th className="px-5 py-3 font-medium">User</th>
                  <th className="px-5 py-3 font-medium">UID</th>
                  <th className="px-5 py-3 font-medium">Document</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <div className="font-medium text-gray-900">{req.profiles?.username ?? 'Unknown'}</div>
                      <div className="text-xs text-gray-400">{req.profiles?.phone || '—'}</div>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-gray-500">{req.user_id.slice(0, 8)}</td>
                    <td className="px-5 py-3">
                      <a href={req.document_url} target="_blank" rel="noopener noreferrer"
                         className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700">
                        <FileImage className="h-4 w-4" /> View
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={req.status === 'approved' ? 'success' : req.status === 'rejected' ? 'error' : 'warning'} dot>
                        {req.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-gray-500">{new Date(req.created_at).toLocaleDateString()}</td>
                    <td className="px-5 py-3">
                      <Button size="sm" variant={req.status === 'pending' ? 'secondary' : 'ghost'}
                        onClick={() => { setSelected(req); setAdminNote(req.admin_note || ''); setActionError(''); }}>
                        {req.status === 'pending' ? 'Review' : 'View'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Verification Review" size="md">
        {selected && (
          <div className="space-y-4">
            <div className="rounded-lg bg-gray-50 p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">User:</span><span className="font-semibold text-gray-900">{selected.profiles?.username ?? 'Unknown'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">UID:</span><span className="font-mono text-xs text-gray-700">{selected.user_id}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Phone:</span><span className="text-gray-700">{selected.profiles?.phone || '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Submitted:</span><span className="text-gray-700">{new Date(selected.created_at).toLocaleString()}</span></div>
            </div>

            <a href={selected.document_url} target="_blank" rel="noopener noreferrer" className="block">
              <img src={selected.document_url} alt="Verification document"
                   className="max-h-72 w-full rounded-lg border border-gray-200 object-contain bg-gray-50" />
              <p className="mt-1 text-center text-xs text-primary-600">Click to open full size</p>
            </a>

            {selected.status === 'pending' ? (
              <>
                <Textarea label="Admin Note" placeholder="Add a note..." value={adminNote} onChange={(e) => setAdminNote(e.target.value)} rows={2} />
                {actionError && <Alert variant="error">{actionError}</Alert>}
                <div className="flex gap-3">
                  <Button variant="danger" fullWidth loading={processing} onClick={() => decide('rejected')}>
                    <X className="h-4 w-4" /> Reject
                  </Button>
                  <Button variant="primary" fullWidth loading={processing} onClick={() => decide('approved')}>
                    <Check className="h-4 w-4" /> Approve & Verify
                  </Button>
                </div>
              </>
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
