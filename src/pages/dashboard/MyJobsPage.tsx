import { useEffect, useState, useCallback } from 'react';
import { ExternalLink, Briefcase } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Badge } from '@/components/ui/Badge';
import { EmptyState, LoadingSpinner } from '@/components/ui/EmptyState';
import { Tabs } from '@/components/ui/Tabs';
import { useSeo } from '@/lib/useSeo';
import { Task, Job } from '@/types';

const COLORS = { primaryGreen: '#058824' };

type MyTask = Task & { jobs?: Job };

function parseProof(raw: string): { shots: string[]; plain: string } {
  if (!raw) return { shots: [], plain: '' };
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return { shots: parsed.filter(Boolean) as string[], plain: '' };
  } catch {
    /* not JSON */
  }
  return { shots: [], plain: raw };
}

export function MyJobsPage() {
  useSeo({
    title: 'আমার জব — WORKER GIG BD | করা কাজসমূহ',
    description: 'আপনি যে কাজগুলো সম্পন্ন করেছেন — Pending, Approved বা Rejected অবস্থায় দেখুন।',
    path: '/dashboard/my-jobs',
    noindex: true,
  });

  const { profile } = useAuth();
  const [tasks, setTasks] = useState<MyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pending');

  const load = useCallback(async () => {
    if (!profile) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*, jobs(*)')
        .eq('worker_id', profile.id)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Load my jobs error:', error);
        setTasks([]);
      } else {
        setTasks((data as MyTask[]) ?? []);
      }
    } catch (err) {
      console.error('Load my jobs error:', err);
      setTasks([]);
    }
    setLoading(false);
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  const filtered = tasks.filter((t) => {
    if (tab === 'pending') return t.status === 'pending' || t.status === 'submitted';
    if (tab === 'approved') return t.status === 'approved';
    if (tab === 'rejected') return t.status === 'rejected';
    return true;
  });

  const tabs = [
    { id: 'pending', label: 'Pending' },
    { id: 'approved', label: 'Approved' },
    { id: 'rejected', label: 'Rejected' },
  ];

  if (loading) return <LoadingSpinner size={40} className="py-20" />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl font-bold text-gray-900">My Jobs</h1>
        <p className="mt-1 text-sm text-gray-600">Tasks you have worked on and submitted</p>
      </div>

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white py-16">
          <EmptyState
            icon={<Briefcase className="h-8 w-8" />}
            title={`No ${tab} jobs`}
            description="Jobs you complete and submit will show up here."
          />
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((task) => {
            const reward = task.jobs?.reward_per_worker ?? 0;
            const { shots, plain } = parseProof(task.proof_url);
            const statusVariant =
              task.status === 'approved' ? 'success' :
              task.status === 'rejected' ? 'error' : 'warning';

            return (
              <div
                key={task.id}
                className="block w-full rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm transition-all hover:border-primary-200 hover:shadow-md"
              >
                {/* Top row: badges + status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap min-w-0 flex-1">
                    {task.jobs?.category && <Badge variant="primary">{task.jobs.category}</Badge>}
                    {task.jobs?.subcategory && <Badge variant="gray">{task.jobs.subcategory}</Badge>}
                    {task.tip_amount ? <Badge variant="accent">+tip</Badge> : null}
                  </div>
                  <Badge variant={statusVariant} dot>{task.status}</Badge>
                </div>

                {/* Title */}
                <h3 className="mt-1.5 text-sm font-semibold text-gray-900 line-clamp-1">
                  {task.jobs?.title ?? `Task #${task.id.slice(0, 8)}`}
                </h3>

                {/* Date + reward (dashboard style) */}
                <div className="mt-2.5 flex items-end justify-between">
                  <div className="text-[11px] font-semibold text-gray-500">
                    {new Date(task.submitted_at ?? task.created_at).toLocaleDateString()}
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    {task.tip_amount ? (
                      <span className="text-xs font-bold text-primary-600">+ $ {task.tip_amount.toFixed(3)}</span>
                    ) : null}
                    <span className="text-lg font-extrabold" style={{ color: COLORS.primaryGreen }}>$ {reward.toFixed(3)}</span>
                  </div>
                </div>

                {/* Proof (screenshots + text) */}
                {(plain || shots.length > 0 || task.proof_text) && (
                  <div className="mt-2.5 border-t border-gray-100 pt-2">
                    {plain && (
                      <a href={plain} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700">
                        <ExternalLink className="h-3 w-3" /> View proof
                      </a>
                    )}
                    {shots.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {shots.map((u, i) => (
                          <a key={i} href={u} target="_blank" rel="noopener noreferrer">
                            <img src={u} alt={`Proof ${i + 1}`} className="h-14 w-14 rounded-md object-cover ring-1 ring-gray-200" />
                          </a>
                        ))}
                      </div>
                    )}
                    {task.proof_text && <p className="mt-1 text-xs text-gray-500 line-clamp-2">{task.proof_text}</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
