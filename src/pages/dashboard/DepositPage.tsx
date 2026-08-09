import { useEffect, useState } from 'react';
import { Wallet, Smartphone, Send, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { EmptyState, LoadingSpinner } from '@/components/ui/EmptyState';
import { DepositRequest, AdminSetting } from '@/types';

export function DepositPage() {
  const { profile, refreshProfile } = useAuth();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('bkash');
  const [senderNumber, setSenderNumber] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [history, setHistory] = useState<DepositRequest[]>([]);
  const [settings, setSettings] = useState<AdminSetting[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const bkashNumber = settings.find(s => s.key === 'payment_bkash')?.value || '';
  const nagadNumber = settings.find(s => s.key === 'payment_nagad')?.value || '';
  const rocketNumber = settings.find(s => s.key === 'payment_rocket')?.value || '';

  const paymentMethods = [
    { id: 'bkash', name: 'bKash', number: bkashNumber, color: 'bg-pink-500' },
    { id: 'nagad', name: 'Nagad', number: nagadNumber, color: 'bg-orange-500' },
    { id: 'rocket', name: 'Rocket', number: rocketNumber, color: 'bg-purple-500' },
  ];

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.from('admin_settings').select('*');
        setSettings((data as AdminSetting[]) ?? []);
      } catch { /* ignore */ }
      setSettingsLoaded(true);
      if (profile) {
        try {
          const { data } = await supabase.from('deposit_requests')
            .select('*').eq('user_id', profile.id)
            .order('created_at', { ascending: false }).limit(10);
          setHistory((data as DepositRequest[]) ?? []);
        } catch { /* ignore */ }
      }
      setPageLoading(false);
    })();
  }, [profile]);

  const depositEnabled = settings.find(s => s.key === 'deposit_enabled')?.value === 'true';
  const minDeposit = parseFloat(settings.find(s => s.key === 'min_deposit')?.value || '100');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setError('');
    setSuccess(false);
    setLoading(true);

    const amt = parseFloat(amount);
    if (amt < minDeposit) {
      setError(`Minimum deposit amount is ৳ ${minDeposit}.`);
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from('deposit_requests').insert({
      user_id: profile.id,
      amount: amt,
      method,
      sender_number: senderNumber,
      transaction_id: transactionId,
      status: 'pending',
    });

    if (insertError) {
      setError(insertError.message);
    } else {
      setSuccess(true);
      setAmount(''); setSenderNumber(''); setTransactionId('');
      const { data } = await supabase.from('deposit_requests')
        .select('*').eq('user_id', profile.id)
        .order('created_at', { ascending: false }).limit(10);
      setHistory((data as DepositRequest[]) ?? []);
      await refreshProfile();
    }
    setLoading(false);
  };

  if (pageLoading) return <LoadingSpinner size={40} className="py-20" />;

  if (!depositEnabled && settings.length > 0) {
    return (
      <div className="space-y-6">
        <h1 className="font-heading text-2xl font-bold text-gray-900">Deposit</h1>
        <Alert variant="warning" title="Deposits Disabled">
          Deposit requests are currently disabled by the administrator.
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-gray-900">Deposit Money</h1>
        <p className="mt-1 text-sm text-gray-600">Add funds to your account via mobile banking</p>
      </div>

      {success && (
        <Alert variant="success" title="Deposit Request Submitted!">
          Your deposit request has been submitted. It will be reviewed and credited to your account within 24 hours.
        </Alert>
      )}
      {error && <Alert variant="error">{error}</Alert>}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Deposit form */}
        <Card className="p-6">
          <h3 className="font-heading font-bold text-gray-900 mb-4">Send Money</h3>

          {/* Payment methods */}
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

          <div className="rounded-lg bg-gray-50 p-4 mb-5">
            <div className="text-xs text-gray-500">Send money to:</div>
            <div className="mt-1 text-lg font-bold text-gray-900">
              {paymentMethods.find(pm => pm.id === method)?.name}: {paymentMethods.find(pm => pm.id === method)?.number || 'Contact support'}
            </div>
            <div className="mt-1 text-xs text-gray-500">
              After sending, fill out the form below with your transaction details.
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Amount (৳)"
              type="number"
              step="0.001"
              min={minDeposit}
              placeholder={`Min ৳ ${minDeposit}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              icon={<Wallet className="h-4 w-4" />}
            />
            <Input
              label="Your Sender Number"
              placeholder="01XXXXXXXXX"
              value={senderNumber}
              onChange={(e) => setSenderNumber(e.target.value)}
              required
            />
            <Input
              label="Transaction ID"
              placeholder="Enter transaction ID"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              required
            />
            <Button type="submit" fullWidth size="lg" loading={loading}>
              <Send className="h-5 w-5" /> Submit Deposit Request
            </Button>
          </form>
        </Card>

        {/* Deposit history */}
        <Card>
          <div className="border-b border-gray-100 px-5 py-4">
            <h3 className="font-heading font-bold text-gray-900">Recent Deposits</h3>
          </div>
          {history.length === 0 ? (
            <EmptyState
              icon={<Wallet className="h-8 w-8" />}
              title="No deposits yet"
              description="Your deposit history will appear here."
            />
          ) : (
            <div className="divide-y divide-gray-50">
              {history.map((dep) => (
                <div key={dep.id} className="flex items-center justify-between p-4">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">৳ {dep.amount.toFixed(3)}</div>
                    <div className="text-xs text-gray-500">
                      {dep.method} • {new Date(dep.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <Badge
                    variant={dep.status === 'approved' ? 'success' : dep.status === 'rejected' ? 'error' : 'warning'}
                    dot
                  >
                    {dep.status}
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
