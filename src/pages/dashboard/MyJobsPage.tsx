import { useEffect, useState, useCallback } from 'react';
import { Pause, Play, Trash2, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { EmptyState, LoadingSpinner } from '@/components/ui/EmptyState';
import { useSeo } from '@/lib/useSeo';
import { Job } from '@/types';

// Matches the dashboard accent so My Jobs cards feel like the feed.
const COLORS = { primaryGreen: '#058824' };

export function MyJobsPage() {
  useSeo({
    title: 'আমার জব — WORKER GIG BD | পোস্ট করা কাজসমূহ',
    description: 'আপনি পোস্ট করা কাজগুলো পরিচালনা করুন — পজ, রিজিউম বা ডিলিট।',
    path: '/dashboard/my-jobs',
    noindex: true,
  });
  const { profile } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadJobs = useCallback(async () => {
    if (!profile) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.from('jobs')
        .select('*').eq('user_id', profile.id)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Load jobs error:', error);
        setJobs([]);
      } else {
        setJobs((data as Job[]) ?? []);
      }
    } catch (err) {
      console.error('Load jobs error:', err);
      setJobs([]);
    }
    setLoading(false);
  }, [profile]);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  const toggleStatus = async (job: Job) => {
    if (job.status !== 'active' && job.status !== 'paused') {
      setError('Completed or rejected jobs cannot be reactivated.');
      return;
    }
    const rpcName = job.status === 'active' ? 'hold_job' : 'resume_job';
    const { error: e } = await supabase.rpc(rpcName, { p_job_id: job.id });
    if (e) setError(e.message);
    loadJobs();
  };

  const deleteJob = async (id: string) => {
    if (!confirm('Delete this job? Submitted tasks will be auto-approved and paid. Unused budget for unfilled slots will be refunded to your deposit balance.')) return;
    const { error: e } = await supabase.rpc('delete_job', { p_job_id: id });
    if (e) setError(e.message);
    loadJobs();
  };

  if (loading) return <LoadingSpinner size={40} className="py-20" />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl font-bold text-gray-900">My Jobs</h1>
        <p className="mt-1 text-sm text-gray-600">Manage jobs you have posted</p>
      </div>

      {error && <Alert variant="error" title="Action failed">{error}</Alert>}

      {jobs.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white py-16">
          <EmptyState
            icon={<Play className="h-8 w-8" />}
            title="No jobs posted yet"
            description="Post your first job to start getting workers."
          />
        </div>
      ) : (
        <div className="space-y-2.5">
          {jobs.map((job) => {
            const progress = job.total_slots > 0 ? (job.filled_slots / job.total_slots) * 100 : 0;
            const totalReward = job.reward_per_worker ?? 0;
            const statusVariant =
              job.status === 'active' ? 'success' :
              job.status === 'paused' ? 'warning' :
              job.status === 'completed' ? 'primary' : 'error';

            return (
              <div
                key={job.id}
                className="block w-full rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm transition-all hover:border-primary-200 hover:shadow-md"
              >
                {/* Top row: badges + action buttons */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap min-w-0 flex-1">
                    <Badge variant="primary">{job.category}</Badge>
                    {job.subcategory && <Badge variant="gray">{job.subcategory}</Badge>}
                    {job.is_premium_only && <Badge variant="accent">Premium</Badge>}
                    {(job.screenshot_count ?? 0) > 0 && (
                      <Badge variant="gray">{job.screenshot_count} shot</Badge>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => toggleStatus(job)}
                      disabled={job.status === 'completed' || job.status === 'rejected'}
                      className="!px-2 !py-1"
                    >
                      {job.status === 'active' ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => deleteJob(job.id)}
                      className="!px-2 !py-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Title + status */}
                <div className="mt-1.5 flex items-center gap-1.5">
                  <h3 className="text-sm font-semibold text-gray-900 line-clamp-1 flex-1 min-w-0">{job.title}</h3>
                  <Badge variant={statusVariant} dot>{job.status}</Badge>
                </div>

                {/* Slots + progress + reward (dashboard style) */}
                <div className="mt-2.5 flex items-end justify-between">
                  <div>
                    <div className="text-[11px] font-semibold text-gray-500">{job.filled_slots} OF {job.total_slots}</div>
                    <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-gray-200">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(progress, 100)}%`, backgroundColor: COLORS.primaryGreen }} />
                    </div>
                    {job.url && (
                      <a href={job.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-[11px] text-primary-600 hover:text-primary-700">
                        <ExternalLink className="h-3 w-3" /> Link
                      </a>
                    )}
                  </div>
                  <div className="text-lg font-extrabold" style={{ color: COLORS.primaryGreen }}>$ {totalReward.toFixed(3)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
