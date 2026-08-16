import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Edit, Megaphone, Link2, ImageIcon, ToggleLeft, ToggleRight, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import { LoadingSpinner, EmptyState } from '@/components/ui/EmptyState';
import { AdBanner } from '@/types';
import { useSeo } from '@/lib/useSeo';

export function AdminAdsPage() {
  useSeo({ title: 'Ad Link — Admin', noindex: true });
  const [banners, setBanners] = useState<AdBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<AdBanner | null>(null);
  const [form, setForm] = useState({ title: '', link_url: '', image_url: '', position: 'job_list_top', display_order: '0' });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('ad_banners').select('*').order('display_order', { ascending: true });
      if (error) throw error;
      setBanners((data as AdBanner[]) ?? []);
    } catch (err) {
      console.error(err);
      setBanners([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setEditing(null);
    setForm({ title: '', link_url: '', image_url: '', position: 'job_list_top', display_order: '0' });
    setError('');
    setShowModal(true);
  };

  const openEdit = (b: AdBanner) => {
    setEditing(b);
    setForm({ title: b.title, link_url: b.link_url, image_url: b.image_url, position: b.position, display_order: String(b.display_order) });
    setError('');
    setShowModal(true);
  };

  const handleUpload = async (file: File) => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const fileName = `ads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from('job-assets').upload(fileName, file, { upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('job-assets').getPublicUrl(fileName);
      setForm((f) => ({ ...f, image_url: pub.publicUrl }));
    } catch (err: any) {
      setError(err.message || 'Upload failed.');
    }
    setUploading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    if (!form.title.trim()) { setError('Title is required.'); setSaving(false); return; }
    if (!form.image_url.trim()) { setError('Please upload a screenshot image.'); setSaving(false); return; }

    const payload = {
      title: form.title.trim(),
      link_url: form.link_url.trim(),
      image_url: form.image_url.trim(),
      position: form.position,
      display_order: parseInt(form.display_order) || 0,
    };

    try {
      if (editing) {
        const { error } = await supabase.from('ad_banners').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('ad_banners').insert({ ...payload, is_active: true });
        if (error) throw error;
      }
      setShowModal(false);
      load();
    } catch (err: any) {
      setError(err.message || 'Failed to save ad.');
    }
    setSaving(false);
  };

  const toggleActive = async (b: AdBanner) => {
    try {
      const { error } = await supabase.from('ad_banners').update({ is_active: !b.is_active }).eq('id', b.id);
      if (error) throw error;
      load();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (b: AdBanner) => {
    if (!confirm(`Delete "${b.title}"?`)) return;
    try {
      const { error } = await supabase.from('ad_banners').delete().eq('id', b.id);
      if (error) throw error;
      load();
    } catch (err) { console.error(err); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 font-heading text-2xl font-bold text-gray-900">
            <Megaphone className="h-6 w-6" /> Ad Link
          </h1>
          <p className="mt-1 text-sm text-gray-500">Manage advertisement banners shown on the job list page.</p>
        </div>
        <Button onClick={openNew}><Plus className="mr-1.5 h-4 w-4" /> Add New Ad</Button>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {loading ? (
        <LoadingSpinner size={36} className="py-16" />
      ) : banners.length === 0 ? (
        <Card className="py-16">
          <EmptyState
            icon={<Megaphone className="h-8 w-8" />}
            title="No ads yet"
            description="Add an ad banner to display it above the job list."
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {banners.map((b) => (
            <Card key={b.id} className="overflow-hidden">
              <div className="flex items-start justify-between p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-bold text-gray-900">{b.title}</h3>
                    <Badge variant={b.is_active ? 'success' : 'default'}>
                      {b.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                    <Link2 className="h-3 w-3" />
                    <span className="truncate">{b.link_url}</span>
                  </div>
                  <div className="mt-1 text-xs text-gray-400">Position: {b.position} · Order: {b.display_order}</div>
                </div>
              </div>

              {b.image_url && (
                <div className="px-4 pb-3">
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                    <ImageIcon className="h-3 w-3" /> Preview
                  </div>
                  <img src={b.image_url} alt={b.title} className="w-full rounded-lg border border-gray-200 max-h-32 object-cover" />
                </div>
              )}

              <div className="flex items-center gap-2 border-t border-gray-100 px-4 py-3">
                <button
                  onClick={() => toggleActive(b)}
                  className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  {b.is_active
                    ? <ToggleRight className="h-5 w-5 text-green-600" />
                    : <ToggleLeft className="h-5 w-5 text-gray-400" />}
                  {b.is_active ? 'Active' : 'Inactive'}
                </button>
                <a href={b.link_url} target="_blank" rel="noopener noreferrer" className="ml-auto text-gray-400 hover:text-gray-600">
                  <ExternalLink className="h-4 w-4" />
                </a>
                <button onClick={() => openEdit(b)} className="text-gray-400 hover:text-blue-600">
                  <Edit className="h-4 w-4" />
                </button>
                <button onClick={() => handleDelete(b)} className="text-gray-400 hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Ad' : 'Add New Ad'}>
        <div className="space-y-4">
          <Input
            label="Ad Title"
            placeholder="e.g. Special Offer"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
          <Input
            label="Ad Link URL (optional)"
            placeholder="https://example.com"
            value={form.link_url}
            onChange={(e) => setForm({ ...form, link_url: e.target.value })}
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Screenshot Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
              className="block w-full text-sm text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-primary-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-700 hover:file:bg-primary-100"
            />
            {uploading && <p className="mt-1 text-xs text-gray-500">Uploading...</p>}
            {form.image_url && (
              <div className="mt-2">
                <img src={form.image_url} alt="Preview" className="max-h-40 rounded-lg border border-gray-200 object-cover" />
                <button onClick={() => setForm({ ...form, image_url: '' })} className="mt-1 text-xs text-red-600 hover:underline">Remove image</button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Position</label>
              <select
                value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="job_list_top">Job List Top</option>
                <option value="sidebar">Sidebar</option>
                <option value="top">Top Banner</option>
              </select>
            </div>
            <Input
              label="Display Order"
              type="number"
              value={form.display_order}
              onChange={(e) => setForm({ ...form, display_order: e.target.value })}
            />
          </div>
          {error && <Alert variant="error">{error}</Alert>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
