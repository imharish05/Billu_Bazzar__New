import { useEffect, useState, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, X, Upload } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import AdminLayout from '../components/AdminLayout';
import Switch from '../components/Switch';
import SortableRow from '../components/SortableRow';
import { PaginationTop, PaginationBottom } from '../components/Pagination';
import api from '../services/api';
import toast from 'react-hot-toast';
import { checkPermission } from '../utils/rbac';
import { getImageUrl } from '../utils/imageUrl';

const CategoriesAdminPage = () => {
  const { admin } = useSelector((s) => s.auth);
  const canAddCategory = checkPermission(admin, 'add_category');
  const canEditCategory = checkPermission(admin, 'edit_category');
  const canDeleteCategory = checkPermission(admin, 'delete_category');
  const canShowActions = canEditCategory || canDeleteCategory;

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  
  const [form, setForm] = useState({ name: '', slug: '', isActive: true, showHeader: false });
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const fileInputRef = useRef(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      const query = `/categories?all=true&page=${page}&limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ''}`;
      const res = await api.get(query);
      setCategories(res.data.categories || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search]);

  useEffect(() => { loadCategories(); }, [loadCategories]);

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = categories.findIndex(c => c.id === active.id);
    const newIndex = categories.findIndex(c => c.id === over.id);
    const reordered = arrayMove(categories, oldIndex, newIndex);

    // Optimistic update
    setCategories(reordered);

    // Persist to server
    try {
      await api.patch('/categories/reorder', {
        items: reordered.map((cat, idx) => ({ id: cat.id, sortOrder: idx })),
      });
      toast.success('Order saved!');
    } catch (err) {
      toast.error('Failed to save order');
      loadCategories(); // revert
    }
  };

  const openModal = (cat = null) => {
    setEditing(cat);
    setForm(cat ? {
      name: cat.name,
      slug: cat.slug || '',
      isActive: cat.isActive,
      showHeader: cat.showHeader || false
    } : {
      name: '',
      slug: '',
      isActive: true,
      showHeader: false
    });
    setImagePreview(cat?.image || null);
    setImageFile(null);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setModalOpen(true);
  };

  const handleNameChange = (e) => {
    const val = e.target.value;
    const slugVal = val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    setForm(p => ({ ...p, name: val, slug: slugVal }));
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = (file) => {
    setUploadError(null);
    const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB

    if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
      const msg = 'Invalid image format. Only JPEG, PNG, and WebP are allowed.';
      setUploadError(msg);
      toast.error(msg);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > MAX_SIZE) {
      const msg = `File size exceeds 5MB limit (${(file.size / (1024 * 1024)).toFixed(2)}MB). Please select an image under 5MB.`;
      setUploadError(msg);
      toast.error(msg);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setUploadError(null);

    try {
      const fd = new FormData();
      fd.append('name', form.name.trim());
      fd.append('slug', form.slug.trim());
      fd.append('isActive', String(form.isActive));
      fd.append('showHeader', String(form.showHeader));
      fd.append('parentId', '');

      const file = imageFile || fileInputRef.current?.files?.[0];
      if (file) {
        if (file.size > 5 * 1024 * 1024) {
          const msg = 'Category image size must not exceed 5MB.';
          setUploadError(msg);
          toast.error(msg);
          setSaving(false);
          return;
        }
        fd.append('image', file);
      }

      if (editing) {
        await api.put(`/categories/${editing.id}`, fd);
        toast.success('Category updated successfully.');
      } else {
        await api.post('/categories', fd);
        toast.success('Category created successfully.');
      }

      setModalOpen(false);
      loadCategories();
    } catch (err) {
      setUploadError(err.response?.data?.message || err.message || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const executeDelete = async (id) => {
    try {
      const deleteRes = await api.delete(`/categories/${id}`);
      toast.success(deleteRes.data.message || 'Category deleted successfully.');
      loadCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to delete category');
    }
  };

  const handleDelete = (id) => {
    toast((t) => (
      <div className="flex flex-col items-center text-center gap-2 p-1">
        <p className="text-sm font-semibold text-neutral-800">Confirm Deletion</p>
        <p className="text-xs text-neutral-600">
          Are you sure you want to permanently delete this category? This will delete all products under it and cannot be undone.
        </p>
        <div className="flex justify-center items-center gap-3 mt-2 w-full">
          <button
            onClick={() => { toast.dismiss(t.id); executeDelete(id); }}
            className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold uppercase tracking-wider transition-colors rounded shadow-sm"
          >
            Yes, Delete
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="px-3.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold uppercase tracking-wider transition-colors rounded border border-neutral-200"
          >
            Cancel
          </button>
        </div>
      </div>
    ), { duration: 10000, position: 'top-center', style: { minWidth: '350px' } });
  };

  return (
    <AdminLayout title="Root Categories">
      <div className="flex justify-between items-center mb-6">
        <p className="text-sm text-brand-grey">{categories.length} root categories · drag rows to reorder</p>
        {canAddCategory && (
          <button onClick={() => openModal()} className="btn-primary flex items-center gap-2" id="add-cat-btn">
            <Plus size={16} /> Add Root Category
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <PaginationTop
          search={search}
          onSearchChange={(s) => { setSearch(s); setPage(1); }}
          searchPlaceholder="Search root categories..."
          currentPage={page}
          totalItems={total}
          limit={limit}
          onLimitChange={(l) => { setLimit(l); setPage(1); }}
        />
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-12 w-full rounded-lg" />)}
          </div>
        ) : categories.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-playfair text-xl text-brand-grey">No root categories yet</p>
            <button onClick={() => openModal()} className="btn-primary mt-4" id="add-first-cat">Add First Root Category</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
              modifiers={[restrictToVerticalAxis]}
            >
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-brand-light bg-brand-light/20 text-brand-grey text-xs font-semibold uppercase tracking-wider">
                    <th className="pl-3 pr-1 py-3 w-8"></th>
                    <th className="px-5 py-3 w-16">NO</th>
                    <th className="px-5 py-3 w-24">Image</th>
                    <th className="px-5 py-3">Root Category Name</th>
                    <th className="px-5 py-3 w-32">Status</th>
                    <th className="px-5 py-3 w-32">Header</th>
                    {canShowActions && <th className="px-5 py-3 w-28 text-right">Actions</th>}
                  </tr>
                </thead>
                <SortableContext
                  items={categories.map(c => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <tbody className="divide-y divide-brand-light text-sm">
                    {categories.map((cat, idx) => (
                      <SortableRow key={cat.id} id={cat.id}>
                        <td className="px-5 py-4 font-medium text-brand-grey">{idx + 1}</td>
                        <td className="px-5 py-4">
                          <div className="w-12 h-12 rounded-lg bg-neutral-100 overflow-hidden border border-neutral-200 flex items-center justify-center shrink-0 shadow-xs">
                            {cat.image ? (
                              <img src={getImageUrl(cat.image)} alt={cat.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-brand-grey text-xs font-bold uppercase">{cat.name.substring(0, 2)}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-brand-text">{cat.name}</p>
                          <p className="text-xs text-brand-grey">/{cat.slug}</p>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                            cat.isActive ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-50 text-gray-500 border border-gray-200'
                          }`}>
                            {cat.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                            cat.showHeader ? 'bg-amber-50 text-brand-gold border border-amber-200' : 'bg-gray-50 text-gray-500 border border-gray-200'
                          }`}>
                            {cat.showHeader ? 'Show' : 'Hide'}
                          </span>
                        </td>
                        {canShowActions && (
                          <td className="px-5 py-4 text-right">
                            <div className="flex justify-end gap-1.5">
                              {canEditCategory && (
                                <button onClick={() => openModal(cat)} className="p-2 text-brand-grey hover:text-brand-gold hover:bg-brand-light/30 rounded transition-colors" id={`edit-cat-${cat.id}`} title="Edit">
                                  <Edit2 size={14} />
                                </button>
                              )}
                              {canDeleteCategory && (
                                <button onClick={() => handleDelete(cat.id)} className="p-2 text-brand-grey hover:text-red-500 hover:bg-red-50 rounded transition-colors" id={`del-cat-${cat.id}`} title="Delete">
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </SortableRow>
                    ))}
                  </tbody>
                </SortableContext>
              </table>
            </DndContext>
          </div>
        )}
        <PaginationBottom
          currentPage={page}
          totalPages={totalPages}
          totalItems={total}
          onPageChange={(p) => setPage(p)}
        />
      </div>

      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && !saving && setModalOpen(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} className="bg-white rounded-xl w-full max-w-md shadow-xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-brand-light">
                <h2 className="font-playfair text-lg font-semibold">{editing ? 'Edit Root Category' : 'Add Root Category'}</h2>
                <button onClick={() => !saving && setModalOpen(false)} className="p-1.5 hover:text-brand-gold focus-visible:outline-brand-gold transition-colors"><X size={18} /></button>
              </div>
              <form onSubmit={handleSave} className="p-6 space-y-4">
                {uploadError && (
                  <div className="text-xs text-red-500 bg-red-50 border border-red-200 p-3 rounded">{uploadError}</div>
                )}
                
                <div>
                  <label className="block text-xs font-medium text-brand-grey mb-1.5" htmlFor="cat-name">Root Category Name *</label>
                  <input id="cat-name" type="text" value={form.name} onChange={handleNameChange} required className="w-full border border-brand-light px-3 py-2 text-sm focus:outline-none focus:border-brand-gold transition-colors" placeholder="e.g. Party Wear" />
                </div>

                <div>
                  <label className="block text-xs font-medium text-brand-grey mb-1.5" htmlFor="cat-slug">Slug</label>
                  <input id="cat-slug" type="text" value={form.slug} onChange={e => setForm(p => ({ ...p, slug: e.target.value }))} className="w-full border border-brand-light bg-neutral-50 px-3 py-2 text-sm focus:outline-none focus:border-brand-gold transition-colors" placeholder="party-wear" />
                </div>

                {/* Categories Image upload zone */}
                <div>
                  <label className="block text-xs font-medium text-brand-grey mb-1.5">Root Category Image (Square 1:1 Aspect Ratio)</label>
                  <div
                    className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer ${
                      isDragging ? 'border-brand-gold bg-brand-gold/5' : 'border-brand-light hover:border-brand-gold'
                    }`}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) processFile(file);
                    }}
                  >
                    {imagePreview ? (
                      <div className="relative inline-block">
                        <div className="w-32 h-32 rounded-lg border border-brand-light overflow-hidden bg-neutral-50 shadow-sm mx-auto">
                          <img src={imagePreview} alt="Category Preview" className="w-full h-full object-cover" />
                        </div>
                        <button type="button" onClick={(e) => { e.stopPropagation(); setImagePreview(null); setImageFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="absolute -top-2 -right-2 bg-white p-1 rounded-full hover:bg-neutral-100 border border-brand-light shadow-md transition-colors">
                          <X size={14} className="text-brand-text" />
                        </button>
                      </div>
                    ) : (
                      <div className="py-4">
                        <Upload size={24} className="mx-auto text-brand-grey mb-1.5" />
                        <p className="text-xs text-brand-grey font-medium">Drag & drop image here, or click to upload</p>
                        <p className="text-[10px] text-brand-grey/70 mt-1 font-semibold">JPEG, PNG, WebP — max 5MB</p>
                        <p className="text-[10px] text-brand-grey/50 mt-0.5">Recommended resolution: 300×300 px (1:1 square)</p>
                      </div>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden" onChange={handleFileSelect} />
                </div>

                <div className="flex items-center gap-6 pt-1">
                  <div className="flex items-center gap-2">
                    <Switch checked={form.isActive} onChange={e => setForm(p => ({ ...p, isActive: typeof e === 'boolean' ? e : Boolean(e?.target?.checked) }))} id="cat-active" />
                    <label className="text-xs font-semibold text-brand-text cursor-pointer select-none" htmlFor="cat-active">Active (Visible in store)</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={form.showHeader} onChange={e => setForm(p => ({ ...p, showHeader: typeof e === 'boolean' ? e : Boolean(e?.target?.checked) }))} id="cat-header" />
                    <label className="text-xs font-semibold text-brand-text cursor-pointer select-none" htmlFor="cat-header">Show in header</label>
                  </div>
                </div>

                <div className="flex gap-3 pt-3 border-t border-brand-light">
                  <button type="button" onClick={() => setModalOpen(false)} disabled={saving} className="btn-outline flex-1" id="cat-cancel">Cancel</button>
                  <button type="submit" disabled={saving} className="btn-primary flex-1" id="cat-save">
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
};

export default CategoriesAdminPage;
