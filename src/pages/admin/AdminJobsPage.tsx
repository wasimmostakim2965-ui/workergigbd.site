import { useEffect, useState, useCallback } from 'react';
import { Briefcase, Pause, Play, Trash2, Search, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { LoadingSpinner, EmptyState } from '@/components/ui/EmptyState';
import { Job, Profile } from '@/types';

export function AdminJobsPage() {
  const [jobs, setJobs] = useState<(Job & { profiles?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const loadJobs = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('jobs').select('*, profiles(username)').order('created_at', { ascending: false });
    if (statusFilter !== 'all') query = query.eq('status', statusFilter);
    if (search) query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    const { data } = await query.limit(100);
    setJobs((data as (Job & { profiles?: Profile })[]) ?? []);
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  const toggleStatus = async (job: Job) => {
    const newStatus = job.status === 'active' ? 'paused' : 'active';
    await supabase.from('jobs').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', job.id);
    loadJobs();
  };

  const deleteJob = async (id: string) => {
    if (!confirm('Delete this job permanently?')) return;
    await supabase.from('jobs').delete().eq('id', id);
    loadJobs();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-gray-900">Job Management</h1>
        <p className="mt-1 text-sm text-gray-600">Monitor and manage all posted jobs</p>
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <Input placeholder="Search jobs..." value={search} onChange={(e) => setSearch(e.target.value)} icon={<Search className="h-4 w-4" />} />
          </div>
          <div className="sm:w-48">
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
            </Select>
          </div>
        </div>
      </Card>

      {loading ? (
        <LoadingSpinner size={40} className="py-20" />
      ) : jobs.length === 0 ? (
        <Card><EmptyState icon={<Briefcase className="h-8 w-8" />} title="No jobs found" /></Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-left text-xs text-gray-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Title</th>
                  <th className="px-5 py-3 font-medium">Posted By</th>
                  <th className="px-5 py-3 font-medium">Category</th>
                  <th className="px-5 py-3 font-medium">Reward</th>
                  <th className="px-5 py-3 font-medium">Slots</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <div className="font-medium text-gray-900 line-clamp-1">{job.title}</div>
                      {job.is_premium_only && <Badge variant="accent" size="sm">Premium</Badge>}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{job.profiles?.username ?? 'Unknown'}</td>
                    <td className="px-5 py-3 text-gray-600">{job.category}</td>
                    <td className="px-5 py-3 font-semibold text-success-600">৳ {job.reward_per_worker.toFixed(3)}</td>
                    <td className="px-5 py-3 text-gray-700">{job.filled_slots}/{job.total_slots}</td>
                    <td className="px-5 py-3">
                      <Badge variant={job.status === 'active' ? 'success' : job.status === 'paused' ? 'warning' : job.status === 'completed' ? 'primary' : 'error'} dot>
                        {job.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1">
                        {job.url && (
                          <a href={job.url} target="_blank" rel="noopener noreferrer" className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                        <button onClick={() => toggleStatus(job)} className="rounded-lg p-1.5 text-gray-500 hover:bg-primary-50 hover:text-primary-600">
                          {job.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </button>
                        <button onClick={() => deleteJob(job.id)} className="rounded-lg p-1.5 text-gray-500 hover:bg-error-50 hover:text-error-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
