import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Briefcase, ExternalLink, X, Pin, Star, Camera, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { checkProofScreenshots } from '@/lib/fraudGuard';
import { uploadToImgbb } from '@/lib/imgbb';
import { Button } from '@/components/ui/Button';
import { ReportButton } from '@/components/ui/ReportButton';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { EmptyState, LoadingSpinner } from '@/components/ui/EmptyState';
import { Alert } from '@/components/ui/Alert';
import { Job, Category } from '@/types';
import { useSeo } from '@/lib/useSeo';

const sortOptions = [
  { value: 'latest', label: 'Latest' },
  { value: 'high_price', label: 'High Price' },
  { value: 'low_price', label: 'Low Price' },
  { value: 'best_paying', label: 'Best Paying' },
];

// Parse the per-screenshot instructions stored as
//   "Screenshot 1: ...\nScreenshot 2: ..."
// into an array of `count` strings (index 0 = screenshot 1).
// Falls back to showing the raw text on every slot when the job was
// created with the old single-box format.
function parseShotInstructions(raw: string, count: number): string[] {
  const arr = new Array(Math.max(count, 0)).fill('');
  if (!raw || !raw.trim()) return arr;
  const lines = raw.split('\n');
  let found = false;
  for (const line of lines) {
    const m = line.match(/^Screenshot\s+(\d+)\s*:\s*(.*)$/);
    if (m) {
      const idx = parseInt(m[1], 10) - 1;
      if (idx >= 0 && idx < count) { arr[idx] = m[2].trim(); found = true; }
    }
  }
  if (!found) return new Array(count).fill(raw.trim());
  return arr;
}

