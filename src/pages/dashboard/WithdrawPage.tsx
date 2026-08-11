import { useEffect, useState } from 'react';
import { ArrowUpFromLine, Send, Smartphone, Mail, ShieldCheck, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { EmptyState, LoadingSpinner } from '@/components/ui/EmptyState';
import { WithdrawalRequest, AdminSetting } from '@/types';

export function WithdrawPage() {
  const { profile, user, refreshProfile } = useAuth();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('bkash');
  const [accountNumber, setAccountNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [history, setHistory] = useState<WithdrawalRequest[]>([]);
  const [settings, setSettings] = useState<AdminSetting[]>([]);
  const [pageLoading, setPageLoading] = useState(true);

  // Email verification state
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);

  const paymentMethods = [
    { id: 'bkash', name: 'bKash', color: 'bg-pink-500' },
    { id: 'nagad', name: 'Nagad', color: 'bg-orange-500' },
    { id: 'rocket', name: 'Rocket', color: 'bg-purple-500' },
  ];

  const emailVerified = profile?.email_verified ?? false;

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
  const minWithdraw = parseFloat(settings.find(s => s.key === 'min_withdrawal')?.value || '500');

  const sendOtp = async () => {
    if (!profile || !user?.email) return;
    setOtpSending(true);
    setOtpError('');

    // Send a real one-time code to the user's email via Supabase Auth.
    // shouldCreateUser:false ensures it targets the existing account instead of creating a new one.
    const { error: emailError } = await supabase.auth.signInWithOtp({
      email: user.email,
      options: { shouldCreateUser: false },
    });

    if (emailError) {
      setOtpError(emailError.message || 'Failed to send verification code. Please try again.');
      setOtpSending(false);
      return;
    }

    setOtpSent(true);
    setOtpSending(false);
  };

  const verifyOtp = async () => {
    if (!profile || !user?.email || !otpCode) return;
    setOtpVerifying(true);
    setOtpError('');

    // Verify the code Supabase actually emailed to the user.
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email: user.email,
      token: otpCode,
      type: 'email',
    });

    if (verifyError || !data) {
      setOtpError(verifyError?.message || 'Invalid verification code. Please check and try again.');
      setOtpVerifying(false);
      return;
    }

    // Mark the profile as email-verified so withdrawals are unlocked.
    await supabase.from('profiles').update({
      email_verified: true,
      updated_at: new Date().toISOString(),
    }).eq('id', profile.id);

    setOtpVerified(true);
    setOtpVerifying(false);
    await refreshProfile();
  };

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
      setError(`Minimum withdrawal amount is ৳ ${minWithdraw}.`);
      setLoading(false);
      return;
    }
    if (amt > profile.earning_balance) {
      setError(`Insufficient earning balance. You have ৳ ${profile.earning_balance.toFixed(3)}.`);
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

  // Email verification gate
  if (!emailVerified && !otpVerified) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-gray-900">Withdraw Earnings</h1>
          <p className="mt-1 text-sm text-gray-600">Withdraw your earning balance to mobile banking</p>
        </div>

        <Card className="p-6">
          <div className="flex flex-col items-center text-center py-6">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-warning-50">
              <ShieldCheck className="h-8 w-8 text-warning-600" />
            </div>
            <h2 className="font-heading text-xl font-bold text-gray-900">Verify Your Email</h2>
            <p className="mt-2 max-w-md text-sm text-gray-600">
              You need to verify your email address before you can withdraw your earnings.
              This is a one-time verification. Click the button below to receive a verification code.
            </p>

            {otpError && (
              <div className="mt-4 w-full max-w-md">
                <Alert variant="error">{otpError}</Alert>
              </div>
            )}

            {!otpSent ? (
              <Button
                className="mt-5"
                onClick={sendOtp}
                loading={otpSending}
                size="lg"
              >
                <Mail className="h-5 w-5" /> Send Verification Code
              </Button>
            ) : (
              <div className="mt-5 w-full max-w-sm space-y-3">
                <Input
                  label="Enter 6-digit verification code"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="000000"
                  maxLength={6}
                  className="text-center text-lg tracking-widest"
                />
                <Button
                  fullWidth
                  onClick={verifyOtp}
                  loading={otpVerifying}
                  size="lg"
                >
                  <ShieldCheck className="h-5 w-5" /> Verify Email
                </Button>
                <button
                  onClick={sendOtp}
                  disabled={otpSending}
                  className="mx-auto flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Resend code
                </button>
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-gray-900">Withdraw Earnings</h1>
        <p className="mt-1 text-sm text-gray-600">Withdraw your earning balance to mobile banking</p>
      </div>

      {otpVerified && (
        <Alert variant="success" title="Email Verified!">
          Your email has been verified successfully. You can now withdraw your earnings.
        </Alert>
      )}

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
              placeholder={`Min ৳ ${minWithdraw}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              icon={<ArrowUpFromLine className="h-4 w-4" />}
            />
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
