import { useEffect, useState, useCallback } from 'react';
import { Search, Ban, CheckCircle, Trash2, Edit, ShieldCheck, Filter } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { LoadingSpinner, EmptyState } from '@/components/ui/EmptyState';
import { Profile } from '@/types';

export function AdminUsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [editForm, setEditForm] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('profiles').select('*').neq('status', 'admin');
      if (statusFilter !== 'all') query = query.eq('status', statusFilter);
      if (search) query = query.or(`username.ilike.%${search}%,full_name.ilike.%${search}%`);
      const { data, error } = await query.order('created_at', { ascending: false }).limit(100);
      if (error) {
        console.error('Load users error:', error);
        setUsers([]);
      } else {
        setUsers((data as Profile[]) ?? []);
      }
    } catch (err) {
      console.error('Load users error:', err);
      setUsers([]);
    }
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const updateStatus = async (user: Profile, status: string) => {
    await supabase.from('profiles').update({ status, updated_at: new Date().toISOString() }).eq('id', user.id);
    loadUsers();
    setSelectedUser(null);
  };

  const toggleVerified = async (user: Profile) => {
    await supabase.from('profiles').update({ is_verified: !user.is_verified, updated_at: new Date().toISOString() }).eq('id', user.id);
    loadUsers();
    setSelectedUser(null);
  };

  const togglePremium = async (user: Profile) => {
    const updates: any = { is_premium: !user.is_premium, updated_at: new Date().toISOString() };
    if (!user.is_premium) {
      const expiry = new Date(); expiry.setDate(expiry.getDate() + 30);
      updates.premium_expires_at = expiry.toISOString();
    } else {
      updates.premium_expires_at = null;
    }
    await supabase.from('profiles').update(updates).eq('id', user.id);
    loadUsers();
    setSelectedUser(null);
  };

  const handleSaveEdit = async () => {
    if (!editForm) return;
    setSaving(true);
    await supabase.from('profiles').update({
      username: editForm.username,
      full_name: editForm.full_name,
      phone: editForm.phone,
      earning_balance: editForm.earning_balance,
      deposit_balance: editForm.deposit_balance,
      updated_at: new Date().toISOString(),
    }).eq('id', editForm.id);
    setSaving(false);
    setEditForm(null);
    loadUsers();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-gray-900">User Management</h1>
        <p className="mt-1 text-sm text-gray-600">Manage all platform users</p>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <Input placeholder="Search by username or name..." value={search} onChange={(e) => setSearch(e.target.value)} icon={<Search className="h-4 w-4" />} />
          </div>
          <div className="sm:w-48">
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="blocked">Blocked</option>
            </Select>
          </div>
        </div>
      </Card>

      {loading ? (
        <LoadingSpinner size={40} className="py-20" />
      ) : users.length === 0 ? (
        <Card><EmptyState icon={<Search className="h-8 w-8" />} title="No users found" /></Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-left text-xs text-gray-500">
                <tr>
                  <th className="px-5 py-3 font-medium">User</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Earning</th>
                  <th className="px-5 py-3 font-medium">Deposit</th>
                  <th className="px-5 py-3 font-medium">Tasks</th>
                  <th className="px-5 py-3 font-medium">Joined</th>
                  <th className="px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white uppercase">
                          {user.username?.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 flex items-center gap-1.5">
                            {user.username}
                            {user.is_verified && <ShieldCheck className="h-3.5 w-3.5 text-success-600" />}
                            {user.is_premium && <Badge variant="accent" size="sm">PRO</Badge>}
                          </div>
                          <div className="text-xs text-gray-500">{user.id.slice(0, 8)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={user.status === 'active' ? 'success' : user.status === 'suspended' ? 'warning' : 'error'} dot>
                        {user.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 font-semibold text-gray-900">৳ {user.earning_balance.toFixed(2)}</td>
                    <td className="px-5 py-3 font-semibold text-gray-900">৳ {user.deposit_balance.toFixed(2)}</td>
                    <td className="px-5 py-3 text-gray-700">{user.tasks_completed}</td>
                    <td className="px-5 py-3 text-gray-500">{new Date(user.created_at).toLocaleDateString()}</td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => setSelectedUser(user)} className="rounded-lg p-1.5 text-gray-500 hover:bg-primary-50 hover:text-primary-600" title="Manage">
                          <Edit className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* User management modal */}
      <Modal open={!!selectedUser} onClose={() => setSelectedUser(null)} title="Manage User" size="lg">
        {selectedUser && (
          <div className="space-y-5">
            <div className="flex items-center gap-4 rounded-lg bg-gray-50 p-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-600 text-xl font-bold text-white uppercase">
                {selectedUser.username?.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-heading text-lg font-bold text-gray-900">{selectedUser.username}</h3>
                  {selectedUser.is_verified && <ShieldCheck className="h-5 w-5 text-success-600" />}
                  {selectedUser.is_premium && <Badge variant="accent" size="sm">PRO</Badge>}
                </div>
                <p className="text-sm text-gray-500">ID: {selectedUser.id.slice(0, 12)}</p>
                <p className="text-sm text-gray-500">Joined: {new Date(selectedUser.created_at).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-gray-200 p-3">
                <div className="text-xs text-gray-500">Earning Balance</div>
                <div className="text-lg font-bold text-gray-900">৳ {selectedUser.earning_balance.toFixed(3)}</div>
              </div>
              <div className="rounded-lg border border-gray-200 p-3">
                <div className="text-xs text-gray-500">Deposit Balance</div>
                <div className="text-lg font-bold text-gray-900">৳ {selectedUser.deposit_balance.toFixed(3)}</div>
              </div>
              <div className="rounded-lg border border-gray-200 p-3">
                <div className="text-xs text-gray-500">Tasks Completed</div>
                <div className="text-lg font-bold text-gray-900">{selectedUser.tasks_completed}</div>
              </div>
              <div className="rounded-lg border border-gray-200 p-3">
                <div className="text-xs text-gray-500">Jobs Posted</div>
                <div className="text-lg font-bold text-gray-900">{selectedUser.jobs_posted}</div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <h4 className="mb-3 text-sm font-semibold text-gray-700">Account Actions</h4>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="secondary" size="sm" onClick={() => toggleVerified(selectedUser)}>
                  <ShieldCheck className="h-4 w-4" /> {selectedUser.is_verified ? 'Unverify' : 'Verify'}
                </Button>
                <Button variant="secondary" size="sm" onClick={() => togglePremium(selectedUser)}>
                  {selectedUser.is_premium ? 'Remove Premium' : 'Grant Premium'}
                </Button>
                <Button variant="secondary" size="sm" onClick={() => updateStatus(selectedUser, 'active')} disabled={selectedUser.status === 'active'}>
                  <CheckCircle className="h-4 w-4" /> Activate
                </Button>
                <Button variant="secondary" size="sm" onClick={() => updateStatus(selectedUser, 'suspended')} disabled={selectedUser.status === 'suspended'}>
                  <Ban className="h-4 w-4" /> Suspend
                </Button>
                <Button variant="danger" size="sm" onClick={() => updateStatus(selectedUser, 'blocked')} disabled={selectedUser.status === 'blocked'}>
                  <Ban className="h-4 w-4" /> Block
                </Button>
                <Button variant="secondary" size="sm" onClick={() => { setEditForm(selectedUser); setSelectedUser(null); }}>
                  <Edit className="h-4 w-4" /> Edit Details
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editForm} onClose={() => setEditForm(null)} title="Edit User Details">
        {editForm && (
          <div className="space-y-4">
            <Input label="Username" value={editForm.username} onChange={(e) => setEditForm({ ...editForm, username: e.target.value })} />
            <Input label="Full Name" value={editForm.full_name ?? ''} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} />
            <Input label="Phone" value={editForm.phone ?? ''} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
            <Input label="Earning Balance" type="number" step="0.001" value={editForm.earning_balance} onChange={(e) => setEditForm({ ...editForm, earning_balance: parseFloat(e.target.value) || 0 })} />
            <Input label="Deposit Balance" type="number" step="0.001" value={editForm.deposit_balance} onChange={(e) => setEditForm({ ...editForm, deposit_balance: parseFloat(e.target.value) || 0 })} />
            <div className="flex gap-3">
              <Button variant="secondary" fullWidth onClick={() => setEditForm(null)}>Cancel</Button>
              <Button fullWidth loading={saving} onClick={handleSaveEdit}>Save Changes</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
