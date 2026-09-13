import { useCallback, useEffect, useState } from 'react';
import { Check, ExternalLink, Flag, Search, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { EmptyState, LoadingSpinner } from '@/components/ui/EmptyState';
import { Job, Profile } from '@/types';

type ReviewJob = Job & { profiles?: Pick<Profile, 'username' | 'email_verified'> };

export function AdminTaskReviewPage() {
  const [jobs, setJobs] = useState<ReviewJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [note, setNote] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadJobs = useCallback(async () => {
    setLoading(true);
    const query = supabase
      .from('jobs')
      .select('*, profiles(username, email_verified)')
      .eq('status', 'pending_review')
      .order('created_at', { ascending: true });
    const { data, error: loadError } = await query;
    if (loadError) setError(loadError.message);
    else setJobs(((data ?? []) as ReviewJob[]).filter((job) => {
      const q = search.trim().toLowerCase();
      return !q || job.title.toLowerCase().includes(q) || job.description.toLowerCase().includes(q) || job.category.toLowerCase().includes(q);
    }));
    setLoading(false);
  }, [search]);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  const review = async (job: ReviewJob, action: 'approve' | 'reject') => {
    if (action === 'reject' && !note[job.id]?.trim()) {
      setError('Add a short reason before rejecting a job.');
      return;
    }
    setBusyId(job.id);
    setError('');
    setMessage('');
    const { error: reviewError } = await supabase.rpc('review_job', {
      p_job_id: job.id,
      p_action: action,
      p_note: note[job.id] ?? '',
    });
    if (reviewError) setError(reviewError.message);
    else {
      setMessage(action === 'approve' ? 'Job approved and published.' : 'Job rejected and unused prepaid funds refunded.');
      setNote((prev) => ({ ...prev, [job.id]: '' }));
      await loadJobs();
    }
    setBusyId('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-heading text-2xl font-bold text-gray-900">Task Review</h1>
          <p className="mt-1 text-sm text-gray-600">Review new jobs before they become visible to workers.</p>
        </div>
        <Badge variant="warning" dot>{jobs.length} pending</Badge>
      </div>

      {error && <Alert variant="error" title="Review action failed">{error}</Alert>}
      {message && <Alert variant="success">{message}</Alert>}

      <Card className="p-4">
        <Input
          placeholder="Search pending jobs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={<Search className="h-4 w-4" />}
        />
      </Card>

      {loading ? <LoadingSpinner size={40} className="py-20" /> : jobs.length === 0 ? (
        <Card><EmptyState icon={<Flag className="h-8 w-8" />} title="No jobs pending review" description="New jobs will appear here before publication." /></Card>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <Card key={job.id} className="p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-gray-900">{job.title}</h2>
                    <Badge variant="warning">Pending review</Badge>
                    {job.is_premium_only && <Badge variant="accent">Premium</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">By {job.profiles?.username ?? 'Unknown'} · {job.category}{job.subcategory ? ` / ${job.subcategory}` : ''}</p>
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-gray-700">{job.description}</p>
                  {job.proof_instructions && (
                    <div className="mt-3 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
                      <strong>Proof requirements:</strong> {job.proof_instructions}
                    </div>
                  )}
                  <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500">
                    <span>Reward: <strong className="text-gray-900">${job.reward_per_worker.toFixed(3)}</strong></span>
                    <span>Workers: <strong className="text-gray-900">{job.total_slots}</strong></span>
                    {job.url && <a href={job.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary-600 hover:underline">Open task URL <ExternalLink className="h-3 w-3" /></a>}
                  </div>
                </div>
                <div className="flex w-full flex-col gap-3 lg:w-80">
                  <Textarea
                    label="Moderator note"
                    placeholder="Required for rejection; optional for approval"
                    rows={3}
                    value={note[job.id] ?? ''}
                    onChange={(e) => setNote((prev) => ({ ...prev, [job.id]: e.target.value }))}
                  />
                  <div className="flex gap-2">
                    <Button className="flex-1" onClick={() => review(job, 'approve')} disabled={busyId === job.id}>
                      <Check className="h-4 w-4" /> Approve
                    </Button>
                    <Button variant="danger" className="flex-1" onClick={() => review(job, 'reject')} disabled={busyId === job.id}>
                      <X className="h-4 w-4" /> Reject
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
