import { useEffect, useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, X, Upload, RefreshCw, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import Switch from '../components/Switch';
import api from '../services/api';
import toast from 'react-hot-toast';
import { checkPermission } from '../utils/rbac';

const formatDatetimeLocal = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const checkImageDimensions = (fileOrUrl) => {
  return new Promise((resolve) => {
    if (!fileOrUrl) { resolve(null); return; }
    const img = new Image();
    if (typeof fileOrUrl === 'string') {
      img.crossOrigin = 'anonymous';
      img.src = fileOrUrl;
    } else if (fileOrUrl instanceof File) {
      img.src = URL.createObjectURL(fileOrUrl);
    } else {
      resolve(null);
      return;
    }
    img.onload = () => {
      if (fileOrUrl instanceof File) URL.revokeObjectURL(img.src);
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = () => {
      if (fileOrUrl instanceof File) URL.revokeObjectURL(img.src);
      resolve(null);
    };
  });
};

// Specifications for reference & validation (matching Client homepage order)
const BANNER_SPECS = {
  HERO: {
    label: 'HERO',
    recommended: '1920 × 1080 px',
    width: 1920,
    height: 1080,
    aspectRatio: 16 / 9,
    aspectLabel: '16:9 Landscape - Full-width hero slider',
  },
  COUNTDOWN: {
    label: 'COUNTDOWN',
    recommended: '800 × 800 px',
    width: 800,
    height: 800,
    aspectRatio: 1.0,
    aspectLabel: '1:1 Square Fit',
  },
  EXCLUSIVE_DEAL: {
    label: 'EXCLUSIVE DEAL',
    recommended: '1920 × 1080 px',
    width: 1920,
    height: 1080,
    aspectRatio: 16 / 9,
    aspectLabel: '16:9 Landscape - Exclusive collection banner',
  },
  PROMO: {
    label: 'PROMO',
    recommended: '1200 × 800 px',
    width: 1200,
    height: 800,
    aspectRatio: 3 / 2,
    aspectLabel: '3:2 Landscape - Promo offer banner',
  },
};

const validateBannerImageDimensions = (dims, bannerType, file = null) => {
  if (file && file.size > 5 * 1024 * 1024) {
    return {
      isValid: false,
      message: `File size exceeds 5MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum allowed file size is 5MB.`
    };
  }

  if (!dims) return { isValid: true, message: null };
  const spec = BANNER_SPECS[bannerType];
  if (!spec) return { isValid: true, message: null };

  const { width, height } = dims;
  const actualRatio = width / height;
  const targetRatio = spec.aspectRatio;

  // Allow aspect ratio tolerance of ±0.08 (e.g. 1.70 to 1.85 for 16:9)
  const ratioDiff = Math.abs(actualRatio - targetRatio);
  const isRatioValid = ratioDiff <= 0.08;

  // Verify minimum size (at least 40% of recommended dimensions)
  const minWidth = Math.round(spec.width * 0.4);
  const minHeight = Math.round(spec.height * 0.4);
  const isSizeValid = width >= minWidth && height >= minHeight;

  if (!isRatioValid || !isSizeValid) {
    let reason = '';
    if (!isRatioValid) {
      reason = `Aspect ratio mismatch (Current: ${actualRatio.toFixed(2)}, Recommended: ${targetRatio.toFixed(2)})`;
    } else {
      reason = `Image resolution too low (${width}×${height} px, minimum required: ${minWidth}×${minHeight} px)`;
    }

    return {
      isValid: false,
      message: `Image dimensions (${width} × ${height} px) do not match recommended dimensions for ${spec.label}. Recommended size is ${spec.recommended} (${spec.aspectLabel}, max 5MB). ${reason}`
    };
  }

  return { isValid: true, message: null };
};

const BannersAdminPage = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imageDims, setImageDims] = useState(null);
  const [dimValidation, setDimValidation] = useState({ isValid: true, message: null });
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    title: '', subtitle: '', type: 'HERO', ctaText: '', ctaLink: '',
    position: 1, isActive: true, badgeText: '', countdown: '',
  });

  useEffect(() => {
    const source = imageFile || imagePreview;
    if (!source || !modalOpen) {
      setImageDims(null);
      setDimValidation({ isValid: true, message: null });
      return;
    }
    checkImageDimensions(source).then(dims => {
      setImageDims(dims);
      if (dims) {
        const val = validateBannerImageDimensions(dims, form.type, imageFile);
        setDimValidation(val);
        if (!val.isValid) {
          setUploadError(val.message);
        } else {
          setUploadError(prev => (prev && (prev.includes('Recommended') || prev.includes('dimensions') || prev.includes('File size') || prev.includes('5MB')) ? null : prev));
        }
      } else {
        setDimValidation({ isValid: true, message: null });
      }
    });
  }, [imageFile, imagePreview, modalOpen, form.type]);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get('/banners?all=true');
      setBanners(res.data.banners || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load banners');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openModal = (b = null) => {
    setEditing(b);
    setUploadProgress(null);
    setUploadError(null);
    setImagePreview(b?.image || null);
    setImageFile(null);
    setImageDims(null);
    setIsDragging(false);
    setForm(b
      ? {
          title: b.title || '',
          subtitle: b.subtitle || '',
          type: b.type || 'HERO',
          ctaText: b.ctaText || '',
          ctaLink: b.ctaLink || '',
          position: b.position !== undefined ? b.position : 1,
          isActive: b.isActive !== false,
          badgeText: b.badgeText || '',
          countdown: b.countdown ? formatDatetimeLocal(b.countdown) : ''
        }
      : { title: '', subtitle: '', type: 'HERO', ctaText: '', ctaLink: '', position: 1, isActive: true, badgeText: '', countdown: '' }
    );
    setModalOpen(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileSelect = (eOrFile) => {
    const file = eOrFile instanceof File ? eOrFile : eOrFile.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      const errMsg = `File size exceeds 5MB limit. Your image is ${(file.size / (1024 * 1024)).toFixed(1)}MB.`;
      setDimValidation({
        isValid: false,
        message: errMsg
      });
      setUploadError(errMsg);
      return;
    }
    setUploadError(null);
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleTypeChange = (newType) => {
    setForm(p => ({ ...p, type: newType }));
    if (imageDims) {
      const val = validateBannerImageDimensions(imageDims, newType, imageFile);
      setDimValidation(val);
      if (!val.isValid) {
        setUploadError(val.message);
      } else {
        setUploadError(prev => (prev && (prev.includes('dimensions') || prev.includes('Recommended') || prev.includes('File size') || prev.includes('5MB')) ? null : prev));
      }
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setUploadProgress(0);
    setUploadError(null);

    // Image dimension & size validation check
    if (imageFile && imageFile.size > 5 * 1024 * 1024) {
      const errMsg = `File size exceeds 5MB limit. Your image is ${(imageFile.size / (1024 * 1024)).toFixed(1)}MB.`;
      setDimValidation({ isValid: false, message: errMsg });
      setUploadError(errMsg);
      setSaving(false); setUploadProgress(null); return;
    }

    if (imageDims) {
      const val = validateBannerImageDimensions(imageDims, form.type, imageFile);
      setDimValidation(val);
      if (!val.isValid) {
        setUploadError(val.message);
        setSaving(false); setUploadProgress(null); return;
      }
    }

    // Form validations
    if (form.type === 'HERO') {
      if (!form.ctaLink?.trim()) {
        setUploadError('CTA Link is required for Hero banners.');
        setSaving(false); setUploadProgress(null); return;
      }
    }

    if (form.type === 'COUNTDOWN') {
      if (!form.title?.trim()) {
        setUploadError('Title is required for Countdown banner.');
        setSaving(false); setUploadProgress(null); return;
      }
      if (!form.subtitle?.trim()) {
        setUploadError('Subtitle is required for Countdown banner.');
        setSaving(false); setUploadProgress(null); return;
      }
      if (!form.ctaText?.trim()) {
        setUploadError('CTA Button Text is required for Countdown banner.');
        setSaving(false); setUploadProgress(null); return;
      }
      if (!form.ctaLink?.trim()) {
        setUploadError('CTA Link is required for Countdown banner.');
        setSaving(false); setUploadProgress(null); return;
      }
      if (!form.badgeText?.trim()) {
        setUploadError('Badge Text is required for Countdown banner.');
        setSaving(false); setUploadProgress(null); return;
      }
      if (!form.countdown) {
        setUploadError('Offer Ends At date & time is required for Countdown banner.');
        setSaving(false); setUploadProgress(null); return;
      }
    }

    if (form.type === 'PROMO') {
      if (!form.title?.trim()) {
        setUploadError('Title is required for Promo banner.');
        setSaving(false); setUploadProgress(null); return;
      }
      if (!form.subtitle?.trim()) {
        setUploadError('Subtitle is required for Promo banner.');
        setSaving(false); setUploadProgress(null); return;
      }
      if (!form.ctaLink?.trim()) {
        setUploadError('CTA Link is required for Promo banner.');
        setSaving(false); setUploadProgress(null); return;
      }
    }

    if (form.type === 'EXCLUSIVE_DEAL') {
      if (!form.title?.trim()) {
        setUploadError('Title is required for Exclusive Deal.');
        setSaving(false); setUploadProgress(null); return;
      }
      if (!form.subtitle?.trim()) {
        setUploadError('Subtitle is required for Exclusive Deal.');
        setSaving(false); setUploadProgress(null); return;
      }
      if (!form.ctaText?.trim()) {
        setUploadError('CTA Button Text is required for Exclusive Deal.');
        setSaving(false); setUploadProgress(null); return;
      }
      if (!form.ctaLink?.trim()) {
        setUploadError('CTA Link is required for Exclusive Deal.');
        setSaving(false); setUploadProgress(null); return;
      }
      if (!form.badgeText?.trim()) {
        setUploadError('Badge Text is required for Exclusive Deal.');
        setSaving(false); setUploadProgress(null); return;
      }
    }

    const file = imageFile || fileInputRef.current?.files?.[0];
    if (!file && !editing) {
      setUploadError('Please select a banner image file.');
      setSaving(false); setUploadProgress(null); return;
    }

    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('subtitle', form.subtitle);
      fd.append('type', form.type);
      fd.append('ctaText', form.ctaText);
      fd.append('ctaLink', form.ctaLink);
      fd.append('position', String(form.position));
      fd.append('isActive', String(form.isActive));
      fd.append('badgeText', form.badgeText);
      fd.append('countdown', form.countdown || '');
      if (file) fd.append('image', file);

      const config = {
        onUploadProgress: (pe) => {
          if (pe.total) {
            const pct = Math.round((pe.loaded / pe.total) * 100);
            setUploadProgress(pct);
          }
        },
      };

      if (editing) {
        await api.put(`/banners/${editing.id}`, fd, config);
        toast.success('Banner updated successfully.');
      } else {
        await api.post('/banners', fd, config);
        toast.success('Banner created successfully.');
      }

      setModalOpen(false);
      load();
    } catch (err) {
      console.error(err);
      setUploadError(err.response?.data?.message || err.message || 'Upload failed. Please retry.');
    } finally {
      setSaving(false);
      setUploadProgress(null);
    }
  };

  const executeDelete = async (id) => {
    try {
      await api.delete(`/banners/${id}`);
      toast.success('Banner deleted successfully');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to delete banner');
      console.error(err);
    }
  };

  const handleDelete = (id) => {
    toast((t) => (
      <div className="flex flex-col items-center text-center gap-2 p-1">
        <p className="text-sm font-semibold text-neutral-800">Confirm Deletion</p>
        <p className="text-xs text-neutral-600">Are you sure you want to delete this banner?</p>
        <div className="flex justify-center items-center gap-3 mt-2 w-full">
          <button
            onClick={() => {
              toast.dismiss(t.id);
              executeDelete(id);
            }}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold uppercase tracking-wider transition-colors rounded shadow-sm"
          >
            Yes, Delete
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold uppercase tracking-wider transition-colors rounded border border-neutral-200"
          >
            Cancel
          </button>
        </div>
      </div>
    ), {
      duration: 5000,
      position: 'top-center',
      style: {
        borderRadius: '12px',
        background: '#fff',
        color: '#333',
        border: '1px solid #E5E5E5',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
      },
    });
  };

  const handleToggle = async (b) => {
    try {
      await api.put(`/banners/${b.id}`, {
        title: b.title,
        subtitle: b.subtitle,
        type: b.type,
        ctaText: b.ctaText,
        ctaLink: b.ctaLink,
        position: b.position,
        badgeText: b.badgeText,
        countdown: b.countdown || '',
        isActive: !b.isActive
      });
      toast.success(`Banner ${!b.isActive ? 'activated' : 'deactivated'}`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to update banner status');
      console.error(err);
    }
  };

  // Tabs order matching homepage display sequence: Hero (1st) -> CountDown (2nd) -> Exclusive Deal (3rd) -> Promo (4th)
  const TABS = ['All', 'Hero', 'CountDown', 'Exclusive Deal', 'Promo'];
  const { admin } = useSelector((s) => s.auth);
  const canAddBanner = checkPermission(admin, 'add_banner');
  const canDeleteBanner = checkPermission(admin, 'delete_banner');

  const filteredBanners = activeTab === 'All'
    ? banners
    : banners.filter(b => {
        if (activeTab === 'Exclusive Deal') return b.type === 'EXCLUSIVE_DEAL';
        return b.type === activeTab.toUpperCase();
      });

  return (
    <AdminLayout title="Banners">
      {/* Tabs Nav Bar */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-hide" role="tablist">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            role="tab"
            aria-selected={activeTab === tab}
            id={`banners-tab-${tab.toLowerCase().replace(/\s+/g, '-')}`}
            className={`flex-shrink-0 px-4 py-2 text-xs font-medium rounded-lg border transition-all ${
              activeTab === tab
                ? 'bg-brand-gold border-brand-gold text-white'
                : 'bg-white border-brand-light text-brand-grey hover:bg-brand-light'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex justify-between items-center mb-6">
        <p className="text-sm text-brand-grey">{filteredBanners.length} banner{filteredBanners.length !== 1 ? 's' : ''}</p>
        {canAddBanner && (
          <button onClick={() => openModal()} className="btn-primary flex items-center gap-2" id="add-banner-btn">
            <Plus size={16} /> Add Banner
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-48 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBanners.map(banner => (
            <div key={banner.id} className="bg-white rounded-xl shadow-sm overflow-hidden group border border-brand-light flex flex-col justify-between">
              <div>
                <div className="relative h-44 bg-brand-light/50">
                  {banner.image ? (
                    <img
                      src={banner.image}
                      alt={banner.title || 'Banner'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=80';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-brand-grey text-xs">No image</div>
                  )}
                  <div className="absolute top-2 left-2 flex gap-1.5 flex-wrap">
                    <span className="bg-brand-gold text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-2xs">
                      {banner.type === 'EXCLUSIVE_DEAL' ? 'EXCLUSIVE DEAL' : banner.type}
                    </span>
                    <span className="bg-white/90 text-brand-text text-[10px] font-bold px-2 py-0.5 rounded border border-brand-light">Pos: {banner.position}</span>
                    {!banner.isActive && (
                      <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded">Inactive</span>
                    )}
                  </div>
                </div>

                <div className="p-4 space-y-1">
                  <p className="font-medium text-sm text-brand-text line-clamp-1">{banner.title || 'Untitled Banner'}</p>
                  <p className="text-xs text-brand-grey line-clamp-2">{banner.subtitle || 'No subtitle provided'}</p>
                  {banner.badgeText && (
                    <span className="inline-block text-[10px] bg-amber-50 text-amber-700 font-semibold px-2 py-0.5 rounded mt-1">
                      Badge: {banner.badgeText}
                    </span>
                  )}
                </div>
              </div>

              <div className="p-4 pt-0 flex items-center justify-between border-t border-brand-light/60 mt-3">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={banner.isActive}
                    disabled={!canAddBanner}
                    onChange={() => canAddBanner && handleToggle(banner)}
                    id={`toggle-banner-${banner.id}`}
                  />
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${banner.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {banner.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex gap-2">
                  {canAddBanner && (
                    <button onClick={() => openModal(banner)} className="p-1.5 text-brand-grey hover:text-brand-gold transition-colors" title="Edit" id={`edit-banner-${banner.id}`}><Edit2 size={14} /></button>
                  )}
                  {canDeleteBanner && (
                    <button onClick={() => handleDelete(banner.id)} className="p-1.5 text-brand-grey hover:text-red-500 transition-colors" title="Delete" id={`del-banner-${banner.id}`}><Trash2 size={14} /></button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Banner Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setModalOpen(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="flex items-center justify-between px-6 py-4 border-b border-brand-light sticky top-0 bg-white z-10">
                <h2 className="font-playfair text-lg font-semibold">{editing ? 'Edit Banner' : 'Add Banner'}</h2>
                <button onClick={() => setModalOpen(false)} className="p-1.5 hover:text-brand-gold"><X size={18} /></button>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-4">
                {/* Banner Type select dropdown — ordered exactly like homepage display (1st Hero, 2nd Countdown, 3rd Exclusive Deal, 4th Promo) */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-brand-grey mb-1.5" htmlFor="ban-type">
                      Banner Type (Section Order) *
                    </label>
                    <select
                      id="ban-type"
                      value={form.type}
                      onChange={e => handleTypeChange(e.target.value)}
                      className="w-full border border-brand-light px-3 py-2 text-sm focus:outline-none focus:border-brand-gold bg-white rounded-sm font-medium text-brand-text"
                    >
                      <option value="HERO">HERO</option>
                      <option value="COUNTDOWN">COUNTDOWN</option>
                      <option value="EXCLUSIVE_DEAL">EXCLUSIVE DEAL</option>
                      <option value="PROMO">PROMO</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-brand-grey mb-1.5" htmlFor="ban-pos">Position Order</label>
                    <input id="ban-pos" type="number" min="1" value={form.position} onChange={e => setForm(p => ({ ...p, position: Number(e.target.value) }))} className="w-full border border-brand-light px-3 py-2 text-sm focus:outline-none focus:border-brand-gold rounded-sm" />
                  </div>
                </div>

                {/* Banner Image Upload & Live Dimension Inspector */}
                <div>
                  <label className="block text-xs font-semibold text-brand-grey mb-1.5">Banner Image {!editing && '*'}</label>
                  <div
                    className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer ${
                      !dimValidation.isValid
                        ? 'border-red-500 bg-red-50/20'
                        : isDragging
                        ? 'border-brand-gold bg-brand-gold/5'
                        : 'border-brand-light hover:border-brand-gold'
                    }`}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
                    onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDragging(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file && file.type.startsWith('image/')) {
                        handleFileSelect(file);
                      }
                    }}
                  >
                    {imagePreview ? (
                      <div className="relative">
                        <img src={imagePreview} alt="Preview" className="max-h-40 mx-auto object-contain rounded" />
                        <button type="button" onClick={(e) => { e.stopPropagation(); setImagePreview(null); setImageFile(null); setImageDims(null); setDimValidation({ isValid: true, message: null }); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="absolute top-1 right-1 bg-white/90 p-1 rounded-full shadow hover:bg-white"><X size={14} /></button>
                      </div>
                    ) : (
                      <div className="py-4">
                        <Upload size={28} className="mx-auto text-brand-grey mb-2" />
                        <p className="text-sm text-brand-grey font-medium">Drag & drop image here, or click to upload</p>
                        <p className="text-xs text-brand-grey mt-1">JPEG, PNG, WebP — max 5MB</p>
                        <p className="text-xs text-red-500 mt-1">
                          (Recommended size {BANNER_SPECS[form.type]?.width} × {BANNER_SPECS[form.type]?.height} px, max 5MB)
                        </p>
                      </div>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileSelect} />
                  
                  {/* Validation feedback below image input field */}
                  {!dimValidation.isValid && (
                    <div className="mt-2.5 p-3 rounded-lg border bg-red-50 border-red-200 text-xs text-red-900 flex items-start gap-2">
                      <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-red-700">Improper Image Size Detected</p>
                        <p className="text-xs text-red-700 font-medium mt-1">
                          Please upload a proper image matching the recommended dimensions: {BANNER_SPECS[form.type]?.width} × {BANNER_SPECS[form.type]?.height} px (max file size: 5 MB).
                        </p>
                      </div>
                    </div>
                  )}
                  {dimValidation.isValid && imageDims && (
                    <div className="mt-2.5 p-2.5 rounded-lg border bg-green-50/60 border-green-200 text-xs text-green-900 flex items-center justify-between font-medium">
                      <span>Current Image Size: <strong>{imageDims.width} × {imageDims.height} px</strong></span>
                      <span className="flex items-center gap-1 text-green-700 font-bold bg-white px-2 py-0.5 rounded border border-green-200 text-[10px]">
                        <CheckCircle2 size={12} /> Dimensions Valid
                      </span>
                    </div>
                  )}
                </div>

                {/* Title & Subtitle */}
                <div>
                  <label className="block text-xs font-semibold text-brand-grey mb-1.5" htmlFor="ban-title">Title {(form.type !== 'HERO') && '*'}</label>
                  <input id="ban-title" type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="w-full border border-brand-light px-3 py-2 text-sm focus:outline-none focus:border-brand-gold rounded-sm" placeholder="e.g. Midnight Luxury Sale" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-brand-grey mb-1.5" htmlFor="ban-sub">Subtitle {(form.type !== 'HERO') && '*'}</label>
                  <input id="ban-sub" type="text" value={form.subtitle} onChange={e => setForm(p => ({ ...p, subtitle: e.target.value }))} className="w-full border border-brand-light px-3 py-2 text-sm focus:outline-none focus:border-brand-gold rounded-sm" placeholder="e.g. Up to 50% Off Luxury Watches & Apparel" />
                </div>

                {/* Countdown Time */}
                {form.type === 'COUNTDOWN' && (
                  <div>
                    <label className="block text-xs font-semibold text-brand-grey mb-1.5" htmlFor="ban-countdown">Offer Ends At (Date & Time) *</label>
                    <input id="ban-countdown" type="datetime-local" value={form.countdown} onChange={e => setForm(p => ({ ...p, countdown: e.target.value }))} required className="w-full border border-brand-light px-3 py-2 text-sm focus:outline-none focus:border-brand-gold rounded-sm" />
                  </div>
                )}

                {/* CTA text & link */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-brand-grey mb-1.5" htmlFor="ban-ctaText">CTA Button Text {(form.type === 'EXCLUSIVE_DEAL' || form.type === 'COUNTDOWN') && '*'}</label>
                    <input id="ban-ctaText" type="text" value={form.ctaText} onChange={e => setForm(p => ({ ...p, ctaText: e.target.value }))} className="w-full border border-brand-light px-3 py-2 text-sm focus:outline-none focus:border-brand-gold rounded-sm" placeholder="e.g. SHOP NOW" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-brand-grey mb-1.5" htmlFor="ban-ctaLink">CTA Link *</label>
                    <input id="ban-ctaLink" type="text" value={form.ctaLink} onChange={e => setForm(p => ({ ...p, ctaLink: e.target.value }))} required className="w-full border border-brand-light px-3 py-2 text-sm focus:outline-none focus:border-brand-gold rounded-sm" placeholder="e.g. /products" />
                  </div>
                </div>

                {/* Badge + Active Toggle */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-brand-grey mb-1.5" htmlFor="ban-badge">Badge Text {(form.type === 'EXCLUSIVE_DEAL' || form.type === 'COUNTDOWN') && '*'}</label>
                    <input id="ban-badge" type="text" value={form.badgeText} onChange={e => setForm(p => ({ ...p, badgeText: e.target.value }))} className="w-full border border-brand-light px-3 py-2 text-sm focus:outline-none focus:border-brand-gold rounded-sm" placeholder="e.g. 50% OFF" />
                  </div>
                  <div className="flex items-end pb-2">
                    <label className="flex items-center gap-2 text-sm cursor-pointer select-none" htmlFor="ban-active">
                      <Switch checked={form.isActive} onChange={val => setForm(p => ({ ...p, isActive: typeof val === 'boolean' ? val : val?.target?.checked }))} id="ban-active" />
                      Active Banner
                    </label>
                  </div>
                </div>

                {uploadError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-600 flex items-center gap-2">
                    <AlertCircle size={15} />
                    <span>{uploadError}</span>
                  </div>
                )}

                {/* Buttons */}
                <div className="flex gap-3 pt-2 border-t border-brand-light">
                  <button type="button" onClick={() => setModalOpen(false)} className="btn-outline flex-1" id="ban-cancel" disabled={saving}>Cancel</button>
                  <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2" id="ban-save" disabled={saving}>
                    {saving ? (
                      <><RefreshCw size={14} className="animate-spin" /> {uploadProgress !== null && uploadProgress > 0 ? `${uploadProgress}%` : 'Saving...'}</>
                    ) : (
                      editing ? 'Update Banner' : 'Save Banner'
                    )}
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

export default BannersAdminPage;
