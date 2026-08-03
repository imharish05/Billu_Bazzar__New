import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
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

const SubCategoriesAdminPage = () => {
  const [parentCategories, setParentCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const [form, setForm] = useState({ categoryId: '', name: '', slug: '', isActive: true });
  const [saving, setSaving] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const categoriesRes = await api.get('/categories?all=true');
      setParentCategories(categoriesRes.data.categories || []);
      const query = `/subcategories?all=true&page=${page}&limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ''}`;
      const subRes = await api.get(query);
      setSubCategories(subRes.data.subCategories || []);
      setTotal(subRes.data.total || 0);
      setTotalPages(subRes.data.totalPages || 1);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load categories data.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = subCategories.findIndex(s => s.id === active.id);
    const newIndex = subCategories.findIndex(s => s.id === over.id);
    const reordered = arrayMove(subCategories, oldIndex, newIndex);

    setSubCategories(reordered);

    try {
      await api.patch('/subcategories/reorder', {
        items: reordered.map((s, idx) => ({ id: s.id, sortOrder: idx })),
      });
      toast.success('Order saved!');
    } catch (err) {
      toast.error('Failed to save order');
      loadData();
    }
  };

  const openModal = (sub = null) => {
    loadData();
    setEditing(sub);
    setForm(sub ? {
      categoryId: String(sub.categoryId || ''),
      name: sub.name,
      slug: sub.slug || '',
      isActive: sub.isActive
    } : {
      categoryId: '',
      name: '',
      slug: '',
      isActive: true
    });
    setUploadError(null);
    setModalOpen(true);
  };

  const handleNameChange = (e) => {
    const val = e.target.value;
    const slugVal = val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    setForm(p => ({ ...p, name: val, slug: slugVal }));
  };



  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.categoryId) { setUploadError('Please select a category'); return; }
    setSaving(true);
    setUploadError(null);

    try {
      const fd = new FormData();
      fd.append('name', form.name.trim());
      fd.append('slug', form.slug.trim());
      fd.append('isActive', String(form.isActive));
      fd.append('categoryId', form.categoryId);



      if (editing) {
        await api.put(`/subcategories/${editing.id}`, fd);
        toast.success('Sub-category updated successfully.');
      } else {
        await api.post('/subcategories', fd);
        toast.success('Sub-category created successfully.');
      }

      setModalOpen(false);
      loadData();
    } catch (err) {
      setUploadError(err.response?.data?.message || err.message || 'Failed to save sub-category');
    } finally {
      setSaving(false);
    }
  };

  const executeDelete = async (id) => {
    try {
      const deleteRes = await api.delete(`/subcategories/${id}`);
      toast.success(deleteRes.data.message || 'Sub-category deleted successfully.');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to delete sub-category');
    }
  };

  const handleDelete = (id) => {
    toast((t) => (
      <div className="flex flex-col items-center text-center gap-2 p-1">
        <p className="text-sm font-semibold text-neutral-800">Confirm Deletion</p>
        <p className="text-xs text-neutral-600 max-w-xs">
          Are you sure you want to permanently delete this sub-category? This will delete all sub-subcategories under it and cannot be undone.
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
    ), { duration: 6000, position: 'top-center', style: { minWidth: '350px' } });
  };

  const getParentName = (categoryId) => {
    const parent = parentCategories.find(p => p.id === categoryId);
    return parent ? parent.name : '—';
  };

  return (
    <AdminLayout title="Sub-categories">
      <div className="flex justify-between items-center mb-6">
        <p className="text-sm text-brand-grey">{subCategories.length} sub-categories · drag rows to reorder</p>
        <button onClick={() => openModal()} className="btn-primary flex items-center gap-2" id="add-subcat-btn" disabled={parentCategories.length === 0}>
          <Plus size={16} /> Add Sub-category
        </button>
      </div>

      {parentCategories.length === 0 && !loading && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg">
          Please add at least one Category before creating a sub-category.
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <PaginationTop
          search={search}
          onSearchChange={(s) => { setSearch(s); setPage(1); }}
          searchPlaceholder="Search sub-categories..."
          currentPage={page}
          totalItems={total}
          limit={limit}
          onLimitChange={(l) => { setLimit(l); setPage(1); }}
        />
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-12 w-full rounded-lg" />)}
          </div>
        ) : subCategories.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-playfair text-xl text-brand-grey">No sub-categories yet</p>
            <button onClick={() => openModal()} className="btn-primary mt-4" id="add-first-subcat" disabled={parentCategories.length === 0}>Add First Sub-category</button>
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

                    <th className="px-5 py-3">Category Name</th>
                    <th className="px-5 py-3">Sub-category Name</th>
                    <th className="px-5 py-3 w-32">Status</th>
                    <th className="px-5 py-3 w-28 text-right">Actions</th>
                  </tr>
                </thead>
                <SortableContext
                  items={subCategories.map(s => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <tbody className="divide-y divide-brand-light text-sm">
                    {subCategories.map((sub, idx) => (
                      <SortableRow key={sub.id} id={sub.id}>
                        <td className="px-5 py-4 font-medium text-brand-grey">{idx + 1}</td>

                        <td className="px-5 py-4 font-medium text-brand-text">{getParentName(sub.categoryId)}</td>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-brand-text">{sub.name}</p>
                          <p className="text-xs text-brand-grey">/{sub.slug}</p>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                            sub.isActive ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-50 text-gray-500 border border-gray-200'
                          }`}>
                            {sub.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button onClick={() => openModal(sub)} className="p-2 text-brand-grey hover:text-brand-gold hover:bg-brand-light/30 rounded transition-colors" id={`edit-sub-${sub.id}`} title="Edit">
                              <Edit2 size={14} />
                            </button>
                            <button onClick={() => handleDelete(sub.id)} className="p-2 text-brand-grey hover:text-red-500 hover:bg-red-50 rounded transition-colors" id={`del-sub-${sub.id}`} title="Delete">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
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
                <h2 className="font-playfair text-lg font-semibold">{editing ? 'Edit Sub-category' : 'Add Sub-category'}</h2>
                <button onClick={() => !saving && setModalOpen(false)} className="p-1.5 hover:text-brand-gold focus-visible:outline-brand-gold transition-colors"><X size={18} /></button>
              </div>
              <form onSubmit={handleSave} className="p-6 space-y-4">
                {uploadError && (
                  <div className="text-xs text-red-500 bg-red-50 border border-red-200 p-3 rounded">{uploadError}</div>
                )}

                {/* Parent Category Selector */}
                <div>
                  <label className="block text-xs font-medium text-brand-grey mb-1.5" htmlFor="sub-parent">Category *</label>
                  <select id="sub-parent" value={form.categoryId} onChange={e => setForm(p => ({ ...p, categoryId: e.target.value }))} required className="w-full border border-brand-light px-3 py-2 text-sm focus:outline-none focus:border-brand-gold transition-colors bg-white">
                    <option value="" disabled>Select category...</option>
                    {parentCategories.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-brand-grey mb-1.5" htmlFor="sub-name">Sub-category Name *</label>
                  <input id="sub-name" type="text" value={form.name} onChange={handleNameChange} required className="w-full border border-brand-light px-3 py-2 text-sm focus:outline-none focus:border-brand-gold transition-colors" placeholder="e.g. Lehenga Sets" />
                </div>

                <div>
                  <label className="block text-xs font-medium text-brand-grey mb-1.5" htmlFor="sub-slug">Slug</label>
                  <input id="sub-slug" type="text" value={form.slug} onChange={e => setForm(p => ({ ...p, slug: e.target.value }))} className="w-full border border-brand-light bg-neutral-50 px-3 py-2 text-sm focus:outline-none focus:border-brand-gold transition-colors" placeholder="lehenga-sets" />
                </div>


                <div className="flex items-center gap-2 pt-1">
                  <Switch checked={form.isActive} onChange={e => setForm(p => ({ ...p, isActive: e.target.checked }))} id="sub-active" />
                  <label className="text-xs font-semibold text-brand-text cursor-pointer select-none" htmlFor="sub-active">Active (Visible in store)</label>
                </div>

                <div className="flex gap-3 pt-3 border-t border-brand-light">
                  <button type="button" onClick={() => setModalOpen(false)} disabled={saving} className="btn-outline flex-1" id="sub-cancel">Cancel</button>
                  <button type="submit" disabled={saving} className="btn-primary flex-1" id="sub-save">
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

export default SubCategoriesAdminPage;
