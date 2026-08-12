import { useEffect, useState } from 'react';
import { ArrowUpFromLine, Send, Smartphone } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { EmptyState, LoadingSpinner } from '@/components/ui/EmptyState';
import { WithdrawalRequest, AdminSetting } from '@/types';
import { useSeo } from '@/lib/useSeo';

export function WithdrawPage() {
  useSeo({
    title: 'উইথড্র — WORKER GIG BD',
    description: 'WORKER GIG BD থেকে আয়কৃত টাকা উইথড্র করুন। ১ ডলার = ১০০ টাকা।',
    path: '/dashboard/withdraw',
    noindex: true,
  });
  const { profile, refreshProfile } = useAuth();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('bkash');
  const [accountNumber, setAccountNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [history, setHistory] = useState<WithdrawalRequest[]>([]);
  const [settings, setSettings] = useState<AdminSetting[]>([]);
  const [pageLoading, setPageLoading] = useState(true);

  const paymentMethods = [
    { id: 'bkash', name: 'bKash', color: 'bg-pink-500' },
    { id: 'nagad', name: 'Nagad', color: 'bg-orange-500' },
    { id: 'rocket', name: 'Rocket', color: 'bg-purple-500' },
  ];

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.from('admin_settings').select('*');
        setSettings((data as AdminSetting[]) ?? []);
      } catch { /* ignore */ }
      if (profile) {
        try {
          const { data } = await supabase.from('withdrawal_requests')
            .select('*').eq('user_id', profile.id)
            .order('created_at', { ascending: false }).limit(10);
          setHistory((data as WithdrawalRequest[]) ?? []);
        } catch { /* ignore */ }
      }
      setPageLoading(false);
    })();
  }, [profile]);

  const withdrawEnabled = settings.find(s => s.key === 'withdrawal_enabled')?.value === 'true';
  const minWithdraw = parseFloat(settings.find(s => s.key === 'min_withdrawal')?.value || '1');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setError('');
    setSuccess(false);
    setLoading(true);

    if (profile.status !== 'active') {
      setError('Your account is not active. Withdrawals are disabled.');
      setLoading(false);
      return;
    }

    const amt = parseFloat(amount);
    if (amt < minWithdraw) {
      setError(`Minimum withdrawal is ৳${minWithdraw}.`);
      setLoading(false);
      return;
    }
    if (amt > profile.earning_balance) {
      setError(`Insufficient earning balance. You have ৳${profile.earning_balance.toFixed(3)}.`);
      setLoading(false);
      return;
    }
    if (!accountNumber.trim()) {
      setError('Please enter your account number.');
      setLoading(false);
      return;
    }

    // Atomic RPC: deducts earning_balance inside a DB transaction so two
    // concurrent requests can never drain more than the available balance.
    // The amount is held until admin approves (then counted as spent) or
    // rejects (then refunded automatically).
    const { error: rpcError } = await supabase.rpc('request_withdrawal', {
      p_uid: profile.id,
      p_amount: amt,
      p_method: method,
      p_account: accountNumber.trim(),
    });

    if (rpcError) {
      setError(rpcError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setAmount(''); setAccountNumber('');
    const { data } = await supabase.from('withdrawal_requests')
      .select('*').eq('user_id', profile.id)
      .order('created_at', { ascending: false }).limit(10);
    setHistory((data as WithdrawalRequest[]) ?? []);
    await refreshProfile();
    setLoading(false);
  };

  if (pageLoading) return <LoadingSpinner size={40} className="py-20" />;

  if (!withdrawEnabled && settings.length > 0) {
    return (
      <div className="space-y-6">
        <h1 className="font-heading text-2xl font-bold text-gray-900">Withdraw</h1>
        <Alert variant="warning" title="Withdrawals Disabled">
          Withdrawal requests are currently disabled by the administrator.
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-gray-900">Withdraw Earnings</h1>
        <p className="mt-1 text-sm text-gray-600">Withdraw your earning balance to mobile banking</p>
      </div>

      {success && (
        <Alert variant="success" title="Withdrawal Request Submitted!">
          ৳ {parseFloat(amount || '0') || '0'} has been held from your balance. Your request is pending admin approval. Funds will be sent within 24-48 hours, or refunded if rejected.
        </Alert>
      )}
      {error && <Alert variant="error">{error}</Alert>}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="mb-4 rounded-lg bg-gradient-to-br from-primary-600 to-primary-800 p-4 text-white">
            <div className="text-xs text-primary-100">Available Earning Balance</div>
            <div className="mt-1 text-3xl font-bold">৳ {profile?.earning_balance?.toFixed(3) ?? '0.000'}</div>
            <div className="mt-2 text-xs text-primary-200">Minimum withdrawal: ৳ {minWithdraw}</div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-5">
            {paymentMethods.map((pm) => (
              <button
                key={pm.id}
                onClick={() => setMethod(pm.id)}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all ${
                  method === pm.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${pm.color} text-white`}>
                  <Smartphone className="h-5 w-5" />
                </div>
                <span className="text-xs font-semibold text-gray-700">{pm.name}</span>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Amount (৳)"
              type="number"
              step="0.001"
              min={minWithdraw}
              placeholder={`Min ৳${minWithdraw}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              icon={<ArrowUpFromLine className="h-4 w-4" />}
            />
            <p className="text-xs text-gray-500">১ ডলার = ১০০ টাকা</p>
            <Input
              label="Your Account Number"
              placeholder="01XXXXXXXXX"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              required
            />
            <Button type="submit" fullWidth size="lg" loading={loading}>
              <Send className="h-5 w-5" /> Submit Withdrawal Request
            </Button>
          </form>
        </Card>

        <Card>
          <div className="border-b border-gray-100 px-5 py-4">
            <h3 className="font-heading font-bold text-gray-900">Recent Withdrawals</h3>
          </div>
          {history.length === 0 ? (
            <EmptyState
              icon={<ArrowUpFromLine className="h-8 w-8" />}
              title="No withdrawals yet"
              description="Your withdrawal history will appear here."
            />
          ) : (
            <div className="divide-y divide-gray-50">
              {history.map((wd) => (
                <div key={wd.id} className="flex items-center justify-between p-4">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">৳ {wd.amount.toFixed(3)}</div>
                    <div className="text-xs text-gray-500">
                      {wd.method} • {new Date(wd.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <Badge
                    variant={wd.status === 'approved' ? 'success' : wd.status === 'rejected' ? 'error' : 'warning'}
                    dot
                  >
                    {wd.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
