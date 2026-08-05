import { useState, useEffect } from 'react';
import { Save, ShieldCheck, RefreshCw, Percent, Lock, UserCheck, Key, CheckSquare } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import api from '../services/api';
import toast from 'react-hot-toast';

const TABS = ['Inventory Alerts', 'Security & OTP', 'Roles & Permissions'];

const MODULE_LIST = [
  { key: 'products', name: 'Products & Catalog' },
  { key: 'orders', name: 'Orders & Shipping' },
  { key: 'customers', name: 'Customers & CRM' },
  { key: 'coupons', name: 'Coupons & Marketing' },
  { key: 'inventory', name: 'Inventory & Warehouses' },
  { key: 'reports', name: 'Reports & Analytics' },
  { key: 'settings', name: 'Settings & Security' },
];

const SettingsAdminPage = () => {
  const [tab, setTab] = useState('Inventory Alerts');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Roles & Permissions State
  const [selectedRole, setSelectedRole] = useState('Store Admin');
  const [rolePermissions, setRolePermissions] = useState({
    'Super Admin': {
      products: { create: true, read: true, update: true, delete: true },
      orders: { create: true, read: true, update: true, delete: true },
      customers: { create: true, read: true, update: true, delete: true },
      coupons: { create: true, read: true, update: true, delete: true },
      inventory: { create: true, read: true, update: true, delete: true },
      reports: { create: true, read: true, update: true, delete: true },
      settings: { create: true, read: true, update: true, delete: true },
    },
    'Store Admin': {
      products: { create: true, read: true, update: true, delete: true },
      orders: { create: true, read: true, update: true, delete: true },
      customers: { create: true, read: true, update: true, delete: false },
      coupons: { create: true, read: true, update: true, delete: true },
      inventory: { create: true, read: true, update: true, delete: false },
      reports: { create: false, read: true, update: false, delete: false },
      settings: { create: false, read: true, update: true, delete: false },
    },
    'Inventory Manager': {
      products: { create: true, read: true, update: true, delete: false },
      orders: { create: false, read: true, update: true, delete: false },
      customers: { create: false, read: true, update: false, delete: false },
      coupons: { create: false, read: true, update: false, delete: false },
      inventory: { create: true, read: true, update: true, delete: true },
      reports: { create: false, read: true, update: false, delete: false },
      settings: { create: false, read: false, update: false, delete: false },
    },
    'Support Agent': {
      products: { create: false, read: true, update: false, delete: false },
      orders: { create: false, read: true, update: true, delete: false },
      customers: { create: false, read: true, update: true, delete: false },
      coupons: { create: false, read: true, update: false, delete: false },
      inventory: { create: false, read: true, update: false, delete: false },
      reports: { create: false, read: false, update: false, delete: false },
      settings: { create: false, read: false, update: false, delete: false },
    }
  });

  // OTP Verification Thresholds
  const [otpSettings, setOtpSettings] = useState({
    inrThreshold: 20000,
    aedThreshold: 800,
    requireCodOtp: true,
  });

  // Global Inventory Low-Stock Alert Threshold
  const [inventorySettings, setInventorySettings] = useState({
    globalLowStockThreshold: 10,
  });

  // Dynamic Tax / GST Settings
  const [taxSettings, setTaxSettings] = useState({
    taxRate: 5,
  });

  // Fetch settings on mount
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const [otpRes, invRes, taxRes] = await Promise.all([
        api.get('/settings/otp_threshold'),
        api.get('/settings/inventory'),
        api.get('/settings/tax')
      ]);

      if (otpRes.data?.success && otpRes.data?.data) {
        setOtpSettings({
          inrThreshold: otpRes.data.data.inrThreshold ?? 20000,
          aedThreshold: otpRes.data.data.aedThreshold ?? 800,
          requireCodOtp: otpRes.data.data.requireCodOtp ?? true,
        });
      }

      if (invRes.data?.success && invRes.data?.data) {
        setInventorySettings({
          globalLowStockThreshold: invRes.data.data.globalLowStockThreshold ?? 10,
        });
      }

      if (taxRes.data?.success && taxRes.data?.data) {
        setTaxSettings({
          taxRate: taxRes.data.data.taxRate ?? 5,
        });
      }
    } catch (err) {
      console.warn('Failed to load settings, using defaults:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTaxSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        taxRate: Number(taxSettings.taxRate) >= 0 ? Number(taxSettings.taxRate) : 5,
      };
      await api.post('/settings/tax', { data: payload });
      toast.success('Tax / GST rate updated successfully!');
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update tax settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveInventorySettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        globalLowStockThreshold: Number(inventorySettings.globalLowStockThreshold) || 10,
      };
      await api.post('/settings/inventory', { data: payload });
      toast.success('Global Inventory low-stock threshold updated!');
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update inventory settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveOtpSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        inrThreshold: Number(otpSettings.inrThreshold) || 20000,
        aedThreshold: Number(otpSettings.aedThreshold) || 800,
        requireCodOtp: Boolean(otpSettings.requireCodOtp),
      };
      await api.post('/settings/otp_threshold', { data: payload });
      toast.success('Security & OTP thresholds updated successfully!');
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update OTP settings');
    } finally {
      setSaving(false);
    }
  };

  const handleGeneralSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const Field = ({ label, id, type = 'text', value, defaultValue, onChange, placeholder, helpText }) => (
    <div>
      <label className="block text-xs font-medium text-brand-grey mb-1.5" htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full border border-brand-light px-3 py-2.5 text-sm rounded focus:outline-none focus:border-brand-gold bg-white"
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
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-brand-gold text-brand-gold' : 'border-transparent text-brand-grey hover:text-brand-text'}`}
          >
            {t}
          </button>
        ))}
      </div>

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
        ) : tab === 'Security & OTP' ? (
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

            {tab === 'Roles & Permissions' && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-playfair text-lg font-bold text-neutral-900 mb-1">Roles & Access Control Matrix</h3>
                  <p className="text-xs text-brand-grey">Configure granular CRUD (Create, Read, Update, Delete) permissions for system roles.</p>
                </div>

                {/* Role Selector Tabs */}
                <div className="flex gap-2 border-b border-brand-light pb-3 overflow-x-auto">
                  {Object.keys(rolePermissions).map(role => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setSelectedRole(role)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${selectedRole === role ? 'bg-brand-gold text-white shadow-xs' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}
                    >
                      {role}
                    </button>
                  ))}
                </div>

                {/* Granular CRUD Permissions Matrix Table */}
                <div className="border border-brand-light rounded-xl overflow-hidden shadow-xs bg-white">
                  <div className="p-3.5 bg-neutral-50 border-b border-brand-light flex justify-between items-center">
                    <span className="text-xs font-bold text-neutral-800 uppercase tracking-wider">Module Permissions for "{selectedRole}"</span>
                    <button
                      type="button"
                      onClick={() => {
                        setRolePermissions(prev => ({
                          ...prev,
                          [selectedRole]: MODULE_LIST.reduce((acc, mod) => ({
                            ...acc,
                            [mod.key]: { create: true, read: true, update: true, delete: true }
                          }), {})
                        }));
                        toast.success(`Full CRUD permissions granted to ${selectedRole}!`);
                      }}
                      className="text-[11px] text-brand-gold hover:underline font-semibold"
                    >
                      Grant Full Access (All CRUD)
                    </button>
                  </div>

                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-neutral-100/70 border-b border-brand-light">
                        <th className="p-3 font-bold text-neutral-700">Module Name</th>
                        <th className="p-3 text-center font-bold text-emerald-700">Create (C)</th>
                        <th className="p-3 text-center font-bold text-blue-700">Read (R)</th>
                        <th className="p-3 text-center font-bold text-amber-700">Update (U)</th>
                        <th className="p-3 text-center font-bold text-rose-700">Delete (D)</th>
                        <th className="p-3 text-center font-bold text-brand-gold">Full Access</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-light/60">
                      {MODULE_LIST.map(mod => {
                        const currentMods = rolePermissions[selectedRole] || {};
                        const perm = currentMods[mod.key] || { create: false, read: false, update: false, delete: false };
                        const isAllChecked = Boolean(perm.create && perm.read && perm.update && perm.delete);

                        const toggleAction = (action) => {
                          setRolePermissions(prev => ({
                            ...prev,
                            [selectedRole]: {
                              ...prev[selectedRole],
                              [mod.key]: {
                                ...perm,
                                [action]: !perm[action]
                              }
                            }
                          }));
                        };

                        const toggleAllModule = () => {
                          const nextState = !isAllChecked;
                          setRolePermissions(prev => ({
                            ...prev,
                            [selectedRole]: {
                              ...prev[selectedRole],
                              [mod.key]: {
                                create: nextState,
                                read: nextState,
                                update: nextState,
                                delete: nextState,
                              }
                            }
                          }));
                        };

                        return (
                          <tr key={mod.key} className="hover:bg-amber-50/20 transition-colors">
                            <td className="p-3 font-semibold text-neutral-900">{mod.name}</td>
                            {['create', 'read', 'update', 'delete'].map(act => (
                              <td key={act} className="p-3 text-center">
                                <label className="inline-flex items-center justify-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(perm[act])}
                                    onChange={() => toggleAction(act)}
                                    className="w-4 h-4 accent-brand-gold rounded cursor-pointer"
                                  />
                                </label>
                              </td>
                            ))}
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={toggleAllModule}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider transition-colors ${
                                  isAllChecked
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                                }`}
                              >
                                {isAllChecked ? 'Full Access ✓' : 'Select All'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="pt-4 border-t border-brand-light flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      toast.success(`Roles & CRUD permissions for "${selectedRole}" saved successfully!`);
                    }}
                    className="btn-primary flex items-center gap-2 text-sm px-5 py-2.5"
                  >
                    <Save size={15} /> Save Roles & Permissions
                  </button>
                </div>
              </div>
            )}

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
        ) : (
          <form onSubmit={handleGeneralSave} className="space-y-5">
            {tab === 'General' && (
              <>
                <Field label="Store Name" id="store-name" defaultValue="Billu Bazaar" />
                <Field label="Store Tagline" id="store-tagline" defaultValue="India's Luxury Fashion Destination" />
                <Field label="Support Email" id="support-email" type="email" defaultValue="hello@billubazaar.com" />
                <Field label="Support Phone" id="support-phone" defaultValue="+91 99999 99999" />
                <Field label="GST Number" id="gst-number" defaultValue="27AABCB1234A1Z1" />
                <Field label="Store Address" id="store-address" defaultValue="14 Linking Road, Bandra West, Mumbai 400050" />
              </>
            )}
            {tab === 'Shipping' && (
              <>
                <Field label="Free Shipping Threshold (₹)" id="ship-threshold" type="number" defaultValue="1499" />
                <Field label="Standard Shipping Rate (₹)" id="ship-rate" type="number" defaultValue="99" />
                <Field label="Express Shipping Rate (₹)" id="ship-express" type="number" defaultValue="249" />
                <Field label="Shiprocket API Key (mock)" id="shiprocket-key" defaultValue="mock_key_here" />
                <Field label="Estimated Delivery (days)" id="ship-days" type="number" defaultValue="5" />
              </>
            )}
            {tab === 'Payments' && (
              <>
                <Field label="Razorpay Key ID (mock)" id="rzp-key" defaultValue="rzp_test_mock123" />
                <Field label="Razorpay Secret (mock)" id="rzp-secret" type="password" defaultValue="rzp_secret_mock" />
                <div>
                  <label className="block text-xs font-medium text-brand-grey mb-1.5">Enabled Payment Methods</label>
                  {['UPI', 'Credit Card', 'Debit Card', 'Net Banking', 'Cash on Delivery'].map(m => (
                    <label key={m} className="flex items-center gap-2 text-sm mb-2 cursor-pointer">
                      <input type="checkbox" defaultChecked className="accent-brand-gold" id={`pay-method-${m}`} /> {m}
                    </label>
                  ))}
                </div>
              </>
            )}
            {tab === 'Users' && (
              <div>
                <h3 className="font-medium text-sm mb-4">Admin Users</h3>
                <div className="space-y-3">
                  {[
                    { name: 'Super Admin', email: 'admin@billubazaar.com', role: 'superadmin' },
                    { name: 'Category Manager', email: 'category@billubazaar.com', role: 'manager' },
                    { name: 'Order Executive', email: 'orders@billubazaar.com', role: 'executive' },
                  ].map(user => (
                    <div key={user.email} className="flex items-center gap-3 p-3 border border-brand-light rounded-lg">
                      <div className="w-9 h-9 rounded-full bg-brand-gold flex items-center justify-center">
                        <span className="text-white text-xs font-bold">{user.name[0]}</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{user.name}</p>
                        <p className="text-xs text-brand-grey">{user.email}</p>
                      </div>
                      <span className="text-xs px-2 py-0.5 bg-brand-light text-brand-grey rounded-full">{user.role}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-brand-light flex items-center gap-3">
              <button type="submit" className="btn-primary flex items-center gap-2" id="settings-save"><Save size={15} /> Save Settings</button>
              {saved && <span className="text-green-600 text-sm font-semibold">✓ Settings saved!</span>}
            </div>
          </form>
        )}
      </div>
    </AdminLayout>
  );
};

export default SettingsAdminPage;
