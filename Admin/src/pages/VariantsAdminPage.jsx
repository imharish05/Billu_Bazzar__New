import { useEffect, useState, useRef, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Edit2, Trash2, X, Upload, ChevronLeft, ChevronRight, Camera, Copy, Palette, Ruler, AlertTriangle } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import currencyJs from 'currency.js';
import toast from 'react-hot-toast';
import api from '../services/api';
import { checkPermission } from '../utils/rbac';
import { getImageUrl } from '../utils/imageUrl';
import { validateImageFile, validateImageDimensionsAndSize } from '../utils/fileValidation';

const fmt = (v) => currencyJs(v, { symbol: '₹', precision: 0 }).format();

/** Map color names to CSS color values for visual swatch rendering in Admin */
const COLOR_MAP = {
  red: '#e53e3e', crimson: '#dc143c', maroon: '#800000', pink: '#f687b3', rose: '#f43f5e', magenta: '#d53f8c', hotpink: '#ff69b4', blush: '#ffb6c1',
  blue: '#3b82f6', navy: '#1e3a8a', cobalt: '#0047ab', royal: '#4169e1', sky: '#38bdf8', cyan: '#06b6d4', teal: '#0d9488', aqua: '#00ffff',
  green: '#22c55e', olive: '#6b8e23', mint: '#3eb489', emerald: '#10b981', forest: '#228b22', lime: '#84cc16', sage: '#9dc183',
  yellow: '#f59e0b', gold: '#b8860b', amber: '#f59e0b', lemon: '#fff44f', mustard: '#ffdb58',
  orange: '#f97316', coral: '#ff6b6b', salmon: '#fa8072', peach: '#ffcba4',
  purple: '#9333ea', lavender: '#c4b5fd', violet: '#7c3aed', indigo: '#6366f1', mauve: '#9f8fba', plum: '#8b008b', lilac: '#c8a2c8', burgundy: '#800020',
  brown: '#92400e', tan: '#d2b48c', beige: '#f5f5dc', caramel: '#c68642', chocolate: '#7b3f00', coffee: '#6f4e37',
  black: '#111111', charcoal: '#374151', grey: '#9ca3af', gray: '#9ca3af', silver: '#c0c0c0', ash: '#b2beb5', steel: '#4682b4', neutral: '#d1d5db',
  white: '#ffffff', cream: '#fffdd0', ivory: '#fffff0', off: '#faf9f6', clear: 'linear-gradient(135deg,#e2e8f0 0%,#cbd5e1 100%)', 'pastel blue': '#90caf9',
  multicolor: 'linear-gradient(135deg,#e53e3e 0%,#f59e0b 25%,#22c55e 50%,#3b82f6 75%,#9333ea 100%)',
  multi: 'linear-gradient(135deg,#e53e3e 0%,#f59e0b 25%,#22c55e 50%,#3b82f6 75%,#9333ea 100%)',
};

const resolveColor = (name = '') => {
  if (!name) return '#cccccc';
  const lower = String(name).toLowerCase().trim();
  if (COLOR_MAP[lower]) return COLOR_MAP[lower];
  for (const [key, val] of Object.entries(COLOR_MAP)) {
    if (lower.includes(key)) return val;
  }
  return lower; // allows hex codes like #FF0000 or valid CSS colors directly
};

