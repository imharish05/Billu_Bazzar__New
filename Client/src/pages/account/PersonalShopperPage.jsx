import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Gift, CheckCircle2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';
import api from '../../services/api';
import PhoneInput from '../../components/PhoneInput';
import { validatePhoneNumber } from '../../utils/validation';

/**
 * PersonalShopperPage — /account/personal-shopper
 * Customer styling assistance request form connected to DB & Admin panel
 */
const PersonalShopperPage = () => {
  const { customer } = useSelector((s) => s.auth || {});

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    occasion: '',
    budget: '',
    style: '',
    notes: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (customer) {
      setForm((f) => ({
        ...f,
        name: f.name || `${customer.firstName || ''} ${customer.lastName || ''}`.trim(),
        email: f.email || customer.email || '',
        phone: f.phone || customer.phone || '',
      }));
    }
  }, [customer]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.occasion.trim() || !form.budget.trim()) {
      toast.error('Please specify occasion and budget');
      return;
    }
    if (form.phone && form.phone.trim()) {
      const phoneVal = validatePhoneNumber(form.phone, { required: false });
      if (!phoneVal.isValid) {
        toast.error(phoneVal.message);
        return;
      }
    }

    try {
      setSubmitting(true);
      const res = await api.post('/personal-shopper', form);
      if (res.data?.success) {
        setSubmitted(true);
        toast.success(res.data.message || 'Styling request sent — our stylist will reach out within 24h');
      } else {
        toast.error(res.data?.message || 'Failed to submit styling request');
      }
    } catch (err) {
      console.error('Personal shopper request error:', err);
      toast.error(err.response?.data?.message || 'Failed to submit styling request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <div className="bg-white shadow-sm p-10 text-center border border-brand-light">
          <CheckCircle2 size={44} className="text-brand-gold mx-auto mb-3" strokeWidth={1.5} />
          <h1 className="font-playfair text-xl font-semibold mb-2 text-brand-text">Request Received</h1>
          <p className="text-brand-grey text-sm mb-6 max-w-sm mx-auto">
            A Billu Bazaar personal stylist will review your preferences and reach out with a curated selection soon.
          </p>
          <button
            onClick={() => setSubmitted(false)}
            className="btn-outline text-xs px-5 py-2.5"
            id="shopper-new-request"
          >
            Submit Another Request
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <div className="bg-white shadow-sm p-6 border border-brand-light">
        <div className="flex items-center gap-2 mb-2">
          <Gift size={20} className="text-brand-gold" />
          <h1 className="font-playfair text-xl font-semibold text-brand-text">Personal Shopper</h1>
        </div>
        <p className="text-brand-grey text-sm mb-6">
          Our personal stylists will curate a luxury collection tailored specifically for you based on your preferences, occasion, and budget.
        </p>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5 text-brand-text" htmlFor="shopper-name">
                Your Name <span className="text-brand-gold">*</span>
              </label>
              <input
                id="shopper-name"
                type="text"
                required
                placeholder="Full Name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full border border-brand-light px-3 py-2.5 text-sm focus:outline-none focus:border-brand-gold"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 text-brand-text" htmlFor="shopper-email">
                Email Address <span className="text-brand-gold">*</span>
              </label>
              <input
                id="shopper-email"
                type="email"
                required
                placeholder="Email Address"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full border border-brand-light px-3 py-2.5 text-sm focus:outline-none focus:border-brand-gold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <PhoneInput
                id="shopper-phone"
                name="phone"
                label="Phone Number"
                value={form.phone}
                onChange={(val) => setForm((f) => ({ ...f, phone: val }))}
                className="w-full"
                inputClassName="py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 text-brand-text" htmlFor="shopper-occasion">
                Occasion <span className="text-brand-gold">*</span>
              </label>
              <input
                id="shopper-occasion"
                type="text"
                required
                placeholder="Wedding, Birthday, Gala, Festival..."
                value={form.occasion}
                onChange={(e) => setForm((f) => ({ ...f, occasion: e.target.value }))}
                className="w-full border border-brand-light px-3 py-2.5 text-sm focus:outline-none focus:border-brand-gold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5 text-brand-text" htmlFor="shopper-budget">
                Budget (₹) <span className="text-brand-gold">*</span>
              </label>
              <input
                id="shopper-budget"
                type="text"
                required
                placeholder="e.g. 10,000 – 50,000"
                value={form.budget}
                onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))}
                className="w-full border border-brand-light px-3 py-2.5 text-sm focus:outline-none focus:border-brand-gold"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 text-brand-text" htmlFor="shopper-style">
                Style Preference
              </label>
              <input
                id="shopper-style"
                type="text"
                placeholder="Traditional, Royal Bridal, Fusion, Contemporary..."
                value={form.style}
                onChange={(e) => setForm((f) => ({ ...f, style: e.target.value }))}
                className="w-full border border-brand-light px-3 py-2.5 text-sm focus:outline-none focus:border-brand-gold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5 text-brand-text" htmlFor="shopper-notes">
              Additional Details / Specific Requirements
            </label>
            <textarea
              id="shopper-notes"
              rows={3}
              placeholder="Preferred colors, fabric choices, date of event, or anything else your personal stylist should know..."
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="w-full border border-brand-light px-3 py-2.5 text-sm focus:outline-none focus:border-brand-gold resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full flex items-center justify-center gap-2"
            id="shopper-submit"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Submitting Request...
              </>
            ) : (
              'Request Styling Consultation'
            )}
          </button>
        </form>
      </div>
    </motion.div>
  );
};

export default PersonalShopperPage;