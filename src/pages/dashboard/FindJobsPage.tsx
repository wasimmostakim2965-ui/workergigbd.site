import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Briefcase, ExternalLink, X, Pin, Star, Camera, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { checkProofScreenshots } from '@/lib/fraudGuard';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { EmptyState, LoadingSpinner } from '@/components/ui/EmptyState';
import { Alert } from '@/components/ui/Alert';
import { Job, Category } from '@/types';
import { useSeo } from '@/lib/useSeo';

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
  useSeo({
    title: 'কাজ খুঁজুন — WORKER GIG BD | অনলাইন মাইক্রো-টাস্ক ও ফ্রিল্যান্স কাজ',
    description: 'WORKER GIG BD-তে পাওয়া সহজ অনলাইন মাইক্রো-টাস্ক ও ফ্রিল্যান্স কাজ ব্রাউজ করুন। ফেসবুক, ইউটিউব, সাইন আপ, সার্ভে, কমেন্ট ইত্যাদি কাজ করে আয় করুন।',
    path: '/dashboard/find-jobs',
  });
  const { profile } = useAuth();
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('latest');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [proofUrl, setProofUrl] = useState('');
  const [proofText, setProofText] = useState('');
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [uploadingShot, setUploadingShot] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      // Jobs the current worker has already submitted a task for — hidden so
      // they never reappear (one task per worker per job, enforced by the DB).
      let doneJobIds: string[] = [];
      if (profile) {
        const { data: myTasks } = await supabase
          .from('tasks')
          .select('job_id')
          .eq('worker_id', profile.id);
        doneJobIds = (myTasks ?? []).map((t) => t.job_id);
      }

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
        // Hide full (100% completed) jobs and jobs this worker already did.
        setJobs(
          ((data as Job[]) ?? []).filter(
            (j) => j.filled_slots < j.total_slots && !doneJobIds.includes(j.id),
          ),
        );
      }
    } catch (err) {
      console.error('Load jobs error:', err);
      setJobs([]);
    }
    setLoading(false);
  }, [categoryFilter, search, sortBy, profile]);

  useEffect(() => {
    supabase.from('categories').select('*').eq('is_active', true).order('display_order').then(({ data }) => {
      setCategories((data as Category[]) ?? []);
    });
  }, []);

  // Open a specific job directly from the URL (one-click from DashboardHome)
  useEffect(() => {
    if (!jobId) return;
    let active = true;
    supabase.from('jobs').select('*').eq('id', jobId).maybeSingle().then(({ data, error }) => {
      if (active && data && !error) setSelectedJob(data as Job);
      else if (active) navigate('/dashboard/find-jobs', { replace: true });
    });
    return () => { active = false; };
  }, [jobId, navigate]);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  // Keep the URL ?q= param in sync with the search box so the schema.org
  // SearchAction target (/dashboard/find-jobs?q={search_term_string}) resolves.
  const onSearchChange = (value: string) => {
    setSearch(value);
    const next = new URLSearchParams(searchParams);
    if (value) next.set('q', value);
    else next.delete('q');
    setSearchParams(next, { replace: true });
  };

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedJob || !profile) return;
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const remaining = selectedJob.screenshot_count - screenshots.length;
    if (remaining <= 0) return;
    // Validate before uploading: images only, max 5 MB each.
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    for (const f of files.slice(0, remaining)) {
      if (f.size > 5 * 1024 * 1024) { setSubmitError('Each screenshot must be less than 5 MB.'); return; }
      if (!allowed.includes(f.type)) { setSubmitError('Screenshots must be image files (JPG, PNG, WEBP, GIF).'); return; }
    }
    setUploadingShot(true);
    try {
      // Anti-fraud: reject reused screenshots BEFORE storing them. Each file's
      // SHA-256 is checked against the global registry (Supabase Storage key
      // collision); a 409 means this exact screenshot was already submitted by
      // anyone. See src/lib/fraudGuard.ts.
      const dupCheck = await checkProofScreenshots(files.slice(0, remaining));
      if (dupCheck.duplicateIndex !== null) {
        setSubmitError('This screenshot has already been used as proof. Please take a fresh screenshot.');
        return;
      }

      const uploaded: string[] = [];
      for (const file of files.slice(0, remaining)) {
        const ext = file.name.split('.').pop();
        const fileName = `task-proofs/${profile.id}/${selectedJob.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from('job-assets').upload(fileName, file, { contentType: file.type });
        if (upErr) { setSubmitError('Screenshot upload failed: ' + upErr.message); break; }
        const { data: urlData } = supabase.storage.from('job-assets').getPublicUrl(fileName);
        uploaded.push(urlData.publicUrl);
      }
      setScreenshots((prev) => [...prev, ...uploaded]);
    } finally {
      setUploadingShot(false);
      e.target.value = '';
    }
  };

  const handleAcceptJob = async () => {
    if (!selectedJob || !profile) return;
    setSubmitting(true);
    setSubmitError('');

    if (profile.status !== 'active') {
      setSubmitError('Your account is not active. You cannot accept jobs.');
      setSubmitting(false);
      return;
    }

    // Premium-only jobs require an ACTIVE premium subscription (the boolean
    // alone is not enough — premium may have expired). The DB trigger also
    // enforces this server-side, but we block early here for a better UX.
    const premiumActive =
      profile.is_premium &&
      (!profile.premium_expires_at || new Date(profile.premium_expires_at) > new Date());
    if (selectedJob.is_premium_only && !premiumActive) {
      setSubmitError('This job is only available for active premium members.');
      setSubmitting(false);
      return;
    }

    // Enforce the screenshot requirement declared by the job poster so the
    // worker can't submit without the requested proof.
    if ((selectedJob.screenshot_count ?? 0) > 0 && screenshots.length < selectedJob.screenshot_count) {
      setSubmitError(`Please upload all ${selectedJob.screenshot_count} required screenshot(s). You have uploaded ${screenshots.length}.`);
      setSubmitting(false);
      return;
    }

    // A worker may only ever complete a job ONCE (regardless of task status),
    // enforced atomically by the tasks_one_active_per_job unique index. This
    // client-side check gives a friendly message before the insert attempt.
    const { data: existing } = await supabase
      .from('tasks')
      .select('id')
      .eq('job_id', selectedJob.id)
      .eq('worker_id', profile.id)
      .maybeSingle();

    if (existing) {
      setSubmitError('You have already worked on this job.');
      setSubmitting(false);
      return;
    }

    // Store screenshot URLs in proof_url as a JSON array (reuses the existing
    // column — no schema change needed). Falls back to the typed proof URL
    // when no screenshots are required.
    const proofUrlValue = screenshots.length
      ? JSON.stringify(screenshots)
      : proofUrl;

    const { error } = await supabase.from('tasks').insert({
      job_id: selectedJob.id,
      worker_id: profile.id,
      status: 'submitted',
      proof_url: proofUrlValue,
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
        closeJobDetail();
        setSubmitSuccess(false);
      }, 2000);
    }
    setSubmitting(false);
  };

  const closeJobDetail = () => {
    setSelectedJob(null);
    setProofUrl('');
    setProofText('');
    setScreenshots([]);
    setSubmitError('');
    if (jobId) navigate('/dashboard/find-jobs', { replace: true });
  };

  // Inline job detail view — opens within the same page (no modal / no new window)
  if (selectedJob) {
    const totalReward = selectedJob.reward_per_worker;
    const isFull = selectedJob.filled_slots >= selectedJob.total_slots;
    const remaining = selectedJob.screenshot_count - screenshots.length;

    return (
      <div className="space-y-4">
        <button
          onClick={closeJobDetail}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back to jobs
        </button>

        {submitSuccess ? (
          <div className="rounded-xl border border-gray-200 bg-white py-12 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success-50">
              <Star className="h-7 w-7 text-success-600 fill-success-600" />
            </div>
            <h3 className="font-heading text-lg font-bold text-gray-900">Your task is submitted</h3>
            <p className="mt-1 text-sm text-gray-600">Your task has been submitted for review. You can no longer work on this job.</p>
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
              <span className="text-base">{flagEmojis[selectedJob.category] ?? '🌍'}</span>
            </div>

            <h2 className="font-heading text-xl font-bold uppercase text-gray-900">
              {selectedJob.title}
            </h2>

            {/* 1. Description */}
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

            {/* 2. Requirements / what workers must submit */}
            {selectedJob.proof_instructions && (
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="text-sm font-semibold text-gray-700">Requirements / Proof Instructions</div>
                <p className="mt-1 whitespace-pre-line text-sm text-gray-600">{selectedJob.proof_instructions}</p>
              </div>
            )}

            {(selectedJob.screenshot_count ?? 0) > 0 && (
              <div className="rounded-lg bg-primary-50/50 p-4">
                <div className="text-sm font-semibold text-primary-700">
                  📸 Screenshots required: {selectedJob.screenshot_count}
                </div>
                {selectedJob.screenshot_instructions && (
                  <p className="mt-1 whitespace-pre-line text-sm text-gray-600">{selectedJob.screenshot_instructions}</p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-gray-200 p-3">
                <div className="text-xs text-gray-500">Reward</div>
                <div className="text-lg font-bold text-success-600">$ {totalReward.toFixed(3)}</div>
              </div>
              <div className="rounded-lg border border-gray-200 p-3">
                <div className="text-xs text-gray-500">Available Slots</div>
                <div className="text-lg font-bold text-gray-900">{selectedJob.total_slots - selectedJob.filled_slots}</div>
              </div>
            </div>

            {submitError && <Alert variant="error">{submitError}</Alert>}

            {/* Proof submission: text proof → screenshot upload (the order workers fill in) */}
            <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
              <div className="text-sm font-semibold text-gray-700">Submit Your Proof</div>

              <Textarea
                label="Proof Details"
                placeholder="Describe or paste your proof..."
                rows={3}
                value={proofText}
                onChange={(e) => setProofText(e.target.value)}
              />
              <Input
                label="Proof URL (if applicable)"
                placeholder="https://..."
                value={proofUrl}
                onChange={(e) => setProofUrl(e.target.value)}
              />

              {/* Screenshot uploader (shown when the job requires screenshots) */}
              {(selectedJob.screenshot_count ?? 0) > 0 && (
                <div>
                  <label className="label-text">
                    Upload {selectedJob.screenshot_count} screenshot(s){' '}
                    <span className="text-gray-400">({screenshots.length}/{selectedJob.screenshot_count} uploaded)</span>
                  </label>
                  {screenshots.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {screenshots.map((url, i) => (
                        <div key={i} className="relative">
                          <img src={url} alt={`Screenshot ${i + 1}`} className="h-20 w-20 rounded-lg border border-gray-200 object-cover" />
                          <button
                            type="button"
                            onClick={() => setScreenshots((prev) => prev.filter((_, idx) => idx !== i))}
                            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-error-500 text-white shadow"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {remaining > 0 && (
                    <label className={`mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 p-4 text-sm text-gray-500 transition-colors hover:border-primary-400 hover:bg-primary-50/30 ${uploadingShot ? 'opacity-60' : ''}`}>
                      <Camera className="h-5 w-5" />
                      <span>{uploadingShot ? 'Uploading...' : 'Click to upload screenshot(s)'}</span>
                      <input type="file" accept="image/*" multiple className="hidden" onChange={handleScreenshotUpload} disabled={uploadingShot} />
                    </label>
                  )}
                </div>
              )}
            </div>

            {/* Job image (the image the poster attached) — shown last as reference */}
            {selectedJob.image_url && (
              <div>
                <div className="text-xs font-semibold text-gray-500 mb-1">Job Image</div>
                <img src={selectedJob.image_url} alt="Job" className="w-full rounded-lg border border-gray-200" />
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="secondary" fullWidth onClick={closeJobDetail}>
                Cancel
              </Button>
              <Button fullWidth loading={submitting} disabled={isFull} onClick={handleAcceptJob}>
                {isFull ? 'Slots Full' : 'Submit Task'}
              </Button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl font-bold text-gray-900">Find Jobs</h1>
        <p className="mt-1 text-sm text-gray-600">Browse available tasks and start earning</p>
      </div>

      {/* Filter bar */}
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
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white pl-9 pr-9 py-2.5 text-sm text-gray-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
          {(search || categoryFilter !== 'all') && (
            <button
              onClick={() => { onSearchChange(''); setCategoryFilter('all'); }}
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
            const totalReward = job.reward_per_worker;
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
                    $ {totalReward.toFixed(3)}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
