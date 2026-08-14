import { useState } from 'react';
import { Flag, X, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';

interface ReportButtonProps {
  taskId?: string;
  jobId?: string;
  label?: string;
  className?: string;
}

const PRESETS = [
  'Unfair rejection — I completed the work correctly',
  'Fraudulent job / misleading requirements',
  'Inappropriate content',
  'Spam or scam',
  'Other (describe below)',
];

export function ReportButton({ taskId, jobId, label = 'Report', className }: ReportButtonProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    if (!reason.trim()) { setErr('Please describe the issue.'); return; }
    setSubmitting(true); setErr('');
    const { error } = await supabase.rpc('create_report', {
      p_task_id: taskId ?? null,
      p_job_id: jobId ?? null,
      p_reason: reason.trim(),
    });
    setSubmitting(false);
    if (error) { setErr(error.message); return; }
    setDone(true);
    setTimeout(() => { setOpen(false); setDone(false); setReason(''); }, 1800);
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={className}
        onClick={() => setOpen(true)}
      >
        <Flag className="h-4 w-4" /> {label}
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !submitting && setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-heading text-lg font-bold text-gray-900 flex items-center gap-2">
                <Flag className="h-5 w-5 text-error-500" /> File a report
              </h3>
              <button onClick={() => !submitting && setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {done ? (
              <div className="py-6 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-success-50">
                  <Flag className="h-6 w-6 text-success-600" />
                </div>
                <p className="text-sm font-medium text-gray-900">Report submitted</p>
                <p className="mt-1 text-xs text-gray-500">Our team will review it shortly.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {PRESETS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setReason(p)}
                      className="rounded-full border border-gray-200 px-2.5 py-1 text-xs text-gray-600 hover:border-primary-300 hover:bg-primary-50"
                    >
                      {p.split(' — ')[0]}
                    </button>
                  ))}
                </div>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  placeholder="Describe the issue…"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                />
                {err && <p className="text-xs text-error-600">{err}</p>}
                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
                  <Button type="button" variant="danger" size="sm" onClick={submit} loading={submitting}>
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flag className="h-4 w-4" />} Submit report
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