export function FindJobsPage() {
  useSeo({
    title: 'কাজ খুঁজুন — WORKER GIG BD | অনলাইন মাইক্রো-টাস্ক ও ফ্রিল্যান্স কাজ',
    description: 'WORKER GIG BD-তে পাওয়া সহজ অনলাইন মাইক্রো-টাস্ক ও ফ্রিল্যান্স কাজ ব্রাউজ করুন। ফেসবুক, ইউটিউব, সাইন আপ, সার্ভে, কমেন্ট ইত্যাদি কাজ করে আয় করুন।',
    path: '/dashboard/find-jobs',
    noindex: true,
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
  const [proofText, setProofText] = useState('');
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [uploadingShot, setUploadingShot] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      // Select only the columns the list + detail view render, not '*'. This
      // keeps every row small and the response fast as the jobs table grows.
      const JOB_COLS =
        'id,title,description,category,subcategory,url,proof_instructions,' +
        'screenshot_count,screenshot_instructions,image_url,reward_per_worker,' +
        'total_slots,filled_slots,status,is_premium_only,created_at';
      let query = supabase.from('jobs').select(JOB_COLS).eq('status', 'active');
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
        // Hide jobs this worker already did (one task per worker per job,
        // enforced by the DB). Ask the DB which of THESE page jobs the worker
        // has a task for — at most 50 rows via the (worker_id, job_id) index —
        // so the check stays both exact (no cap that would resurface old jobs)
        // and cheap.
        const page = (data as unknown as Job[]) ?? [];
        const doneJobIds = new Set<string>();
        if (profile && page.length > 0) {
          const { data: myTasks } = await supabase
            .from('tasks')
            .select('job_id')
            .eq('worker_id', profile.id)
            .in('job_id', page.map((j) => j.id));
          (myTasks ?? []).forEach((t) => doneJobIds.add(t.job_id));
        }

        setJobs(page.filter((j) => j.filled_slots < j.total_slots && !doneJobIds.has(j.id)));
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

  // Open a specific job directly from the URL (one-click from DashboardHome).
  // If the worker already did this job, never reopen it — bounce back to the
  // list so they can't submit twice.
  useEffect(() => {
    if (!jobId || !profile) return;
    let active = true;
    (async () => {
      const { data: existing } = await supabase
        .from('tasks')
        .select('id')
        .eq('job_id', jobId)
        .eq('worker_id', profile.id)
        .maybeSingle();
      if (!active) return;
      if (existing) { navigate('/dashboard/find-jobs', { replace: true }); return; }
      const { data, error } = await supabase
        .from('jobs')
        .select('id,title,description,category,subcategory,url,proof_instructions,screenshot_count,screenshot_instructions,image_url,reward_per_worker,total_slots,filled_slots,status,is_premium_only,created_at')
        .eq('id', jobId)
        .maybeSingle();
      if (active && data && !error) openJob(data as Job);
      else if (active) navigate('/dashboard/find-jobs', { replace: true });
    })();
    return () => { active = false; };
  }, [jobId, profile, navigate]);

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

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>, slotIndex: number) => {
    if (!selectedJob || !profile) return;
    const file = (e.target.files ?? [])[0];
    e.target.value = '';
    if (!file) return;
    // Validate before uploading: images only, max 5 MB each.
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (file.size > 5 * 1024 * 1024) { setSubmitError('Each screenshot must be less than 5 MB.'); return; }
    if (!allowed.includes(file.type)) { setSubmitError('Screenshots must be image files (JPG, PNG, WEBP, GIF).'); return; }
    setUploadingShot(true);
    try {
      // Anti-fraud: reject reused screenshots BEFORE storing them. The file's
      // SHA-256 is checked against the global registry (Supabase Storage key
      // collision); a 409 means this exact screenshot was already submitted.
      const dupCheck = await checkProofScreenshots([file]);
      if (dupCheck.duplicateIndex !== null) {
        setSubmitError('This screenshot has already been used as proof. Please take a fresh screenshot.');
        return;
      }
      // Proof screenshots are disposable and public by design, so they go to
      // ImgBB instead of Supabase Storage — this keeps our free storage/egress
      // quota from ever being the bottleneck. Only the returned URL string is
      // kept in proof_url, exactly where the old Supabase public URL lived.
      try {
        const { url } = await uploadToImgbb(file, `proof-${selectedJob.id}-${slotIndex}`);
        setScreenshots((prev) => {
          const next = [...prev];
          next[slotIndex] = url;
          return next;
        });
      } catch (e) {
        setSubmitError(e instanceof Error ? e.message : 'Screenshot upload failed.');
        return;
      }
    } finally {
      setUploadingShot(false);
    }
  };

  const removeScreenshot = (slotIndex: number) => {
    setScreenshots((prev) => {
      const next = [...prev];
      next[slotIndex] = '';
      return next;
    });
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
    // worker can't submit without the requested proof. Each slot must be filled.
    const shotCount = selectedJob.screenshot_count ?? 0;
    if (shotCount > 0) {
      const filled = screenshots.filter(Boolean);
      if (filled.length < shotCount) {
        setSubmitError(`Please upload all ${shotCount} required screenshot(s). You have uploaded ${filled.length}.`);
        setSubmitting(false);
        return;
      }
    }

    // A submission must always carry some proof — either a written description
    // or at least one screenshot. Without this, a job that requires no
    // screenshots could be submitted with an empty box, leaving the buyer
    // nothing to review.
    const filledShots = screenshots.filter(Boolean);
    if (filledShots.length === 0 && !proofText.trim()) {
      setSubmitError('Please describe your work in the proof box before submitting.');
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
    // column — no schema change needed).
    const proofUrlValue = filledShots.length
      ? JSON.stringify(filledShots)
      : null;

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
      // Show the success message briefly, then redirect to the dashboard so
      // the worker can't resubmit the same job. The job is also hidden from
      // the find-jobs list on the next load (loadJobs filters doneJobIds).
      setTimeout(() => {
        setSubmitSuccess(false);
        closeJobDetail();
        navigate('/dashboard');
      }, 1800);
    }
    setSubmitting(false);
  };

  const openJob = (job: Job) => {
    setSelectedJob(job);
    setProofText('');
    setScreenshots(new Array(Math.max(job.screenshot_count ?? 0, 0)).fill(''));
    setSubmitError('');
    setSubmitSuccess(false);
  };

  const closeJobDetail = () => {
    setSelectedJob(null);
    setProofText('');
    setScreenshots([]);
    setSubmitError('');
    if (jobId) navigate('/dashboard/find-jobs', { replace: true });
  };

  // Inline job detail view — opens within the same page (no modal / no new window)
  if (selectedJob) {
    // Worker payout is the base reward only (the screenshot fee is kept by
    // the platform as commission, not paid to the worker).
    const totalReward = selectedJob.reward_per_worker ?? 0;
    const isFull = selectedJob.filled_slots >= selectedJob.total_slots;
    const shotCount = selectedJob.screenshot_count ?? 0;
    const shotInstructions = parseShotInstructions(selectedJob.screenshot_instructions ?? '', shotCount);

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
            <p className="mt-1 text-sm text-gray-600">Your task has been submitted for review. Redirecting to dashboard…</p>
          </div>
        ) : (
          <>
            {/* 1. Title (top) with category badges */}
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
              <span className="ml-auto text-sm font-semibold text-success-600">
                $ {totalReward.toFixed(3)} · {selectedJob.total_slots - selectedJob.filled_slots} slots left
              </span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <h2 className="font-heading text-xl font-medium text-gray-900">
                {selectedJob.title}
              </h2>
              <ReportButton jobId={selectedJob.id} label="Report job" />
            </div>

            {/* 2. Description */}
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

            {/* 3. Requirements / what workers must submit */}
            {selectedJob.proof_instructions?.trim() && (
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="text-sm font-semibold text-gray-700">Requirements</div>
                <p className="mt-1 whitespace-pre-line text-sm text-gray-600">{selectedJob.proof_instructions}</p>
              </div>
            )}

            {shotCount > 0 && (
              <div className="rounded-lg bg-primary-50/50 p-4">
                <div className="text-sm font-semibold text-primary-700">
                  Screenshots required: {shotCount}
                </div>
              </div>
            )}

            {submitError && <Alert variant="error">{submitError}</Alert>}

            {/* 4. Proof submission box (where workers write their answer) */}
            <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
              <div className="text-sm font-semibold text-gray-700">Submit Your Proof</div>

              <Textarea
                label="Proof Details"
                placeholder="Describe or paste your proof..."
                rows={3}
                value={proofText}
                onChange={(e) => setProofText(e.target.value)}
              />

              {/* 5. Screenshot upload (required screenshots) */}
              {shotCount > 0 && (
                <div className="space-y-3">
                  <label className="label-text">
                    Upload {shotCount} screenshot(s){' '}
                    <span className="text-gray-400">({screenshots.filter(Boolean).length}/{shotCount} uploaded)</span>
                  </label>
                  {Array.from({ length: shotCount }).map((_, i) => {
                    const url = screenshots[i];
                    const instruction = shotInstructions[i];
                    return (
                      <div key={i} className="rounded-lg border border-gray-200 p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-gray-700">Screenshot {i + 1}</span>
                          {instruction ? (
                            <span className="text-xs text-gray-500">{instruction}</span>
                          ) : null}
                        </div>
                        {instruction && (
                          <p className="mb-2 whitespace-pre-line text-xs text-gray-600">{instruction}</p>
                        )}
                        {url ? (
                          <div className="relative inline-block">
                            <img src={url} alt={`Screenshot ${i + 1}`} className="h-24 w-24 rounded-lg border border-gray-200 object-cover" />
                            <button
                              type="button"
                              onClick={() => removeScreenshot(i)}
                              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-error-500 text-white shadow"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <label className={`mt-1 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 p-3 text-sm text-gray-500 transition-colors hover:border-primary-400 hover:bg-primary-50/30 ${uploadingShot ? 'opacity-60' : ''}`}>
                            <Camera className="h-4 w-4" />
                            <span>{uploadingShot ? 'Uploading...' : 'Click to upload screenshot ' + (i + 1)}</span>
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleScreenshotUpload(e, i)} disabled={uploadingShot} />
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 6. Job image (optional, at the bottom) */}
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
            const totalReward = job.reward_per_worker ?? 0;
            const isPinned = job.is_premium_only;

            return (
              <button
                key={job.id}
                onClick={() => openJob(job)}
                disabled={isFull}
                className="block w-full text-left rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-primary-200 hover:shadow-md disabled:opacity-60"
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <h3 className="text-base font-medium text-gray-900 line-clamp-1">
                      {job.title}
                    </h3>
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
