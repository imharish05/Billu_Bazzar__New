import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import AdminLayout from '../components/AdminLayout';
import api from '../services/api';
import toast from 'react-hot-toast';
import { PaginationTop, PaginationBottom } from '../components/Pagination';
import { checkPermission } from '../utils/rbac';

const TYPE_COLORS = {
  EARN: 'bg-green-50 text-green-700',
  REDEEM: 'bg-red-50 text-red-600',
  BONUS: 'bg-amber-50 text-amber-700',
  EXPIRE: 'bg-gray-100 text-gray-500',
};

const LoyaltyAdminPage = () => {
  const { admin } = useSelector((s) => s.auth);
  const canManageLoyalty = checkPermission(admin, 'manage_loyalty');
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    earnRate: 20,
    redeemRate: 0.2,
    maxRedeemAmount: 500,
    expiryMonths: 2,
    signupPointsEnabled: true,
    signupPoints: 50,
    reviewPointsEnabled: true,
    reviewPoints: 20,
    earnRules: []
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [ledgerRes, settingsRes] = await Promise.all([
        api.get('/loyalty/ledger'),
        api.get('/site-settings/loyalty')
      ]);
      if (ledgerRes.data.success) {
        setLedger(ledgerRes.data.ledger);
      }
      if (settingsRes.data.success && settingsRes.data.data) {
        setSettings(prev => ({
          ...prev,
          ...settingsRes.data.data,
          signupPointsEnabled: settingsRes.data.data.signupPointsEnabled ?? true,
          signupPoints: settingsRes.data.data.signupPoints ?? 50,
          reviewPointsEnabled: settingsRes.data.data.reviewPointsEnabled ?? true,
          reviewPoints: settingsRes.data.data.reviewPoints ?? 20,
        }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      await api.post('/site-settings/loyalty', { data: settings });
      setShowSettings(false);
      toast.success('Loyalty settings saved successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save settings.');
    }
  };

  const handleRuleChange = (index, field, value) => {
    const newRules = [...settings.earnRules];
    newRules[index][field] = value;
    setSettings({ ...settings, earnRules: newRules });
  };

  const addRule = () => {
    setSettings({
      ...settings,
      earnRules: [...(settings.earnRules || []), { id: Date.now().toString(), action: '', points: '' }]
    });
  };

  const removeRule = (index) => {
    const newRules = [...settings.earnRules];
    newRules.splice(index, 1);
    setSettings({ ...settings, earnRules: newRules });
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const filteredLedger = ledger.filter(entry => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase().trim();
    const custId = String(entry.customerId || entry.customer?.id || '');
    const custName = (entry.customer?.name || '').toLowerCase();
    const custEmail = (entry.customer?.email || '').toLowerCase();
    const desc = (entry.description || '').toLowerCase();
    return custId.includes(q) || custName.includes(q) || custEmail.includes(q) || desc.includes(q);
  });

  const totalItems = filteredLedger.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage) || 1;
  const paginatedLedger = filteredLedger.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  return (
    <AdminLayout title="Loyalty Program">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-playfair text-2xl font-bold">Loyalty & Rewards</h1>
          <p className="text-sm text-brand-grey">Manage customer points, redemption rates, and ledger history.</p>
        </div>
        {canManageLoyalty && (
          <button
            onClick={() => setShowSettings(true)}
            className="bg-brand-text text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-brand-gold transition-colors"
            id="configure-loyalty-btn"
          >
            Configure Settings
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8">
        <PaginationTop
          search={searchQuery}
          onSearchChange={(q) => { setSearchQuery(q); setCurrentPage(1); }}
          searchPlaceholder="Filter by Customer ID or name..."
          currentPage={currentPage}
          totalItems={totalItems}
          limit={rowsPerPage}
          onLimitChange={(l) => { setRowsPerPage(l); setCurrentPage(1); }}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label="Loyalty ledger">
            <thead>
              <tr className="bg-brand-light/40 text-left">
                {['Customer ID', 'Customer Name', 'Type', 'Points', 'Balance', 'Description', 'Date'].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-brand-grey uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="text-center py-4 text-brand-grey">Loading...</td></tr>
              ) : paginatedLedger.length === 0 ? (
                <tr><td colSpan="7" className="text-center py-4 text-brand-grey">No transactions found.</td></tr>
              ) : paginatedLedger.map(entry => (
                <tr key={entry.id} className="border-b border-brand-light hover:bg-brand-light/20 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs bg-amber-100/80 px-2 py-0.5 rounded font-bold">
                      {entry.customerId || entry.customer?.id || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium">
                    <div>{entry.customer?.name || 'Unknown'}</div>
                    {entry.customer?.email && <div className="text-[11px] text-brand-grey font-normal">{entry.customer.email}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[entry.type] || TYPE_COLORS.BONUS}`}>
                      {entry.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold" style={{ color: entry.points > 0 ? '#16a34a' : '#dc2626' }}>
                    {entry.points > 0 ? '+' : ''}{entry.points}
                  </td>
                  <td className="px-4 py-3 text-brand-grey font-medium">{entry.balance}</td>
                  <td className="px-4 py-3 text-brand-grey text-xs">{entry.description}</td>
                  <td className="px-4 py-3 text-brand-grey text-xs whitespace-nowrap">
                    {new Date(entry.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginationBottom
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          onPageChange={(p) => setCurrentPage(p)}
        />
      </div>

      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-brand-light flex justify-between items-center sticky top-0 bg-white">
              <h2 className="font-playfair text-xl font-semibold">Loyalty Settings</h2>
              <button onClick={() => setShowSettings(false)} className="text-brand-grey hover:text-brand-text">&times;</button>
            </div>
            <form onSubmit={handleSaveSettings} className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Earn Rate (INR per 1 Point)</label>
                  <input type="number" value={settings.earnRate} onChange={e => setSettings({ ...settings, earnRate: Number(e.target.value) })} className="w-full border border-brand-light rounded p-2 focus:border-brand-gold outline-none" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Redeem Rate (INR per 1 Point)</label>
                  <input type="number" step="0.01" value={settings.redeemRate} onChange={e => setSettings({ ...settings, redeemRate: Number(e.target.value) })} className="w-full border border-brand-light rounded p-2 focus:border-brand-gold outline-none" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Max Redeem Amount per Order (INR)</label>
                  <input type="number" value={settings.maxRedeemAmount} onChange={e => setSettings({ ...settings, maxRedeemAmount: Number(e.target.value) })} className="w-full border border-brand-light rounded p-2 focus:border-brand-gold outline-none" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Points Expiry (Months)</label>
                  <input type="number" value={settings.expiryMonths} onChange={e => setSettings({ ...settings, expiryMonths: Number(e.target.value) })} className="w-full border border-brand-light rounded p-2 focus:border-brand-gold outline-none" required />
                </div>
              </div>
              
              <div className="border-t border-brand-light pt-6">
                <h3 className="font-semibold text-sm text-brand-text mb-3">Automatic Action Rewards (Dynamic Points & Toggles)</h3>
                
                <div className="space-y-4 bg-brand-light/20 p-4 rounded-lg border border-brand-light">
                  {/* Signup Bonus */}
                  <div className="flex items-center justify-between gap-4">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={settings.signupPointsEnabled}
                        onChange={e => setSettings({ ...settings, signupPointsEnabled: e.target.checked })}
                        className="w-4 h-4 accent-brand-gold rounded cursor-pointer"
                        id="chk-signup-points"
                      />
                      <span className="text-sm font-medium text-brand-text">New Registration / Signup Bonus</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0"
                        value={settings.signupPoints}
                        onChange={e => setSettings({ ...settings, signupPoints: Number(e.target.value) })}
                        disabled={!settings.signupPointsEnabled}
                        className="w-24 border border-brand-light rounded p-1.5 text-sm focus:border-brand-gold outline-none disabled:bg-neutral-100 disabled:text-neutral-400 font-semibold text-right"
                        id="input-signup-points"
                      />
                      <span className="text-xs text-brand-grey">pts</span>
                    </div>
                  </div>

                  {/* Review Bonus */}
                  <div className="flex items-center justify-between gap-4">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={settings.reviewPointsEnabled}
                        onChange={e => setSettings({ ...settings, reviewPointsEnabled: e.target.checked })}
                        className="w-4 h-4 accent-brand-gold rounded cursor-pointer"
                        id="chk-review-points"
                      />
                      <span className="text-sm font-medium text-brand-text">Product Review Reward</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0"
                        value={settings.reviewPoints}
                        onChange={e => setSettings({ ...settings, reviewPoints: Number(e.target.value) })}
                        disabled={!settings.reviewPointsEnabled}
                        className="w-24 border border-brand-light rounded p-1.5 text-sm focus:border-brand-gold outline-none disabled:bg-neutral-100 disabled:text-neutral-400 font-semibold text-right"
                        id="input-review-points"
                      />
                      <span className="text-xs text-brand-grey">pts</span>
                    </div>
                  </div>

                </div>
              </div>

              <div className="border-t border-brand-light pt-6">
                <h3 className="font-medium mb-4">"How to Earn More" Custom Display Rules</h3>
                {settings.earnRules && settings.earnRules.map((rule, idx) => (
                  <div key={idx} className="flex gap-2 mb-3">
                    <input type="text" placeholder="Action (e.g. Write a review)" value={rule.action} onChange={e => handleRuleChange(idx, 'action', e.target.value)} className="flex-1 border border-brand-light rounded p-2 focus:border-brand-gold outline-none" required />
                    <input type="text" placeholder="Points (e.g. +50 points)" value={rule.points} onChange={e => handleRuleChange(idx, 'points', e.target.value)} className="w-40 border border-brand-light rounded p-2 focus:border-brand-gold outline-none" required />
                    <button type="button" onClick={() => removeRule(idx)} className="text-red-500 px-2 font-bold hover:bg-red-50 rounded">X</button>
                  </div>
                ))}
                <button type="button" onClick={addRule} className="text-sm text-brand-gold font-medium mt-2">+ Add Rule</button>
              </div>

              <div className="flex justify-end pt-4 border-t border-brand-light">
                <button type="button" onClick={() => setShowSettings(false)} className="px-4 py-2 text-brand-grey hover:text-brand-text mr-4">Cancel</button>
                <button type="submit" className="bg-brand-text text-white px-6 py-2 rounded-md hover:bg-brand-gold transition-colors">Save Settings</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
export default LoyaltyAdminPage;
