import { useEffect, useState, useCallback } from 'react';
import { Briefcase, ExternalLink, CheckCircle, Clock, XCircle, ArrowLeft, Camera, Gift } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmptyState, LoadingSpinner } from '@/components/ui/EmptyState';
import { Tabs } from '@/components/ui/Tabs';
import { Lightbox } from '@/components/ui/Lightbox';
import { ReportButton } from '@/components/ui/ReportButton';
import { Task, Job, Profile } from '@/types';
import { useSeo } from '@/lib/useSeo';

const COLORS = { primaryGreen: '#058824' };

type Submission = Task & { jobs?: Job; profiles?: Pick<Profile, 'username' | 'avatar_url'> };

// Parse proof_url — either a plain URL or a JSON array of screenshot URLs.
function parseProof(raw: string): { shots: string[]; plain: string } {
  if (!raw) return { shots: [], plain: '' };
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return { shots: parsed.filter(Boolean) as string[], plain: '' };
  } catch { /* not JSON */ }
  return { shots: [], plain: raw };
}

export function MyTasksPage() {
  useSeo({
    title: 'আমার টাস্ক — WORKER GIG BD | করা কাজ ও রিভিউ',
    description: 'আপনি পোস্ট করা কাজের সাবমিশন রিভিউ করুন এবং করা কাজগুলো ট্র্যাক করুন।',
    path: '/dashboard/my-tasks',
    noindex: true,
  });
  const { profile, refreshProfile } = useAuth();
  // Top-level mode: review submissions on jobs I posted, or track tasks I did.
  const [mode, setMode] = useState<'posted' | 'did'>('posted');

  // ---- Jobs I Posted (job-poster review flow) ----
  const [postedJobs, setPostedJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [actionError, setActionError] = useState('');
  const [tipAmount, setTipAmount] = useState('');
  const [tipMsg, setTipMsg] = useState('');
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingSubs, setLoadingSubs] = useState(false);

  // ---- Tasks I Did (worker view) ----
  const [myTasks, setMyTasks] = useState<(Task & { jobs?: Job })[]>([]);
  const [workerTab, setWorkerTab] = useState('active');
  const [loadingMy, setLoadingMy] = useState(true);

  const loadPostedJobs = useCallback(async () => {
    if (!profile) { setLoadingJobs(false); return; }
    setLoadingJobs(true);
    try {
      const { data } = await supabase
        .from('jobs')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(50);
      setPostedJobs((data as Job[]) ?? []);
    } catch { setPostedJobs([]); }
    setLoadingJobs(false);
  }, [profile]);

  const loadSubmissions = useCallback(async (job: Job) => {
    setLoadingSubs(true);
    try {
      const { data } = await supabase
        .from('tasks')
        .select('*, jobs(*), profiles:worker_id(username, avatar_url)')
        .eq('job_id', job.id)
        .order('submitted_at', { ascending: false, nullsFirst: false });
      setSubmissions((data as Submission[]) ?? []);
    } catch { setSubmissions([]); }
    setLoadingSubs(false);
  }, []);

  const loadMyTasks = useCallback(async () => {
    if (!profile) { setLoadingMy(false); return; }
    setLoadingMy(true);
    try {
      let query = supabase.from('tasks').select('*, jobs(*)').eq('worker_id', profile.id);
      if (workerTab === 'active') query = query.in('status', ['pending', 'submitted']);
      else if (workerTab === 'approved') query = query.eq('status', 'approved');
      else if (workerTab === 'rejected') query = query.eq('status', 'rejected');
      const { data } = await query.order('created_at', { ascending: false }).limit(50);
      setMyTasks((data as (Task & { jobs?: Job })[]) ?? []);
    } catch { setMyTasks([]); }
    setLoadingMy(false);
  }, [profile, workerTab]);

  useEffect(() => { loadPostedJobs(); }, [loadPostedJobs]);
  useEffect(() => { if (mode === 'did') loadMyTasks(); }, [mode, loadMyTasks]);

  const openJob = (job: Job) => {
    setSelectedJob(job);
    setSelectedSub(null);
    setActionError(''); setTipMsg('');
    loadSubmissions(job);
  };

  const backToJobs = () => { setSelectedJob(null); setSelectedSub(null); setActionError(''); setTipMsg(''); };

  const handleReview = async (action: 'approve' | 'reject') => {
    if (!selectedSub || !profile) return;
    setProcessing(true); setActionError('');
    const { error } = await supabase.rpc('process_task', {
      p_task_id: selectedSub.id,
      p_admin_uid: profile.id,
      p_action: action,
      p_note: action === 'reject' ? 'Task did not meet requirements.' : '',
    });
    if (error) { setProcessing(false); setActionError(error.message); return; }
    // Refresh the selected submission so its status/reward update immediately,
    // then reload the submissions list (awaited so the badge stays in sync).
    const refreshed = await supabase
      .from('tasks')
      .select('*, jobs(*), profiles:worker_id(username, avatar_url)')
      .eq('id', selectedSub.id)
      .maybeSingle();
    if (refreshed.data) setSelectedSub(refreshed.data as Submission);
    if (selectedJob) await loadSubmissions(selectedJob);
    setProcessing(false);
  };

  const handleTip = async () => {
    if (!selectedSub || !profile) return;
    const amt = parseFloat(tipAmount || '0');
    if (!amt || amt <= 0) { setTipMsg('Enter a valid tip amount.'); return; }
    setProcessing(true); setTipMsg('');
    const { error } = await supabase.rpc('tip_worker', { p_task_id: selectedSub.id, p_amount: amt });
    setProcessing(false);
    if (error) { setTipMsg(error.message); return; }
    setTipAmount('');
    setTipMsg(`Tipped $${amt.toFixed(3)} sent to the worker.`);
    await refreshProfile();
    if (selectedJob) loadSubmissions(selectedJob);
    const refreshed = await supabase
      .from('tasks')
      .select('*, jobs(*), profiles:worker_id(username, avatar_url)')
      .eq('id', selectedSub.id)
      .maybeSingle();
    if (refreshed.data) setSelectedSub(refreshed.data as Submission);
  };

  const modeTabs = [
    { id: 'posted', label: 'Jobs I Posted' },
    { id: 'did', label: 'Tasks I Did' },
  ];
  const workerTabs = [
    { id: 'active', label: 'Active' },
    { id: 'approved', label: 'Approved' },
    { id: 'rejected', label: 'Rejected' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-gray-900">My Tasks</h1>
        <p className="mt-1 text-sm text-gray-600">
          Review submissions on jobs you posted, and track tasks you completed.
        </p>
      </div>

      <Tabs tabs={modeTabs} active={mode} onChange={(v) => setMode(v as 'posted' | 'did')} />

      {mode === 'posted' && (
        <>
          {!selectedJob ? (
            // ---- Level 1: list of jobs the user posted ----
            loadingJobs ? (
              <LoadingSpinner size={40} className="py-20" />
            ) : postedJobs.length === 0 ? (
              <Card><EmptyState icon={<Briefcase className="h-8 w-8" />} title="No jobs posted" description="Post a job to start receiving worker submissions." /></Card>
            ) : (
              <div className="space-y-2">
                {postedJobs.map((job) => (
                  <button
                    key={job.id}
                    onClick={() => openJob(job)}
                    className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 text-left transition-all hover:border-primary-200 hover:shadow-sm"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-gray-900">{job.title}</div>
                      <div className="text-xs text-gray-500">{job.category} • {job.total_slots - job.filled_slots} of {job.total_slots} slots left</div>
                    </div>
                    <Badge variant={job.status === 'active' ? 'success' : 'warning'} dot>{job.status}</Badge>
                  </button>
                ))}
              </div>
            )
          ) : !selectedSub ? (
            // ---- Level 2: submissions for the selected job (compact list) ----
            <div className="space-y-3">
              <button onClick={backToJobs} className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900">
                <ArrowLeft className="h-4 w-4" /> Back to jobs
              </button>
              <h2 className="font-heading text-lg font-bold text-gray-900">{selectedJob.title}</h2>
              {loadingSubs ? (
                <LoadingSpinner size={36} className="py-12" />
              ) : submissions.length === 0 ? (
                <Card><EmptyState icon={<Briefcase className="h-8 w-8" />} title="No submissions yet" description="Workers who submit proof for this job will appear here." /></Card>
              ) : (
                <div className="space-y-1.5">
                  {submissions.map((sub) => {
                    const { shots, plain } = parseProof(sub.proof_url);
                    const preview = (sub.proof_text || plain || (shots.length ? `${shots.length} screenshot(s)` : '')).slice(0, 50);
                    const reward = selectedJob.reward_per_worker ?? 0;
                    return (
                      <button
                        key={sub.id}
                        onClick={() => { setSelectedSub(sub); setActionError(''); setTipMsg(''); }}
                        className="flex w-full items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-left transition-all hover:border-primary-200 hover:shadow-sm"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <Badge
                            variant={sub.status === 'approved' ? 'success' : sub.status === 'rejected' ? 'error' : 'warning'}
                            dot
                          >
                            {sub.status}
                          </Badge>
                          <span className="truncate text-sm font-medium text-gray-800">
                            {sub.profiles?.username || sub.worker_id.slice(0, 8)}
                          </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <span className="truncate text-xs text-gray-400">{preview || 'No proof'}</span>
                          <span className="text-sm font-bold text-success-600">$ {reward.toFixed(3)}</span>
                          {sub.tip_amount ? <span className="text-xs text-primary-600">+tip</span> : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            // ---- Level 3: review a single submission ----
            <SubmissionReview
              sub={selectedSub}
              job={selectedJob}
              onBack={() => { setSelectedSub(null); setActionError(''); setTipMsg(''); }}
              onLightbox={setLightboxSrc}
              processing={processing}
              actionError={actionError}
              onApprove={() => handleReview('approve')}
              onReject={() => handleReview('reject')}
              tipAmount={tipAmount}
              setTipAmount={setTipAmount}
              tipMsg={tipMsg}
              onTip={handleTip}
            />
          )}
        </>
      )}

      {mode === 'did' && (
        <>
          <Tabs tabs={workerTabs} active={workerTab} onChange={setWorkerTab} />
          {loadingMy ? (
            <LoadingSpinner size={40} className="py-20" />
          ) : myTasks.length === 0 ? (
            <Card><EmptyState icon={<Briefcase className="h-8 w-8" />} title="No tasks found" description="You haven't worked on any tasks in this category yet." /></Card>
          ) : (
            <div className="space-y-2.5">
              {myTasks.map((task) => {
                const reward = task.jobs?.reward_per_worker ?? 0;
                const statusVariant = task.status === 'approved' ? 'success' : task.status === 'rejected' ? 'error' : 'warning';
                const { shots, plain } = parseProof(task.proof_url);
                return (
                  <div
                    key={task.id}
                    className="block w-full rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm transition-all hover:border-primary-200 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap min-w-0 flex-1">
                        {task.jobs?.category && <Badge variant="primary">{task.jobs.category}</Badge>}
                        {task.jobs?.subcategory && <Badge variant="gray">{task.jobs.subcategory}</Badge>}
                        {task.tip_amount ? <Badge variant="accent">+tip</Badge> : null}
                      </div>
                      <Badge variant={statusVariant} dot>{task.status}</Badge>
                    </div>

                    <h3 className="mt-1.5 text-sm font-semibold text-gray-900 line-clamp-1">
                      {task.jobs?.title ?? `Task #${task.id.slice(0, 8)}`}
                    </h3>

                    <div className="mt-2.5 flex items-end justify-between">
                      <div className="text-[11px] font-semibold text-gray-500">
                        {new Date(task.created_at).toLocaleDateString()}
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        {task.tip_amount ? (
                          <span className="text-xs font-bold text-primary-600">+ $ {task.tip_amount.toFixed(3)}</span>
                        ) : null}
                        <span className="text-lg font-extrabold" style={{ color: COLORS.primaryGreen }}>$ {reward.toFixed(3)}</span>
                      </div>
                    </div>

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

                    <div className="mt-2 flex justify-end">
                      <ReportButton taskId={task.id} jobId={task.job_id} label="Report this task" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    </div>
  );
}

// ---- Single submission review (level 3 of the posted-jobs flow) ----
interface SubmissionReviewProps {
  sub: Submission;
  job: Job;
  onBack: () => void;
  onLightbox: (src: string) => void;
  processing: boolean;
  actionError: string;
  onApprove: () => void;
  onReject: () => void;
  tipAmount: string;
  setTipAmount: (v: string) => void;
  tipMsg: string;
  onTip: () => void;
}

function SubmissionReview({
  sub, job, onBack, onLightbox, processing, actionError, onApprove, onReject,
  tipAmount, setTipAmount, tipMsg, onTip,
}: SubmissionReviewProps) {
  const { shots, plain } = parseProof(sub.proof_url);
  const isApproved = sub.status === 'approved';
  const isPending = sub.status === 'submitted' || sub.status === 'pending';
  const reward = job.reward_per_worker ?? 0;

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900">
        <ArrowLeft className="h-4 w-4" /> Back to submissions
      </button>

      <Card className="space-y-4 p-4">
        {/* Header: worker + tip box on the right */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-600`}>
              {(sub.profiles?.username || '?').charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">{sub.profiles?.username || sub.worker_id.slice(0, 8)}</div>
              <div className="text-xs text-gray-500">
                {new Date(sub.submitted_at || sub.created_at).toLocaleString()}
              </div>
            </div>
            <Badge variant={isApproved ? 'success' : sub.status === 'rejected' ? 'error' : 'warning'} dot>{sub.status}</Badge>
          </div>

          {/* Tip box (top-right) — only after approval */}
          <div className="rounded-lg border border-gray-200 p-3 sm:w-56">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
              <Gift className="h-4 w-4 text-primary-600" /> Tip this worker
            </div>
            {isApproved ? (
              sub.tip_amount && sub.tip_amount > 0 ? (
                <p className="mt-2 text-xs text-success-600">Tipped $ {sub.tip_amount.toFixed(3)}</p>
              ) : (
                <>
                  <div className="mt-2 flex gap-2">
                    <Input
                      type="number"
                      step="0.001"
                      min="0"
                      placeholder="0.000"
                      value={tipAmount}
                      onChange={(e) => setTipAmount(e.target.value)}
                    />
                    <Button size="sm" onClick={onTip} loading={processing}>Tip</Button>
                  </div>
                  {tipMsg && <p className="mt-1 text-xs text-gray-500">{tipMsg}</p>}
                </>
              )
            ) : (
              <p className="mt-2 text-xs text-gray-400">Available after approval.</p>
            )}
          </div>
        </div>

        {/* Proof text (full) */}
        {sub.proof_text && (
          <div className="rounded-lg bg-gray-50 p-3">
            <div className="text-xs font-semibold text-gray-500">Proof Details</div>
            <p className="mt-1 whitespace-pre-line text-sm text-gray-700">{sub.proof_text}</p>
          </div>
        )}

        {/* Plain proof URL */}
        {plain && (
          <a href={plain} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700">
            <ExternalLink className="h-4 w-4" /> View proof link
          </a>
        )}

        {/* Screenshots — click to open lightbox */}
        {shots.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-gray-500">
              <Camera className="h-3.5 w-3.5" /> Screenshots ({shots.length})
            </div>
            <div className="flex flex-wrap gap-2">
              {shots.map((u, i) => (
                <button key={i} onClick={() => onLightbox(u)} className="overflow-hidden rounded-lg ring-1 ring-gray-200 transition hover:ring-primary-400">
                  <img src={u} alt={`Screenshot ${i + 1}`} className="h-24 w-24 cursor-zoom-in object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}

        {actionError && <p className="text-sm text-error-600">{actionError}</p>}

        {/* Approve / Reject buttons */}
        {isPending && (
          <div className="flex gap-3 border-t border-gray-100 pt-3">
            <Button variant="danger" fullWidth loading={processing} onClick={onReject}>
              <XCircle className="h-5 w-5" /> Reject
            </Button>
            <Button fullWidth loading={processing} onClick={onApprove}>
              <CheckCircle className="h-5 w-5" /> Approve & Pay $ {reward.toFixed(3)}
            </Button>
          </div>
        )}
        {!isPending && (
          <div className="text-xs text-gray-400">Reward $ {reward.toFixed(3)} {isApproved ? 'paid to worker' : ''}.</div>
        )}
      </Card>
    </div>
  );
}
