import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Edit, FolderTree, GripVertical } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { LoadingSpinner, EmptyState } from '@/components/ui/EmptyState';
import { Category } from '@/types';

export function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: '', icon: '', subcategories: '', display_order: '0' });
  const [saving, setSaving] = useState(false);

  const loadCategories = useCallback(async () => {
    const { data } = await supabase.from('categories').select('*').order('display_order');
    setCategories((data as Category[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadCategories(); }, [loadCategories]);

  const handleSave = async () => {
    setSaving(true);
    const subs = form.subcategories.split(',').map(s => s.trim()).filter(Boolean);

    if (editing) {
      await supabase.from('categories').update({
        name: form.name,
        icon: form.icon,
        subcategories: subs,
        display_order: parseInt(form.display_order) || 0,
      }).eq('id', editing.id);
    } else {
      await supabase.from('categories').insert({
        name: form.name,
        icon: form.icon,
        subcategories: subs,
        display_order: parseInt(form.display_order) || 0,
        is_active: true,
      });
    }

    setSaving(false);
    setShowNew(false);
    setEditing(null);
    setForm({ name: '', icon: '', subcategories: '', display_order: '0' });
    loadCategories();
  };

  const toggleActive = async (cat: Category) => {
    await supabase.from('categories').update({ is_active: !cat.is_active }).eq('id', cat.id);
    loadCategories();
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('Delete this category?')) return;
    await supabase.from('categories').delete().eq('id', id);
    loadCategories();
  };

  const startEdit = (cat: Category) => {
    setEditing(cat);
    setForm({
      name: cat.name,
      icon: cat.icon,
      subcategories: cat.subcategories.join(', '),
      display_order: String(cat.display_order),
    });
    setShowNew(true);
  };

  if (loading) return <LoadingSpinner size={40} className="py-20" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-gray-900">Categories</h1>
          <p className="mt-1 text-sm text-gray-600">Manage task categories and subcategories</p>
        </div>
        <Button onClick={() => { setEditing(null); setForm({ name: '', icon: '', subcategories: '', display_order: '0' }); setShowNew(true); }}>
          <Plus className="h-4 w-4" /> Add Category
        </Button>
      </div>

      {categories.length === 0 ? (
        <Card><EmptyState icon={<FolderTree className="h-8 w-8" />} title="No categories yet" /></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <Card key={cat.id} className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50">
                    <GripVertical className="h-5 w-5 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{cat.name}</h3>
                    <div className="text-xs text-gray-500">Order: {cat.display_order}</div>
                  </div>
                </div>
                <Badge variant={cat.is_active ? 'success' : 'gray'} dot>{cat.is_active ? 'Active' : 'Inactive'}</Badge>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {cat.subcategories.map((sub) => (
                  <Badge key={sub} variant="gray">{sub}</Badge>
                ))}
              </div>

              <div className="mt-4 flex gap-2 border-t border-gray-100 pt-3">
                <Button size="sm" variant="secondary" onClick={() => startEdit(cat)}>
                  <Edit className="h-3.5 w-3.5" /> Edit
                </Button>
                <Button size="sm" variant="secondary" onClick={() => toggleActive(cat)}>
                  {cat.is_active ? 'Disable' : 'Enable'}
                </Button>
                <Button size="sm" variant="danger" onClick={() => deleteCategory(cat.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showNew} onClose={() => { setShowNew(false); setEditing(null); }} title={editing ? 'Edit Category' : 'Add New Category'}>
        <div className="space-y-4">
          <Input label="Category Name" placeholder="e.g., Facebook" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Icon Name" placeholder="e.g., facebook" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} hint="Lucide icon name (lowercase)" />
          <div>
            <Textarea label="Subcategories" placeholder="Comma-separated: Picture Like, Page Like, Follower" value={form.subcategories} onChange={(e) => setForm({ ...form, subcategories: e.target.value })} rows={3} />
            <p className="mt-1 text-xs text-gray-500">Separate each subcategory with a comma</p>
          </div>
          <Input label="Display Order" type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: e.target.value })} />
          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={() => { setShowNew(false); setEditing(null); }}>Cancel</Button>
            <Button fullWidth loading={saving} onClick={handleSave}>{editing ? 'Save Changes' : 'Create Category'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
