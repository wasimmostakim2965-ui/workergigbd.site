import { useEffect, useState } from 'react';
import { Share2, Copy, Gift, Users, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Card, StatCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { AdminSetting, Profile } from '@/types';
import { useSeo } from '@/lib/useSeo';

export function ShareEarnPage() {
  useSeo({
    title: 'শেয়ার ও আয় — WORKER GIG BD | রেফার করে বোনাস পান',
    description: 'WORKER GIG BD-তে আপনার রেফার লিংক শেয়ার করে বোনাস আয় করুন। প্রতিটি রেফারেল থেকে আয় পান এবং বন্ধুদের সাথে মাইক্রো-টাস্ক প্ল্যাটফর্ম পরিচয় করিয়ে দিন।',
    path: '/dashboard/share-earn',
    noindex: true,
  });
  const { profile } = useAuth();
  const [settings, setSettings] = useState<AdminSetting[]>([]);
  const [referrals, setReferrals] = useState<{ referred: Profile | null; bonus_amount: number; status: string; created_at: string }[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    supabase.from('admin_settings').select('*').then(({ data }) => {
      setSettings((data as AdminSetting[]) ?? []);
    });
    if (profile) {
      supabase.from('referrals')
        .select('bonus_amount, status, created_at, referred:profiles!referrals_referred_profile(username, created_at)')
        .eq('referrer_id', profile.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          if (data) {
            setReferrals(data as any);
          }
        });
    }
  }, [profile]);

  const referralBonus = parseFloat(settings.find(s => s.key === 'referral_bonus')?.value || '10');
  const referralEnabled = settings.find(s => s.key === 'referral_enabled')?.value === 'true';
  const siteDomain = settings.find(s => s.key === 'site_domain')?.value || window.location.hostname;
  const referralLink = profile?.referral_code
    ? `${window.location.origin}/signup?ref=${profile.referral_code}`
    : '';
  const referralCode = profile?.referral_code ?? '';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-gray-900">Share & Earn</h1>
        <p className="mt-1 text-sm text-gray-600">Invite friends and earn bonus for each signup</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Your Referral Code"
          value={referralCode || '—'}
          icon={<Gift className="h-6 w-6" />}
          color="primary"
        />
        <StatCard
          label="Total Referrals"
          value={referrals.length}
          icon={<Users className="h-6 w-6" />}
          color="accent"
        />
        <StatCard
          label="Bonus per Referral"
          value={`$ ${referralBonus}`}
          icon={<Share2 className="h-6 w-6" />}
          color="success"
        />
      </div>

      {/* Referral link card */}
      <Card className="p-6">
        <h3 className="font-heading font-bold text-gray-900 mb-4">Your Referral Link</h3>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 font-mono text-sm text-gray-700 break-all">
            {referralLink || 'Generate your referral code by completing your profile.'}
          </div>
          <Button onClick={() => copyToClipboard(referralLink)} disabled={!referralLink}>
            {copied ? <><CheckCircle className="h-4 w-4" /> Copied!</> : <><Copy className="h-4 w-4" /> Copy Link</>}
          </Button>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <div className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 font-mono text-sm text-gray-700">
            {referralCode}
          </div>
          <Button variant="secondary" onClick={() => copyToClipboard(referralCode)} disabled={!referralCode}>
            <Copy className="h-4 w-4" /> Copy Code
          </Button>
        </div>

        <Alert variant="info" className="mt-4">
          Share your link with friends. When they sign up using your code, you'll earn $ {referralBonus} bonus after their first deposit.
        </Alert>
      </Card>

      {/* Referral history */}
      <Card>
        <div className="border-b border-gray-100 px-5 py-4">
          <h3 className="font-heading font-bold text-gray-900">Referral History</h3>
        </div>
        {referrals.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <Users className="mb-3 h-10 w-10 text-gray-300" />
            <p className="text-sm text-gray-500">No referrals yet. Start sharing your link!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {referrals.map((ref, idx) => (
              <div key={idx} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white uppercase">
                    {(ref.referred as any)?.username?.charAt(0) ?? '?'}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">
                      {(ref.referred as any)?.username ?? 'Unknown user'}
                    </div>
                    <div className="text-xs text-gray-500">{new Date(ref.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-success-600">+$ {ref.bonus_amount.toFixed(2)}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    ref.status === 'completed' ? 'bg-success-50 text-success-700' : 'bg-warning-50 text-warning-700'
                  }`}>
                    {ref.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
