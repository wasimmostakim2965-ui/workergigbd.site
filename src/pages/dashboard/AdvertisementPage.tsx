import { useEffect, useState, useCallback } from 'react';
import { Megaphone, Plus, ExternalLink, BarChart3 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState, LoadingSpinner } from '@/components/ui/EmptyState';
import { Alert } from '@/components/ui/Alert';
import { Advertisement } from '@/types';

export function AdvertisementPage() {
  const { profile, refreshProfile } = useAuth();
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({ title: '', url: '', image_url: '', budget: '' });
  const [creating, setCreating] = useState(false);

  const loadAds = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from('advertisements')
        .select('*').eq('user_id', profile.id)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Load ads error:', error);
        setAds([]);
      } else {
        setAds((data as Advertisement[]) ?? []);
      }
    } catch (err) {
      console.error('Load ads error:', err);
      setAds([]);
    }
    setLoading(false);
  }, [profile]);

  useEffect(() => { loadAds(); }, [loadAds]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setCreating(true);
    setError('');

    const budget = parseFloat(form.budget);
    if (!budget || budget <= 0) {
      setError('Please enter a valid budget amount.');
      setCreating(false);
      return;
    }
    if (profile.deposit_balance < budget) {
      setError(`Insufficient deposit balance. You need ৳ ${budget.toFixed(3)} but have ৳ ${profile.deposit_balance.toFixed(3)}.`);
      setCreating(false);
      return;
    }

    // Charge the ad budget up front so ads are not created for free.
    const { error: adError } = await supabase.from('advertisements').insert({
      user_id: profile.id,
      title: form.title,
      url: form.url,
      image_url: form.image_url,
      budget,
      spent: 0,
      status: 'pending',
    });

    if (adError) {
      setError(adError.message);
      setCreating(false);
      return;
    }

    await supabase.from('profiles').update({
      deposit_balance: profile.deposit_balance - budget,
      updated_at: new Date().toISOString(),
    }).eq('id', profile.id);

    await supabase.from('transactions').insert({
      user_id: profile.id,
      type: 'ad_charge',
      amount: budget,
      balance_type: 'deposit',
      description: `Advertisement: ${form.title}`,
    });

    await refreshProfile();

    setSuccess(true);
    setShowNew(false);
    setForm({ title: '', url: '', image_url: '', budget: '' });
    loadAds();
    setCreating(false);
  };

  if (loading) return <LoadingSpinner size={40} className="py-20" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-gray-900">Advertisement</h1>
          <p className="mt-1 text-sm text-gray-600">Promote your products or services to our users</p>
        </div>
        <Button onClick={() => setShowNew(true)}>
          <Plus className="h-4 w-4" /> New Ad
        </Button>
      </div>

      {ads.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Megaphone className="h-8 w-8" />}
            title="No advertisements"
            description="Create an ad to promote your product, service, or website."
            action={<Button onClick={() => setShowNew(true)}><Plus className="h-4 w-4" /> Create Ad</Button>}
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {ads.map((ad) => (
            <Card key={ad.id} className="overflow-hidden">
              {ad.image_url && (
                <img src={ad.image_url} alt={ad.title} className="h-32 w-full object-cover" />
              )}
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <Badge
                    variant={ad.status === 'active' ? 'success' : ad.status === 'pending' ? 'warning' : ad.status === 'rejected' ? 'error' : 'gray'}
                    dot
                  >
                    {ad.status}
                  </Badge>
                </div>
                <h3 className="mt-2 font-semibold text-gray-900 line-clamp-1">{ad.title}</h3>
                <a href={ad.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700">
                  <ExternalLink className="h-3 w-3" /> {ad.url}
                </a>

                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-gray-100 pt-3 text-center">
                  <div>
                    <div className="text-xs text-gray-500">Impressions</div>
                    <div className="text-sm font-semibold text-gray-900">{ad.impressions}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Clicks</div>
                    <div className="text-sm font-semibold text-gray-900">{ad.clicks}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Budget</div>
                    <div className="text-sm font-semibold text-gray-900">৳{ad.budget}</div>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Spent</span>
                    <span>৳ {ad.spent.toFixed(2)} / ৳ {ad.budget.toFixed(2)}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-gray-100">
                    <div className="h-full rounded-full bg-primary-500" style={{ width: `${ad.budget > 0 ? (ad.spent / ad.budget) * 100 : 0}%` }} />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showNew} onClose={() => setShowNew(false)} title="Create Advertisement">
        {error && <Alert variant="error" className="mb-4">{error}</Alert>}
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Ad Title"
            placeholder="e.g., Best Mobile Shop in Dhaka"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
          <Input
            label="Target URL"
            placeholder="https://your-website.com"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            required
          />
          <Input
            label="Image URL (Optional)"
            placeholder="https://your-image-url.com/image.jpg"
            value={form.image_url}
            onChange={(e) => setForm({ ...form, image_url: e.target.value })}
            hint="Provide a square image URL for best results"
          />
          <Input
            label="Budget (৳)"
            type="number"
            step="0.01"
            min="10"
            placeholder="100"
            value={form.budget}
            onChange={(e) => setForm({ ...form, budget: e.target.value })}
            required
            hint={`Your deposit balance: ৳ ${profile?.deposit_balance?.toFixed(3) ?? '0.000'}`}
          />
          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={() => setShowNew(false)}>Cancel</Button>
            <Button type="submit" fullWidth loading={creating}>Create Ad</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
