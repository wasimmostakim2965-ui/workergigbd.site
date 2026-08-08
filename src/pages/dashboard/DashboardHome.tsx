import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Megaphone, ChevronRight, Pin,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { LoadingSpinner } from '@/components/ui/EmptyState';
import { Job, Category, AdminSetting } from '@/types';

const flagEmojis: Record<string, string> = {
  Facebook: '📘', Twitter: '🐦', Instagram: '📸', 'YouTube/Toffe': '📺',
  TikTok: '🎵', 'Sign Up': '✍️', 'Ads Click': '🖱️', Survey: '📋',
  'Gmail Account': '📧', 'Mobile Application': '📱', 'Write an Article': '📝',
  Comment: '💬', LinkedIn: '💼', Reddit: '🔴',
};

export function DashboardHome() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [settings, setSettings] = useState<AdminSetting[]>([]);

  const bannerActive = settings.find(s => s.key === 'banner_active')?.value === 'true';
  const bannerTitle = settings.find(s => s.key === 'banner_title')?.value || '';
  const bannerUrl = settings.find(s => s.key === 'banner_url')?.value || '';
  const bannerImage = settings.find(s => s.key === 'banner_image')?.value || '';

  const loadJobs = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('jobs').select('*').eq('status', 'active').order('created_at', { ascending: false });
    if (categoryFilter !== 'all') query = query.eq('category', categoryFilter);
    const { data } = await query.limit(20);
    setJobs((data as Job[]) ?? []);
    setLoading(false);
  }, [categoryFilter]);

  useEffect(() => {
    supabase.from('categories').select('*').eq('is_active', true).order('display_order').then(({ data }) => {
      setCategories((data as Category[]) ?? []);
    });
    supabase.from('admin_settings').select('*').then(({ data }) => {
      setSettings((data as AdminSetting[]) ?? []);
    });
  }, []);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  return (
    <div className="space-y-5">
      {/* Admin Banner */}
      {bannerActive && bannerTitle && (
        bannerUrl ? (
          <a href={bannerUrl} target="_blank" rel="noopener noreferrer" className="block">
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary-600 via-primary-700 to-primary-800 px-5 py-3 shadow-md transition-all hover:shadow-lg">
              <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-white/5 blur-xl" />
              <div className="relative flex items-center gap-3">
                <Megaphone className="h-5 w-5 shrink-0 text-primary-200" />
                <p className="text-sm font-semibold text-white">{bannerTitle}</p>
                <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-primary-200" />
              </div>
            </div>
          </a>
        ) : (
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-gray-700 to-gray-800 px-5 py-3 shadow-md">
            <div className="relative flex items-center gap-3">
              <Megaphone className="h-5 w-5 shrink-0 text-gray-300" />
              <p className="text-sm font-semibold text-white">{bannerTitle}</p>
            </div>
          </div>
        )
      )}

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setCategoryFilter('all')}
          className={`shrink-0 rounded-lg px-3.5 py-2 text-sm font-bold transition-all ${
            categoryFilter === 'all'
              ? 'bg-[#1EA3EE] text-white'
              : 'bg-white text-gray-600 border border-gray-200'
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategoryFilter(cat.name)}
            className={`shrink-0 rounded-lg px-3.5 py-2 text-sm font-bold transition-all ${
              categoryFilter === cat.name
                ? 'bg-[#1EA3EE] text-white'
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Jobs feed - WorkUpJob style cards */}
      {loading ? (
        <LoadingSpinner size={36} className="py-16" />
      ) : jobs.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white py-16 text-center">
          <p className="text-sm text-gray-500">No jobs available right now. Check back soon!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => {
            const progress = job.total_slots > 0 ? (job.filled_slots / job.total_slots) * 100 : 0;
            const isFull = job.filled_slots >= job.total_slots;
            const totalReward = job.reward_per_worker + (job.screenshot_count ?? 0) * 0.05;
            const isPinned = job.is_premium_only;

            return (
              <Link
                key={job.id}
                to="/dashboard/find-jobs"
                className={`block rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-primary-200 hover:shadow-md ${isFull ? 'opacity-60' : ''}`}
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
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