// Preset suggestion chips per option name (mirrors ProductsAdminPage)
const VARIANT_PRESET_VALUES = {
  Size: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'FREE SIZE'],
  Color: ['Black', 'White', 'Red', 'Blue', 'Green', 'Gray', 'Navy', 'Pink', 'Gold', 'Brown'],
  'Band Color': ['Black', 'White', 'Pink', 'Green', 'Blue'],
  Storage: ['128GB', '256GB', '512GB', '1TB', '2TB'],
  RAM: ['4GB', '6GB', '8GB', '12GB', '16GB', '32GB', '64GB'],
  Processor: ['i5', 'i7', 'i9', 'Ryzen 5', 'Ryzen 7', 'M2', 'M3'],
  Connectivity: ['Wired', 'Bluetooth', 'Wi-Fi', 'Zigbee', 'Matter'],
  Resolution: ['1080p', '1440p', '4K'],
  'Refresh Rate': ['60Hz', '120Hz', '144Hz', '240Hz'],
  Capacity: ['8GB', '16GB', '256GB', '512GB', '1TB', '10000mAh', '20000mAh'],
  Type: ['DDR4', 'DDR5', 'SATA', 'NVMe', 'Indoor', 'Outdoor'],
  Wattage: ['20W', '30W', '65W', '100W', '1800W'],
  'Band Material': ['Silicone', 'Leather', 'Metal', 'Nylon'],
  'Case Size': ['40mm', '42mm', '44mm', '45mm'],
  Fit: ['Slim', 'Regular', 'Relaxed', 'Oversized'],
  Material: ['Cotton', 'Polyester', 'Denim', 'Leather', 'Wood', 'Stainless Steel'],
  'Metal Type': ['Gold', 'Silver', 'Rose Gold', 'Stainless Steel'],
  Width: ['Regular', 'Wide'],
  'Age / Size': ['0-3M', '3-6M', '6-12M', '2T', '3T', '4T', '5-6Y', '7-8Y'],
  'Age Range': ['0-2Y', '3-5Y', '6-8Y', '9+'],
  Finish: ['Matte', 'Dewy', 'Glossy', 'Oak', 'Walnut'],
  Style: ['Modern', 'Boho', 'Minimalist', 'Casual', 'Formal'],
  'Skin Type': ['Oily', 'Dry', 'Combination', 'Sensitive'],
  SPF: ['SPF 15', 'SPF 30', 'SPF 50'],
  Shade: ['Fair', 'Light', 'Medium', 'Tan', 'Deep'],
  'Hair Type': ['Curly', 'Straight', 'Color-treated', 'Oily'],
  Concentration: ['EDT', 'EDP', 'Parfum'],
  Scent: ['Fresh', 'Unscented', 'Citrus', 'Musk'],
  Weight: ['5lb', '10lb', '20lb', '50lb'],
  'Resistance Level': ['Light', 'Medium', 'Heavy'],
  'Temp Rating': ['20°F', '0°F', '32°F'],
  'Frame Size': ['S', 'M', 'L', 'XL'],
  'Wheel Size': ['26"', '27.5"', '29"'],
  'Helmet Size': ['S', 'M', 'L'],
  'Piece Count': ['100pc', '500pc', '1000pc'],
  'Player Count': ['1-2', '2-4', '4-6'],
  Platform: ['PS5', 'Xbox Series X', 'Switch', 'PC'],
  Edition: ['Standard', 'Deluxe', "Collector's"],
  Format: ['Hardcover', 'Paperback', 'E-book', 'Audiobook'],
  Language: ['English', 'Spanish', 'French', 'Hindi'],
};

/**
 * VariantAttributeChips
 * Replica of Product CRUD Section 5 chip UI with Color Swatches & Color Picker support:
 * - Dashed green "+ Add {label}" button to open inline custom input
 * - Color Picker (input type="color") when label is Color
 * - Preset chips with visual color swatches
 * - Custom typed value chip with color swatch dot
 */
