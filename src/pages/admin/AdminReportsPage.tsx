import { useEffect, useState, useCallback } from 'react';
import { Flag, CheckCircle, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner, EmptyState } from '@/components/ui/EmptyState';

interface ReportRow {
  id: string;
  reporter_id: string;
  task_id: string | null;
  job_id: string | null;
  reason: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
  reporter?: { username: string };
}

export function AdminReportsPage() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('open');

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('reports')
      .select('*, reporter:reporter_id(username)')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) { console.error(error); setReports([]); }
    else setReports((data as ReportRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const resolve = async (id: string) => {
    const { error } = await supabase
      .from('reports')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .eq('id', id);
    if (!error) load();
  };

  const filtered = reports.filter((r) => (tab === 'open' ? r.status === 'open' : r.status === 'resolved'));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-gray-900">Reports</h1>
        <Button variant="ghost" size="sm" onClick={load}>Refresh</Button>
      </div>

      <div className="flex gap-2">
        {(['open', 'resolved'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors ${
              tab === t ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner size={40} className="py-20" />
      ) : filtered.length === 0 ? (
        <Card><EmptyState icon={<Flag className="h-8 w-8" />} title="No reports" description="There are no reports in this category." /></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant={r.status === 'open' ? 'warning' : 'success'} dot>{r.status}</Badge>
                    <span className="text-sm font-semibold text-gray-900">{r.reporter?.username ?? 'Unknown'}</span>
                    <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleString()}</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-700">{r.reason}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-primary-600">
                    {r.task_id && <span>Task: {r.task_id.slice(0, 8)}</span>}
                    {r.job_id && <span>Job: {r.job_id.slice(0, 8)}</span>}
                  </div>
                </div>
                {r.status === 'open' && (
                  <Button variant="secondary" size="sm" onClick={() => resolve(r.id)}>
                    <CheckCircle className="h-4 w-4" /> Mark resolved
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
