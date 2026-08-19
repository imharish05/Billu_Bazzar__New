import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Edit, Trash2, Gift } from 'lucide-react';
import { toast } from 'react-hot-toast';
import AdminLayout from '../components/AdminLayout';
import api from '../services/api';
import { checkPermission } from '../utils/rbac';

const GiftServicesAdminPage = () => {
  const { admin } = useSelector((s) => s.auth);
  const canManageGiftService = checkPermission(admin, 'view_gift_services');
  const [giftService, setGiftService] = useState(null);
  const [giftLoading, setGiftLoading] = useState(true);
  const [giftModalOpen, setGiftModalOpen] = useState(false);
  const [giftForm, setGiftForm] = useState({
    label: 'Add Premium Gift Wrapping',
    amount: 99,
    description: 'Meticulously wrapped in our signature gold foil box with a silk ribbon casing.',
    isActive: true,
  });

  const loadGiftService = async () => {
    try {
      setGiftLoading(true);
      const res = await api.get('/gift-service');
      if (res.data?.success && res.data?.giftService) {
        setGiftService(res.data.giftService);
      } else {
        setGiftService(null);
      }
    } catch {
      setGiftService(null);
    } finally {
      setGiftLoading(false);
    }
  };

  useEffect(() => {
    loadGiftService();
  }, []);

  const openAddGiftModal = () => {
    setGiftForm({
      label: 'Add Premium Gift Wrapping',
      amount: 99,
      description: 'Meticulously wrapped in our signature gold foil box with a silk ribbon casing.',
      isActive: true,
    });
    setGiftModalOpen(true);
  };

  const openEditGiftModal = () => {
    if (giftService) {
      setGiftForm({
        label: giftService.label || 'Add Premium Gift Wrapping',
        amount: giftService.amount !== undefined ? giftService.amount : 99,
        description: giftService.description || '',
        isActive: giftService.isActive !== false,
      });
    }
    setGiftModalOpen(true);
  };

  const handleSaveGiftService = async (e) => {
    e.preventDefault();
    try {
      if (giftService) {
        const res = await api.put('/gift-service', giftForm);
        if (res.data?.success) {
          toast.success('Premium Gift Service updated successfully.');
          setGiftService(res.data.giftService);
        }
      } else {
        const res = await api.post('/gift-service', giftForm);
        if (res.data?.success) {
          toast.success('Premium Gift Service added successfully.');
          setGiftService(res.data.giftService);
        }
      }
      setGiftModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to save gift service');
    }
  };

  const executeDeleteGiftService = async () => {
    try {
      await api.delete('/gift-service');
      toast.success('Premium Gift Service deleted.');
      setGiftService(null);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to delete gift service');
    }
  };

  const handleDeleteGiftService = () => {
    toast((t) => (
      <div className="flex flex-col items-center text-center gap-2 p-1">
        <p className="text-sm font-semibold text-neutral-800">Delete Gift Service</p>
        <p className="text-xs text-neutral-600 max-w-xs">
          Are you sure you want to remove the Premium Gift Service? Customers will no longer see gift wrapping on cart/checkout.
        </p>
        <div className="flex justify-center items-center gap-3 mt-2 w-full">
          <button
            onClick={() => {
              toast.dismiss(t.id);
              executeDeleteGiftService();
            }}
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

  return (
    <AdminLayout title="Gift Services">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header Bar */}
        <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-brand-light">
          <div>
            <h1 className="font-playfair text-xl font-bold text-brand-text flex items-center gap-2">
              {/* <Gift className="text-brand-gold" size={24} /> */}
              Premium Gift Services
            </h1>
            <p className="text-xs text-brand-grey mt-1">
              Manage single-entry premium gift service details, pricing amount, subtext label, and visibility in cart/checkout.
            </p>
          </div>
          {!giftService && !giftLoading && canManageGiftService && (
            <button
              onClick={openAddGiftModal}
              className="btn-primary flex items-center gap-2 text-xs py-2.5 px-4"
              id="add-gift-service-top-btn"
            >
              <Plus size={16} /> Add Gift Service
            </button>
          )}
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-brand-light">
          {giftLoading ? (
            <div className="p-4 space-y-3">
              <div className="skeleton h-6 w-56" />
              <div className="skeleton h-4 w-full" />
            </div>
          ) : giftService ? (
            <div className="bg-brand-light/30 rounded-xl p-6 border border-brand-light flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-semibold text-brand-text text-base">{giftService.label}</span>
                  <span className="bg-brand-gold/10 text-brand-gold font-bold px-3 py-1 rounded-full text-xs border border-brand-gold/30">
                    +₹{giftService.amount}
                  </span>
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${giftService.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                    {giftService.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="bg-white p-3.5 rounded-lg border border-brand-light/60">
                  <p className="text-xs text-brand-grey font-medium">Subtext / Description:</p>
                  <p className="text-xs text-brand-text mt-0.5 italic">"{giftService.description}"</p>
                </div>
              </div>

              {canManageGiftService && (
                <div className="flex items-center gap-3 self-end md:self-auto">
                  <button
                    onClick={openEditGiftModal}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-white text-brand-text hover:text-brand-gold border border-brand-light rounded-lg shadow-xs transition-colors"
                    title="Edit Gift Service"
                    id="edit-gift-service-btn"
                  >
                    <Edit size={15} /> Edit
                  </button>
                  <button
                    onClick={handleDeleteGiftService}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-white text-red-600 hover:bg-red-50 border border-red-200 rounded-lg shadow-xs transition-colors"
                    title="Delete Gift Service"
                    id="delete-gift-service-btn"
                  >
                    <Trash2 size={15} /> Delete
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 bg-brand-light/20 rounded-xl border border-dashed border-brand-light space-y-4">
              <div className="w-14 h-14 rounded-full bg-brand-gold/10 text-brand-gold flex items-center justify-center mx-auto">
                <Gift size={28} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-brand-text">No Premium Gift Service Configured</h3>
                <p className="text-xs text-brand-grey max-w-md mx-auto mt-1">
                  Add gift service pricing, label, and description to allow customers to opt for luxury gift wrapping on the cart page.
                </p>
              </div>
              <button
                onClick={openAddGiftModal}
                className="btn-primary inline-flex items-center gap-2 text-xs py-2.5 px-5"
                id="add-gift-service-empty-btn"
              >
                <Plus size={16} /> Add Gift Service
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Gift Service Add/Edit Modal */}
      <AnimatePresence>
        {giftModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setGiftModalOpen(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} className="bg-white rounded-xl w-full max-w-lg overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between px-6 py-4 border-b border-brand-light">
                <h2 className="font-playfair text-lg font-semibold flex items-center gap-2">
                  {/* <Gift size={18} className="text-brand-gold" /> */}
                  {giftService ? 'Edit Premium Gift Service' : 'Add Premium Gift Service'}
                </h2>
                <button onClick={() => setGiftModalOpen(false)} className="p-1.5 hover:text-brand-gold"><X size={18} /></button>
              </div>

              <form onSubmit={handleSaveGiftService} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-brand-grey mb-1.5" htmlFor="gift-label">
                    Service Label *
                  </label>
                  <input
                    id="gift-label"
                    type="text"
                    value={giftForm.label}
                    onChange={e => setGiftForm(p => ({ ...p, label: e.target.value }))}
                    required
                    className="w-full border border-brand-light px-3 py-2 text-sm focus:outline-none focus:border-brand-gold rounded"
                    placeholder="e.g. Add Premium Gift Wrapping"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-brand-grey mb-1.5" htmlFor="gift-amount">
                    Amount (₹) *
                  </label>
                  <input
                    id="gift-amount"
                    type="number"
                    min="0"
                    step="1"
                    value={giftForm.amount}
                    onChange={e => setGiftForm(p => ({ ...p, amount: e.target.value }))}
                    required
                    className="w-full border border-brand-light px-3 py-2 text-sm focus:outline-none focus:border-brand-gold rounded"
                    placeholder="e.g. 99"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-brand-grey mb-1.5" htmlFor="gift-desc">
                    Message / Description *
                  </label>
                  <textarea
                    id="gift-desc"
                    rows={3}
                    value={giftForm.description}
                    onChange={e => setGiftForm(p => ({ ...p, description: e.target.value }))}
                    required
                    className="w-full border border-brand-light px-3 py-2 text-sm focus:outline-none focus:border-brand-gold rounded resize-none"
                    placeholder="e.g. Meticulously wrapped in our signature gold foil box with a silk ribbon casing."
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="gift-active"
                    checked={giftForm.isActive}
                    onChange={e => setGiftForm(p => ({ ...p, isActive: e.target.checked }))}
                    className="w-4 h-4 accent-brand-gold rounded border-brand-light cursor-pointer"
                  />
                  <label htmlFor="gift-active" className="text-xs font-medium text-brand-text cursor-pointer select-none">
                    Active (Display option on cart & checkout pages)
                  </label>
                </div>

                <div className="flex gap-3 pt-4 border-t border-brand-light">
                  <button type="button" onClick={() => setGiftModalOpen(false)} className="btn-outline flex-1" id="gift-cancel">
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary flex-1" id="gift-save">
                    {giftService ? 'Update Service' : 'Save Service'}
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

export default GiftServicesAdminPage;