const VariantAttributeChips = ({ label, value, onChange, suggestions = [] }) => {
  const [showInput, setShowInput] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [colorPickerHex, setColorPickerHex] = useState('#e53e3e');
  const isColor = label.toLowerCase() === 'color';

  // Resolve presets — case-insensitive + handle plural labels & partial matches
  const presets = useMemo(() => {
    const rawLabel = String(label || '').trim();
    if (!rawLabel) return [];

    let globalPresets = [];
    if (VARIANT_PRESET_VALUES[rawLabel]) {
      globalPresets = VARIANT_PRESET_VALUES[rawLabel];
    } else {
      const normalize = (s) => s.toLowerCase().replace(/s$/, '');
      const labelNorm = normalize(rawLabel);
      const matchedKey = Object.keys(VARIANT_PRESET_VALUES).find(
        k => normalize(k) === labelNorm || rawLabel.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(rawLabel.toLowerCase())
      );
      if (matchedKey) {
        globalPresets = VARIANT_PRESET_VALUES[matchedKey];
      }
    }

    const slicedGlobal = globalPresets.slice(0, 8);
    return [...new Set([...slicedGlobal, ...suggestions.filter(s => !slicedGlobal.includes(s))])];
  }, [label, suggestions]);

  const toggleValue = (v) => {
    // clicking the same value deselects it; clicking another selects it
    onChange(value === v ? '' : v);
    setShowInput(false);
    setCustomInput('');
  };

  return (
    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200 shadow-sm space-y-3 hover:border-neutral-300 transition-all">
      {/* Header row */}
      <div className="flex items-center gap-2 border-b border-neutral-100 pb-2.5">
        {isColor
          ? <Palette size={16} className="text-amber-600 shrink-0" />
          : <Ruler size={16} className="text-neutral-500 shrink-0" />}
        <span className="text-xs font-bold text-neutral-800 capitalize">{label}</span>
        <span className="text-red-500 font-bold text-xs">*</span>
      </div>

      {/* Chips row */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {/* + Add custom (dashed green) */}
        {showInput ? (
          <div className="flex items-center gap-1.5 bg-white border-2 border-emerald-500 rounded-full px-3 py-1 shadow-sm">
            {isColor && (
              <input
                type="color"
                value={colorPickerHex}
                onChange={e => {
                  setColorPickerHex(e.target.value);
                  setCustomInput(e.target.value);
                }}
                className="w-5 h-5 rounded-full cursor-pointer border border-neutral-300 p-0 overflow-hidden flex-shrink-0"
                title="Pick hex color"
              />
            )}
            <input
              type="text"
              autoFocus
              placeholder={isColor ? 'Type color name or #hex...' : `Type custom ${label}...`}
              value={customInput}
              onChange={e => setCustomInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (customInput.trim()) {
                    onChange(customInput.trim());
                    setCustomInput('');
                    setShowInput(false);
                  }
                }
                if (e.key === 'Escape') { setShowInput(false); setCustomInput(''); }
              }}
              className="text-xs font-medium focus:outline-none bg-transparent w-36 text-neutral-800"
            />
            <button
              type="button"
              onClick={() => {
                if (customInput.trim()) { onChange(customInput.trim()); setCustomInput(''); }
                setShowInput(false);
              }}
              className="text-emerald-700 text-xs font-bold hover:text-emerald-900"
            >
              Set
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowInput(true)}
            className="border-2 border-dashed border-emerald-500 text-emerald-600 bg-emerald-50/40 hover:bg-emerald-50 text-xs font-bold px-3 py-1.5 rounded-full transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Plus size={14} /> Add {label}
          </button>
        )}

        {/* Preset chips */}
        {presets.map(chip => {
          const isSelected = value === chip;
          return (
            <button
              key={chip}
              type="button"
              onClick={() => toggleValue(chip)}
              className={`text-xs font-medium px-3.5 py-1.5 rounded-full border transition-all cursor-pointer flex items-center gap-1.5 ${
                isSelected
                  ? 'border-2 border-emerald-500 bg-emerald-50 text-emerald-950 font-bold shadow-sm'
                  : 'border-neutral-200 bg-white hover:bg-neutral-100 text-neutral-700'
              }`}
            >
              {isColor && (
                <span
                  className="w-3.5 h-3.5 rounded-full border border-neutral-300 shadow-sm flex-shrink-0 inline-block"
                  style={{ background: resolveColor(chip) }}
                />
              )}
              <span>{chip}</span>
            </button>
          );
        })}

        {/* Custom typed chip — shows if value not in presets */}
        {value && !presets.includes(value) && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-xs font-bold px-3 py-1.5 rounded-full border-2 border-emerald-500 bg-emerald-50 text-emerald-950 flex items-center gap-1.5 shadow-sm"
          >
            {isColor && (
              <span
                className="w-3.5 h-3.5 rounded-full border border-neutral-300 shadow-sm flex-shrink-0 inline-block"
                style={{ background: resolveColor(value) }}
              />
            )}
            <span>{value}</span>
            <X size={12} className="text-emerald-700 hover:text-red-600 ml-0.5" />
          </button>
        )}
      </div>

      {!value && (
        <p className="text-[11px] text-red-400 italic">Select or type a value above</p>
      )}
    </div>
  );
};


