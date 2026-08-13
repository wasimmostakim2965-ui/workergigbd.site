import { useEffect, useState } from 'react';
import { PlusCircle, ImagePlus, X, Info, Camera } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { Category, AdminSetting } from '@/types';
import { useSeo } from '@/lib/useSeo';

export function PostJobPage() {
  useSeo({
    title: 'কাজ পোস্ট করুন — WORKER GIG BD | অনলাইন কাজ পোস্ট ও ওয়ার্কার নিয়োগ',
    description: 'WORKER GIG BD-তে কাজ পোস্ট করুন এবং সারা বাংলাদেশের ওয়ার্কারদের কাছ থেকে সহজে আপনার মাইক্রো-টাস্ক সম্পন্ন করান। ফেসবুক লাইক, সাইন আপ, সার্ভে ইত্যাদি কাজ পোস্ট করুন।',
    path: '/dashboard/post-job',
  });
  const { profile, refreshProfile } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<string[]>([]);
  const [settings, setSettings] = useState<AdminSetting[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    title: '',
    description: '',
    requirements: '',
    category: '',
    subcategory: '',
    url: '',
    screenshot_count: 0,
    screenshot_instructions: '',
    image_url: '',
    reward_per_worker: '',
    total_slots: '1',
    is_premium_only: false,
  });

  useEffect(() => {
    supabase.from('categories').select('*').eq('is_active', true).order('display_order').then(({ data }) => {
      setCategories((data as Category[]) ?? []);
    });
    supabase.from('admin_settings').select('*').then(({ data }) => {
      setSettings((data as AdminSetting[]) ?? []);
    });
  }, []);

  const jobPostingEnabled = settings.find(s => s.key === 'job_posting_enabled')?.value === 'true';

  const reward = parseFloat(form.reward_per_worker || '0') || 0;
  const slots = parseInt(form.total_slots || '0') || 0;
  const screenshots = form.screenshot_count;

  // Cost calculation: reward * slots + (screenshots * 0.05 * slots)
  const screenshotFee = screenshots * 0.05 * slots;
  const baseCost = reward * slots;
  const totalCost = baseCost + screenshotFee;

  const handleCategoryChange = (catName: string) => {
    const cat = categories.find(c => c.name === catName);
    setSubcategories(cat?.subcategories ?? []);
    setForm({ ...form, category: catName, subcategory: cat?.subcategories?.[0] ?? '' });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    // Validate before uploading: images only, max 5 MB.
    if (file.size > 5 * 1024 * 1024) { setError('Image must be less than 5 MB.'); return; }
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      setError('Only image files (JPG, PNG, WEBP, GIF) are allowed.'); return;
    }

    const ext = file.name.split('.').pop();
    const fileName = `job-images/${profile.id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('job-assets')
      .upload(fileName, file, { contentType: file.type });

    if (uploadError) {
      setError('Image upload failed: ' + uploadError.message);
      return;
    }

    const { data: urlData } = supabase.storage.from('job-assets').getPublicUrl(fileName);
    setForm({ ...form, image_url: urlData.publicUrl });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setError('');
    setSuccess(false);
    setLoading(true);

    if (profile.status !== 'active') {
      setError('Your account is not active. Job posting is disabled.');
      setLoading(false);
      return;
    }

    if (reward < 0.02) {
      setError('Minimum reward per worker is $0.02 (2 cents).');
      setLoading(false);
      return;
    }

    if (profile.deposit_balance < totalCost) {
      setError(`Insufficient deposit balance. You need $${totalCost.toFixed(3)} but have $${profile.deposit_balance.toFixed(3)}. Please deposit first.`);
      setLoading(false);
      return;
    }

    const { error: jobError } = await supabase.rpc('post_job', {
      p_uid: profile.id,
      p_title: form.title,
      p_description: form.description,
      p_category: form.category,
      p_subcategory: form.subcategory,
      p_url: form.url,
      p_proof_instructions: form.requirements,
      p_reward_per_worker: reward,
      p_total_slots: slots,
      p_is_premium_only: form.is_premium_only,
      p_screenshot_count: form.screenshot_count,
      p_screenshot_instructions: form.screenshot_instructions,
      p_image_url: form.image_url,
    });

    if (jobError) {
      setError(jobError.message);
      setLoading(false);
      return;
    }

    await refreshProfile();

    setSuccess(true);
    setForm({
      title: '', description: '', requirements: '', category: '', subcategory: '', url: '',
      screenshot_count: 0, screenshot_instructions: '', image_url: '',
      reward_per_worker: '', total_slots: '1', is_premium_only: false,
    });
    setLoading(false);
  };

  if (!jobPostingEnabled && settings.length > 0) {
    return (
      <div className="space-y-6">
        <h1 className="font-heading text-2xl font-bold text-gray-900">Post New Job</h1>
        <Alert variant="warning" title="Job Posting Disabled">
          Job posting is currently disabled by the administrator. Please check back later.
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-gray-900">Post New Job</h1>
        <p className="mt-1 text-sm text-gray-600">Create a task for workers to complete</p>
      </div>

      {success && (
        <Alert variant="success" title="Job Posted Successfully!">
          Your job has been posted and is now visible to workers. ${totalCost.toFixed(3)} has been deducted from your deposit balance.
        </Alert>
      )}
      {error && <Alert variant="error">{error}</Alert>}

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 1. Job Title */}
          <Input
            label="Job Title"
            placeholder="e.g., Like my Facebook page"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />

          {/* 2. Description */}
          <Textarea
            label="Description"
            placeholder="Describe what workers need to do in detail..."
            rows={4}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
          />

          {/* 3. Requirements (what workers submit) */}
          <Textarea
            label="Requirements"
            placeholder="What proof should workers submit? e.g., Submit screenshot of liking the page..."
            rows={3}
            value={form.requirements}
            onChange={(e) => setForm({ ...form, requirements: e.target.value })}
          />

          {/* 4. Category + Subcategory */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Category"
              value={form.category}
              onChange={(e) => handleCategoryChange(e.target.value)}
              required
            >
              <option value="">Select category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </Select>
            <Select
              label="Subcategory"
              value={form.subcategory}
              onChange={(e) => setForm({ ...form, subcategory: e.target.value })}
              disabled={subcategories.length === 0}
            >
              {subcategories.map((sub) => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </Select>
          </div>

          {/* 5. Task URL */}
          <Input
            label="Task URL (optional)"
            placeholder="https://facebook.com/your-page"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            hint="The link workers need to visit"
          />

          {/* 6. Screenshot count selector */}
          <div>
            <label className="label-text">How many screenshots should workers submit?</label>
            <div className="flex items-center gap-2">
              {[0, 1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setForm({ ...form, screenshot_count: n })}
                  className={`flex h-10 w-10 items-center justify-center rounded-lg border-2 text-sm font-bold transition-all ${
                    form.screenshot_count === n
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-gray-500">Max 4 screenshots. Each screenshot costs $0.05 per worker.</p>
          </div>

          {/* 7. Screenshot instructions (optional) */}
          {form.screenshot_count > 0 && (
            <Textarea
              label="Screenshot Instructions (optional)"
              placeholder="Describe what each screenshot should show..."
              rows={2}
              value={form.screenshot_instructions}
              onChange={(e) => setForm({ ...form, screenshot_instructions: e.target.value })}
            />
          )}

          {/* 8. Image upload (optional) */}
          <div>
            <label className="label-text">Job Image (optional)</label>
            {form.image_url ? (
              <div className="relative inline-block">
                <img src={form.image_url} alt="Job" className="h-32 w-32 rounded-lg border border-gray-200 object-cover" />
                <button
                  type="button"
                  onClick={() => setForm({ ...form, image_url: '' })}
                  className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-error-500 text-white shadow-md"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 p-6 text-sm text-gray-500 transition-colors hover:border-primary-400 hover:bg-primary-50/30">
                <ImagePlus className="h-5 w-5" />
                <span>Click to upload an image</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            )}
          </div>

          {/* 9. Reward per worker */}
          <Input
            label="Reward per Worker ($)"
            type="number"
            step="0.01"
            min="0.02"
            placeholder="0.02 (minimum 2 cents)"
            value={form.reward_per_worker}
            onChange={(e) => setForm({ ...form, reward_per_worker: e.target.value })}
            required
            hint="Minimum $0.02 per worker"
          />

          {/* 10. Total slots */}
          <Input
            label="Total Workers Needed"
            type="number"
            min="1"
            placeholder="e.g., 100"
            value={form.total_slots}
            onChange={(e) => setForm({ ...form, total_slots: e.target.value })}
            required
          />

          {/* 11. Premium only checkbox */}
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.is_premium_only}
              onChange={(e) => setForm({ ...form, is_premium_only: e.target.checked })}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-200"
            />
            Premium members only
          </label>

          {/* 12. Cost breakdown */}
          {(reward > 0 || slots > 0) && (
            <div className="rounded-lg bg-gray-50 p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Worker rewards ({slots} × ${reward.toFixed(3)})</span>
                <span className="font-medium text-gray-900">${baseCost.toFixed(3)}</span>
              </div>
              {screenshotFee > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Screenshot fees ({screenshots} × $0.05 × {slots})</span>
                  <span className="font-medium text-gray-900">${screenshotFee.toFixed(3)}</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">Total Cost</span>
                <span className="text-lg font-bold text-primary-700">${totalCost.toFixed(3)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Your deposit balance</span>
                <span className={`font-medium ${profile && profile.deposit_balance >= totalCost ? 'text-success-600' : 'text-error-600'}`}>
                  $ {profile?.deposit_balance?.toFixed(3) ?? '0.000'}
                </span>
              </div>
            </div>
          )}

          {/* 13. Submit */}
          <Button type="submit" fullWidth size="lg" loading={loading} disabled={totalCost <= 0}>
            <PlusCircle className="h-5 w-5" /> Confirm & Post Job
          </Button>
        </form>
      </Card>
    </div>
  );
}
