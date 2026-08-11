import { useEffect, useState } from 'react';
import { Crown, Check, Zap, Shield, TrendingUp, Star, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Modal } from '@/components/ui/Modal';
import { AdminSetting } from '@/types';

const premiumFeatures = [
  { icon: Zap, title: '2x Task Rewards', desc: 'Earn double on all premium-only tasks' },
  { icon: TrendingUp, title: 'Priority Withdrawals', desc: 'Get your withdrawal processed first' },
  { icon: Shield, title: 'Zero Deposit Fees', desc: 'No transaction fees on any deposit' },
  { icon: Star, title: 'Premium Badge', desc: 'Show off your premium status' },
  { icon: Crown, title: 'Exclusive Tasks', desc: 'Access high-paying premium-only jobs' },
  { icon: Check, title: 'Priority Support', desc: 'Faster response on support tickets' },
];

export function PremiumPage() {
  const { profile, refreshProfile } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [settings, setSettings] = useState<AdminSetting[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.from('admin_settings').select('*');
        setSettings((data as AdminSetting[]) ?? []);
      } catch { /* ignore */ }
    })();
  }, []);

  const premiumPrice = parseFloat(settings.find(s => s.key === 'premium_price')?.value || '500');
  const premiumDays = parseInt(settings.find(s => s.key === 'premium_duration_days')?.value || '30', 10);
  const premiumEnabled = settings.find(s => s.key === 'premium_enabled')?.value === 'true';

  const handleSubscribe = async () => {
    if (!profile) return;
    setError('');
    setLoading(true);

    if (profile.status !== 'active') {
      setError('Your account is not active. Premium subscription is disabled.');
      setLoading(false);
      return;
    }

    if (!premiumEnabled) {
      setError('Premium subscription is currently disabled by the administrator.');
      setLoading(false);
      return;
    }

    if (profile.deposit_balance < premiumPrice) {
      setError(`Insufficient deposit balance. You need at least ৳ ${premiumPrice}. Please deposit first.`);
      setLoading(false);
      return;
    }

    // Atomic RPC: deducts premium_price, sets is_premium + expiry, writes the
    // ledger transaction — all in one DB transaction with a row lock.
    const { error: rpcError } = await supabase.rpc('subscribe_premium', {
      p_uid: profile.id,
    });

    if (rpcError) {
      setError(rpcError.message);
      setLoading(false);
      return;
    }

    await refreshProfile();
    setShowConfirm(false);
    setLoading(false);
  };

  const isPremium = profile?.is_premium;
  const expiryDate = profile?.premium_expires_at ? new Date(profile.premium_expires_at) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-gray-900">Premium Membership</h1>
        <p className="mt-1 text-sm text-gray-600">Unlock exclusive benefits and earn more</p>
      </div>

      {isPremium && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-accent-500 to-accent-700 p-6 text-white shadow-lg">
          <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
              <Crown className="h-8 w-8" />
            </div>
            <div>
              <h2 className="font-heading text-xl font-bold">You're a Premium Member!</h2>
              <p className="text-accent-100">
                {expiryDate ? `Valid until ${expiryDate.toLocaleDateString()}` : 'Active subscription'}
              </p>
            </div>
          </div>
        </div>
      )}

      {error && <Alert variant="error">{error}</Alert>}

      {/* Premium features */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {premiumFeatures.map((feat) => (
          <Card key={feat.title} className="p-5">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent-400 to-accent-600 text-white">
              <feat.icon className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-gray-900">{feat.title}</h3>
            <p className="mt-1 text-sm text-gray-600">{feat.desc}</p>
          </Card>
        ))}
      </div>

      {/* Pricing */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-primary-700 to-primary-900 p-8 text-center text-white">
          <Crown className="mx-auto h-12 w-12 text-accent-400" />
          <h2 className="mt-4 font-heading text-2xl font-bold">Premium Plan</h2>
          <div className="mt-4">
            <span className="text-4xl font-extrabold">৳ {premiumPrice}</span>
            <span className="text-primary-200"> / {premiumDays} days</span>
          </div>
          <p className="mt-2 text-sm text-primary-200">One-time payment from your deposit balance</p>
        </div>
        <div className="p-6">
          <ul className="space-y-3">
            {premiumFeatures.map((feat) => (
              <li key={feat.title} className="flex items-center gap-3 text-sm">
                <CheckCircle className="h-5 w-5 shrink-0 text-success-600" />
                <span className="text-gray-700">{feat.title}</span>
              </li>
            ))}
          </ul>
          <Button
            className="mt-6"
            fullWidth
            size="lg"
            variant="accent"
            disabled={isPremium}
            onClick={() => setShowConfirm(true)}
          >
            {isPremium ? 'Already Premium' : 'Upgrade to Premium'}
          </Button>
        </div>
      </Card>

      <Modal open={showConfirm} onClose={() => setShowConfirm(false)} title="Confirm Premium Subscription">
        <div className="space-y-4">
          <div className="rounded-lg bg-primary-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Premium Plan ({premiumDays} days)</span>
              <span className="font-bold text-gray-900">৳ {premiumPrice}</span>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-primary-100 pt-2">
              <span className="text-sm text-gray-600">Your Deposit Balance</span>
              <span className="font-bold text-gray-900">৳ {profile?.deposit_balance?.toFixed(3) ?? '0.000'}</span>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-primary-100 pt-2">
              <span className="text-sm font-semibold text-gray-700">Balance After</span>
              <span className="font-bold text-primary-700">৳ {((profile?.deposit_balance ?? 0) - premiumPrice).toFixed(3)}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={() => setShowConfirm(false)}>Cancel</Button>
            <Button fullWidth loading={loading} onClick={handleSubscribe}>Confirm & Pay</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
