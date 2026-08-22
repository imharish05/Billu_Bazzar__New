import { useEffect, useState, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, X, Upload, ChevronRight } from 'lucide-react';
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

const SubSubCategoriesAdminPage = () => {
  const { admin } = useSelector((s) => s.auth);
  const canAddChildCategory = checkPermission(admin, 'add_sub_sub_category');
  const canEditChildCategory = checkPermission(admin, 'edit_sub_sub_category');
  const canDeleteCategory = checkPermission(admin, 'delete_category');
  const canShowActions = canEditChildCategory || canDeleteCategory;
  const [parentCategories, setParentCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [subSubCategories, setSubSubCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const [form, setForm] = useState({ categoryId: '', subCategoryId: '', name: '', slug: '', isActive: true });
  const [filteredSubs, setFilteredSubs] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const catRes = await api.get('/categories?all=true');
      setParentCategories(catRes.data.categories || []);
      const subRes = await api.get('/subcategories?all=true');
      setSubCategories(subRes.data.subCategories || []);
      const query = `/subsubcategories?all=true&page=${page}&limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ''}`;
      const subSubRes = await api.get(query);
      setSubSubCategories(subSubRes.data.subSubCategories || []);
      setTotal(subSubRes.data.total || 0);
      setTotalPages(subSubRes.data.totalPages || 1);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load child categories data.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = subSubCategories.findIndex(s => s.id === active.id);
    const newIndex = subSubCategories.findIndex(s => s.id === over.id);
    const reordered = arrayMove(subSubCategories, oldIndex, newIndex);

    setSubSubCategories(reordered);

    try {
      await api.patch('/subsubcategories/reorder', {
        items: reordered.map((s, idx) => ({ id: s.id, sortOrder: idx })),
      });
      toast.success('Order saved!');
    } catch (err) {
      toast.error('Failed to save order');
      loadData();
    }
  };

  const handleCategoryChange = (e) => {
    const catId = e.target.value;
    const subs = subCategories.filter(c => String(c.categoryId) === String(catId));
    setFilteredSubs(subs);
    setForm(p => ({ ...p, categoryId: catId, subCategoryId: subs[0]?.id ? String(subs[0].id) : '' }));
  };

  const openModal = (item = null) => {
    loadData();
    setEditing(item);
    if (item) {
      const parentSub = subCategories.find(c => c.id === item.subCategoryId);
      const grandParentId = parentSub ? String(parentSub.categoryId) : '';
      const subs = subCategories.filter(c => String(c.categoryId) === grandParentId);
      setFilteredSubs(subs);
      setForm({
        categoryId: grandParentId,
        subCategoryId: String(item.subCategoryId || ''),
        name: item.name,
        slug: item.slug || '',
        isActive: item.isActive
      });
    } else {
      // Add mode: start with empty placeholders — user must select
      setFilteredSubs([]);
      setForm({
        categoryId: '',
        subCategoryId: '',
        name: '',
        slug: '',
        isActive: true
      });
    }
    setUploadError(null);
    setModalOpen(true);
  };

  const handleNameChange = (e) => {
    const val = e.target.value;
    setForm(p => ({ ...p, name: val, slug: val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.subCategoryId) { setUploadError('Please select a parent category'); return; }
    if (!form.name.trim()) { setUploadError('Child category name is required'); return; }
    if (!form.slug.trim()) { setUploadError('Slug is required'); return; }
    setSaving(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append('name', form.name.trim());
      fd.append('slug', form.slug.trim());
      fd.append('isActive', String(form.isActive));
      fd.append('subCategoryId', form.subCategoryId);

      if (editing) {
        await api.put(`/subsubcategories/${editing.id}`, fd);
        toast.success('Child Category updated successfully.');
      } else {
        await api.post('/subsubcategories', fd);
        toast.success('Child Category created successfully.');
      }
      setModalOpen(false);
      loadData();
    } catch (err) {
      setUploadError(err.response?.data?.message || err.message || 'Failed to save child category');
    } finally {
      setSaving(false);
    }
  };

  const executeDelete = async (id) => {
    try {
      const r = await api.delete(`/subsubcategories/${id}`);
      toast.success(r.data.message || 'Child Category deleted.');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Delete failed');
    }
  };

  const handleDelete = (id) => {
    toast((t) => (
      <div className="flex flex-col items-center text-center gap-2 p-1">
        <p className="text-sm font-semibold text-neutral-800">Confirm Deletion</p>
        <p className="text-xs text-neutral-600 max-w-xs">Are you sure you want to permanently delete this child category? This cannot be undone.</p>
        <div className="flex justify-center items-center gap-3 mt-2 w-full">
          <button onClick={() => { toast.dismiss(t.id); executeDelete(id); }}
            className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold uppercase tracking-wider transition-colors rounded shadow-sm">
            Yes, Delete
          </button>
          <button onClick={() => toast.dismiss(t.id)}
            className="px-3.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold uppercase tracking-wider transition-colors rounded border border-neutral-200">
            Cancel
          </button>
        </div>
      </div>
    ), { duration: 6000, position: 'top-center', style: { minWidth: '350px' } });
  };

  const getNames = (item) => {
    const parentSub = subCategories.find(c => c.id === item.subCategoryId);
    const grandParent = parentSub ? parentCategories.find(c => c.id === parentSub.categoryId) : null;
    return { cat: grandParent?.name || '—', sub: parentSub?.name || '—' };
  };

  return (
    <AdminLayout title="Child Categories">
      <div className="flex justify-between items-center mb-6">
        <p className="text-sm text-brand-grey">{subSubCategories.length} child categories · drag rows to reorder</p>
        {canAddChildCategory && (
          <button onClick={() => openModal()} className="btn-primary flex items-center gap-2" disabled={subCategories.length === 0}>
            <Plus size={16} /> Add Child Category
          </button>
        )}
      </div>

      {subCategories.length === 0 && !loading && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg">
          Please add at least one Parent Category before creating a child category.
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <PaginationTop
          search={search}
          onSearchChange={(s) => { setSearch(s); setPage(1); }}
          searchPlaceholder="Search child categories..."
          currentPage={page}
          totalItems={total}
          limit={limit}
          onLimitChange={(l) => { setLimit(l); setPage(1); }}
        />
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-12 w-full rounded-lg" />)}
          </div>
        ) : subSubCategories.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-playfair text-xl text-brand-grey">No child categories yet</p>
            {canAddChildCategory && (
              <button onClick={() => openModal()} className="btn-primary mt-4" disabled={subCategories.length === 0}>
                Add First Child Category
              </button>
            )}
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
                    <th className="px-5 py-3 w-12">#</th>
                    <th className="px-5 py-3">Root Category</th>
                    <th className="px-5 py-3">Parent Category</th>
                    <th className="px-5 py-3">Child Category</th>
                    <th className="px-5 py-3 w-28">Status</th>
                    {canShowActions && <th className="px-5 py-3 w-24 text-right">Actions</th>}
                  </tr>
                </thead>
                <SortableContext
                  items={subSubCategories.map(s => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <tbody className="divide-y divide-brand-light text-sm">
                    {subSubCategories.map((item, idx) => {
                      const { cat, sub } = getNames(item);
                      return (
                        <SortableRow key={item.id} id={item.id}>
                          <td className="px-5 py-4 font-medium text-brand-grey">{idx + 1}</td>
                          <td className="px-5 py-4 font-medium text-brand-text">{cat}</td>
                          <td className="px-5 py-4 text-brand-grey">{sub}</td>
                          <td className="px-5 py-4">
                            <p className="font-semibold text-brand-text">{item.name}</p>
                            <p className="text-xs text-brand-grey">/{item.slug}</p>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                              item.isActive ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-50 text-gray-500 border border-gray-200'
                            }`}>
                              {item.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          {canShowActions && (
                            <td className="px-5 py-4 text-right">
                              <div className="flex justify-end gap-1.5">
                                {canEditChildCategory && (
                                  <button onClick={() => openModal(item)} className="p-2 text-brand-grey hover:text-brand-gold hover:bg-brand-light/30 rounded transition-colors" title="Edit">
                                    <Edit2 size={14} />
                                  </button>
                                )}
                                {canDeleteCategory && (
                                  <button onClick={() => handleDelete(item.id)} className="p-2 text-brand-grey hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="Delete">
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </SortableRow>
                      );
                    })}
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

      {/* ── Modal ── */}
      <AnimatePresence>
        {modalOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={e => e.target === e.currentTarget && !saving && setModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white rounded-xl w-full max-w-md shadow-xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-brand-light">
                <h2 className="font-playfair text-lg font-semibold">
                  {editing ? 'Edit Child Category' : 'Add Child Category'}
                </h2>
                <button onClick={() => !saving && setModalOpen(false)} className="p-1.5 hover:text-brand-gold transition-colors">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-4">
                {uploadError && (
                  <div className="text-xs text-red-500 bg-red-50 border border-red-200 p-3 rounded">{uploadError}</div>
                )}

                {/* Category dropdown */}
                <div>
                  <label className="block text-xs font-medium text-brand-grey mb-1.5" htmlFor="ssc-cat">Root Category *</label>
                  <select id="ssc-cat" value={form.categoryId} onChange={handleCategoryChange} required
                    className="w-full border border-brand-light px-3 py-2 text-sm focus:outline-none focus:border-brand-gold bg-white">
                    <option value="" disabled>Select root category…</option>
                    {parentCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                {/* Parent Category dropdown */}
                <div>
                  <label className="block text-xs font-medium text-brand-grey mb-1.5" htmlFor="ssc-sub">Parent Category *</label>
                  <select id="ssc-sub" value={form.subCategoryId}
                    onChange={e => setForm(p => ({ ...p, subCategoryId: e.target.value }))}
                    required disabled={filteredSubs.length === 0}
                    className="w-full border border-brand-light px-3 py-2 text-sm focus:outline-none focus:border-brand-gold bg-white disabled:opacity-50">
                    <option value="" disabled>{filteredSubs.length === 0 ? 'No parent categories for this root category' : 'Select parent category…'}</option>
                    {filteredSubs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-xs font-medium text-brand-grey mb-1.5" htmlFor="ssc-name">Child Category Name *</label>
                  <input id="ssc-name" type="text" value={form.name} onChange={handleNameChange} required
                    className="w-full border border-brand-light px-3 py-2 text-sm focus:outline-none focus:border-brand-gold"
                    placeholder="e.g. Perfume Combos" />
                </div>

                {/* Slug */}
                <div>
                  <label className="block text-xs font-medium text-brand-grey mb-1.5" htmlFor="ssc-slug">Slug *</label>
                  <input id="ssc-slug" type="text" value={form.slug}
                    onChange={e => setForm(p => ({ ...p, slug: e.target.value }))} required
                    className="w-full border border-brand-light bg-neutral-50 px-3 py-2 text-sm focus:outline-none focus:border-brand-gold"
                    placeholder="perfume-combos" />
                </div>

                {/* Status */}
                <div className="flex items-center gap-2 pt-1">
                  <Switch checked={form.isActive}
                    onChange={e => setForm(p => ({ ...p, isActive: e.target.checked }))}
                    id="ssc-active" />
                  <label className="text-xs font-semibold text-brand-text cursor-pointer select-none" htmlFor="ssc-active">
                    Active (Visible in store)
                  </label>
                </div>

                <div className="flex gap-3 pt-3 border-t border-brand-light">
                  <button type="button" onClick={() => setModalOpen(false)} disabled={saving} className="btn-outline flex-1">Cancel</button>
                  <button type="submit" disabled={saving} className="btn-primary flex-1">
                    {saving ? 'Saving…' : 'Save'}
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

export default SubSubCategoriesAdminPage;
