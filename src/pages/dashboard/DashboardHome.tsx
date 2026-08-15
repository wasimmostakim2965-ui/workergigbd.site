import { useEffect, useState, useCallback } from 'react';
import { Search, Briefcase, ExternalLink, X, Pin, Star, Camera, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { checkProofScreenshots } from '@/lib/fraudGuard';
import { Button } from '@/components/ui/Button';
import { ReportButton } from '@/components/ui/ReportButton';
import { Input, Textarea } from '@/components/ui/Input';
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
  });
  const { profile, refreshProfile } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
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
      // Hide jobs this worker already did (one task per worker per job) and
      // full jobs, so the feed only shows work the worker can still do.
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
      if (sortBy === 'latest') query = query.order('is_premium_only', { ascending: false }).order('created_at', { ascending: false });
      else if (sortBy === 'high_price' || sortBy === 'best_paying') query = query.order('reward_per_worker', { ascending: false });
      else if (sortBy === 'low_price') query = query.order('reward_per_worker', { ascending: true });

      const { data, error } = await query.limit(50);
      if (error) {
        console.error('Load jobs error:', error);
        setJobs([]);
      } else {
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

  useEffect(() => { loadJobs(); }, [loadJobs]);

  const openJob = (job: Job) => {
    setSelectedJob(job);
    setProofUrl('');
    setProofText('');
    setScreenshots(new Array(Math.max(job.screenshot_count ?? 0, 0)).fill(''));
    setSubmitError('');
    setSubmitSuccess(false);
  };

  const closeJobDetail = () => {
    setSelectedJob(null);
    setProofUrl('');
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
      const ext = file.name.split('.').pop();
      const fileName = `task-proofs/${profile.id}/${selectedJob.id}/${Date.now()}-${slotIndex}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from('job-assets').upload(fileName, file, { contentType: file.type });
      if (upErr) { setSubmitError('Screenshot upload failed: ' + upErr.message); return; }
      const { data: urlData } = supabase.storage.from('job-assets').getPublicUrl(fileName);
      setScreenshots((prev) => { const next = [...prev]; next[slotIndex] = urlData.publicUrl; return next; });
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
    const proofUrlValue = filledShots.length ? JSON.stringify(filledShots) : proofUrl;

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
      await supabase.rpc('notify_user', {
        target_uid: selectedJob.user_id,
        n_title: 'New Task Submission',
        n_message: `A worker has submitted a task for "${selectedJob.title}". Review it in My Tasks.`,
        n_type: 'info',
      });
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
      <div className="space-y-4">
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
            <div className="flex items-center gap-2 flex-wrap">
              <span className="rounded-lg bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700">{selectedJob.category}</span>
              {selectedJob.subcategory && <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">{selectedJob.subcategory}</span>}
              {selectedJob.is_premium_only && <span className="rounded-lg bg-accent-50 px-2.5 py-1 text-xs font-semibold text-accent-700">Premium Only</span>}
              <span className="text-base">{flagEmojis[selectedJob.category] ?? '🌍'}</span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <h2 className="font-heading text-xl font-bold uppercase text-gray-900">{selectedJob.title}</h2>
              <ReportButton jobId={selectedJob.id} label="Report job" />
            </div>

            <p className="text-sm text-gray-600">{selectedJob.description}</p>

            {selectedJob.url && (
              <a href={selectedJob.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700">
                <ExternalLink className="h-4 w-4" /> Open task link
              </a>
            )}

            {selectedJob.proof_instructions?.trim() && (
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="text-sm font-semibold text-gray-700">Requirements / Proof Instructions</div>
                <p className="mt-1 whitespace-pre-line text-sm text-gray-600">{selectedJob.proof_instructions}</p>
              </div>
            )}

            {shotCount > 0 && (
              <div className="rounded-lg bg-primary-50/50 p-4">
                <div className="text-sm font-semibold text-primary-700">📸 Screenshots required: {shotCount}</div>
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

            <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
              <div className="text-sm font-semibold text-gray-700">Submit Your Proof</div>
              <Textarea label="Proof Details" placeholder="Describe or paste your proof..." rows={3} value={proofText} onChange={(e) => setProofText(e.target.value)} />
              <Input label="Proof URL (if applicable)" placeholder="https://..." value={proofUrl} onChange={(e) => setProofUrl(e.target.value)} />

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
                          {instruction ? <span className="text-xs text-gray-500">{instruction}</span> : null}
                        </div>
                        {instruction && <p className="mb-2 whitespace-pre-line text-xs text-gray-600">{instruction}</p>}
                        {url ? (
                          <div className="relative inline-block">
                            <img src={url} alt={`Screenshot ${i + 1}`} className="h-24 w-24 rounded-lg border border-gray-200 object-cover" />
                            <button type="button" onClick={() => removeScreenshot(i)} className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-error-500 text-white shadow">
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

            {selectedJob.image_url && (
              <div>
                <div className="text-xs font-semibold text-gray-500 mb-1">Job Image</div>
                <img src={selectedJob.image_url} alt="Job" className="w-full rounded-lg border border-gray-200" />
              </div>
            )}

            <div className="flex gap-3">
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
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`shrink-0 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${categoryFilter === 'all' ? 'text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
              style={categoryFilter === 'all' ? { backgroundColor: COLORS.filterBlue } : {}}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.name)}
                className={`shrink-0 rounded-lg px-3.5 py-2 text-xs font-bold whitespace-nowrap transition-all ${categoryFilter === cat.name ? 'text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
                style={categoryFilter === cat.name ? { backgroundColor: COLORS.filterBlue } : {}}
              >
                {cat.name}
              </button>
            ))}
          </div>
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
        <div className="space-y-3">
          {jobs.map((job) => {
            const progress = job.total_slots > 0 ? (job.filled_slots / job.total_slots) * 100 : 0;
            const totalReward = job.reward_per_worker ?? 0;
            const isPinned = job.is_premium_only;

            return (
              <button
                key={job.id}
                onClick={() => openJob(job)}
                className="block w-full text-left rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-primary-200 hover:shadow-md"
                style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)' }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
                    <h3 className="text-base font-bold uppercase text-gray-900 line-clamp-1">{job.title}</h3>
                    <span className="text-base">{flagEmojis[job.category] ?? '🌍'}</span>
                    {totalReward >= 0.1 && (
                      <span className="rounded px-2 py-0.5 text-[11px] font-extrabold uppercase" style={{ backgroundColor: '#C8F7DC', color: COLORS.primaryGreen }}>
                        TOP JOB
                      </span>
                    )}
                  </div>
                  {isPinned && (
                    <div className="flex shrink-0 items-center gap-1" style={{ color: COLORS.badgePurple }}>
                      <Pin className="h-4 w-4 fill-current" />
                      <span className="text-sm font-bold">Pinned</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <div className="text-xs font-semibold text-gray-600 mb-1">{job.filled_slots} OF {job.total_slots}</div>
                    <div className="h-1.5 w-28 overflow-hidden rounded-full bg-gray-200">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(progress, 100)}%`, backgroundColor: COLORS.primaryGreen }} />
                    </div>
                  </div>
                  <div className="text-xl font-extrabold" style={{ color: COLORS.primaryGreen }}>$ {totalReward.toFixed(3)}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
