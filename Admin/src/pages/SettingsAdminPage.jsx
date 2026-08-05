import { useState, useEffect } from 'react';
import { Save, ShieldCheck, RefreshCw } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import RolesPermissionsAdminPage from './RolesPermissionsAdminPage';
import api from '../services/api';
import toast from 'react-hot-toast';

const TABS = ['Inventory Alerts', 'Security & OTP', 'Roles & Permissions'];

const SettingsAdminPage = () => {
  const [tab, setTab] = useState('Roles & Permissions');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // OTP Verification Thresholds State
  const [otpSettings, setOtpSettings] = useState({
    inrThreshold: 20000,
    aedThreshold: 800,
    requireCodOtp: true,
  });

  // Global Inventory Low Stock Alert Threshold State
  const [inventorySettings, setInventorySettings] = useState({
    globalLowStockThreshold: 10,
  });

  // Fetch settings on mount
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const [otpRes, invRes] = await Promise.all([
        api.get('/settings/otp_threshold').catch(() => null),
        api.get('/settings/inventory').catch(() => null)
      ]);

      if (otpRes?.data?.success && otpRes?.data?.data) {
        setOtpSettings({
          inrThreshold: otpRes.data.data.inrThreshold ?? 20000,
          aedThreshold: otpRes.data.data.aedThreshold ?? 800,
          requireCodOtp: otpRes.data.data.requireCodOtp ?? true,
        });
      }

      if (invRes?.data?.success && invRes?.data?.data) {
        setInventorySettings({
          globalLowStockThreshold: invRes.data.data.globalLowStockThreshold ?? 10,
        });
      }
    } catch (err) {
      console.warn('Failed to load settings:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveInventorySettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/settings/inventory', {
        globalLowStockThreshold: Number(inventorySettings.globalLowStockThreshold)
      });
      setSaved(true);
      toast.success('Global Inventory Stock Alert Threshold saved successfully!');
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save inventory settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveOtpSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/settings/otp_threshold', {
        inrThreshold: Number(otpSettings.inrThreshold),
        aedThreshold: Number(otpSettings.aedThreshold),
        requireCodOtp: Boolean(otpSettings.requireCodOtp),
      });
      setSaved(true);
      toast.success('OTP security thresholds saved successfully!');
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save OTP thresholds');
    } finally {
      setSaving(false);
    }
  };

  const Field = ({ label, helpText, ...props }) => (
    <div>
      <label className="block text-xs font-semibold text-neutral-800 mb-1.5">{label}</label>
      <input
        {...props}
        className="w-full border border-neutral-300 rounded-lg p-2.5 text-xs text-neutral-900 focus:border-brand-gold focus:outline-none bg-white transition-colors"
      />
      {helpText && <p className="text-[11px] text-neutral-400 mt-1">{helpText}</p>}
    </div>
  );

  return (
    <AdminLayout title="Settings">
      <div className="flex gap-2 mb-6 border-b border-brand-light flex-wrap" role="tablist">
        {TABS.map(t => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            id={`settings-tab-${t.toLowerCase().replace(/[^a-z]/g, '')}`}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-brand-gold text-brand-gold font-bold' : 'border-transparent text-neutral-500 hover:text-neutral-900'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Roles & Permissions' ? (
        <RolesPermissionsAdminPage standalone={false} />
      ) : (
        <div className="bg-white rounded-xl shadow-sm p-6 max-w-2xl border border-neutral-100">
          {tab === 'Inventory Alerts' ? (
            <form onSubmit={handleSaveInventorySettings} className="space-y-6">
              <div className="flex items-center gap-2 pb-3 border-b border-neutral-100">
                <Save className="text-brand-gold" size={20} />
                <div>
                  <h2 className="text-base font-semibold text-neutral-900">Global Inventory Stock Alert Threshold</h2>
                  <p className="text-xs text-neutral-500">Global default limit to trigger low stock warnings in the top notification bell across all warehouses.</p>
                </div>
              </div>
              {loading ? (
                <div className="py-8 text-center text-xs text-neutral-400 flex items-center justify-center gap-2">
                  <RefreshCw size={16} className="animate-spin text-brand-gold" /> Loading inventory settings…
                </div>
              ) : (
                <>
                  <Field
                    label="Global Low Stock Threshold (units)"
                    id="inv-global-threshold"
                    type="number"
                    value={inventorySettings.globalLowStockThreshold}
                    onChange={e => setInventorySettings(s => ({ ...s, globalLowStockThreshold: e.target.value }))}
                    helpText="When stock in the fulfillment hub or any warehouse falls to or below this unit limit, an alert triggers in the header notification bell."
                  />
                  <div className="pt-4 border-t border-brand-light flex items-center gap-3">
                    <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 text-sm px-5 py-2.5" id="settings-save-inv">
                      {saving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
                      {saving ? 'Saving...' : 'Save Inventory Threshold'}
                    </button>
                    {saved && <span className="text-green-600 text-sm font-semibold">✓ Threshold updated!</span>}
                  </div>
                </>
              )}
            </form>
          ) : (
            <form onSubmit={handleSaveOtpSettings} className="space-y-6">
              <div className="flex items-center gap-2 pb-3 border-b border-neutral-100">
                <ShieldCheck className="text-brand-gold" size={20} />
                <div>
                  <h2 className="text-base font-semibold text-neutral-900">OTP Security Verification Thresholds</h2>
                  <p className="text-xs text-neutral-500">Configure real-time email OTP verification rules for high-value orders and COD checkout.</p>
                </div>
              </div>

              {loading ? (
                <div className="py-8 text-center text-xs text-neutral-400 flex items-center justify-center gap-2">
                  <RefreshCw size={16} className="animate-spin text-brand-gold" /> Loading security thresholds…
                </div>
              ) : (
                <>
                  <Field
                    label="INR Order Value Threshold (₹)"
                    id="otp-inr-threshold"
                    type="number"
                    value={otpSettings.inrThreshold}
                    onChange={e => setOtpSettings(s => ({ ...s, inrThreshold: e.target.value }))}
                    helpText="Orders in INR exceeding this total will trigger a mandatory 6-digit email OTP verification before placement."
                  />

                  <Field
                    label="AED Order Value Threshold (AED)"
                    id="otp-aed-threshold"
                    type="number"
                    value={otpSettings.aedThreshold}
                    onChange={e => setOtpSettings(s => ({ ...s, aedThreshold: e.target.value }))}
                    helpText="Orders in AED exceeding this total will trigger a mandatory 6-digit email OTP verification."
                  />

                  <div className="pt-2">
                    <label className="flex items-center gap-2.5 text-sm font-medium text-neutral-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={otpSettings.requireCodOtp}
                        onChange={e => setOtpSettings(s => ({ ...s, requireCodOtp: e.target.checked }))}
                        className="w-4 h-4 accent-brand-gold rounded cursor-pointer"
                        id="otp-cod-toggle"
                      />
                      Require OTP verification for Cash on Delivery (COD) orders
                    </label>
                    <p className="text-[11px] text-neutral-400 ml-6 mt-1">
                      When enabled, any customer selecting Cash on Delivery must verify their order via email OTP regardless of order value.
                    </p>
                  </div>

                  <div className="pt-4 border-t border-brand-light flex items-center gap-3">
                    <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 text-sm px-5 py-2.5" id="settings-save-otp">
                      {saving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
                      {saving ? 'Saving...' : 'Save OTP Thresholds'}
                    </button>
                    {saved && <span className="text-green-600 text-sm font-semibold">✓ Settings saved & updated live!</span>}
                  </div>
                </>
              )}
            </form>
          )}
        </div>
      )}
    </AdminLayout>
  );
};

export default SettingsAdminPage;