const VariantModal = ({ variant, onClose, onSave, products, warehouses }) => {
  const isEdit = !!variant;
  const [selectedProductId, setSelectedProductId] = useState(variant?.productId || '');
  const [sku, setSku] = useState(variant?.sku || '');
  const [price, setPrice] = useState(variant?.price || '');
  const [mrp, setMrp] = useState(variant?.mrp || '');
  const [stock, setStock] = useState(variant?.stock !== undefined ? String(variant?.stock) : '0');
  const [warehouseId, setWarehouseId] = useState(variant?.warehouseId || '');
  const [attributes, setAttributes] = useState(variant?.attributes || {});
  
  const [lowStockThreshold, setLowStockThreshold] = useState(variant?.lowStockThreshold !== undefined ? String(variant.lowStockThreshold) : '10');

  const [mainImageFile, setMainImageFile] = useState(null);
  const [mainImagePreview, setMainImagePreview] = useState(variant?.image || '');

  // Multi-Image Upload States (Up to 5 Images per Variant)
  const [existingImages, setExistingImages] = useState(() => {
    const mainImg = variant?.image || null;
    const rawImgs = Array.isArray(variant?.images) ? variant.images : (variant?.image ? [variant.image] : []);
    return rawImgs.filter(img => img && img !== mainImg).slice(0, 5);
  });
  const [newImageFiles, setNewImageFiles] = useState([]);

  // Selected Product details
  const selectedProduct = products.find(p => Number(p.id) === Number(selectedProductId));

  // Determine allowed option keys (attributes) based ONLY on Section 4 options defined on selectedProduct
  const optionKeys = useMemo(() => {
    if (!selectedProduct) return [];
    if (selectedProduct.attributes) {
      if (Array.isArray(selectedProduct.attributes)) {
        return selectedProduct.attributes.map(a => a.optionName || a.name || a.key).filter(Boolean);
      }
      if (typeof selectedProduct.attributes === 'object') {
        return Object.keys(selectedProduct.attributes).filter(k => k.trim() !== '');
      }
    }
    if (selectedProduct.variants?.[0]?.attributes) {
      return Object.keys(selectedProduct.variants[0].attributes).filter(k => k.trim() !== '');
    }
    return [];
  }, [selectedProduct]);

  // Get existing / defined option values for each option key (from Section 4 or existing variants)
  const getExistingValues = (key) => {
    if (!selectedProduct) return [];
    const valuesSet = new Set();
    
    if (selectedProduct.attributes) {
      if (Array.isArray(selectedProduct.attributes)) {
        const item = selectedProduct.attributes.find(a => (a.optionName || a.name || a.key)?.toLowerCase() === key.toLowerCase());
        if (item) {
          const raw = item.optionValue || item.values || item.value || '';
          if (Array.isArray(raw)) raw.forEach(v => valuesSet.add(v));
          else if (typeof raw === 'string') raw.split(',').forEach(v => v.trim() && valuesSet.add(v.trim()));
        }
      } else if (typeof selectedProduct.attributes === 'object') {
        const raw = selectedProduct.attributes[key];
        if (Array.isArray(raw)) raw.forEach(v => valuesSet.add(v));
        else if (typeof raw === 'string') raw.split(',').forEach(v => v.trim() && valuesSet.add(v.trim()));
      }
    }

    if (selectedProduct.variants) {
      selectedProduct.variants.forEach(v => {
        if (v.attributes && v.attributes[key]) {
          valuesSet.add(v.attributes[key]);
        }
      });
    }
    return Array.from(valuesSet);
  };

  // Sync attributes with selected product's option keys & auto-generate suggested SKU
  useEffect(() => {
    if (!isEdit && selectedProductId) {
      const nextAttrs = {};
      optionKeys.forEach(k => {
        nextAttrs[k] = '';
      });
      setAttributes(nextAttrs);
      if (selectedProduct?.sku) {
        const cleanBase = selectedProduct.sku.toUpperCase().replace(/^SKU-/, '');
        setSku(`SKU-${cleanBase}-VAR-${Date.now().toString().slice(-4)}`);
      }
    }
  }, [selectedProductId, isEdit, optionKeys, selectedProduct]);

  useEffect(() => {
    if (!isEdit && selectedProduct && attributes) {
      const attrValues = Object.values(attributes).filter(Boolean).join('-').toUpperCase().replace(/[^A-Z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
      if (attrValues) {
        const baseSku = (selectedProduct.sku || `PROD-${selectedProductId}`).toUpperCase().replace(/^SKU-/, '');
        setSku(`SKU-${baseSku}-${attrValues}`);
      }
    }
  }, [attributes, selectedProduct, isEdit, selectedProductId]);

  const handleAttributeChange = (key, val) => {
    setAttributes(prev => ({
      ...prev,
      [key]: val
    }));
  };

  const handleMainImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const val = await validateImageDimensionsAndSize(file, { maxSizeMB: 3, minWidth: 400, minHeight: 400, requireSquare: true });
      if (!val.isValid) {
        toast.error(val.error);
        e.target.value = '';
        return;
      }
      setMainImageFile(file);
      setMainImagePreview(URL.createObjectURL(file));
    }
  };

  const handleMultipleFilesSelect = async (e) => {
    const rawFiles = Array.from(e.target.files || []);
    const validFiles = [];
    for (const file of rawFiles) {
      const val = await validateImageDimensionsAndSize(file, { maxSizeMB: 3, minWidth: 400, minHeight: 400, requireSquare: true });
      if (!val.isValid) {
        toast.error(val.error);
      } else {
        validFiles.push(file);
      }
    }
    if (validFiles.length === 0) return;

    const galleryCount = existingImages.length + newImageFiles.length;
    const remainingSlots = 5 - galleryCount;
    if (remainingSlots <= 0) {
      toast.error('Maximum 5 variant gallery images allowed');
      return;
    }
    const selected = validFiles.slice(0, remainingSlots).map(file => {
      file.preview = URL.createObjectURL(file);
      return file;
    });
    setNewImageFiles(prev => [...prev, ...selected]);
  };

  const removeExistingImage = (idx) => {
    setExistingImages(prev => prev.filter((_, i) => i !== idx));
  };

  const removeNewFile = (idx) => {
    setNewImageFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedProductId) {
      toast.error('Please select a product');
      return;
    }

    // Verify all required option types have values
    for (const key of optionKeys) {
      if (!attributes[key] || attributes[key].trim() === '') {
        toast.error(`Please provide a value for option "${key}"`);
        return;
      }
    }

    // Check attribute combo conflict for creation and edit
    if (selectedProduct?.variants) {
      const isConflict = selectedProduct.variants.some(v => {
        if (isEdit && Number(v.id) === Number(variant.id)) return false;
        const vAttrs = v.attributes || {};
        return optionKeys.every(k => String(vAttrs[k] || '').trim().toLowerCase() === String(attributes[k] || '').trim().toLowerCase());
      });

      if (isConflict) {
        const comboStr = Object.entries(attributes).map(([k, v]) => `${k}: ${v}`).join(', ');
        toast.error(`Same variant already present! (${comboStr})`);
        return;
      }
    }

    let finalSku = sku ? sku.trim() : '';
    if (!finalSku && selectedProduct) {
      const attrValues = Object.values(attributes).filter(Boolean).join('-').toUpperCase().replace(/[^A-Z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
      const baseSku = (selectedProduct.sku || `PROD-${selectedProductId}`).toUpperCase().replace(/^SKU-/, '');
      finalSku = attrValues ? `SKU-${baseSku}-${attrValues}` : `SKU-${baseSku}-VAR-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    }
    if (!finalSku) {
      finalSku = `SKU-PV-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    }

    if (!mainImageFile && !mainImagePreview) {
      toast.error('Main Variant Image is required');
      return;
    }

    const fd = new FormData();
    fd.append('productId', selectedProductId);
    fd.append('sku', finalSku);
    fd.append('price', price);
    fd.append('mrp', mrp);
    fd.append('stock', stock);
    fd.append('lowStockThreshold', lowStockThreshold);
    fd.append('warehouseId', warehouseId || '');
    fd.append('attributes', JSON.stringify(attributes));
    fd.append('existingImages', JSON.stringify(existingImages));
    
    if (mainImageFile) {
      fd.append('variantImages', mainImageFile);
    }

    newImageFiles.forEach(file => {
      fd.append('variantImages', file);
    });

    onSave(fd);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
        className="bg-white rounded-xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-light sticky top-0 bg-white z-10">
          <h2 className="font-playfair text-xl font-semibold">{isEdit ? 'Edit Variant' : 'Add Variant'}</h2>
          <button onClick={onClose} className="p-1.5 hover:text-brand-gold transition-colors focus-visible:outline-brand-gold" aria-label="Close"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            {/* Product selection (read-only in Edit mode) */}
            <div>
              <label className="block text-xs font-semibold text-brand-grey mb-1.5" htmlFor="var-product">Product *</label>
              {isEdit ? (
                <div className="w-full border border-brand-light bg-neutral-50 px-3 py-2 text-sm text-brand-grey font-medium rounded-md">
                  {variant.product?.name}
                </div>
              ) : (
                <select
                  id="var-product"
                  value={selectedProductId}
                  onChange={e => setSelectedProductId(e.target.value)}
                  required
                  className="w-full border border-brand-light bg-white px-3 py-2 text-sm focus:outline-none focus:border-brand-gold transition-colors rounded-md"
                >
                  <option value="">Select Product</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Dynamic Attributes / Option Types inputs */}
            {selectedProductId && (
              <div className="border border-brand-light p-4 bg-neutral-50/50 rounded-lg space-y-4">
                {/* Section header with Copy icon */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-brand-gold uppercase tracking-wider">Configure Product Option Attributes</h3>
                    <p className="text-[11px] text-neutral-500 mt-0.5">Select pre-determined options or type custom specs.</p>
                  </div>
                  {/* Copy icon — always visible if product has at least 1 existing variant */}
                  {selectedProduct?.variants?.length > 0 && (() => {
                    // find the first existing variant (exclude current edit variant)
                    const sourceVariant = isEdit
                      ? (selectedProduct.variants.find(v => Number(v.id) !== Number(variant?.id)) || selectedProduct.variants[0])
                      : selectedProduct.variants[0];
                    if (!sourceVariant?.attributes) return null;
                    return (
                      <button
                        type="button"
                        title="Copy values from first existing variant"
                        onClick={() => {
                          const copied = {};
                          optionKeys.forEach(k => { copied[k] = sourceVariant.attributes[k] || ''; });
                          setAttributes(copied);
                          toast.success('Variant values copied!');
                        }}
                        className="flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-brand-gold border border-neutral-200 hover:border-brand-gold px-2.5 py-1.5 rounded-lg transition-colors bg-white shadow-sm"
                      >
                        <Copy size={13} /> Copy Existing
                      </button>
                    );
                  })()}
                </div>

                {optionKeys.length === 0 ? (
                  <p className="text-xs text-brand-grey italic">
                    This product does not have custom option types defined in Section 4.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {optionKeys.map(key => {
                      return (
                        <VariantAttributeChips
                          key={key}
                          label={key}
                          value={attributes[key] || ''}
                          onChange={(val) => handleAttributeChange(key, val)}
                          suggestions={[]}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Core Fields Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* SKU Code Input */}
              <div>
                <label className="block text-xs font-semibold text-brand-grey mb-1.5" htmlFor="var-sku">SKU Code *</label>
                <input
                  id="var-sku"
                  type="text"
                  required
                  value={sku}
                  onChange={e => setSku(e.target.value)}
                  placeholder="e.g. VAR-SKU-001"
                  className="w-full border border-brand-light px-3 py-2 text-sm focus:outline-none focus:border-brand-gold rounded-md font-mono uppercase"
                />
              </div>

              {/* Warehouse Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-brand-grey mb-1.5" htmlFor="var-warehouse">Warehouse</label>
                <select
                  id="var-warehouse"
                  value={warehouseId}
                  onChange={e => setWarehouseId(e.target.value)}
                  className="w-full border border-brand-light bg-white px-3 py-2 text-sm focus:outline-none focus:border-brand-gold transition-colors rounded-md"
                >
                  <option value="">Select Warehouse</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name} ({w.city})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-grey mb-1.5" htmlFor="var-price">Selling Price (₹) *</label>
                <input
                  id="var-price"
                  type="number"
                  required
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full border border-brand-light px-3 py-2 text-sm focus:outline-none focus:border-brand-gold rounded-md font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-grey mb-1.5" htmlFor="var-mrp">MRP (₹)</label>
                <input
                  id="var-mrp"
                  type="number"
                  value={mrp}
                  onChange={e => setMrp(e.target.value)}
                  placeholder="0.00"
                  className="w-full border border-brand-light px-3 py-2 text-sm focus:outline-none focus:border-brand-gold rounded-md font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-grey mb-1.5" htmlFor="var-stock">Stock QTY *</label>
                <input
                  id="var-stock"
                  type="number"
                  required
                  value={stock}
                  onChange={e => setStock(e.target.value)}
                  placeholder="0"
                  className="w-full border border-brand-light px-3 py-2 text-sm focus:outline-none focus:border-brand-gold rounded-md font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-grey mb-1.5" htmlFor="var-threshold">Low Stock Threshold</label>
                <input
                  id="var-threshold"
                  type="number"
                  value={lowStockThreshold}
                  onChange={e => setLowStockThreshold(e.target.value)}
                  placeholder="10"
                  className="w-full border border-brand-light px-3 py-2 text-sm focus:outline-none focus:border-brand-gold rounded-md font-sans"
                />
              </div>


            </div>

            {/* Main Variant Image Input (Dashed Dropzone & Rounded Preview Card) */}
            <div className="pt-2 border-t border-neutral-200 space-y-1.5">
              <label className="block text-xs font-semibold text-neutral-700">
                Main Variant Image * • Recommended 400×400px (1:1) • Max: 3MB
              </label>

              {mainImagePreview ? (
                <div className="relative w-28 h-28 border border-neutral-300 rounded-2xl overflow-hidden shadow-md group bg-neutral-900">
                  <img src={getImageUrl(mainImagePreview)} alt="Main Variant" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setMainImageFile(null);
                      setMainImagePreview('');
                    }}
                    className="absolute top-2 right-2 bg-black/80 hover:bg-red-600 text-white p-1 rounded-full shadow-lg transition-colors"
                    title="Remove Main Image"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <label className="border-2 border-dashed border-neutral-300 hover:border-brand-gold bg-white hover:bg-neutral-50/50 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all group">
                  <div className="flex items-center gap-1.5 text-xs text-neutral-500 font-medium group-hover:text-neutral-800">
                    <Camera size={16} className="text-neutral-400 group-hover:text-brand-gold" />
                    <span>Click to <strong>browse</strong> or <strong>drag & drop</strong></span>
                  </div>
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleMainImageChange} className="hidden" />
                </label>
              )}
            </div>

            {/* Variant Gallery (Up to 5 Images) */}
            <div className="pt-2 border-t border-neutral-200 space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-bold text-neutral-800">Variant Gallery (Max 5 Images)</label>
                <span className="text-xs font-mono font-semibold text-brand-gold bg-brand-gold/10 px-2 py-0.5 rounded">
                  {existingImages.length + newImageFiles.length} / 5
                </span>
              </div>

              <div className="grid grid-cols-5 gap-3">
                {existingImages.map((imgUrl, idx) => (
                  <div key={`existing-${idx}`} className="relative aspect-square border border-neutral-300 rounded-md overflow-hidden bg-neutral-100 shadow-sm">
                    <img src={getImageUrl(imgUrl)} alt={`Variant ${idx + 1}`} className="w-full h-full object-cover" />
                    <span className="absolute top-1 left-1 bg-black/70 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                      #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeExistingImage(idx)}
                      className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-90 hover:opacity-100 shadow"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}

                {newImageFiles.map((file, idx) => {
                  const globalPos = existingImages.length + idx + 1;
                  return (
                    <div key={`new-${idx}`} className="relative aspect-square border-2 border-brand-gold/60 rounded-md overflow-hidden bg-neutral-100 shadow-sm">
                      <img src={file.preview} alt={`Upload ${globalPos}`} className="w-full h-full object-cover" />
                      <span className="absolute top-1 left-1 bg-brand-gold text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                        #{globalPos}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeNewFile(idx)}
                        className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-90 hover:opacity-100 shadow"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  );
                })}

                {existingImages.length + newImageFiles.length < 5 && (
                  <label className="aspect-square border-2 border-dashed border-neutral-300 hover:border-brand-gold flex flex-col items-center justify-center text-neutral-400 hover:text-brand-gold cursor-pointer rounded-md bg-neutral-50 transition-colors">
                    <Plus size={20} />
                    <span className="text-[10px] font-semibold mt-1">Add Photo</span>
                    <input
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleMultipleFilesSelect}
                    />
                  </label>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-6 border-t border-brand-light">
            <button type="button" onClick={onClose} className="w-full border border-brand-light py-3 font-semibold text-xs tracking-wider uppercase text-neutral-800 hover:bg-neutral-50 transition-colors">Cancel</button>
            <button type="submit" className="w-full bg-neutral-950 text-white hover:bg-neutral-800 py-3 font-semibold text-xs tracking-wider uppercase transition-colors">Save Variant</button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const VariantsAdminPage = () => {
  const [variants, setVariants] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [vRes, pRes, wRes] = await Promise.all([
        api.get('/variants'),
        api.get('/products?limit=1000'),
        api.get('/warehouses')
      ]);
      setVariants(vRes.data.variants || []);
      setProducts(pRes.data.products || []);
      setWarehouses(wRes.data.warehouses || []);
    } catch (err) {
      toast.error('Failed to load variants database');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleSave = async (formData) => {
    try {
      if (editing) {
        await api.put(`/variants/update/${editing.id}`, formData);
        toast.success('Variant updated successfully');
      } else {
        await api.post('/variants/add', formData);
        toast.success('Variant created successfully');
      }
      setModalOpen(false);
      setEditing(null);
      fetchInitialData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save variant');
    }
  };

  const executeDelete = async (id) => {
    try {
      const res = await api.delete(`/variants/${id}`);
      const data = res.data;

      if (data.cascadeDeletedProduct) {
        toast.success(`Last variant deleted — product has been removed from the catalog.`);
      } else {
        toast.success('Variant deleted. Product default updated to next available variant.');
      }

      fetchInitialData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete variant');
    }
  };

  const handleDelete = (id) => {
    const targetVar = variants.find(v => Number(v.id) === Number(id));

    // Count how many variants this product has (using local state for UI context)
    const prodVariants = targetVar
      ? variants.filter(v => Number(v.productId) === Number(targetVar.productId))
      : [];

    const isLastVariant = prodVariants.length <= 1;
    const productName = targetVar?.product?.name || 'this product';
    const variantSku = targetVar?.sku || 'this variant';

    // ── CASE: Last remaining variant → cascade warning ───────────────────────
    if (isLastVariant) {
      toast((t) => (
        <div className="flex flex-col items-start gap-2.5 p-1 max-w-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-600 shrink-0" />
            <p className="text-sm font-bold text-neutral-900">Delete Last Variant?</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 text-xs text-red-800 leading-relaxed">
            <strong>{variantSku}</strong> is the last variant of <strong>{productName}</strong>.
            <br />Deleting it will <strong>permanently remove the entire product</strong> from the catalog.
          </div>
          <div className="flex items-center gap-2.5 w-full mt-1">
            <button
              onClick={() => { toast.dismiss(t.id); executeDelete(id); }}
              className="flex-1 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider transition-colors rounded shadow-sm"
            >
              Yes, Delete Both
            </button>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="flex-1 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold uppercase tracking-wider transition-colors rounded border border-neutral-200"
            >
              Cancel
            </button>
          </div>
        </div>
      ), { duration: 8000, position: 'top-center' });
      return;
    }

    // ── CASE: Multiple variants exist → standard confirmation ─────────────────
    toast((t) => (
      <div className="flex flex-col items-center text-center gap-2 p-1">
        <p className="text-sm font-semibold text-neutral-800">Confirm Deletion</p>
        <p className="text-xs text-neutral-600 max-w-xs">
          Delete variant <strong>{variantSku}</strong>? The product's default variant will automatically update to the next available option.
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
    ), { duration: 6000, position: 'top-center' });
  };

  // Filter variants based on search (product name or SKU) and product selection
  const filteredVariants = variants.filter(v => {
    const matchesSearch = v.sku?.toLowerCase().includes(search.toLowerCase()) || 
                          v.product?.name?.toLowerCase().includes(search.toLowerCase());
    const matchesProduct = productFilter === '' || Number(v.productId) === Number(productFilter);
    return matchesSearch && matchesProduct;
  });

  const { admin } = useSelector((s) => s.auth);
  const canAddVariant = checkPermission(admin, 'add_variant');
  const canEditVariant = checkPermission(admin, 'edit_variant');
  const canDeleteVariant = checkPermission(admin, 'delete_variant');
  const canShowActions = canEditVariant || canDeleteVariant;

  const variantHeaders = ['Image', 'Product', 'SKU', 'Attributes', 'Warehouse', 'Selling Price', 'MRP', 'Stock'];
  if (canShowActions) variantHeaders.push('Actions');

  return (
    <AdminLayout title="Variants">
      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-grey" />
          <input
            type="search"
            placeholder="Search SKU or Product..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-brand-light text-sm focus:outline-none focus:border-brand-gold"
          />
        </div>

        {/* Product Filter */}
        <select
          value={productFilter}
          onChange={e => setProductFilter(e.target.value)}
          className="border border-brand-light bg-white px-3 py-2 text-sm focus:outline-none focus:border-brand-gold max-w-xs"
        >
          <option value="">All Products</option>
          {products.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        {canAddVariant && (
          <button onClick={() => { setEditing(null); setModalOpen(true); }} className="btn-primary flex items-center gap-2 whitespace-nowrap">
            <Plus size={16} /> Add Variant
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-brand-light flex items-center justify-between">
          <p className="text-sm text-brand-grey">{filteredVariants.length} variants found</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label="Variants table">
            <thead>
              <tr className="bg-brand-light/40 text-left">
                {variantHeaders.map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-brand-grey uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="border-b border-brand-light">
                    {[...Array(variantHeaders.length)].map((_, j) => <td key={j} className="px-4 py-3"><div className="skeleton h-4 w-16" /></td>)}
                  </tr>
                ))
              ) : filteredVariants.length === 0 ? (
                <tr>
                  <td colSpan={variantHeaders.length} className="px-4 py-8 text-center text-brand-grey italic">No variants found matching criteria</td>
                </tr>
              ) : (
                filteredVariants.map(variant => {
                  let rawAttrs = variant.attributes;
                  for (let k = 0; k < 4; k++) {
                    if (typeof rawAttrs === 'string') {
                      try { rawAttrs = JSON.parse(rawAttrs); } catch { break; }
                    }
                  }
                  if (Array.isArray(rawAttrs) && rawAttrs.length > 0) rawAttrs = rawAttrs[0];

                  const attributesStr = (rawAttrs && typeof rawAttrs === 'object')
                    ? Object.entries(rawAttrs)
                        .filter(([k, v]) => v !== undefined && v !== null && v !== '' && !['id', 'sku', 'price', 'stock'].includes(k))
                        .map(([k, v]) => (k.toLowerCase() === 'variant' ? String(v) : `${k}: ${v}`))
                        .join(' · ')
                    : (typeof rawAttrs === 'string' && rawAttrs !== '{}' ? rawAttrs : '');

                  const prodVariants = variants.filter(v => Number(v.productId) === Number(variant.productId));
                  const isLastVariant = prodVariants.length <= 1;

                return (
                  <tr key={variant.id} className="border-b border-brand-light hover:bg-brand-light/20 transition-colors">
                    <td className="px-4 py-3">
                      <img 
                        src={getImageUrl(variant.image || variant.product?.images?.[0]) || 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=80'} 
                        alt="Variant" 
                        className="w-10 h-12 object-cover rounded" 
                      />
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium line-clamp-1">{variant.product?.name || '—'}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{variant.sku}</td>
                    <td className="px-4 py-3 text-brand-grey font-medium text-xs">
                      {attributesStr || <span className="italic text-neutral-400">Default Variant</span>}
                    </td>
                    <td className="px-4 py-3 text-brand-grey">
                      {variant.warehouse?.name || '—'}
                    </td>
                    <td className="px-4 py-3 font-semibold">{fmt(variant.price)}</td>
                    <td className="px-4 py-3 font-medium text-brand-grey">{variant.mrp ? fmt(variant.mrp) : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold ${variant.stock <= 5 ? 'text-red-500' : 'text-green-600'}`}>
                        {variant.stock}
                      </span>
                    </td>
                    {canShowActions && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {canEditVariant && <button onClick={() => { setEditing(variant); setModalOpen(true); }} className="p-1.5 text-brand-grey hover:text-brand-gold transition-colors focus-visible:outline-brand-gold" aria-label="Edit"><Edit2 size={14} /></button>}
                          {canDeleteVariant && (
                            <button
                              onClick={() => handleDelete(variant.id)}
                              title={isLastVariant ? 'Delete Variant (will also delete product)' : 'Delete Variant'}
                              className={`p-1.5 transition-colors focus-visible:outline-brand-gold ${
                                isLastVariant
                                  ? 'text-red-400 hover:text-red-600 cursor-pointer'
                                  : 'text-brand-grey hover:text-red-400 cursor-pointer'
                              }`}
                              aria-label="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {modalOpen && (
          <VariantModal 
            variant={editing} 
            products={products} 
            warehouses={warehouses}
            onClose={() => { setModalOpen(false); setEditing(null); }} 
            onSave={handleSave} 
          />
        )}
      </AnimatePresence>
    </AdminLayout>
  );
};

export default VariantsAdminPage;
