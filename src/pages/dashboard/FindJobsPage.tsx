import { useEffect, useState, useCallback } from 'react';
import { Search, Briefcase, ExternalLink, X, Pin, Star } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState, LoadingSpinner } from '@/components/ui/EmptyState';
import { Alert } from '@/components/ui/Alert';
import { Job, Category } from '@/types';

const flagEmojis: Record<string, string> = {
  Facebook: '📘', Twitter: '🐦', Instagram: '📸', 'YouTube/Toffe': '📺',
  TikTok: '🎵', 'Sign Up': '✍️', 'Ads Click': '🖱️', Survey: '📋',
  'Gmail Account': '📧', 'Mobile Application': '📱', 'Write an Article': '📝',
  Comment: '💬', LinkedIn: '💼', Reddit: '🔴',
};

const sortOptions = [
  { value: 'latest', label: 'Latest' },
  { value: 'high_price', label: 'High Price' },
  { value: 'low_price', label: 'Low Price' },
  { value: 'best_paying', label: 'Best Paying' },
];

export function FindJobsPage() {
  const { profile } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('latest');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [proofUrl, setProofUrl] = useState('');
  const [proofText, setProofText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('jobs').select('*').eq('status', 'active');
      if (categoryFilter !== 'all') query = query.eq('category', categoryFilter);
      if (search) query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);

      if (sortBy === 'latest') query = query.order('created_at', { ascending: false });
      else if (sortBy === 'high_price') query = query.order('reward_per_worker', { ascending: false });
      else if (sortBy === 'low_price') query = query.order('reward_per_worker', { ascending: true });
      else if (sortBy === 'best_paying') query = query.order('reward_per_worker', { ascending: false });

      const { data, error } = await query.limit(50);
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
  }, [categoryFilter, search, sortBy]);

  useEffect(() => {
    supabase.from('categories').select('*').eq('is_active', true).order('display_order').then(({ data }) => {
      setCategories((data as Category[]) ?? []);
    });
  }, []);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  const handleAcceptJob = async () => {
    if (!selectedJob || !profile) return;
    setSubmitting(true);
    setSubmitError('');

    if (selectedJob.is_premium_only && !profile.is_premium) {
      setSubmitError('This job is only available for premium members.');
      setSubmitting(false);
      return;
    }

    const { data: existing } = await supabase
      .from('tasks')
      .select('id')
      .eq('job_id', selectedJob.id)
      .eq('worker_id', profile.id)
      .in('status', ['pending', 'submitted'])
      .maybeSingle();

    if (existing) {
      setSubmitError('You already have an active task for this job.');
      setSubmitting(false);
      return;
    }

    const { error } = await supabase.from('tasks').insert({
      job_id: selectedJob.id,
      worker_id: profile.id,
      status: 'submitted',
      proof_url: proofUrl,
      proof_text: proofText,
      submitted_at: new Date().toISOString(),
    });

    if (error) {
      setSubmitError(error.message);
    } else {
      setSubmitSuccess(true);
      // Notify the job owner that a worker submitted a task. Done via the
      // notify_user RPC so it bypasses RLS (worker != owner). Falls back
      // gracefully if the RPC isn't deployed yet.
      await supabase.rpc('notify_user', {
        target_uid: selectedJob.user_id,
        n_title: 'New Task Submission',
        n_message: `A worker has submitted a task for "${selectedJob.title}". Review it in your admin panel.`,
        n_type: 'info',
      });
      setTimeout(() => {
        setSelectedJob(null);
        setProofUrl('');
        setProofText('');
        setSubmitSuccess(false);
      }, 2000);
    }
    setSubmitting(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl font-bold text-gray-900">Find Jobs</h1>
        <p className="mt-1 text-sm text-gray-600">Browse available tasks and start earning</p>
      </div>

      {/* Filter bar - WorkUpJob style */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-3">
          <div className="flex-1">
            <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </Select>
          </div>
          <div className="flex-1">
            <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </Select>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search jobs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white pl-9 pr-9 py-2.5 text-sm text-gray-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
          {(search || categoryFilter !== 'all') && (
            <button
              onClick={() => { setSearch(''); setCategoryFilter('all'); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Jobs feed */}
      {loading ? (
        <LoadingSpinner size={36} className="py-16" />
      ) : jobs.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white py-16">
          <EmptyState
            icon={<Briefcase className="h-8 w-8" />}
            title="No jobs found"
            description="Try adjusting your filters or check back later."
          />
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => {
            const progress = job.total_slots > 0 ? (job.filled_slots / job.total_slots) * 100 : 0;
            const isFull = job.filled_slots >= job.total_slots;
            const totalReward = job.reward_per_worker + (job.screenshot_count ?? 0) * 0.05;
            const isPinned = job.is_premium_only;

            return (
              <button
                key={job.id}
                onClick={() => setSelectedJob(job)}
                disabled={isFull}
                className="block w-full text-left rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-primary-200 hover:shadow-md disabled:opacity-60"
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <h3 className="text-base font-bold uppercase text-gray-900 line-clamp-1">
                      {job.title}
                    </h3>
                    <span className="text-base">{flagEmojis[job.category] ?? '🌍'}</span>
                    {totalReward >= 0.1 && (
                      <span className="rounded bg-success-100 px-2 py-0.5 text-[11px] font-extrabold uppercase text-success-700">
                        TOP JOB
                      </span>
                    )}
                  </div>
                  {isPinned && (
                    <div className="flex shrink-0 items-center gap-1 text-[#5865F2]">
                      <Pin className="h-4 w-4 fill-[#5865F2]" />
                      <span className="text-sm font-bold">Pinned</span>
                    </div>
                  )}
                </div>

                {/* Bottom row */}
                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <div className="text-xs font-semibold text-gray-600">
                      {job.filled_slots} OF {job.total_slots}
                    </div>
                    <div className="mt-1 h-1.5 w-28 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className={`h-full rounded-full ${isFull ? 'bg-gray-400' : 'bg-success-600'}`}
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-lg font-extrabold text-success-600">
                    {totalReward.toFixed(3)} S
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Job detail modal */}
      <Modal
        open={!!selectedJob}
        onClose={() => { setSelectedJob(null); setSubmitError(''); setProofUrl(''); setProofText(''); }}
        title="Job Details"
        size="lg"
      >
        {selectedJob && (
          <div className="space-y-4">
            {submitSuccess ? (
              <div className="py-8 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success-50">
                  <Star className="h-7 w-7 text-success-600 fill-success-600" />
                </div>
                <h3 className="font-heading text-lg font-bold text-gray-900">Task Submitted!</h3>
                <p className="mt-1 text-sm text-gray-600">Your task has been submitted for review.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="rounded-lg bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700">
                    {selectedJob.category}
                  </span>
                  {selectedJob.subcategory && (
                    <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                      {selectedJob.subcategory}
                    </span>
                  )}
                  {selectedJob.is_premium_only && (
                    <span className="rounded-lg bg-accent-50 px-2.5 py-1 text-xs font-semibold text-accent-700">
                      Premium Only
                    </span>
                  )}
                </div>

                <h3 className="font-heading text-xl font-bold uppercase text-gray-900">
                  {selectedJob.title}
                </h3>

                {selectedJob.image_url && (
                  <img src={selectedJob.image_url} alt="Job" className="w-full rounded-lg border border-gray-200" />
                )}

                <p className="text-sm text-gray-600">{selectedJob.description}</p>

                {selectedJob.url && (
                  <a
                    href={selectedJob.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700"
                  >
                    <ExternalLink className="h-4 w-4" /> Open task link
                  </a>
                )}

                {selectedJob.proof_instructions && (
                  <div className="rounded-lg bg-gray-50 p-4">
                    <div className="text-sm font-semibold text-gray-700">Requirements</div>
                    <p className="mt-1 text-sm text-gray-600">{selectedJob.proof_instructions}</p>
                  </div>
                )}

                {(selectedJob.screenshot_count ?? 0) > 0 && (
                  <div className="rounded-lg bg-primary-50/50 p-4">
                    <div className="text-sm font-semibold text-primary-700">
                      Screenshots required: {selectedJob.screenshot_count}
                    </div>
                    {selectedJob.screenshot_instructions && (
                      <p className="mt-1 text-sm text-gray-600">{selectedJob.screenshot_instructions}</p>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border border-gray-200 p-3">
                    <div className="text-xs text-gray-500">Reward</div>
                    <div className="text-lg font-bold text-success-600">
                      {(selectedJob.reward_per_worker + (selectedJob.screenshot_count ?? 0) * 0.05).toFixed(3)} S
                    </div>
                  </div>
                  <div className="rounded-lg border border-gray-200 p-3">
                    <div className="text-xs text-gray-500">Available Slots</div>
                    <div className="text-lg font-bold text-gray-900">{selectedJob.total_slots - selectedJob.filled_slots}</div>
                  </div>
                </div>

                {submitError && <Alert variant="error">{submitError}</Alert>}

                <div className="space-y-3 border-t border-gray-100 pt-4">
                  <Input
                    label="Proof URL (if applicable)"
                    placeholder="https://..."
                    value={proofUrl}
                    onChange={(e) => setProofUrl(e.target.value)}
                  />
                  <Input
                    label="Proof Details"
                    placeholder="Describe or paste your proof..."
                    value={proofText}
                    onChange={(e) => setProofText(e.target.value)}
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={() => { setSelectedJob(null); setSubmitError(''); setProofUrl(''); setProofText(''); }}
                  >
                    Cancel
                  </Button>
                  <Button fullWidth loading={submitting} onClick={handleAcceptJob}>
                    Submit Task
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
