import { useEffect, useState, useCallback } from 'react';
import { Search, Briefcase, ExternalLink, X, Star, Camera, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { checkProofScreenshots } from '@/lib/fraudGuard';
import { uploadToImgbb } from '@/lib/imgbb';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { EmptyState, LoadingSpinner } from '@/components/ui/EmptyState';
import { Alert } from '@/components/ui/Alert';
import { Job, Category } from '@/types';
import { useSeo } from '@/lib/useSeo';


const COLORS = {
  primaryGreen: '#058824',
  filterBlue: '#1EA3EE',
  badgePurple: '#5865F2',
};

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

export function DashboardHome() {
  useSeo({
    title: 'Dashboard — WORKER GIG BD | অনলাইন মাইক্রো-টাস্ক কাজ',
    description: 'উপলব্ধ কাজ ব্রাউজ করুন এবং আয় শুরু করুন।',
    path: '/dashboard',
    noindex: true,
  });
  const { profile, refreshProfile } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
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
      // Hide jobs this worker already did (one task per worker per job) and
      // full jobs, so the feed only shows work the worker can still do.
      let doneJobIds: string[] = [];
      if (profile) {
        const { data: myTasks } = await supabase
          .from('tasks')
          .select('job_id')
          .eq('worker_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(500);
        doneJobIds = (myTasks ?? []).map((t) => t.job_id);
      }

      const JOB_COLS =
        'id,title,description,category,subcategory,url,proof_instructions,' +
        'screenshot_count,screenshot_instructions,image_url,reward_per_worker,' +
        'total_slots,filled_slots,status,is_premium_only,created_at';
      let query = supabase.from('jobs').select(JOB_COLS).eq('status', 'active');
      if (categoryFilter !== 'all') query = query.eq('category', categoryFilter);
      if (search) query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
      if (sortBy === 'latest') query = query.order('is_premium_only', { ascending: false }).order('created_at', { ascending: false });
      else if (sortBy === 'high_price' || sortBy === 'best_paying') query = query.order('reward_per_worker', { ascending: false });
      else if (sortBy === 'low_price') query = query.order('reward_per_worker', { ascending: true });

      const { data, error } = await query.limit(50);
      if (error) {
        console.error('Load jobs error:', error);
        setJobs([]);
      } else {
        setJobs(
          ((data as unknown as Job[]) ?? []).filter(
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

  useEffect(() => { loadJobs(); }, [loadJobs]);

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
  };

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>, slotIndex: number) => {
    const file = e.target.files?.[0];
    if (!file || !profile || !selectedJob) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) { setSubmitError('Screenshots must be image files (JPG, PNG, WEBP, GIF).'); return; }
    setUploadingShot(true);
    try {
      const dupCheck = await checkProofScreenshots([file]);
      if (dupCheck.duplicateIndex !== null) {
        setSubmitError('This screenshot has already been used as proof. Please take a fresh screenshot.');
        return;
      }
      // Proof screenshots are disposable/public -> ImgBB (see FindJobsPage).
      try {
        const { url } = await uploadToImgbb(file, `proof-${selectedJob.id}-${slotIndex}`);
        setScreenshots((prev) => { const next = [...prev]; next[slotIndex] = url; return next; });
      } catch (e) {
        setSubmitError(e instanceof Error ? e.message : 'Screenshot upload failed.');
        return;
      }
    } finally {
      setUploadingShot(false);
    }
  };

  const removeScreenshot = (slotIndex: number) => {
    setScreenshots((prev) => { const next = [...prev]; next[slotIndex] = ''; return next; });
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
    const premiumActive = profile.is_premium && (!profile.premium_expires_at || new Date(profile.premium_expires_at) > new Date());
    if (selectedJob.is_premium_only && !premiumActive) {
      setSubmitError('This job is only available for active premium members.');
      setSubmitting(false);
      return;
    }
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
    // or at least one screenshot. Without this, a zero-screenshot job could be
    // submitted with an empty box, leaving the buyer nothing to review. This
    // mirrors the guard in FindJobsPage and matches the require_task_proof DB
    // trigger, so the message stays friendly instead of a raw DB error.
    const filledShotsGuard = screenshots.filter(Boolean);
    if (filledShotsGuard.length === 0 && !proofText.trim()) {
      setSubmitError('Please describe your work in the proof box before submitting.');
      setSubmitting(false);
      return;
    }
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

    const filledShots = screenshots.filter(Boolean);
    const proofUrlValue = filledShots.length ? JSON.stringify(filledShots) : null;

    const { error } = await supabase.from('tasks').insert({
      job_id: selectedJob.id,
      worker_id: profile.id,
      proof_url: proofUrlValue || null,
      proof_text: proofText || null,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    });

    if (error) {
      setSubmitError(error.message);
    } else {
      setSubmitSuccess(true);
      // Reload the feed (hides the just-done job) and refresh balance.
      setTimeout(async () => {
        setSubmitSuccess(false);
        closeJobDetail();
        await loadJobs();
        refreshProfile?.();
      }, 1800);
    }
    setSubmitting(false);
  };

  // ---- Inline job detail view ----
  if (selectedJob) {
    const totalReward = selectedJob.reward_per_worker ?? 0;
    const isFull = selectedJob.filled_slots >= selectedJob.total_slots;
    const shotCount = selectedJob.screenshot_count ?? 0;
    const shotInstructions = parseShotInstructions(selectedJob.screenshot_instructions ?? '', shotCount);

    return (
      <div className="space-y-3">
        <button onClick={closeJobDetail} className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4" /> Back to jobs
        </button>

        {submitSuccess ? (
          <div className="rounded-xl border border-gray-200 bg-white py-12 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success-50">
              <Star className="h-7 w-7 text-success-600 fill-success-600" />
            </div>
            <h3 className="font-heading text-lg font-bold text-gray-900">Your task is submitted</h3>
            <p className="mt-1 text-sm text-gray-600">Your task has been submitted for review.</p>
          </div>
        ) : (
          <>
            {/* 1. Title + slots info (compact, at top) */}
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-heading text-lg font-semibold text-gray-900 leading-snug">{selectedJob.title}</h2>
                {totalReward >= 0.1 && (
                  <span className="shrink-0 rounded px-2 py-0.5 text-[11px] font-extrabold uppercase" style={{ backgroundColor: '#C8F7DC', color: COLORS.primaryGreen }}>
                    TOP JOB
                  </span>
                )}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-gray-500">{selectedJob.filled_slots} OF {selectedJob.total_slots}</div>
                  <div className="mt-1 h-1.5 w-28 overflow-hidden rounded-full bg-gray-200">
                    <div className="h-full rounded-full" style={{ width: `${Math.min((selectedJob.filled_slots / selectedJob.total_slots) * 100, 100)}%`, backgroundColor: COLORS.primaryGreen }} />
                  </div>
                </div>
                <div className="text-lg font-extrabold" style={{ color: COLORS.primaryGreen }}>$ {totalReward.toFixed(3)}</div>
              </div>
            </div>

            {/* 2. Description (clean text) */}
            {selectedJob.description?.trim() && (
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="text-sm font-semibold text-gray-700 mb-1">Description</div>
                <p className="whitespace-pre-line text-sm text-gray-600 leading-relaxed">{selectedJob.description}</p>
                {selectedJob.url && (
                  <a href={selectedJob.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700">
                    <ExternalLink className="h-4 w-4" /> Open task link
                  </a>
                )}
              </div>
            )}

            {/* 3. Requirements (below description) */}
            {selectedJob.proof_instructions?.trim() && (
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="text-sm font-semibold text-gray-700 mb-1">Requirements</div>
                <p className="whitespace-pre-line text-sm text-gray-600 leading-relaxed">{selectedJob.proof_instructions}</p>
              </div>
            )}

            {shotCount > 0 && (
              <div className="rounded-lg bg-primary-50/50 px-4 py-2.5">
                <div className="text-sm font-semibold text-primary-700">Screenshots required: {shotCount}</div>
              </div>
            )}

            {submitError && <Alert variant="error">{submitError}</Alert>}

            {/* 4. Proof submission box (where workers write their answer) */}
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="text-sm font-semibold text-gray-700 mb-2">Submit Your Proof</div>
              <Textarea placeholder="Describe or paste your proof here..." rows={3} value={proofText} onChange={(e) => setProofText(e.target.value)} />

              {/* 5. Screenshot upload (below proof box) */}
              {shotCount > 0 && (
                <div className="mt-3 space-y-2">
                  <label className="text-xs font-medium text-gray-600">
                    Upload {shotCount} screenshot(s){' '}
                    <span className="text-gray-400">({screenshots.filter(Boolean).length}/{shotCount})</span>
                  </label>
                  {Array.from({ length: shotCount }).map((_, i) => {
                    const url = screenshots[i];
                    const instruction = shotInstructions[i];
                    return (
                      <div key={i} className="rounded-lg border border-gray-200 p-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-700">Screenshot {i + 1}</span>
                          {instruction ? <span className="text-[11px] text-gray-500">{instruction}</span> : null}
                        </div>
                        {instruction && <p className="mb-1.5 whitespace-pre-line text-[11px] text-gray-500">{instruction}</p>}
                        {url ? (
                          <div className="relative inline-block">
                            <img src={url} alt={`Screenshot ${i + 1}`} className="h-20 w-20 rounded-lg border border-gray-200 object-cover" />
                            <button type="button" onClick={() => removeScreenshot(i)} className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-error-500 text-white shadow">
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <label className={`mt-1 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 py-2.5 text-xs text-gray-500 transition-colors hover:border-primary-400 hover:bg-primary-50/30 ${uploadingShot ? 'opacity-60' : ''}`}>
                            <Camera className="h-4 w-4" />
                            <span>{uploadingShot ? 'Uploading...' : 'Upload screenshot ' + (i + 1)}</span>
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleScreenshotUpload(e, i)} disabled={uploadingShot} />
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 6. Job image (at the very bottom, if posted) */}
            {selectedJob.image_url && (
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="text-xs font-semibold text-gray-500 mb-1.5">Job Image</div>
                <img src={selectedJob.image_url} alt="Job" className="w-full rounded-lg border border-gray-200" />
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <Button variant="secondary" fullWidth onClick={closeJobDetail}>Cancel</Button>
              <Button fullWidth loading={submitting} disabled={isFull} onClick={handleAcceptJob}>
                {isFull ? 'Slots Full' : 'Submit Task'}
              </Button>
            </div>
          </>
        )}
      </div>
    );
  }

  // ---- Jobs list view ----
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
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
            <button onClick={() => { setSearch(''); setCategoryFilter('all'); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 focus:border-primary-500 focus:outline-none"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.name}>{cat.name}</option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="shrink-0 rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs font-medium text-gray-600"
          >
            <option value="latest">Latest</option>
            <option value="high_price">High Price</option>
            <option value="low_price">Low Price</option>
            <option value="best_paying">Best Paying</option>
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner size={36} className="py-16" />
      ) : jobs.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white py-16">
          <EmptyState icon={<Briefcase className="h-8 w-8" />} title="No jobs found" description="Try adjusting your filters or check back later." />
        </div>
      ) : (
        <div className="space-y-2.5">
          {jobs.map((job) => {
            const progress = job.total_slots > 0 ? (job.filled_slots / job.total_slots) * 100 : 0;
            const totalReward = job.reward_per_worker ?? 0;

            return (
              <button
                key={job.id}
                onClick={() => openJob(job)}
                className="block w-full text-left rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm transition-all hover:border-primary-200 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-gray-900 line-clamp-1">{job.title}</h3>
                    {totalReward >= 0.1 && (
                      <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-extrabold uppercase" style={{ backgroundColor: '#C8F7DC', color: COLORS.primaryGreen }}>
                        TOP JOB
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-2.5 flex items-end justify-between">
                  <div>
                    <div className="text-[11px] font-semibold text-gray-500">{job.filled_slots} OF {job.total_slots}</div>
                    <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-gray-200">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(progress, 100)}%`, backgroundColor: COLORS.primaryGreen }} />
                    </div>
                  </div>
                  <div className="text-lg font-extrabold" style={{ color: COLORS.primaryGreen }}>$ {totalReward.toFixed(3)}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
