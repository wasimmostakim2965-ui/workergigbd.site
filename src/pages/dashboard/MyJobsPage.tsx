import { useEffect, useState, useCallback } from 'react';
import { Briefcase, Pause, Play, CheckCircle, ExternalLink, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { EmptyState, LoadingSpinner } from '@/components/ui/EmptyState';
import { Job } from '@/types';

export function MyJobsPage() {
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
    const newStatus = job.status === 'active' ? 'paused' : 'active';
    const { error: e } = await supabase.from('jobs').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', job.id);
    if (e) setError(e.message);
    loadJobs();
  };

  const deleteJob = async (id: string) => {
    if (!confirm('Are you sure you want to delete this job? Unused prepaid budget will be refunded.')) return;
    // Use the delete_job RPC so the prepaid budget is refunded and affected
    // workers are notified instead of a raw cascade delete.
    const { error: e } = await supabase.rpc('delete_job', { p_job_id: id });
    if (e) setError(e.message);
    loadJobs();
  };

  if (loading) return <LoadingSpinner size={40} className="py-20" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-gray-900">My Jobs</h1>
        <p className="mt-1 text-sm text-gray-600">Manage jobs you have posted</p>
      </div>

      {error && <Alert variant="error" title="Action failed">{error}</Alert>}

      {jobs.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Briefcase className="h-8 w-8" />}
            title="No jobs posted yet"
            description="Post your first job to start getting workers."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <Card key={job.id} className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="primary">{job.category}</Badge>
                    {job.subcategory && <Badge variant="gray">{job.subcategory}</Badge>}
                    <Badge
                      variant={job.status === 'active' ? 'success' : job.status === 'paused' ? 'warning' : job.status === 'completed' ? 'primary' : 'error'}
                      dot
                    >
                      {job.status}
                    </Badge>
                    {job.is_premium_only && <Badge variant="accent">Premium</Badge>}
                  </div>
                  <h3 className="font-semibold text-gray-900">{job.title}</h3>
                  <p className="mt-1 text-sm text-gray-600 line-clamp-2">{job.description}</p>

                  <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-500">Reward:</span>
                      <span className="font-semibold text-success-600">$ {job.reward_per_worker.toFixed(3)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-500">Slots:</span>
                      <span className="font-semibold text-gray-900">{job.filled_slots}/{job.total_slots}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-500">Created:</span>
                      <span className="text-gray-700">{new Date(job.created_at).toLocaleDateString()}</span>
                    </div>
                    {job.url && (
                      <a href={job.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700">
                        <ExternalLink className="h-3 w-3" /> View Link
                      </a>
                    )}
                  </div>

                  <div className="mt-3 h-1.5 rounded-full bg-gray-100">
                    <div className="h-full rounded-full bg-primary-500" style={{ width: `${job.total_slots > 0 ? (job.filled_slots / job.total_slots) * 100 : 0}%` }} />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => toggleStatus(job)}
                    disabled={job.status === 'completed' || job.status === 'rejected'}
                  >
                    {job.status === 'active' ? <><Pause className="h-4 w-4" /> Pause</> : <><Play className="h-4 w-4" /> Resume</>}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => deleteJob(job.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
