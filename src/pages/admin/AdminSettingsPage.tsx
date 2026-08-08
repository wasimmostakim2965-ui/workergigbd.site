import { useEffect, useState, useCallback } from 'react';
import { Settings as SettingsIcon, Save, ToggleLeft, ToggleRight, DollarSign, Globe, Megaphone, Zap, Smartphone } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/EmptyState';
import { AdminSetting } from '@/types';

export function AdminSettingsPage() {
  const [settings, setSettings] = useState<AdminSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedKey, setSavedKey] = useState('');

  const loadSettings = useCallback(async () => {
    const { data } = await supabase.from('admin_settings').select('*').order('category').order('key');
    setSettings((data as AdminSetting[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const updateSetting = async (setting: AdminSetting, newValue: string) => {
    setSaving(true);
    await supabase.from('admin_settings').update({
      value: newValue,
      updated_at: new Date().toISOString(),
    }).eq('id', setting.id);
    setSavedKey(setting.key);
    setTimeout(() => setSavedKey(''), 2000);
    loadSettings();
    setSaving(false);
  };

  const toggleBoolean = async (setting: AdminSetting) => {
    const newValue = setting.value === 'true' ? 'false' : 'true';
    await updateSetting(setting, newValue);
  };

  if (loading) return <LoadingSpinner size={40} className="py-20" />;

  const featureSettings = settings.filter(s => s.category === 'features');
  const limitSettings = settings.filter(s => s.category === 'limits');
  const generalSettings = settings.filter(s => s.category === 'general');
  const bannerSettings = settings.filter(s => s.category === 'banner');
  const marqueeSettings = settings.filter(s => s.category === 'marquee');
  const paymentSettings = settings.filter(s => s.category === 'payment');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-gray-900">Platform Settings</h1>
        <p className="mt-1 text-sm text-gray-600">Control features, limits, and platform configuration</p>
      </div>

      {/* Dashboard Banner */}
      <Card>
        <div className="border-b border-gray-100 px-5 py-4">
          <h3 className="font-heading font-bold text-gray-900 flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary-600" /> Dashboard Banner
          </h3>
          <p className="mt-1 text-xs text-gray-500">Promotional banner shown on user dashboard above job list</p>
        </div>
        <div className="divide-y divide-gray-50">
          {bannerSettings.map((setting) => (
            <LimitRow key={setting.id} setting={setting} onSave={updateSetting} savedKey={savedKey} />
          ))}
        </div>
      </Card>

      {/* Marquee Message */}
      <Card>
        <div className="border-b border-gray-100 px-5 py-4">
          <h3 className="font-heading font-bold text-gray-900 flex items-center gap-2">
            <Zap className="h-5 w-5 text-accent-600" /> Scrolling Marquee Message
          </h3>
          <p className="mt-1 text-xs text-gray-500">Admin announcement shown as scrolling text on dashboard</p>
        </div>
        <div className="divide-y divide-gray-50">
          {marqueeSettings.map((setting) => (
            <LimitRow key={setting.id} setting={setting} onSave={updateSetting} savedKey={savedKey} />
          ))}
        </div>
      </Card>

      {/* Feature toggles */}
      <Card>
        <div className="border-b border-gray-100 px-5 py-4">
          <h3 className="font-heading font-bold text-gray-900 flex items-center gap-2">
            <SettingsIcon className="h-5 w-5 text-primary-600" /> Feature Toggles
          </h3>
          <p className="mt-1 text-xs text-gray-500">Enable or disable platform features</p>
        </div>
        <div className="divide-y divide-gray-50">
          {featureSettings.map((setting) => (
            <div key={setting.id} className="flex items-center justify-between p-4">
              <div className="flex-1">
                <div className="text-sm font-semibold text-gray-900">{setting.description}</div>
                <div className="text-xs text-gray-500 font-mono">{setting.key}</div>
              </div>
              <div className="flex items-center gap-3">
                {savedKey === setting.key && <Badge variant="success" size="sm">Saved!</Badge>}
                <button
                  onClick={() => toggleBoolean(setting)}
                  disabled={saving}
                  className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                    setting.value === 'true'
                      ? 'bg-success-50 text-success-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {setting.value === 'true' ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                  {setting.value === 'true' ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Limits */}
      <Card>
        <div className="border-b border-gray-100 px-5 py-4">
          <h3 className="font-heading font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-accent-600" /> Limits & Pricing
          </h3>
          <p className="mt-1 text-xs text-gray-500">Configure minimum amounts and pricing</p>
        </div>
        <div className="divide-y divide-gray-50">
          {limitSettings.map((setting) => (
            <LimitRow key={setting.id} setting={setting} onSave={updateSetting} savedKey={savedKey} />
          ))}
        </div>
      </Card>

      {/* General settings */}
      <Card>
        <div className="border-b border-gray-100 px-5 py-4">
          <h3 className="font-heading font-bold text-gray-900 flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary-600" /> General Configuration
          </h3>
          <p className="mt-1 text-xs text-gray-500">Platform-wide settings</p>
        </div>
        <div className="divide-y divide-gray-50">
          {generalSettings.map((setting) => (
            <LimitRow key={setting.id} setting={setting} onSave={updateSetting} savedKey={savedKey} />
          ))}
        </div>
      </Card>

      {/* Payment Settings */}
      <Card>
        <div className="border-b border-gray-100 px-5 py-4">
          <h3 className="font-heading font-bold text-gray-900 flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-pink-600" /> Payment Numbers
          </h3>
          <p className="mt-1 text-xs text-gray-500">Payment numbers where users will send money (bKash, Nagad, Rocket)</p>
        </div>
        <div className="divide-y divide-gray-50">
          {paymentSettings.map((setting) => (
            <LimitRow key={setting.id} setting={setting} onSave={updateSetting} savedKey={savedKey} />
          ))}
        </div>
      </Card>
    </div>
  );
}

function LimitRow({ setting, onSave, savedKey }: { setting: AdminSetting; onSave: (s: AdminSetting, v: string) => void; savedKey: string }) {
  const [value, setValue] = useState(setting.value);

  return (
    <div className="flex items-center justify-between gap-4 p-4">
      <div className="flex-1">
        <div className="text-sm font-semibold text-gray-900">{setting.description}</div>
        <div className="text-xs text-gray-500 font-mono">{setting.key}</div>
      </div>
      <div className="flex items-center gap-2">
        {savedKey === setting.key && <Badge variant="success" size="sm">Saved!</Badge>}
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-40"
        />
        <Button size="sm" variant="secondary" onClick={() => onSave(setting, value)}>
          <Save className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
