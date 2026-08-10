import { useState } from 'react';
import { User, Mail, Phone, Save, Shield, Camera, Crown, Calendar, TrendingUp, Briefcase, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';

export function ProfilePage() {
  const { profile, user, refreshProfile } = useAuth();
  const [username, setUsername] = useState(profile?.username ?? '');
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState('');

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setAvatarUploading(true);
    setAvatarError('');
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${profile.id}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage.from('avatars')
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
      const { error: updErr } = await supabase.from('profiles')
        .update({ avatar_url: pub.publicUrl, updated_at: new Date().toISOString() })
        .eq('id', profile.id);
      if (updErr) throw updErr;
      await refreshProfile();
    } catch (err: any) {
      setAvatarError(err?.message || 'Avatar upload failed');
    } finally {
      setAvatarUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setLoading(true);
    setSuccess(false);

    const { error } = await supabase.from('profiles').update({
      username,
      full_name: fullName,
      phone,
      updated_at: new Date().toISOString(),
    }).eq('id', profile.id);

    if (error) {
      console.error('Profile update error:', error);
    } else {
      setSuccess(true);
      await refreshProfile();
    }
    setLoading(false);
  };

  const stats = [
    { label: 'Total Earned', value: `৳ ${profile?.total_earned?.toFixed(2) ?? '0.00'}`, icon: TrendingUp, color: 'text-success-600' },
    { label: 'Total Deposited', value: `৳ ${profile?.total_deposit?.toFixed(2) ?? '0.00'}`, icon: Calendar, color: 'text-primary-600' },
    { label: 'Tasks Completed', value: profile?.tasks_completed ?? 0, icon: Briefcase, color: 'text-accent-600' },
    { label: 'Jobs Posted', value: profile?.jobs_posted ?? 0, icon: Briefcase, color: 'text-primary-600' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="mt-1 text-sm text-gray-600">Manage your account information</p>
      </div>

      {success && <Alert variant="success" title="Profile updated successfully!">Your changes have been saved.</Alert>}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile card */}
        <Card className="p-6 text-center">
          <div className="relative mx-auto mb-4 h-24 w-24">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={profile?.username ?? 'avatar'}
                   className="h-24 w-24 rounded-full object-cover border border-gray-200" />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary-600 to-primary-800 text-4xl font-bold text-white uppercase">
                {profile?.username?.charAt(0) ?? 'U'}
              </div>
            )}
            <label className="absolute bottom-0 right-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white border border-gray-200 shadow-md hover:bg-gray-50">
              <Camera className={`h-4 w-4 text-gray-600 ${avatarUploading ? 'animate-pulse' : ''}`} />
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} disabled={avatarUploading} />
            </label>
          </div>
          {avatarError && <p className="text-xs text-error-600">{avatarError}</p>}
          <h3 className="font-heading text-lg font-bold text-gray-900">{profile?.username ?? 'User'}</h3>
          <p className="text-sm text-gray-500">{user?.email ?? '—'}</p>
          <p className="text-xs text-gray-400 mt-0.5">ID: {profile?.id?.slice(0, 8) ?? '—'}</p>

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {profile?.is_verified && <Badge variant="success" dot>Verified</Badge>}
            {profile?.email_verified && <Badge variant="primary" dot>Email Verified</Badge>}
            {profile?.is_premium && <Badge variant="accent" dot><Crown className="h-3 w-3" /> Premium</Badge>}
            <Badge variant={profile?.status === 'active' ? 'success' : 'error'} dot>
              {profile?.status ?? 'active'}
            </Badge>
          </div>

          {/* Stats grid */}
          <div className="mt-6 grid grid-cols-2 gap-3 border-t border-gray-100 pt-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-left">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <stat.icon className={`h-3.5 w-3.5 ${stat.color}`} />
                  {stat.label}
                </div>
                <div className="mt-0.5 text-sm font-bold text-gray-900">{stat.value}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 border-t border-gray-100 pt-4 text-left">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Member Since</span>
              <span className="font-semibold text-gray-900">
                {profile ? new Date(profile.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
              </span>
            </div>
            <div className="mt-2 flex justify-between text-sm">
              <span className="text-gray-500">Referral Code</span>
              <span className="font-mono font-semibold text-primary-600">{profile?.referral_code ?? '—'}</span>
            </div>
            <div className="mt-2 flex justify-between text-sm">
              <span className="text-gray-500">Referred By</span>
              <span className="font-semibold text-gray-900">{profile?.referred_by ?? 'None'}</span>
            </div>
          </div>
        </Card>

        {/* Edit form */}
        <Card className="p-6 lg:col-span-2">
          <h3 className="font-heading font-bold text-gray-900 mb-4">Edit Information</h3>
          <form onSubmit={handleSave} className="space-y-4">
            <Input
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              icon={<User className="h-4 w-4" />}
              required
            />
            <Input
              label="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
            />
            <Input
              label="Phone Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01XXXXXXXXX"
              icon={<Phone className="h-4 w-4" />}
            />
            <Input
              label="Email Address"
              value={user?.email ?? ''}
              disabled
              hint="Email cannot be changed. Verify it from the Withdraw page."
              icon={<Mail className="h-4 w-4" />}
            />
            <Input
              label="Referral Code"
              value={profile?.referral_code ?? ''}
              disabled
              hint="Your unique referral code for Share & Earn"
            />
            <Button type="submit" loading={loading}>
              <Save className="h-4 w-4" /> Save Changes
            </Button>
          </form>

          {/* Verification status */}
          <div className="mt-6 border-t border-gray-100 pt-6">
            <h4 className="font-heading font-bold text-gray-900 mb-3">Verification Status</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className={`flex items-center gap-3 rounded-lg border p-3 ${profile?.email_verified ? 'border-success-200 bg-success-50' : 'border-warning-200 bg-warning-50'}`}>
                {profile?.email_verified ? (
                  <CheckCircle className="h-5 w-5 text-success-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-warning-600" />
                )}
                <div>
                  <div className="text-sm font-semibold text-gray-900">Email Verification</div>
                  <div className={`text-xs ${profile?.email_verified ? 'text-success-600' : 'text-warning-600'}`}>
                    {profile?.email_verified ? 'Verified' : 'Not verified - required for withdrawals'}
                  </div>
                </div>
              </div>
              <div className={`flex items-center gap-3 rounded-lg border p-3 ${profile?.is_verified ? 'border-success-200 bg-success-50' : 'border-gray-200 bg-gray-50'}`}>
                {profile?.is_verified ? (
                  <CheckCircle className="h-5 w-5 text-success-600" />
                ) : (
                  <Shield className="h-5 w-5 text-gray-400" />
                )}
                <div>
                  <div className="text-sm font-semibold text-gray-900">Account Verification</div>
                  <div className={`text-xs ${profile?.is_verified ? 'text-success-600' : 'text-gray-500'}`}>
                    {profile?.is_verified ? 'Verified' : 'Not verified'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
