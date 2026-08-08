import { useEffect, useState, useCallback } from 'react';
import { Briefcase, ExternalLink, CheckCircle, Clock, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState, LoadingSpinner } from '@/components/ui/EmptyState';
import { Tabs } from '@/components/ui/Tabs';
import { Task, Job } from '@/types';

export function MyTasksPage() {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<(Task & { jobs?: Job })[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('active');

  const loadTasks = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    let query = supabase.from('tasks').select('*, jobs(*)').eq('worker_id', profile.id);
    if (tab === 'active') query = query.in('status', ['pending', 'submitted']);
    else if (tab === 'approved') query = query.eq('status', 'approved');
    else if (tab === 'rejected') query = query.eq('status', 'rejected');
    const { data } = await query.order('created_at', { ascending: false }).limit(50);
    setTasks((data as (Task & { jobs?: Job })[]) ?? []);
    setLoading(false);
  }, [profile, tab]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const tabs = [
    { id: 'active', label: 'Active' },
    { id: 'approved', label: 'Approved' },
    { id: 'rejected', label: 'Rejected' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-gray-900">My Tasks</h1>
        <p className="mt-1 text-sm text-gray-600">Track your task submissions and earnings</p>
      </div>

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {loading ? (
        <LoadingSpinner size={40} className="py-20" />
      ) : tasks.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Briefcase className="h-8 w-8" />}
            title="No tasks found"
            description="You haven't worked on any tasks in this category yet."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <Card key={task.id} className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    task.status === 'approved' ? 'bg-success-50' :
                    task.status === 'rejected' ? 'bg-error-50' : 'bg-warning-50'
                  }`}>
                    {task.status === 'approved' ? <CheckCircle className="h-5 w-5 text-success-600" /> :
                     task.status === 'rejected' ? <XCircle className="h-5 w-5 text-error-600" /> :
                     <Clock className="h-5 w-5 text-warning-600" />}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">
                      {task.jobs?.title ?? `Task #${task.id.slice(0, 8)}`}
                    </div>
                    <div className="text-xs text-gray-500">
                      {task.jobs?.category} • {new Date(task.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm font-bold text-gray-900">৳ {task.jobs?.reward_per_worker.toFixed(3) ?? '0.000'}</div>
                    <div className="text-xs text-gray-500">Reward</div>
                  </div>
                  <Badge
                    variant={task.status === 'approved' ? 'success' : task.status === 'rejected' ? 'error' : 'warning'}
                    dot
                  >
                    {task.status}
                  </Badge>
                </div>
              </div>

              {(task.proof_url || task.proof_text) && (
                <div className="mt-3 border-t border-gray-100 pt-3">
                  {task.proof_url && (
                    <a href={task.proof_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700">
                      <ExternalLink className="h-3 w-3" /> {task.proof_url}
                    </a>
                  )}
                  {task.proof_text && <p className="mt-1 text-xs text-gray-500">{task.proof_text}</p>}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
