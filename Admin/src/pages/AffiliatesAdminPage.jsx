import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { 
  X, Save, Plus, Edit2, Trash2, Upload, Copy, RefreshCw, 
  FileText, ExternalLink, Eye, CheckSquare, Square, Download, Eye as PreviewIcon
} from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import Switch from '../components/Switch';
import api from '../services/api';
import toast from 'react-hot-toast';
import { checkPermission } from '../utils/rbac';
import { validateDocumentFile } from '../utils/fileValidation';

const generateUniqueCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // avoid ambiguous characters
  let code = 'BB-AFF-';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const DEFAULT_PLATFORMS = ['Instagram', 'YouTube', 'TikTok', 'Facebook'];

const buildDefaultSocials = (existingList = []) => {
  const result = DEFAULT_PLATFORMS.map(pName => {
    const found = existingList.find(x => x.platform?.toLowerCase() === pName.toLowerCase());
    if (found) {
      return {
        platform: pName,
        enabled: found.enabled !== false,
        handle: found.handle || '',
        followersCount: found.followersCount || found.followers || ''
      };
    }
    return { platform: pName, enabled: false, handle: '', followersCount: '' };
  });

  const customItems = existingList.filter(x => 
    x.platform && !DEFAULT_PLATFORMS.some(dp => dp.toLowerCase() === x.platform.toLowerCase())
  ).map(c => ({
    platform: c.platform,
    enabled: c.enabled !== false,
    handle: c.handle || '',
    followersCount: c.followersCount || c.followers || '',
    isCustom: true
  }));

  return [...result, ...customItems];
};

