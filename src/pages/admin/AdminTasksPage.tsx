import { useEffect, useState, useCallback } from 'react';
import { Check, X, Briefcase, ExternalLink, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Tabs } from '@/components/ui/Tabs';
import { LoadingSpinner, EmptyState } from '@/components/ui/EmptyState';
import { Task, Job, Profile } from '@/types';

type TaskWithRelations = Task & { jobs?: Job; profiles?: Profile };

export function AdminTasksPage() {
  const { profile: admin } = useAuth();
  const [tasks, setTasks] = useState<TaskWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('submitted');
  const [selected, setSelected] = useState<TaskWithRelations | null>(null);
  const [processing, setProcessing] = useState(false);
  const [search, setSearch] = useState('');

  const loadTasks = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('tasks').select('*, jobs(*), profiles(username)').order('created_at', { ascending: false });
    if (tab === 'submitted') query = query.eq('status', 'submitted');
    else if (tab === 'approved') query = query.eq('status', 'approved');
    else if (tab === 'rejected') query = query.eq('status', 'rejected');
    else if (tab === 'pending') query = query.eq('status', 'pending');
    const { data } = await query.limit(100);
    setTasks((data as TaskWithRelations[]) ?? []);
    setLoading(false);
  }, [tab]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const handleApprove = async () => {
    if (!selected || !admin) return;
    setProcessing(true);

    const { error: taskError } = await supabase.from('tasks').update({
      status: 'approved',
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
    }).eq('id', selected.id);

    if (taskError) { console.error(taskError); setProcessing(false); return; }

    const job = selected.jobs;
    const reward = job?.reward_per_worker ?? 0;
    const screenshotBonus = (job?.screenshot_count ?? 0) * 0.05;
    const totalReward = reward + screenshotBonus;

    const { data: workerProfile } = await supabase.from('profiles').select('*').eq('id', selected.worker_id).maybeSingle();
    if (workerProfile) {
      const wp = workerProfile as Profile;
      await supabase.from('profiles').update({
        earning_balance: wp.earning_balance + totalReward,
        total_earned: wp.total_earned + totalReward,
        tasks_completed: wp.tasks_completed + 1,
        updated_at: new Date().toISOString(),
      }).eq('id', selected.worker_id);

      await supabase.from('transactions').insert({
        user_id: selected.worker_id,
        type: 'earning',
        amount: totalReward,
        balance_type: 'earning',
        description: `Task approved: ${job?.title ?? 'Unknown job'}`,
      });
    }

    await supabase.from('jobs').update({
      filled_slots: (job?.filled_slots ?? 0) + 1,
      updated_at: new Date().toISOString(),
    }).eq('id', selected.job_id);

    await supabase.from('notifications').insert({
      user_id: selected.worker_id,
      title: 'Task Approved!',
      message: `Your task "${job?.title ?? ''}" has been approved. ৳${totalReward.toFixed(3)} has been credited to your earning balance.`,
      type: 'success',
    });

    setProcessing(false);
    setSelected(null);
    loadTasks();
  };

  const handleReject = async () => {
    if (!selected || !admin) return;
    setProcessing(true);

    await supabase.from('tasks').update({
      status: 'rejected',
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
    }).eq('id', selected.id);

    await supabase.from('notifications').insert({
      user_id: selected.worker_id,
      title: 'Task Rejected',
      message: `Your task "${selected.jobs?.title ?? ''}" was rejected. Please check the requirements and try again.`,
      type: 'error',
    });

    setProcessing(false);
    setSelected(null);
    loadTasks();
  };

  const tabs = [
    { id: 'submitted', label: 'Submitted' },
    { id: 'approved', label: 'Approved' },
    { id: 'rejected', label: 'Rejected' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-gray-900">Task Review</h1>
        <p className="mt-1 text-sm text-gray-600">Review and approve/reject worker task submissions</p>
      </div>

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {loading ? (
        <LoadingSpinner size={40} className="py-20" />
      ) : tasks.length === 0 ? (
        <Card><EmptyState icon={<Briefcase className="h-8 w-8" />} title="No tasks found" /></Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-left text-xs text-gray-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Worker</th>
                  <th className="px-5 py-3 font-medium">Job</th>
                  <th className="px-5 py-3 font-medium">Reward</th>
                  <th className="px-5 py-3 font-medium">Proof</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900">{task.profiles?.username ?? 'Unknown'}</td>
                    <td className="px-5 py-3 text-gray-700 line-clamp-1">{task.jobs?.title ?? 'Unknown'}</td>
                    <td className="px-5 py-3 font-semibold text-success-600">
                      ৳ {((task.jobs?.reward_per_worker ?? 0) + (task.jobs?.screenshot_count ?? 0) * 0.05).toFixed(3)}
                    </td>
                    <td className="px-5 py-3">
                      {task.proof_url ? (
                        <a href={task.proof_url} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      ) : (
                        <span className="text-gray-400 text-xs">Text only</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={task.status === 'approved' ? 'success' : task.status === 'rejected' ? 'error' : 'warning'} dot>
                        {task.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-gray-500">{new Date(task.created_at).toLocaleDateString()}</td>
                    <td className="px-5 py-3">
                      {task.status === 'submitted' || task.status === 'pending' ? (
                        <Button size="sm" variant="secondary" onClick={() => setSelected(task)}>
                          Review
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => setSelected(task)}>
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

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Task Review" size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="rounded-lg bg-gray-50 p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Worker:</span><span className="font-semibold text-gray-900">{selected.profiles?.username ?? 'Unknown'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Job:</span><span className="font-semibold text-gray-900">{selected.jobs?.title ?? 'Unknown'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Category:</span><span className="text-gray-700">{selected.jobs?.category}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Reward:</span><span className="font-bold text-success-600">৳ {((selected.jobs?.reward_per_worker ?? 0) + (selected.jobs?.screenshot_count ?? 0) * 0.05).toFixed(3)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Date:</span><span className="text-gray-700">{new Date(selected.created_at).toLocaleString()}</span></div>
            </div>

            {selected.jobs?.description && (
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-1">Job Description</div>
                <p className="text-sm text-gray-600">{selected.jobs.description}</p>
              </div>
            )}

            {selected.jobs?.proof_instructions && (
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-1">Requirements</div>
                <p className="text-sm text-gray-600">{selected.jobs.proof_instructions}</p>
              </div>
            )}

            {selected.proof_url && (
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-1">Proof URL</div>
                <a href={selected.proof_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700">
                  <ExternalLink className="h-4 w-4" /> {selected.proof_url}
                </a>
              </div>
            )}

            {selected.proof_text && (
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-1">Proof Details</div>
                <div className="rounded-lg border border-gray-200 p-3 text-sm text-gray-600">{selected.proof_text}</div>
              </div>
            )}

            {(selected.status === 'submitted' || selected.status === 'pending') ? (
              <div className="flex gap-3">
                <Button variant="danger" fullWidth loading={processing} onClick={handleReject}>
                  <X className="h-4 w-4" /> Reject
                </Button>
                <Button fullWidth loading={processing} onClick={handleApprove}>
                  <Check className="h-4 w-4" /> Approve & Pay Worker
                </Button>
              </div>
            ) : (
              <div className="rounded-lg border border-gray-200 p-3 text-sm">
                <span className="text-gray-500">Status: </span>
                <Badge variant={selected.status === 'approved' ? 'success' : 'error'} dot>{selected.status}</Badge>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
