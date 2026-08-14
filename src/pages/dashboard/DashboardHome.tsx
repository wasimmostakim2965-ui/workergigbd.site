import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Pin } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { LoadingSpinner } from '@/components/ui/EmptyState';
import { Job, Category } from '@/types';

const flagEmojis: Record<string, string> = {
  Facebook: '📘', Twitter: '🐦', Instagram: '📸', 'YouTube/Toffe': '📺',
  TikTok: '🎵', 'Sign Up': '✍️', 'Ads Click': '🖱️', Survey: '📋',
  'Gmail Account': '📧', 'Mobile Application': '📱', 'Write an Article': '📝',
  Comment: '💬', LinkedIn: '💼', Reddit: '🔴',
};

// Color constants matching the spec
const COLORS = {
  bodyBg: '#E8F4F8',
  cardBg: '#FFFFFF',
  primaryGreen: '#058824',
  filterBlue: '#1EA3EE',
  badgePurple: '#5865F2',
};

export function DashboardHome() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('all');

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('jobs').select('*').eq('status', 'active').order('is_premium_only', { ascending: false }).order('created_at', { ascending: false });
      if (categoryFilter !== 'all') query = query.eq('category', categoryFilter);
      const { data, error } = await query.limit(20);
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
  }, [categoryFilter]);

  useEffect(() => {
    supabase.from('categories').select('*').eq('is_active', true).order('display_order').then(({ data }) => {
      setCategories((data as Category[]) ?? []);
    });
  }, []);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  return (
    <div className="space-y-4">
      {/* Category filter - Mobile style horizontal scroll */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        <button
          onClick={() => setCategoryFilter('all')}
          className={`shrink-0 rounded-lg px-4 py-2.5 text-sm font-bold transition-all ${
            categoryFilter === 'all'
              ? 'text-white'
              : 'bg-white text-gray-600 border border-gray-200'
          }`}
          style={categoryFilter === 'all' ? { backgroundColor: COLORS.filterBlue } : {}}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategoryFilter(cat.name)}
            className={`shrink-0 rounded-lg px-4 py-2.5 text-sm font-bold transition-all whitespace-nowrap ${
              categoryFilter === cat.name
                ? 'text-white'
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
            style={categoryFilter === cat.name ? { backgroundColor: COLORS.filterBlue } : {}}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Jobs feed - WorkUpJob style cards */}
      {loading ? (
        <LoadingSpinner size={36} className="py-16" />
      ) : jobs.length === 0 ? (
        <div 
          className="rounded-xl border border-gray-200 bg-white py-16 text-center"
          style={{ backgroundColor: COLORS.cardBg }}
        >
          <p className="text-sm text-gray-500">No jobs available right now. Check back soon!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => {
            const progress = job.total_slots > 0 ? (job.filled_slots / job.total_slots) * 100 : 0;
            const isFull = job.filled_slots >= job.total_slots;
            const totalReward = (job.reward_per_worker ?? 0);
            const isPinned = job.is_premium_only;
            const isTopJob = totalReward >= 0.1;

            return (
              <Link
                key={job.id}
                to={`/dashboard/find-jobs/${job.id}`}
                className={`block rounded-xl border border-gray-200 bg-white p-4 transition-all hover:shadow-md ${
                  isFull ? 'opacity-60' : ''
                }`}
                style={{ 
                  backgroundColor: COLORS.cardBg,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                }}
              >
                {/* Top row - Job Title + Tags */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
                    <h3 className="text-base font-bold uppercase text-gray-900 line-clamp-1">
                      {job.title}
                    </h3>
                    <span className="text-base">🇧🇩</span>
                    {isTopJob && (
                      <span 
                        className="rounded px-2 py-0.5 text-[11px] font-extrabold uppercase"
                        style={{ 
                          backgroundColor: '#C8F7DC',
                          color: COLORS.primaryGreen
                        }}
                      >
                        TOP JOB
                      </span>
                    )}
                  </div>
                  {isPinned && (
                    <div 
                      className="flex shrink-0 items-center gap-1"
                      style={{ color: COLORS.badgePurple }}
                    >
                      <Pin className="h-4 w-4 fill-current" />
                      <span className="text-sm font-bold">Pinned</span>
                    </div>
                  )}
                </div>

                {/* Bottom row - Progress + Price */}
                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <div className="text-xs font-semibold text-gray-600 mb-1">
                      {job.filled_slots} OF {job.total_slots}
                    </div>
                    <div className="h-1.5 w-28 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full rounded-full"
                        style={{ 
                          width: `${Math.min(progress, 100)}%`,
                          backgroundColor: isFull ? '#9CA3AF' : COLORS.primaryGreen
                        }}
                      />
                    </div>
                  </div>
                  <div 
                    className="text-xl font-extrabold"
                    style={{ color: COLORS.primaryGreen }}
                  >
                    $ {totalReward.toFixed(3)}
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