const AffiliatesAdminPage = () => {
  const { admin } = useSelector((s) => s.auth);
  const canManageAffiliates = checkPermission(admin, 'manage_affiliates');

  const affiliateHeaders = ['Affiliate Name', 'Email', 'Referral Code', 'Social Platforms & Followers', 'Commission', 'Total Earnings', 'Clicks', 'Orders', 'Document Proof', 'Status'];
  if (canManageAffiliates) affiliateHeaders.push('Actions');

  const [affiliates, setAffiliates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  
  // Document Preview Modal state
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [docModalUrl, setDocModalUrl] = useState(null);
  const [docModalTitle, setDocModalTitle] = useState('');

  // Orders View Modal state
  const [ordersModalOpen, setOrdersModalOpen] = useState(false);
  const [selectedAffiliateForOrders, setSelectedAffiliateForOrders] = useState(null);
  const [affiliateOrders, setAffiliateOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const [form, setForm] = useState({
    name: '',
    email: '',
    referralCode: '',
    commissionRate: 5.0,
    payoutMethod: 'Bank Transfer',
    socialMedia: buildDefaultSocials([])
  });
  
  const [docFile, setDocFile] = useState(null);
  const [docPreviewUrl, setDocPreviewUrl] = useState(null);
  const [docPreviewName, setDocPreviewName] = useState(null);
  const [existingDocUrl, setExistingDocUrl] = useState(null);

  const [isDraggingDoc, setIsDraggingDoc] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const docInputRef = useRef(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get('/affiliates');
      setAffiliates(res.data.affiliates || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load affiliates.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCopyLink = (code) => {
    const origin = import.meta.env.VITE_CLIENT_URL || window.location.origin.replace(':5174', ':5173');
    const url = `${origin}/?ref=${code}`;
    navigator.clipboard.writeText(url)
      .then(() => toast.success('Unique referral link copied to clipboard!'))
      .catch(() => toast.error('Failed to copy link.'));
  };

  const openDocPreviewModal = (url, title = 'Document Proof Preview') => {
    if (!url) return;
    setDocModalUrl(url);
    setDocModalTitle(title);
    setDocModalOpen(true);
  };

  const openModal = (aff = null) => {
    setEditing(aff);
    let parsedSocials = [];
    if (aff?.socialMedia) {
      parsedSocials = typeof aff.socialMedia === 'string' ? JSON.parse(aff.socialMedia) : aff.socialMedia;
    }

    setForm(aff ? {
      name: aff.name,
      email: aff.email,
      referralCode: aff.referralCode,
      commissionRate: aff.commissionRate,
      payoutMethod: aff.payoutMethod || 'Bank Transfer',
      socialMedia: buildDefaultSocials(parsedSocials)
    } : {
      name: '',
      email: '',
      referralCode: generateUniqueCode(),
      commissionRate: 5.0,
      payoutMethod: 'Bank Transfer',
      socialMedia: buildDefaultSocials([])
    });

    setDocFile(null);
    setDocPreviewUrl(null);
    setDocPreviewName(null);
    setExistingDocUrl(aff?.documentProof || null);
    setError(null);

    if (docInputRef.current) docInputRef.current.value = '';
    setModalOpen(true);
  };

  const handleToggleActive = async (aff) => {
    const previousState = aff.isActive;
    const nextState = !previousState;

    // 1. Optimistic UI update
    setAffiliates((prev) =>
      prev.map((a) => (a.id === aff.id ? { ...a, isActive: nextState } : a))
    );

    try {
      // 2. Silent backend sync
      await api.put(`/affiliates/${aff.id}`, { ...aff, isActive: nextState });
      toast.success(nextState ? 'Affiliate link activated' : 'Affiliate link disabled');
    } catch (err) {
      // 3. Rollback on error
      setAffiliates((prev) =>
        prev.map((a) => (a.id === aff.id ? { ...a, isActive: previousState } : a))
      );
      console.error(err);
      toast.error('Failed to update status.');
    }
  };

  // Document proof file handling
  const processDocFile = (file) => {
    if (!file) return;
    const val = validateDocumentFile(file, { maxSizeMB: 10 });
    if (!val.isValid) {
      toast.error(val.error);
      if (docInputRef.current) docInputRef.current.value = '';
      return;
    }
    setDocFile(file);
    setDocPreviewName(file.name);
    const objectUrl = URL.createObjectURL(file);
    setDocPreviewUrl(objectUrl);
  };

  // Social media form handlers
  const handleToggleSocial = (index) => {
    setForm(prev => {
      const updated = [...prev.socialMedia];
      updated[index] = { ...updated[index], enabled: !updated[index].enabled };
      return { ...prev, socialMedia: updated };
    });
  };

  const handleSocialFieldChange = (index, field, value) => {
    setForm(prev => {
      const updated = [...prev.socialMedia];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, socialMedia: updated };
    });
  };

  const handleAddCustomSocial = () => {
    setForm(prev => ({
      ...prev,
      socialMedia: [
        ...prev.socialMedia,
        { platform: '', enabled: true, handle: '', followersCount: '', isCustom: true }
      ]
    }));
  };

  const handleRemoveCustomSocial = (index) => {
    setForm(prev => ({
      ...prev,
      socialMedia: prev.socialMedia.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const fd = new FormData();
      fd.append('name', form.name.trim());
      fd.append('email', form.email.trim());
      fd.append('referralCode', form.referralCode.trim());
      fd.append('commissionRate', String(form.commissionRate));
      fd.append('payoutMethod', form.payoutMethod);

      const validSocials = form.socialMedia.filter(s => s.platform.trim() !== '');
      fd.append('socialMedia', JSON.stringify(validSocials));

      if (docFile) {
        fd.append('documentProof', docFile);
      }

      if (editing) {
        await api.put(`/affiliates/${editing.id}`, fd);
        toast.success('Affiliate updated successfully.');
      } else {
        await api.post('/affiliates', fd);
        toast.success('Affiliate created successfully.');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save affiliate');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id) => {
    toast((t) => (
      <div className="flex flex-col items-center text-center gap-2 p-1 min-w-[260px]">
        <p className="text-sm font-bold text-brand-text">Delete this affiliate?</p>
        <p className="text-xs text-brand-grey max-w-xs">This action cannot be undone.</p>
        <div className="flex justify-center items-center gap-3 mt-2 w-full">
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              try {
                await api.delete(`/affiliates/${id}`);
                toast.success('Affiliate permanently deleted.');
                load();
              } catch (err) {
                console.error(err);
                toast.error('Failed to delete affiliate.');
              }
            }}
            className="px-3.5 py-1.5 text-xs bg-red-600 text-white rounded font-medium hover:bg-red-700 shadow-sm transition-colors"
          >
            Yes, Delete
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="px-3.5 py-1.5 text-xs border border-brand-light rounded text-brand-grey hover:bg-neutral-100 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    ), {
      duration: 6000,
      position: 'top-center',
      style: {
        borderRadius: '12px',
        background: '#ffffff',
        color: '#1a1a1a',
        border: '1px solid #E5E7EB',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        padding: '14px 18px',
      },
    });
  };

  const handleViewOrders = async (aff) => {
    setSelectedAffiliateForOrders(aff);
    setOrdersModalOpen(true);
    setLoadingOrders(true);
    try {
      const res = await api.get(`/affiliates/${aff.id}/orders`);
      setAffiliateOrders(res.data.orders || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load orders for this affiliate.');
    } finally {
      setLoadingOrders(false);
    }
  };

  return (
    <AdminLayout title="Affiliates">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-playfair font-bold text-brand-text">Affiliate Management</h2>
          <p className="text-sm text-brand-grey mt-0.5">
            {affiliates.length} affiliates registered · ₹{affiliates.reduce((s, a) => s + Number(a.totalEarnings || 0), 0).toLocaleString('en-IN')} total paid out
          </p>
        </div>
        {canManageAffiliates && (
          <button onClick={() => openModal()} className="btn-primary flex items-center justify-center gap-2" id="add-affiliate-btn">
            <Plus size={16} /> Add Affiliate
          </button>
        )}
      </div>

      {loading ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center text-brand-grey">Loading affiliates...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-brand-light overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="min-w-[1250px] w-full text-sm text-left border-collapse" aria-label="Affiliates table">
              <thead>
                <tr className="bg-brand-light/40 border-b border-brand-light">
                  {affiliateHeaders.map(h => (
                    <th key={h} className="px-4 py-3.5 text-xs font-semibold text-brand-grey uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-light">
                {affiliates.length === 0 ? (
                  <tr>
                    <td colSpan={affiliateHeaders.length} className="px-5 py-8 text-center text-brand-grey">
                      No affiliates found. Click "Add Affiliate" to create one.
                    </td>
                  </tr>
                ) : (
                  affiliates.map(a => {
                    let parsedSocials = [];
                    if (a.socialMedia) {
                      parsedSocials = typeof a.socialMedia === 'string' ? JSON.parse(a.socialMedia) : a.socialMedia;
                    }
                    const activeSocials = parsedSocials.filter(s => s.enabled !== false && (s.handle || s.followersCount));

                    return (
                      <tr key={a.id} className="hover:bg-brand-light/10 transition-colors">
                        {/* Name */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-brand-light text-brand-text flex items-center justify-center font-bold text-xs shrink-0">
                              {a.name ? a.name[0].toUpperCase() : 'A'}
                            </div>
                            <p className="font-semibold text-brand-text">{a.name}</p>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="px-4 py-4 text-brand-grey text-xs whitespace-nowrap">{a.email}</td>

                        {/* Referral Code & Unique Link */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-semibold bg-brand-light/80 text-brand-text px-2 py-1 rounded border border-brand-light whitespace-nowrap">
                              {a.referralCode}
                            </span>
                            <button
                              onClick={() => handleCopyLink(a.referralCode)}
                              className="p-1.5 text-brand-grey hover:text-brand-gold hover:bg-brand-light rounded transition-all"
                              title="Copy Unique Link"
                              id={`copy-aff-${a.id}`}
                            >
                              <Copy size={14} />
                            </button>
                          </div>
                        </td>

                        {/* Social Platforms & Followers */}
                        <td className="px-4 py-4">
                          {activeSocials.length > 0 ? (
                            <div className="flex flex-wrap items-center gap-1.5 max-w-[320px]">
                              {activeSocials.map((s, idx) => {
                                const cleanHandle = s.handle?.replace(/^https?:\/\/(www\.)?/, '') || 'N/A';
                                return (
                                  <span key={idx} className="inline-flex items-center gap-1 text-[11px] bg-neutral-100 text-neutral-800 px-2 py-0.5 rounded border border-neutral-200 whitespace-nowrap max-w-[280px]" title={`${s.platform}: ${s.handle}`}>
                                    <span className="font-semibold">{s.platform}:</span>
                                    <span className="truncate max-w-[140px]">{cleanHandle}</span>
                                    {s.followersCount && (
                                      <span className="bg-brand-gold/15 text-brand-gold text-[10px] font-bold px-1 rounded shrink-0">
                                        {s.followersCount}
                                      </span>
                                    )}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-xs text-brand-grey/60 italic whitespace-nowrap">None specified</span>
                          )}
                        </td>

                        {/* Commission Rate */}
                        <td className="px-4 py-4 font-semibold text-brand-text whitespace-nowrap">{a.commissionRate}%</td>

                        {/* Total Earnings */}
                        <td className="px-4 py-4 font-bold text-emerald-600 whitespace-nowrap">
                          ₹{Number(a.totalEarnings || 0).toLocaleString('en-IN')}
                        </td>

                        {/* Clicks */}
                        <td className="px-4 py-4 text-brand-grey font-medium whitespace-nowrap">{Number(a.totalClicks || 0).toLocaleString('en-IN')}</td>

                        {/* Orders */}
                        <td className="px-4 py-4 font-medium text-brand-text whitespace-nowrap">{a.totalOrders || 0}</td>

                        {/* Document Proof (Modal Trigger) */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          {a.documentProof ? (
                            <button
                              type="button"
                              onClick={() => openDocPreviewModal(a.documentProof, `Document Proof — ${a.name}`)}
                              className="inline-flex items-center gap-1 text-xs text-brand-gold hover:underline font-semibold cursor-pointer"
                              title="View Document Proof in Modal"
                            >
                              <FileText size={14} /> View Document
                            </button>
                          ) : (
                            <span className="text-xs text-brand-grey/60 italic">No Document</span>
                          )}
                        </td>

                        {/* Status Toggle */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={a.isActive}
                              disabled={!canManageAffiliates}
                              onChange={() => canManageAffiliates && handleToggleActive(a)}
                              id={`toggle-aff-${a.id}`}
                            />
                            <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${a.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                              {a.isActive ? 'Active' : 'Disabled'}
                            </span>
                          </div>
                        </td>

                        {/* Actions */}
                        {canManageAffiliates && (
                          <td className="px-4 py-4 text-right whitespace-nowrap">
                            <div className="flex items-center gap-1 justify-end">
                              <button
                                onClick={() => handleViewOrders(a)}
                                className="p-1.5 text-brand-grey hover:text-brand-gold hover:bg-brand-light rounded transition-colors"
                                title="View Orders History"
                              >
                                <Eye size={15} />
                              </button>
                              <button
                                onClick={() => openModal(a)}
                                className="p-1.5 text-brand-grey hover:text-brand-gold hover:bg-brand-light rounded transition-colors"
                                id={`edit-aff-${a.id}`}
                                title="Edit"
                              >
                                <Edit2 size={15} />
                              </button>
                              <button
                                onClick={() => handleDelete(a.id)}
                                className="p-1.5 text-brand-grey hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                id={`del-aff-${a.id}`}
                                title="Delete"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Affiliate Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && !saving && setModalOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-brand-light bg-neutral-50 shrink-0">
              <h3 className="font-playfair text-lg font-bold text-brand-text">
                {editing ? 'Edit Affiliate Profile' : 'Add New Affiliate'}
              </h3>
              <button onClick={() => !saving && setModalOpen(false)} className="text-brand-grey hover:text-brand-text">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-6 overflow-y-auto flex-1 text-sm">
              {error && <p className="text-red-500 text-xs bg-red-50 p-3 rounded border border-red-200">{error}</p>}
              
              {/* Basic Info Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-brand-grey mb-1" htmlFor="aff-name">Full Name *</label>
                  <input id="aff-name" type="text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full border border-brand-light px-3 py-2 text-sm focus:outline-none focus:border-brand-gold rounded" placeholder="e.g. Rahul Sharma" />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-brand-grey mb-1" htmlFor="aff-email">Email Address *</label>
                  <input id="aff-email" type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full border border-brand-light px-3 py-2 text-sm focus:outline-none focus:border-brand-gold rounded" placeholder="e.g. rahul@example.com" />
                </div>
              </div>

              {/* Referral Code & Commission */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-brand-grey mb-1" htmlFor="aff-code">Referral Code *</label>
                  <div className="relative">
                    <input
                      id="aff-code"
                      type="text"
                      required
                      value={form.referralCode}
                      onChange={e => setForm({...form, referralCode: e.target.value.toUpperCase().replace(/\s+/g, '')})}
                      className="w-full border border-brand-light pl-3 pr-8 py-2 text-sm focus:outline-none focus:border-brand-gold font-mono rounded"
                    />
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, referralCode: generateUniqueCode() }))}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-brand-grey hover:text-brand-gold transition-colors"
                      title="Generate Unique Code"
                    >
                      <RefreshCw size={14} />
                    </button>
                  </div>
                  <p className="text-[11px] text-brand-grey/70 mt-1">Unique link: <span className="font-mono text-brand-gold">?ref={form.referralCode}</span></p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-brand-grey mb-1" htmlFor="aff-rate">Commission Rate (%) *</label>
                  <input id="aff-rate" type="number" step="0.1" required value={form.commissionRate} onChange={e => setForm({...form, commissionRate: parseFloat(e.target.value) || 0})} className="w-full border border-brand-light px-3 py-2 text-sm focus:outline-none focus:border-brand-gold rounded" placeholder="e.g. 5.0" />
                </div>
              </div>

              {/* Social Media & Per-Platform Followers Section */}
              <div className="border border-brand-light rounded-lg p-4 bg-neutral-50/50 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold text-brand-text text-sm">Social Media & Individual Followers Count</h4>
                    <p className="text-xs text-brand-grey">Select platforms and enter handles & follower counts for each platform.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddCustomSocial}
                    className="text-xs text-brand-gold font-semibold hover:underline flex items-center gap-1"
                  >
                    <Plus size={14} /> Add Social Media
                  </button>
                </div>

                <div className="space-y-3">
                  {form.socialMedia.map((soc, idx) => (
                    <div key={idx} className="bg-white border border-brand-light p-3 rounded-lg flex flex-col md:flex-row md:items-center gap-3">
                      <div className="flex items-center gap-2 min-w-[140px]">
                        <button
                          type="button"
                          onClick={() => handleToggleSocial(idx)}
                          className="text-brand-gold focus:outline-none"
                        >
                          {soc.enabled ? <CheckSquare size={18} /> : <Square size={18} className="text-neutral-400" />}
                        </button>
                        {soc.isCustom ? (
                          <input
                            type="text"
                            value={soc.platform}
                            onChange={e => handleSocialFieldChange(idx, 'platform', e.target.value)}
                            placeholder="Platform Name"
                            className="w-full border border-brand-light px-2 py-1 text-xs rounded"
                          />
                        ) : (
                          <span className={`font-semibold text-xs ${soc.enabled ? 'text-brand-text' : 'text-neutral-400'}`}>
                            {soc.platform}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 flex-1">
                        <input
                          type="text"
                          disabled={!soc.enabled}
                          value={soc.handle}
                          onChange={e => handleSocialFieldChange(idx, 'handle', e.target.value)}
                          placeholder="Handle / Link (e.g. @user)"
                          className="w-full border border-brand-light px-2.5 py-1 text-xs focus:outline-none focus:border-brand-gold rounded disabled:bg-neutral-100"
                        />
                        <input
                          type="text"
                          disabled={!soc.enabled}
                          value={soc.followersCount}
                          onChange={e => handleSocialFieldChange(idx, 'followersCount', e.target.value)}
                          placeholder="Followers Count (e.g. 150K)"
                          className="w-full border border-brand-light px-2.5 py-1 text-xs focus:outline-none focus:border-brand-gold rounded disabled:bg-neutral-100"
                        />
                      </div>

                      {soc.isCustom && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomSocial(idx)}
                          className="text-neutral-400 hover:text-red-500 p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Document Proof Upload & Inline Preview Section */}
              <div>
                <label className="block text-xs font-medium text-brand-grey mb-1">Document Proof (ID / Tax / Agreement)</label>
                <div
                  className={`border-2 border-dashed rounded-lg p-4 transition-colors cursor-pointer ${
                    isDraggingDoc ? 'border-brand-gold bg-brand-gold/5' : 'border-brand-light hover:border-brand-gold'
                  }`}
                  onClick={() => docInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setIsDraggingDoc(true); }}
                  onDragLeave={() => setIsDraggingDoc(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingDoc(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) processDocFile(file);
                  }}
                >
                  {docPreviewUrl || docPreviewName ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-1" onClick={e => e.stopPropagation()}>
                      {/* Inline Image or PDF File Card Preview */}
                      {docFile?.type?.startsWith('image/') ? (
                        <div className="relative group">
                          <img src={docPreviewUrl} alt="Document Proof Preview" className="max-h-32 rounded border border-brand-light object-contain shadow-sm bg-neutral-50" />
                          <button
                            type="button"
                            onClick={() => openDocPreviewModal(docPreviewUrl, `Document Proof — ${docPreviewName || 'Preview'}`)}
                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold rounded gap-1"
                          >
                            <PreviewIcon size={16} /> Preview Modal
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 bg-neutral-50 p-3 rounded-lg border border-brand-light w-full max-w-md">
                          <FileText size={28} className="text-brand-gold shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-brand-text truncate">{docPreviewName || 'Document File'}</p>
                            <p className="text-[10px] text-brand-grey">Selected file ready to save</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => openDocPreviewModal(docPreviewUrl, `Document Proof — ${docPreviewName}`)}
                            className="btn-outline text-xs py-1 px-2.5 flex items-center gap-1"
                          >
                            <PreviewIcon size={13} /> Preview
                          </button>
                        </div>
                      )}

                      <div className="flex items-center gap-3 mt-1">
                        <button
                          type="button"
                          onClick={() => docInputRef.current?.click()}
                          className="text-xs text-brand-gold font-medium hover:underline"
                        >
                          Change File
                        </button>
                        <span className="text-neutral-300">|</span>
                        <button
                          type="button"
                          onClick={() => { setDocFile(null); setDocPreviewUrl(null); setDocPreviewName(null); if (docInputRef.current) docInputRef.current.value = ''; }}
                          className="text-xs text-red-500 font-medium hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : existingDocUrl ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-1" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-3 bg-neutral-50 p-3 rounded-lg border border-brand-light w-full max-w-md">
                        <FileText size={28} className="text-brand-gold shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-brand-text truncate">Uploaded Document Proof</p>
                          <p className="text-[10px] text-brand-grey">Stored safely on server</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => openDocPreviewModal(existingDocUrl, `Document Proof — ${form.name}`)}
                          className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
                        >
                          <PreviewIcon size={14} /> Preview Modal
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => docInputRef.current?.click()}
                        className="text-xs text-brand-gold font-medium hover:underline mt-1"
                      >
                        Upload Replacement File
                      </button>
                    </div>
                  ) : (
                    <div className="py-3 text-center">
                      <FileText size={24} className="mx-auto text-brand-grey mb-1.5" />
                      <p className="text-xs text-brand-grey font-medium">Click or drag & drop to upload Document Proof</p>
                      <p className="text-[10px] text-brand-grey/60 mt-0.5">PDF, JPEG, PNG, WebP (max 10MB)</p>
                    </div>
                  )}
                </div>
                <input ref={docInputRef} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="hidden" onChange={e => e.target.files?.[0] && processDocFile(e.target.files[0])} />
              </div>

              <div className="flex gap-3 pt-4 border-t border-brand-light shrink-0">
                <button type="button" onClick={() => setModalOpen(false)} disabled={saving} className="btn-outline flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex items-center justify-center gap-2 flex-1">
                  <Save size={15} /> {saving ? 'Saving...' : 'Save Affiliate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Proof Preview Modal */}
      {docModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setDocModalOpen(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-brand-light bg-neutral-50 shrink-0">
              <div className="flex items-center gap-2">
                <FileText size={20} className="text-brand-gold" />
                <h3 className="font-playfair text-lg font-bold text-brand-text">
                  {docModalTitle}
                </h3>
              </div>
              <div className="flex items-center gap-3">
                {docModalUrl && (
                  <a
                    href={docModalUrl}
                    download
                    target="_blank"
                    rel="noreferrer"
                    className="btn-outline text-xs py-1.5 px-3 flex items-center gap-1.5"
                  >
                    <Download size={14} /> Download File
                  </a>
                )}
                <button onClick={() => setDocModalOpen(false)} className="text-brand-grey hover:text-brand-text p-1">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-4 bg-neutral-100 flex-1 overflow-y-auto flex items-center justify-center min-h-[500px]">
              {docModalUrl ? (
                docModalUrl.toLowerCase().includes('.pdf') || docModalUrl.startsWith('data:application/pdf') ? (
                  <iframe
                    src={docModalUrl}
                    className="w-full h-[70vh] rounded-lg border shadow-inner bg-white"
                    title="Document Proof Preview"
                  />
                ) : (
                  <img
                    src={docModalUrl}
                    alt="Document Proof Preview"
                    className="max-w-full max-h-[70vh] object-contain rounded-lg border shadow-md bg-white"
                  />
                )
              ) : (
                <p className="text-sm text-brand-grey">No document available to preview.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Orders Breakdown Modal */}
      {ordersModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setOrdersModalOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-brand-light bg-neutral-50 shrink-0">
              <div>
                <h3 className="font-playfair text-lg font-bold text-brand-text">
                  Orders History — {selectedAffiliateForOrders?.name}
                </h3>
                <p className="text-xs text-brand-grey">
                  Referral Code: <span className="font-mono text-brand-gold">{selectedAffiliateForOrders?.referralCode}</span> · Commission Rate: {selectedAffiliateForOrders?.commissionRate}%
                </p>
              </div>
              <button onClick={() => setOrdersModalOpen(false)} className="text-brand-grey hover:text-brand-text">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {loadingOrders ? (
                <div className="text-center py-8 text-brand-grey text-sm">Loading affiliate orders...</div>
              ) : affiliateOrders.length === 0 ? (
                <div className="text-center py-8 text-brand-grey text-sm">
                  No orders placed through this affiliate link yet.
                </div>
              ) : (
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-brand-light/40 border-b border-brand-light text-brand-grey font-semibold uppercase">
                      <th className="px-4 py-3">Order</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Order Total</th>
                      <th className="px-4 py-3">Commission Earned</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-light">
                    {affiliateOrders.map(ord => {
                      const commRate = parseFloat(selectedAffiliateForOrders?.commissionRate || 0);
                      const earnedComm = (Number(ord.totalAmount || 0) * commRate) / 100;
                      return (
                        <tr key={ord.id} className="hover:bg-neutral-50">
                          <td className="px-4 py-3 font-mono font-semibold text-brand-text">{ord.orderNumber}</td>
                          <td className="px-4 py-3 text-brand-text">{ord.customer?.name || 'Guest'} ({ord.customer?.email || 'N/A'})</td>
                          <td className="px-4 py-3 text-brand-grey">{new Date(ord.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                          <td className="px-4 py-3 font-semibold text-brand-text">₹{Number(ord.totalAmount || 0).toLocaleString('en-IN')}</td>
                          <td className="px-4 py-3 font-bold text-emerald-600">₹{earnedComm.toFixed(2)}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">
                              {ord.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AffiliatesAdminPage;
