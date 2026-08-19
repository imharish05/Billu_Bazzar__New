import { useEffect, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, X, Store, Star, Mail, Phone, MapPin, UserCheck, FileText, Globe, AlertTriangle } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import Switch from '../components/Switch';
import { PaginationTop, PaginationBottom } from '../components/Pagination';
import api from '../services/api';
import toast from 'react-hot-toast';
import { checkPermission } from '../utils/rbac';

const VendorsAdminPage = () => {
  const { admin } = useSelector((s) => s.auth);
  const canAddVendor = checkPermission(admin, 'add_vendor');
  const canEditVendor = checkPermission(admin, 'edit_vendor');
  const canDeleteVendor = checkPermission(admin, 'delete_vendor');
  const canShowActions = canEditVendor || canDeleteVendor;
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  
  const [form, setForm] = useState({
    name: '',
    gstin: '',
    contactPerson: '',
    phone: '',
    email: '',
    commissionRate: 10.0,
    rating: 4.0,
    isActive: true,
    address: {
      streetAddress: '',
      city: '',
      state: '',
      pincode: '',
      country: ''
    }
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const loadVendors = useCallback(async () => {
    try {
      setLoading(true);
      const query = `/vendors?all=true&page=${page}&limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ''}`;
      const res = await api.get(query);
      setVendors(res.data.vendors || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      console.error('Error loading vendors:', err);
      toast.error('Failed to load vendors.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search]);

  useEffect(() => {
    loadVendors();
  }, [loadVendors]);

  const openModal = (vendor = null) => {
    setEditing(vendor);
    setError(null);
    const addr = vendor?.address || {};
    setForm(vendor ? {
      name: vendor.name || '',
      gstin: vendor.gstin || '',
      contactPerson: vendor.contactPerson || '',
      phone: vendor.phone || '',
      email: vendor.email || '',
      commissionRate: vendor.commissionRate !== undefined ? vendor.commissionRate : 10.0,
      rating: vendor.rating !== undefined ? vendor.rating : 4.0,
      isActive: vendor.isActive !== false,
      address: {
        streetAddress: addr.streetAddress || addr.street || '',
        city: addr.city || '',
        state: addr.state || '',
        pincode: addr.pincode || addr.zip || '',
        country: addr.country || ''
      }
    } : {
      name: '',
      gstin: '',
      contactPerson: '',
      phone: '',
      email: '',
      commissionRate: 10.0,
      rating: 4.0,
      isActive: true,
      address: {
        streetAddress: '',
        city: '',
        state: '',
        pincode: '',
        country: ''
      }
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const cleanGst = form.gstin.trim().toUpperCase();
    if (cleanGst) {
      if (cleanGst.length < 7 || cleanGst.length > 15 || !/^[0-9]{2}[A-Z0-9]{4,13}$/.test(cleanGst)) {
        const msg = 'Invalid GST number format. Must start with 2 state code digits (e.g. 22AAAAA0000A1Z5 or 22A435HG).';
        setError(msg);
        toast.error(msg);
        setSaving(false);
        return;
      }
    }

    try {
      const payload = {
        name: form.name.trim(),
        gstin: cleanGst,
        contactPerson: form.contactPerson.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        commissionRate: parseFloat(form.commissionRate) || 0.0,
        rating: parseFloat(form.rating) || 4.0,
        isActive: form.isActive,
        address: {
          streetAddress: form.address.streetAddress.trim(),
          city: form.address.city.trim(),
          state: form.address.state.trim(),
          pincode: form.address.pincode.trim(),
          country: form.address.country.trim()
        }
      };

      if (editing) {
        await api.put(`/vendors/${editing.id}`, payload);
        toast.success('Vendor updated successfully.');
      } else {
        await api.post('/vendors', payload);
        toast.success('Vendor created successfully.');
      }

      setModalOpen(false);
      loadVendors();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save vendor details');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (vendor) => {
    const updatedStatus = !vendor.isActive;
    setVendors(prev => prev.map(v => v.id === vendor.id ? { ...v, isActive: updatedStatus } : v));
    try {
      await api.put(`/vendors/${vendor.id}`, { isActive: updatedStatus });
      toast.success(`Vendor status updated to ${updatedStatus ? 'Active' : 'Inactive'}.`);
    } catch (err) {
      setVendors(prev => prev.map(v => v.id === vendor.id ? { ...v, isActive: vendor.isActive } : v));
      toast.error(err.response?.data?.message || 'Failed to update vendor status');
    }
  };

  const confirmDeleteVendor = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const deleteRes = await api.delete(`/vendors/${deleteTarget.id}`);
      toast.success(deleteRes.data.message || 'Vendor deleted successfully.');
      setDeleteTarget(null);
      loadVendors();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to delete vendor');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminLayout title="Vendors">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-playfair text-2xl font-bold">Procurement Vendors</h1>
          <p className="text-sm text-brand-grey">Internal vendor registry for product sourcing (Hidden from customer store).</p>
        </div>
        {canAddVendor && (
          <button onClick={() => openModal()} className="btn-primary flex items-center gap-2" id="add-vendor-btn">
            <Plus size={16} /> Add Vendor
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <PaginationTop
          search={search}
          onSearchChange={(s) => { setSearch(s); setPage(1); }}
          searchPlaceholder="Search vendors..."
          currentPage={page}
          totalItems={total}
          limit={limit}
          onLimitChange={(l) => { setLimit(l); setPage(1); }}
        />
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-12 w-full rounded-lg" />)}
          </div>
        ) : vendors.length === 0 ? (
          <div className="p-12 text-center">
            <Store size={48} className="mx-auto text-brand-grey/50 mb-3" />
            <p className="font-playfair text-xl text-brand-grey">No vendors registered yet</p>
            {canAddVendor && (
              <button onClick={() => openModal()} className="btn-primary mt-4" id="add-first-vendor">Add First Vendor</button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" aria-label="Vendors table">
              <thead>
                <tr className="border-b border-brand-light bg-brand-light/20 text-brand-grey text-xs font-semibold uppercase tracking-wider">
                  <th className="px-5 py-3 w-12">#</th>
                  <th className="px-5 py-3">Company & GST</th>
                  <th className="px-5 py-3">Contact Person</th>
                  <th className="px-5 py-3">Contact Details</th>
                  <th className="px-5 py-3">Address Summary</th>
                  <th className="px-5 py-3 w-28">Status</th>
                  {canShowActions && <th className="px-5 py-3 w-28 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-light text-sm">
                {vendors.map((v, idx) => {
                  const addr = v.address || {};
                  const addrText = [addr.streetAddress || addr.street, addr.city, addr.state, addr.pincode || addr.zip, addr.country].filter(Boolean).join(', ');

                  return (
                    <tr key={v.id} className="hover:bg-brand-light/20 transition-colors">
                      <td className="px-5 py-4 font-medium text-brand-grey">{idx + 1}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-brand-gold/10 flex items-center justify-center border border-brand-gold/20 flex-shrink-0">
                            <span className="text-brand-gold font-bold text-sm">{v.name.substring(0, 2).toUpperCase()}</span>
                          </div>
                          <div>
                            <p className="font-semibold text-brand-text">{v.name}</p>
                            {v.gstin ? (
                              <p className="text-[11px] bg-neutral-100 text-brand-grey px-1.5 py-0.5 rounded mt-0.5 inline-block font-mono">GST: {v.gstin}</p>
                            ) : (
                              <p className="text-[11px] text-neutral-400 italic">No GST registered</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-medium text-brand-text">
                        <div className="flex items-center gap-1.5 text-xs">
                          {/* <UserCheck size={14} className="text-brand-gold flex-shrink-0" /> */}
                          <span>{v.contactPerson || '—'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 text-xs text-brand-grey">
                            <Mail size={12} className="flex-shrink-0" />
                            <span>{v.email}</span>
                          </div>
                          {v.phone && (
                            <div className="flex items-center gap-1.5 text-xs text-brand-grey">
                              <Phone size={12} className="flex-shrink-0" />
                              <span>{v.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs text-brand-grey max-w-xs truncate" title={addrText || 'No address'}>
                        <div className="flex items-start gap-1">
                          <MapPin size={13} className="text-brand-gold flex-shrink-0 mt-0.5" />
                          <span className="truncate">{addrText || '—'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={v.isActive}
                            disabled={!canEditVendor}
                            onChange={() => canEditVendor && handleToggleStatus(v)}
                            id={`toggle-vendor-${v.id}`}
                          />
                          <span className={`text-xs font-semibold ${v.isActive ? 'text-green-700' : 'text-neutral-500'}`}>
                            {v.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </td>
                      {canShowActions && (
                        <td className="px-5 py-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            {canEditVendor && (
                              <button onClick={() => openModal(v)} className="p-2 text-brand-grey hover:text-brand-gold hover:bg-brand-light/30 rounded transition-colors" id={`edit-vendor-${v.id}`} title="Edit Vendor">
                                <Edit2 size={14} />
                              </button>
                            )}
                            {canDeleteVendor && (
                              <button onClick={() => setDeleteTarget(v)} className="p-2 text-brand-grey hover:text-red-500 hover:bg-red-50 rounded transition-colors" id={`del-vendor-${v.id}`} title="Delete Vendor">
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} className="bg-white rounded-xl w-full max-w-xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-brand-light flex-shrink-0 bg-brand-light/20">
                <h2 className="font-playfair text-lg font-semibold">{editing ? 'Edit Vendor' : 'Add Vendor'}</h2>
                <button onClick={() => !saving && setModalOpen(false)} className="p-1.5 hover:text-brand-gold focus-visible:outline-brand-gold transition-colors"><X size={18} /></button>
              </div>
              
              <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4">
                {error && (
                  <div className="text-xs text-red-500 bg-red-50 border border-red-200 p-3 rounded">{error}</div>
                )}
                
                {/* Company & GST Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-semibold text-brand-text mb-1" htmlFor="vendor-name">Company Name *</label>
                    <input id="vendor-name" type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required className="w-full border border-brand-light px-3 py-2 text-sm focus:outline-none focus:border-brand-gold transition-colors rounded-sm" placeholder="e.g. Sabyasachi Apparel Pvt Ltd" />
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-semibold text-brand-text mb-1" htmlFor="vendor-gstin">GST Number</label>
                    <input id="vendor-gstin" type="text" value={form.gstin} onChange={e => setForm(p => ({ ...p, gstin: e.target.value.toUpperCase() }))} maxLength={15} className="uppercase w-full border border-brand-light px-3 py-2 text-sm focus:outline-none focus:border-brand-gold transition-colors font-mono rounded-sm" placeholder="e.g. 22AAAAA0000A1Z5" />
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-semibold text-brand-text mb-1" htmlFor="vendor-contact-person">Contact Person *</label>
                    <input id="vendor-contact-person" type="text" value={form.contactPerson} onChange={e => setForm(p => ({ ...p, contactPerson: e.target.value }))} required className="w-full border border-brand-light px-3 py-2 text-sm focus:outline-none focus:border-brand-gold transition-colors rounded-sm" placeholder="e.g. Rajesh Sharma (Manager)" />
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-semibold text-brand-text mb-1" htmlFor="vendor-phone">Contact Number *</label>
                    <input id="vendor-phone" type="text" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} required className="w-full border border-brand-light px-3 py-2 text-sm focus:outline-none focus:border-brand-gold transition-colors rounded-sm" placeholder="e.g. 9876543210" />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-brand-text mb-1" htmlFor="vendor-email">Email Address *</label>
                    <input id="vendor-email" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required className="w-full border border-brand-light px-3 py-2 text-sm focus:outline-none focus:border-brand-gold transition-colors rounded-sm" placeholder="contact@vendor.com" />
                  </div>
                </div>

                {/* Address Details Section */}
                <div className="border-t border-brand-light pt-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-brand-gold mb-3 flex items-center gap-1">
                    Address Details
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-brand-grey mb-1" htmlFor="addr-street">Street Address</label>
                      <input id="addr-street" type="text" value={form.address.streetAddress} onChange={e => setForm(p => ({ ...p, address: { ...p.address, streetAddress: e.target.value } }))} className="w-full border border-brand-light px-3 py-1.5 text-xs focus:outline-none focus:border-brand-gold transition-colors rounded-sm" placeholder="Building no., Street, Industrial Area" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-brand-grey mb-1" htmlFor="addr-city">City</label>
                      <input id="addr-city" type="text" value={form.address.city} onChange={e => setForm(p => ({ ...p, address: { ...p.address, city: e.target.value } }))} className="w-full border border-brand-light px-3 py-1.5 text-xs focus:outline-none focus:border-brand-gold transition-colors rounded-sm" placeholder="City" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-brand-grey mb-1" htmlFor="addr-state">State / Province</label>
                      <input id="addr-state" type="text" value={form.address.state} onChange={e => setForm(p => ({ ...p, address: { ...p.address, state: e.target.value } }))} className="w-full border border-brand-light px-3 py-1.5 text-xs focus:outline-none focus:border-brand-gold transition-colors rounded-sm" placeholder="State" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-brand-grey mb-1" htmlFor="addr-zip">Pincode / ZIP Code</label>
                      <input id="addr-zip" type="text" value={form.address.pincode} onChange={e => setForm(p => ({ ...p, address: { ...p.address, pincode: e.target.value } }))} className="w-full border border-brand-light px-3 py-1.5 text-xs focus:outline-none focus:border-brand-gold transition-colors rounded-sm" placeholder="Postal / ZIP code" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-brand-grey mb-1" htmlFor="addr-country">Country</label>
                      <input id="addr-country" type="text" value={form.address.country} onChange={e => setForm(p => ({ ...p, address: { ...p.address, country: e.target.value } }))} className="w-full border border-brand-light px-3 py-1.5 text-xs focus:outline-none focus:border-brand-gold transition-colors rounded-sm" placeholder="Country" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-brand-light">
                  <Switch checked={form.isActive} onChange={e => setForm(p => ({ ...p, isActive: e.target.checked }))} id="vendor-active" />
                  <label className="text-xs font-semibold text-brand-text cursor-pointer select-none" htmlFor="vendor-active">Active Status</label>
                </div>

                <div className="flex gap-3 pt-4 border-t border-brand-light flex-shrink-0">
                  <button type="button" onClick={() => setModalOpen(false)} disabled={saving} className="btn-outline flex-1" id="vendor-cancel">Cancel</button>
                  <button type="submit" disabled={saving} className="btn-primary flex-1" id="vendor-save">
                    {saving ? 'Saving...' : 'Save Vendor'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Vendor Confirmation Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <div
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={() => !deleting && setDeleteTarget(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-neutral-100"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 text-center">
                <div className="w-14 h-14 rounded-full bg-red-50 border border-red-100 text-red-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <Trash2 size={24} />
                </div>

                <h3 className="font-playfair text-xl font-bold text-neutral-900 mb-2">
                  Confirm Vendor Deletion
                </h3>

                <div className="text-xs text-neutral-600 space-y-2 mb-6 leading-relaxed bg-neutral-50 p-4 rounded-xl border border-neutral-200/80 text-left">
                  <p>
                    Are you sure you want to delete vendor <strong className="text-neutral-900">{deleteTarget.name}</strong>?
                  </p>
                  {deleteTarget.products && deleteTarget.products.length > 0 ? (
                    <div className="text-red-700 bg-red-50 border border-red-200 p-3 rounded-lg mt-2 text-[11px] font-medium leading-normal flex items-start gap-1.5">
                      <AlertTriangle size={14} className="text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>Warning:</strong> Deleting this vendor will also permanently delete <strong>{deleteTarget.products.length} associated product{deleteTarget.products.length === 1 ? '' : 's'}</strong> assigned to them.
                      </div>
                    </div>
                  ) : (
                    <p className="text-neutral-500 italic pt-1.5 border-t border-neutral-200/60">
                      This vendor currently has no associated products.
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3 justify-end pt-2 border-t border-neutral-100">
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => setDeleteTarget(null)}
                    className="flex-1 py-2.5 px-4 bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700 text-xs font-semibold rounded-lg transition-all shadow-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={confirmDeleteVendor}
                    className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-all shadow-sm flex items-center justify-center gap-1.5"
                  >
                    {deleting ? 'Deleting...' : 'Yes, Delete Vendor'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
};

export default VendorsAdminPage;
