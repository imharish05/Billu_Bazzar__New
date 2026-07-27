import { useEffect, useState, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Edit2, Trash2, X, Upload, ChevronLeft, ChevronRight, ChevronDown, Check, Eye, Play, Pause, RotateCw, Sparkles, Box, ShieldCheck, Tag, Camera } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import Switch from '../components/Switch';
import { PaginationTop, PaginationBottom } from '../components/Pagination';
import { fetchAdminProducts, createProduct, updateProduct, deleteProduct } from '../redux/slices/productsSlice';
import currencyJs from 'currency.js';
import toast from 'react-hot-toast';
import api from '../services/api';

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
  return lower;
};

const PRESET_OPTION_NAMES = [
  'Size',
  'Color',
  'Storage',
  'RAM',
  'Processor',
  'Connectivity',
  'Resolution',
  'Refresh Rate',
  'Capacity',
  'Type',
  'Wattage',
  'Band Color',
  'Band Material',
  'Case Size',
  'Fit',
  'Material',
  'Metal Type',
  'Width',
  'Age / Size',
  'Age Range',
  'Finish',
  'Style',
  'Skin Type',
  'SPF',
  'Shade',
  'Hair Type',
  'Concentration',
  'Scent',
  'Weight',
  'Resistance Level',
  'Temp Rating',
  'Frame Size',
  'Wheel Size',
  'Helmet Size',
  'Piece Count',
  'Player Count',
  'Platform',
  'Edition',
  'Format',
  'Language',
];

const PRESET_VALUES_BY_OPTION = {
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

const resolvePresetValues = (optName = '') => {
  if (!optName || !String(optName).trim()) return [];
  const raw = String(optName).trim();

  // 1. Direct match
  if (PRESET_VALUES_BY_OPTION[raw]) {
    return PRESET_VALUES_BY_OPTION[raw].slice(0, 8);
  }

  // 2. Case-insensitive exact match
  const lower = raw.toLowerCase();
  for (const [key, val] of Object.entries(PRESET_VALUES_BY_OPTION)) {
    if (key.toLowerCase() === lower) return val.slice(0, 8);
  }

  // 3. Normalized match (strip trailing 's')
  const norm = lower.replace(/s$/, '');
  for (const [key, val] of Object.entries(PRESET_VALUES_BY_OPTION)) {
    if (key.toLowerCase().replace(/s$/, '') === norm) return val.slice(0, 8);
  }

  // 4. Substring match
  for (const [key, val] of Object.entries(PRESET_VALUES_BY_OPTION)) {
    if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) return val.slice(0, 8);
  }

  // For unselected or custom unrecognized options, return empty array!
  return [];
};

// ── Custom Searchable Combobox Dropdown for Option Type ─────────────────────
const OptionTypeSelect = ({ value, onChange, usedOptions = [] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredPresets = PRESET_OPTION_NAMES.filter(name =>
    name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isExactPreset = PRESET_OPTION_NAMES.some(
    name => name.toLowerCase() === searchTerm.trim().toLowerCase()
  );

  const handleSelect = (selectedName) => {
    const isUsedByOther = usedOptions.some(
      u => String(u || '').trim().toLowerCase() === String(selectedName || '').trim().toLowerCase() &&
           String(u || '').trim().toLowerCase() !== String(value || '').trim().toLowerCase()
    );
    if (isUsedByOther) {
      toast.error(`Option type '${selectedName}' is already added!`);
      return;
    }
    onChange(selectedName);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Trigger Button matching reference UI */}
      <div
        onClick={() => setIsOpen(prev => !prev)}
        className="w-full border border-neutral-300 px-3 py-2 text-xs rounded-lg bg-white flex items-center justify-between cursor-pointer hover:border-brand-gold focus:border-brand-gold transition-colors font-medium text-neutral-800 shadow-sm"
      >
        <span className={value ? 'text-neutral-900 font-semibold' : 'text-neutral-400'}>
          {value || 'Select type...'}
        </span>
        <ChevronDown size={14} className={`text-neutral-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {/* Floating Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-full min-w-[220px] bg-white border border-neutral-200 shadow-2xl rounded-xl z-50 p-2.5 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Search or type custom input box */}
          <input
            type="text"
            autoFocus
            placeholder="Search or type custom..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchTerm.trim()) {
                e.preventDefault();
                handleSelect(searchTerm.trim());
              }
            }}
            className="w-full border border-neutral-300 px-3 py-1.5 text-xs rounded-md focus:outline-none focus:border-brand-gold bg-neutral-50 font-medium text-neutral-800"
          />

          {/* Options List */}
          <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar py-0.5">
            {filteredPresets.map((name) => {
              const isSelected = value && String(value || '').trim().toLowerCase() === name.trim().toLowerCase();
              const isUsedByOther = usedOptions.some(
                u => String(u || '').trim().toLowerCase() === name.trim().toLowerCase() &&
                     String(u || '').trim().toLowerCase() !== String(value || '').trim().toLowerCase()
              );

              return (
                <button
                  key={name}
                  type="button"
                  disabled={isUsedByOther}
                  onClick={() => handleSelect(name)}
                  className={`w-full text-left px-3 py-2 text-xs rounded-md flex items-center justify-between transition-colors ${
                    isSelected
                      ? 'bg-amber-100 text-amber-900 font-bold'
                      : isUsedByOther
                      ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed line-through opacity-60'
                      : 'hover:bg-neutral-100 text-neutral-800 font-medium'
                  }`}
                >
                  <span>{name}</span>
                  {isSelected && <Check size={14} className="text-amber-800" />}
                  {isUsedByOther && <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Added</span>}
                </button>
              );
            })}

            {/* Custom option prompt if user types custom name */}
            {searchTerm.trim() && !isExactPreset && (
              <button
                type="button"
                onClick={() => handleSelect(searchTerm.trim())}
                className="w-full text-left px-3 py-2 text-xs rounded-md bg-amber-50 hover:bg-amber-100 text-amber-900 font-semibold flex items-center gap-1.5 mt-1 border border-amber-200 transition-colors"
              >
                <Plus size={13} /> Add "{searchTerm.trim()}"
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const EMPTY_FORM = {
  name: '', slug: '', shortDescription: '', description: '', price: '', comparePrice: '',
  stock: '', sku: '', categoryId: '', subCategoryId: '', subSubCategoryId: '', vendorId: '', warehouseId: '',
  isFeatured: false, isNewArrival: false, isBestSeller: false, hasAuthenticityBadge: false, isActive: true,
  has360View: false, hasVideo: false, videoUrl: '', defaultProductImage: null,
};

// ── Interactive 360 Spin Preview Box Component ──────────────────────────────
const SpinViewerPreview = ({ images }) => {
  const [frameIndex, setFrameIndex] = useState(0);
  const [isAutoSpin, setIsAutoSpin] = useState(false);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);

  const totalFrames = images.length;

  useEffect(() => {
    if (!isAutoSpin || totalFrames === 0) return;
    const interval = setInterval(() => {
      setFrameIndex(prev => (prev + 1) % totalFrames);
    }, 100);
    return () => clearInterval(interval);
  }, [isAutoSpin, totalFrames]);

  const handleMouseDown = (e) => {
    isDraggingRef.current = true;
    startXRef.current = e.clientX;
  };

  const handleMouseMove = (e) => {
    if (!isDraggingRef.current || totalFrames === 0) return;
    const deltaX = e.clientX - startXRef.current;
    if (Math.abs(deltaX) > 10) {
      const step = deltaX > 0 ? 1 : -1;
      setFrameIndex(prev => (prev + step + totalFrames) % totalFrames);
      startXRef.current = e.clientX;
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  if (totalFrames === 0) return null;

  return (
    <div className="bg-neutral-900 rounded-lg p-4 text-white border border-neutral-800 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RotateCw size={14} className="text-brand-gold animate-spin-slow" />
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-200">360° Preview</span>
        </div>
        <button
          type="button"
          onClick={() => setIsAutoSpin(!isAutoSpin)}
          className={`px-2.5 py-1 text-[11px] font-semibold rounded flex items-center gap-1 transition-colors ${
            isAutoSpin ? 'bg-brand-gold text-black' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
          }`}
        >
          {isAutoSpin ? <Pause size={12} /> : <Play size={12} />}
          {isAutoSpin ? 'Pause' : 'Auto Rotate'}
        </button>
      </div>

      <div
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="relative aspect-square max-h-64 mx-auto bg-neutral-950 rounded overflow-hidden cursor-grab active:cursor-grabbing border border-neutral-800 flex items-center justify-center select-none"
      >
        <img
          src={images[frameIndex]}
          alt={`360 Frame ${frameIndex + 1}`}
          className="w-full h-full object-contain pointer-events-none"
        />
        <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-0.5 rounded text-[10px] font-mono text-brand-gold">
          Frame {frameIndex + 1} / {totalFrames}
        </div>
        <div className="absolute top-2 right-2 bg-black/60 px-2 py-0.5 rounded text-[9px] text-neutral-400">
          Drag left/right to rotate
        </div>
      </div>
    </div>
  );
};

// ── Storefront Product Live Preview Modal ────────────────────────────────────
const ProductLivePreviewModal = ({ product, onClose }) => {
  const [activeImg, setActiveImg] = useState(product.defaultProductImage || product.images?.[0] || 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=600');
  const [activeTab, setActiveTab] = useState('gallery'); // 'gallery' | 'spin' | 'video'

  const images = product.images && product.images.length > 0 ? product.images : [activeImg];
  const spinImages = product.spin_images || [];
  const discountPct = product.comparePrice && product.comparePrice > product.price
    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
    : 0;

  const attributes = typeof product.attributes === 'string' ? JSON.parse(product.attributes) : (product.attributes || {});

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-white rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-neutral-900 text-white flex items-center justify-between border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Eye size={18} className="text-brand-gold" />
            <div>
              <h2 className="font-playfair text-lg font-semibold">Storefront Live Preview</h2>
              <p className="text-[11px] text-neutral-400">Live Customer View Showcase</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-neutral-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-8">
          
          {/* Card View Preview */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-gold mb-3">1. Product Card View (Listing Page)</h3>
            <div className="w-full max-w-xs bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden group">
              <div className="relative aspect-[4/5] bg-neutral-100 overflow-hidden">
                <img src={activeImg} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                {discountPct > 0 && (
                  <span className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                    {discountPct}% OFF
                  </span>
                )}
                {product.showAuthenticity && (
                  <span className="absolute top-2 right-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck size={10} /> Authentic
                  </span>
                )}
              </div>
              <div className="p-4 space-y-2">
                <p className="text-xs text-neutral-500 font-medium">{product.category?.name || 'Category'}</p>
                <h4 className="font-playfair text-base font-semibold text-neutral-900 line-clamp-1">{product.name || 'Untitled Product'}</h4>
                <div className="flex items-baseline gap-2">
                  <span className="text-base font-bold text-neutral-900">{fmt(product.price || 0)}</span>
                  {product.comparePrice > 0 && (
                    <span className="text-xs text-neutral-400 line-through">{fmt(product.comparePrice)}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Full Showcase View */}
          <div className="border-t border-neutral-200 pt-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-gold mb-3">2. Product Details View (PDP)</h3>
            
            <div className="grid md:grid-cols-2 gap-8 bg-neutral-50 p-6 rounded-xl border border-neutral-200">
              
              {/* Media Section */}
              <div className="space-y-4">
                {/* Media Tabs */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveTab('gallery')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${activeTab === 'gallery' ? 'bg-neutral-900 text-white' : 'bg-white border border-neutral-200 text-neutral-700'}`}
                  >
                    Gallery ({images.length})
                  </button>
                  {product.has360View && spinImages.length > 0 && (
                    <button
                      onClick={() => setActiveTab('spin')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${activeTab === 'spin' ? 'bg-neutral-900 text-white' : 'bg-white border border-neutral-200 text-neutral-700'}`}
                    >
                      360° View ({spinImages.length})
                    </button>
                  )}
                  {product.hasVideo && (product.videoUrl || product.videoFile) && (
                    <button
                      onClick={() => setActiveTab('video')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${activeTab === 'video' ? 'bg-neutral-900 text-white' : 'bg-white border border-neutral-200 text-neutral-700'}`}
                    >
                      Showcase Video
                    </button>
                  )}
                </div>

                {/* Display Media */}
                {activeTab === 'gallery' && (
                  <div className="space-y-3">
                    <div className="aspect-[4/5] bg-white rounded-lg border border-neutral-200 overflow-hidden">
                      <img src={activeImg} alt={product.name} className="w-full h-full object-cover" />
                    </div>
                    {images.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {images.map((img, i) => (
                          <button
                            key={i}
                            onClick={() => setActiveImg(img)}
                            className={`w-14 h-14 rounded overflow-hidden border-2 flex-shrink-0 ${activeImg === img ? 'border-brand-gold' : 'border-neutral-200'}`}
                          >
                            <img src={img} alt={`Thumb ${i}`} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'spin' && (
                  <SpinViewerPreview images={spinImages} />
                )}

                {activeTab === 'video' && (
                  <div className="aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center border border-neutral-800">
                    {product.videoUrl ? (
                      <video src={product.videoUrl} controls className="w-full h-full object-contain" />
                    ) : (
                      <p className="text-xs text-neutral-400">Video file attached</p>
                    )}
                  </div>
                )}
              </div>

              {/* Details Section */}
              <div className="space-y-4">
                <div>
                  <span className="text-xs text-brand-gold font-bold uppercase tracking-wider">{product.category?.name || 'Category'}</span>
                  <h2 className="font-playfair text-2xl font-bold text-neutral-900 mt-1">{product.name || 'Untitled Product'}</h2>
                  <p className="text-xs text-neutral-500 font-mono mt-0.5">SKU: {product.sku || 'N/A'}</p>
                </div>

                <div className="flex items-baseline gap-3">
                  <span className="text-2xl font-bold text-neutral-900">{fmt(product.price || 0)}</span>
                  {product.comparePrice > 0 && (
                    <span className="text-base text-neutral-400 line-through">{fmt(product.comparePrice)}</span>
                  )}
                </div>

                {product.shortDescription && (
                  <p className="text-xs text-neutral-600 leading-relaxed border-t border-b border-neutral-200 py-3">{product.shortDescription}</p>
                )}

                {/* Attributes / Options */}
                {Object.keys(attributes).length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">Specifications & Attributes</h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(attributes).map(([k, v]) => (
                        <div key={k} className="bg-white border border-neutral-200 px-3 py-1.5 rounded text-xs flex items-center gap-2">
                          <span className="font-semibold text-neutral-500">{k}:</span>
                          <span className="font-bold text-neutral-900">{v}</span>
                          {k.toLowerCase() === 'color' && (
                            <span className="w-3 h-3 rounded-full border border-neutral-300" style={{ backgroundColor: v.startsWith('#') ? v : '#000' }} />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}



                <div className="flex items-center gap-3 text-xs pt-2">
                  <span className={`px-2.5 py-1 rounded font-bold ${product.stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {product.stock > 0 ? `In Stock (${product.stock} units)` : 'Out of Stock'}
                  </span>
                  {product.showAuthenticity && (
                    <span className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded font-bold flex items-center gap-1">
                      <ShieldCheck size={12} /> 100% Certified Authentic
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// ── Product Add / Edit Modal Component ──────────────────────────────────────
const ProductModal = ({ product, onClose, onSave }) => {
  const [form, setForm] = useState(product ? {
    name: product.name || '',
    sku: product.sku || '',
    slug: product.slug || '',
    shortDescription: product.shortDescription || '',
    description: product.description || '',
    price: product.price || '',
    comparePrice: product.comparePrice || '',
    stock: product.stock !== undefined ? product.stock : '0',
    categoryId: product.categoryId || '',
    subCategoryId: product.subCategoryId || '',
    subSubCategoryId: product.subSubCategoryId || '',
    vendorId: product.vendorId || '',
    warehouseId: product.warehouseId || '',
    isFeatured: Boolean(product.isFeatured),
    isNewArrival: Boolean(product.isNewArrival),
    isBestSeller: Boolean(product.isBestSeller),
    hasAuthenticityBadge: Boolean(product.showAuthenticity),
    isActive: product.isActive !== undefined ? Boolean(product.isActive) : true,
    has360View: Boolean(product.has360View || (product.spin_images && product.spin_images.length > 0)),
    hasVideo: Boolean(product.hasVideo || product.videoUrl),
    videoUrl: product.videoUrl || '',
    defaultProductImage: product.defaultProductImage || product.images?.[0] || null,
  } : { ...EMPTY_FORM });

  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [subSubCategories, setSubSubCategories] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [warehouses, setWarehouses] = useState([]);

  // Inline Custom Subcategory and SubSubcategory creation states
  const [customSubCategoryName, setCustomSubCategoryName] = useState('');
  const [isCustomSubCategory, setIsCustomSubCategory] = useState(false);
  const [customSubSubCategoryName, setCustomSubSubCategoryName] = useState('');
  const [isCustomSubSubCategory, setIsCustomSubSubCategory] = useState(false);

  // Live Storefront Preview state inside modal
  const [previewOpen, setPreviewOpen] = useState(false);

  // Dynamic Key-Value Option Rows with Color Support
  const [optionRows, setOptionRows] = useState(() => {
    if (product && product.attributes && Object.keys(product.attributes).length > 0) {
      const attrs = typeof product.attributes === 'string' ? JSON.parse(product.attributes) : product.attributes;
      if (Array.isArray(attrs)) {
        return attrs.map((item, i) => {
          const k = String(item?.key || item?.name || item?.optionName || `Option ${i + 1}`);
          const v = item?.values || item?.value || item?.optionValue || '';
          const valStr = Array.isArray(v) ? v.join(', ') : (v !== null && v !== undefined ? String(v) : '');
          return {
            id: Date.now() + i,
            optionName: k,
            optionValue: valStr,
            colorHex: k.toLowerCase() === 'color' && valStr.startsWith('#') ? valStr : '#8B0000',
          };
        });
      }
      return Object.entries(attrs).map(([k, v], i) => {
        const keyStr = String(k || '');
        const valStr = Array.isArray(v) ? v.join(', ') : (v !== null && v !== undefined ? String(v) : '');
        return {
          id: Date.now() + i,
          optionName: keyStr,
          optionValue: valStr,
          colorHex: keyStr.toLowerCase() === 'color' && valStr.startsWith('#') ? valStr : '#8B0000',
        };
      });
    }
    return [{ id: Date.now(), optionName: 'Size', optionValue: '', colorHex: '#8B0000' }];
  });

  // Product Variants Matrix State
  const [productVariants, setProductVariants] = useState(() => {
    if (product && Array.isArray(product.variants) && product.variants.length > 0) {
      return product.variants.map((v, idx) => ({
        id: v.id || Date.now() + idx,
        sku: v.sku || '',
        price: v.price !== undefined ? String(v.price) : '',
        mrp: v.mrp !== undefined ? String(v.mrp) : '',
        stock: v.stock !== undefined ? String(v.stock) : '0',
        attributes: v.attributes || {},
        existingImages: Array.isArray(v.images) ? v.images : (v.image ? [v.image] : []),
        newFiles: [],
      }));
    }
    return [];
  });

  // Real-time auto-sync variant combinations from Section 4 optionRows
  useEffect(() => {
    const validRows = optionRows.filter(r => {
      const name = String(r.optionName || '');
      const val = Array.isArray(r.optionValue) ? r.optionValue.join(', ') : String(r.optionValue || '');
      return name.trim() !== '' && val.trim() !== '';
    });
    if (validRows.length === 0) {
      setProductVariants([]);
      return;
    }

    const optionMap = [];
    validRows.forEach(r => {
      const name = String(r.optionName || '').trim();
      const valStr = Array.isArray(r.optionValue) ? r.optionValue.join(', ') : String(r.optionValue || '');
      const vals = valStr.split(',').map(v => v.trim()).filter(Boolean);
      if (vals.length > 0) {
        optionMap.push({ name, vals });
      }
    });

    if (optionMap.length === 0) {
      setProductVariants([]);
      return;
    }

    const cartesian = (arrays) => {
      return arrays.reduce((acc, curr) => {
        return acc.flatMap(d => curr.vals.map(e => ({ ...d, [curr.name]: e })));
      }, [{}]);
    };

    const combinations = cartesian(optionMap);

    setProductVariants(prev => {
      const existingMap = new Map();
      prev.forEach(v => {
        const key = Object.entries(v.attributes || {}).sort().map(([k, val]) => `${k}:${val}`).join('|');
        existingMap.set(key, v);
      });

      return combinations.map((combo, idx) => {
        const key = Object.entries(combo).sort().map(([k, val]) => `${k}:${val}`).join('|');
        const existing = existingMap.get(key);

        if (existing) {
          return { ...existing, attributes: combo };
        }

        const comboLabel = Object.values(combo).join('-');
        const skuCode = form.sku ? `${form.sku}-${comboLabel}`.toUpperCase().replace(/\s+/g, '') : `PV-${Date.now()}-${idx + 1}`;

        return {
          id: Date.now() + Math.random() + idx,
          sku: skuCode,
          attributes: combo,
          existingImages: [],
          newFiles: [],
        };
      });
    });
  }, [optionRows, form.sku]);

  const removeVariantRow = (variantId) => {
    setProductVariants(prev => prev.filter(v => v.id !== variantId));
  };

  const updateVariantRow = (variantId, field, val) => {
    setProductVariants(prev => prev.map(v => v.id === variantId ? { ...v, [field]: val } : v));
  };

  const updateVariantAttribute = (variantId, attrKey, attrVal) => {
    setProductVariants(prev => {
      const target = prev.find(v => v.id === variantId);
      if (!target) return prev;

      const nextAttrs = { ...(target.attributes || {}), [attrKey]: attrVal };

      const conflict = prev.some(v => {
        if (v.id === variantId) return false;
        const eAttrs = v.attributes || {};
        const keysA = Object.keys(eAttrs).sort();
        const keysB = Object.keys(nextAttrs).sort();
        if (keysA.length !== keysB.length) return false;
        return keysA.every(k => String(eAttrs[k]).trim().toLowerCase() === String(nextAttrs[k]).trim().toLowerCase());
      });

      if (conflict) {
        const label = Object.entries(nextAttrs).map(([k, v]) => `${k}: ${v}`).join(', ');
        toast.error(`Variant combination '${label}' already exists!`);
        return prev;
      }

      return prev.map(v => v.id === variantId ? { ...v, attributes: nextAttrs } : v);
    });
  };

  const handleVariantRowFilesSelect = (variantId, e) => {
    const files = Array.from(e.target.files || []);
    setProductVariants(prev => prev.map(v => {
      if (v.id !== variantId) return v;
      const remaining = 10 - ((v.existingImages?.length || 0) + (v.newFiles?.length || 0));
      if (remaining <= 0) {
        toast.error('Maximum 10 images per variant allowed');
        return v;
      }
      const selected = files.slice(0, remaining).map(file => {
        file.preview = URL.createObjectURL(file);
        return file;
      });
      return { ...v, newFiles: [...(v.newFiles || []), ...selected] };
    }));
  };

  const removeVariantRowImage = (variantId, isNew, idx) => {
    setProductVariants(prev => prev.map(v => {
      if (v.id !== variantId) return v;
      if (isNew) {
        return { ...v, newFiles: v.newFiles.filter((_, i) => i !== idx) };
      } else {
        return { ...v, existingImages: v.existingImages.filter((_, i) => i !== idx) };
      }
    }));
  };

  // Image Upload States
  const [defaultProductImageFile, setDefaultProductImageFile] = useState(null);
  const [defaultProductImagePreview, setDefaultProductImagePreview] = useState(form.defaultProductImage);

  // Variant Gallery Images
  const [existingVariantImages, setExistingVariantImages] = useState(product ? [...(product.images || [])] : []);
  const [newVariantImageFiles, setNewVariantImageFiles] = useState([]);

  // 360 Spin Images
  const [existingSpinImages, setExistingSpinImages] = useState(product ? [...(product.spin_images || [])] : []);
  const [newSpinImageFiles, setNewSpinImageFiles] = useState([]);
  const [draggedSpinIdx, setDraggedSpinIdx] = useState(null);

  const handleSpinDragStart = (e, index) => {
    setDraggedSpinIdx(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleSpinDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleSpinDrop = (e, targetIdx) => {
    e.preventDefault();
    if (draggedSpinIdx === null || draggedSpinIdx === targetIdx) return;

    if (draggedSpinIdx < existingSpinImages.length && targetIdx < existingSpinImages.length) {
      setExistingSpinImages(prev => {
        const updated = [...prev];
        const [moved] = updated.splice(draggedSpinIdx, 1);
        updated.splice(targetIdx, 0, moved);
        return updated;
      });
    } else if (draggedSpinIdx >= existingSpinImages.length && targetIdx >= existingSpinImages.length) {
      const relStart = draggedSpinIdx - existingSpinImages.length;
      const relTarget = targetIdx - existingSpinImages.length;
      setNewSpinImageFiles(prev => {
        const updated = [...prev];
        const [moved] = updated.splice(relStart, 1);
        updated.splice(relTarget, 0, moved);
        return updated;
      });
    }
    setDraggedSpinIdx(null);
  };

  // Video File
  const [videoFile, setVideoFile] = useState(null);

  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [catRes, subRes, subSubRes, venRes, whRes] = await Promise.all([
          api.get('/categories?all=true'),
          api.get('/subcategories?all=true'),
          api.get('/subsubcategories?all=true'),
          api.get('/vendors'),
          api.get('/warehouses')
        ]);
        setCategories(catRes.data.categories || []);
        setSubCategories(subRes.data.subCategories || []);
        setSubSubCategories(subSubRes.data.subSubCategories || []);
        setVendors(venRes.data.vendors || (venRes.data.success ? venRes.data.vendors : []));
        const whList = whRes.data.warehouses || [];
        setWarehouses(whList);
        
        // Auto select fulfillment warehouse if none selected
        if (!form.warehouseId && whList.length > 0) {
          const defaultWh = whList.find(w => w.isFulfillment) || whList[0];
          if (defaultWh) {
            setForm(p => ({ ...p, warehouseId: defaultWh.id }));
          }
        }
      } catch (err) {
        console.error('Error fetching metadata', err);
      }
    };
    loadMetadata();
  }, []);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleNameChange = (nameVal) => {
    setForm(p => {
      const isSkuAuto = !p.sku || p.sku.startsWith('SKU-') || p.sku.startsWith('PROD-');
      let newSku = p.sku;
      if (isSkuAuto) {
        const cleanCode = nameVal.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
        newSku = cleanCode ? `SKU-${cleanCode}` : '';
      }
      return { ...p, name: nameVal, sku: newSku };
    });
  };

  // Filtered Subcategories & SubSubcategories
  const filteredSubCategories = subCategories.filter(
    sub => Number(sub.categoryId) === Number(form.categoryId)
  );

  const filteredSubSubCategories = subSubCategories.filter(
    ss => Number(ss.subCategoryId) === Number(form.subCategoryId)
  );

  const handleCategoryChange = (val) => {
    setForm(p => ({ ...p, categoryId: val, subCategoryId: '', subSubCategoryId: '' }));
  };

  const handleSubCategoryChange = (val) => {
    setForm(p => ({ ...p, subCategoryId: val, subSubCategoryId: '' }));
  };

  // Rich Text Editor Ref & Helpers
  const richEditorRef = useRef(null);

  // Seed editor content when editing an existing product
  useEffect(() => {
    if (richEditorRef.current && form.description) {
      richEditorRef.current.innerHTML = form.description;
    }
    // Only run on mount — we don't want to reset on every form change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyRichTextCommand = (command, value = null) => {
    richEditorRef.current?.focus();

    // Smart "Normal" — exit any active list before switching to paragraph
    if (command === 'formatBlock' && value === 'P') {
      const selection = window.getSelection();
      if (selection && selection.rangeCount) {
        let node = selection.getRangeAt(0).startContainer;
        if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
        let cursor = node;
        while (cursor && cursor !== richEditorRef.current) {
          if (cursor.tagName === 'UL') {
            document.execCommand('insertUnorderedList'); // toggles UL off
            break;
          }
          if (cursor.tagName === 'OL') {
            document.execCommand('insertOrderedList'); // toggles OL off
            break;
          }
          cursor = cursor.parentNode;
        }
      }
    }

    document.execCommand(command, false, value);
    // Sync HTML back to form state after command
    if (richEditorRef.current) {
      set('description', richEditorRef.current.innerHTML);
    }
  };

  // Exit list on Enter when current <li> is empty
  const handleEditorKeyDown = (e) => {
    if (e.key !== 'Enter') return;

    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    // Walk up from cursor to find the nearest <li>
    let node = selection.getRangeAt(0).startContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;

    let li = null;
    let cursor = node;
    while (cursor && cursor !== richEditorRef.current) {
      if (cursor.tagName === 'LI') { li = cursor; break; }
      cursor = cursor.parentNode;
    }

    if (li && li.textContent.trim() === '') {
      // Empty list item — break out of the list and insert a normal paragraph
      e.preventDefault();
      const parentList = li.parentNode; // UL or OL
      const listParent = parentList?.parentNode;

      // Remove the empty <li>
      parentList.removeChild(li);

      // Remove the list element too if it became empty
      if (parentList && parentList.children.length === 0) {
        listParent?.removeChild(parentList);
      }

      // Insert a fresh <p> after the list
      const p = document.createElement('p');
      p.innerHTML = '<br>'; // keeps the block focusable

      if (listParent) {
        // Insert after the list (or after where it was)
        const refNode = parentList.parentNode ? parentList.nextSibling : null;
        richEditorRef.current.insertBefore(p, refNode);
      } else {
        richEditorRef.current.appendChild(p);
      }

      // Move cursor into the new paragraph
      const range = document.createRange();
      range.setStart(p, 0);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);

      if (richEditorRef.current) {
        set('description', richEditorRef.current.innerHTML);
      }
    }
  };

  // Option Row Handlers
  const addOptionRow = () => {
    if (optionRows.length >= PRESET_OPTION_NAMES.length + 5) {
      toast.error('Maximum variant options reached');
      return;
    }
    setOptionRows(prev => [...prev, { id: Date.now(), optionName: '', optionValue: '', colorHex: '#8B0000' }]);
  };

  const removeOptionRow = (id) => {
    if (optionRows.length === 1) {
      toast.error('At least 1 variant option is required');
      return;
    }
    setOptionRows(prev => prev.filter(r => r.id !== id));
  };

  const updateOptionRow = (id, key, value) => {
    if (key === 'optionName' && value.trim() !== '') {
      const isDuplicate = optionRows.some(r => r.id !== id && r.optionName.trim().toLowerCase() === value.trim().toLowerCase());
      if (isDuplicate) {
        toast.error(`Option type '${value}' is already added!`);
        return;
      }
    }
    setOptionRows(prev => prev.map(r => r.id === id ? { ...r, [key]: value } : r));
  };

  // Image Selection Handlers
  const handleDefaultImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDefaultProductImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setDefaultProductImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleVariantImagesSelect = (e) => {
    const files = Array.from(e.target.files || []);
    const remainingSlots = 10 - (existingVariantImages.length + newVariantImageFiles.length);
    if (remainingSlots <= 0) {
      toast.error('Maximum 10 variant gallery images allowed');
      return;
    }
    const selected = files.slice(0, remainingSlots).map(file => {
      file.preview = URL.createObjectURL(file);
      return file;
    });
    setNewVariantImageFiles(prev => [...prev, ...selected]);
  };

  const removeExistingVariantImage = (index) => {
    setExistingVariantImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeNewVariantFile = (index) => {
    setNewVariantImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  const moveNewVariantFile = (index, direction) => {
    const newIdx = index + direction;
    if (newIdx < 0 || newIdx >= newVariantImageFiles.length) return;
    setNewVariantImageFiles(prev => {
      const arr = [...prev];
      const temp = arr[index];
      arr[index] = arr[newIdx];
      arr[newIdx] = temp;
      return arr;
    });
  };

  // 360 Spin Handlers
  const handleSpinFileSelect = (e) => {
    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/')).map(file => {
      file.preview = URL.createObjectURL(file);
      return file;
    });
    setNewSpinImageFiles(prev => [...prev, ...files]);
  };

  const moveSpinFrame = (index, direction, isNew = false) => {
    if (isNew) {
      const newIdx = index + direction;
      if (newIdx < 0 || newIdx >= newSpinImageFiles.length) return;
      setNewSpinImageFiles(prev => {
        const arr = [...prev];
        const temp = arr[index];
        arr[index] = arr[newIdx];
        arr[newIdx] = temp;
        return arr;
      });
    } else {
      const newIdx = index + direction;
      if (newIdx < 0 || newIdx >= existingSpinImages.length) return;
      setExistingSpinImages(prev => {
        const arr = [...prev];
        const temp = arr[index];
        arr[index] = arr[newIdx];
        arr[newIdx] = temp;
        return arr;
      });
    }
  };

  const removeSpinFrame = (index, isNew = false) => {
    if (isNew) {
      setNewSpinImageFiles(prev => prev.filter((_, i) => i !== index));
    } else {
      setExistingSpinImages(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name || form.name.trim() === '') {
      toast.error('Product Name is required');
      return;
    }
    let finalProductSku = form.sku ? form.sku.trim() : '';
    if (!finalProductSku && form.name) {
      const cleanCode = form.name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
      finalProductSku = cleanCode ? `SKU-${cleanCode}` : `PROD-${Date.now()}`;
    }
    if (!finalProductSku) {
      toast.error('SKU is required');
      return;
    }
    if (!form.categoryId) {
      toast.error('Category is required');
      return;
    }

    const validOptions = optionRows.filter(r => {
      const name = String(r.optionName || '');
      const val = Array.isArray(r.optionValue) ? r.optionValue.join(', ') : String(r.optionValue || '');
      return name.trim() !== '' && val.trim() !== '';
    });
    if (validOptions.length === 0) {
      toast.error('At least 1 variant option is required before publishing');
      return;
    }

    if (!defaultProductImageFile && !defaultProductImagePreview && existingVariantImages.length === 0 && newVariantImageFiles.length === 0) {
      toast.error('Default Product Listing Image is required');
      return;
    }

    if (form.has360View && existingSpinImages.length === 0 && newSpinImageFiles.length === 0) {
      toast.error('Please upload at least 1 image frame for 360° View');
      return;
    }

    if (form.hasVideo && !videoFile && (!form.videoUrl || form.videoUrl.trim() === '')) {
      toast.error('Please upload a video file or provide a video URL');
      return;
    }

    // Auto-create Subcategory if typed in custom input
    let finalSubCategoryId = form.subCategoryId;
    if ((isCustomSubCategory || filteredSubCategories.length === 0) && customSubCategoryName.trim()) {
      try {
        const subRes = await api.post('/subcategories', {
          name: customSubCategoryName.trim(),
          categoryId: parseInt(form.categoryId, 10),
          isActive: true
        });
        if (subRes.data.success && subRes.data.subCategory) {
          finalSubCategoryId = subRes.data.subCategory.id;
          setSubCategories(prev => [...prev, subRes.data.subCategory]);
        }
      } catch (err) {
        console.error('Error creating custom subcategory:', err);
      }
    }

    // Auto-create Sub-subcategory if typed in custom input
    let finalSubSubCategoryId = form.subSubCategoryId;
    if ((isCustomSubSubCategory || filteredSubSubCategories.length === 0) && customSubSubCategoryName.trim() && finalSubCategoryId) {
      try {
        const subSubRes = await api.post('/subsubcategories', {
          name: customSubSubCategoryName.trim(),
          subCategoryId: parseInt(finalSubCategoryId, 10),
          isActive: true
        });
        if (subSubRes.data.success && subSubRes.data.subSubCategory) {
          finalSubSubCategoryId = subSubRes.data.subSubCategory.id;
          setSubSubCategories(prev => [...prev, subSubRes.data.subSubCategory]);
        }
      } catch (err) {
        console.error('Error creating custom sub-subcategory:', err);
      }
    }

    const generatedSlug = form.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const fd = new FormData();
    fd.append('productName', form.name.trim());
    fd.append('sku', finalProductSku);
    fd.append('slug', generatedSlug);
    fd.append('price', form.price === '' ? '0' : String(form.price));
    fd.append('comparePrice', form.comparePrice === '' ? '' : String(form.comparePrice));
    fd.append('stock', form.stock === '' ? '0' : String(form.stock));
    fd.append('shortDescription', form.shortDescription || '');
    fd.append('description', form.description || '');
    fd.append('categoryId', form.categoryId || '');
    fd.append('subCategoryId', finalSubCategoryId || '');
    fd.append('subSubCategoryId', finalSubSubCategoryId || '');
    fd.append('vendorId', form.vendorId || '');
    fd.append('warehouseId', form.warehouseId || '');


    fd.append('isFeatured', String(form.isFeatured));
    fd.append('isNewArrival', String(form.isNewArrival));
    fd.append('isBestSeller', String(form.isBestSeller));
    fd.append('hasAuthenticityBadge', String(form.hasAuthenticityBadge));
    fd.append('isActive', String(form.isActive));
    fd.append('has360View', String(form.has360View));
    fd.append('hasVideo', String(form.hasVideo));
    fd.append('videoUrl', form.videoUrl || '');

    fd.append('variantOptions', JSON.stringify(validOptions));

    if (defaultProductImageFile) {
      fd.append('defaultProductImage', defaultProductImageFile);
    }
    if (videoFile) {
      fd.append('video', videoFile);
    }

    if (productVariants.length > 0) {
      fd.append('variants', JSON.stringify(productVariants.map(v => ({
        id: typeof v.id === 'number' && v.id < 1000000000000 ? v.id : null,
        sku: v.sku,
        price: v.price,
        mrp: v.mrp,
        stock: v.stock,
        attributes: v.attributes,
        existingImages: v.existingImages || [],
        warehouseId: v.warehouseId || form.warehouseId || null,
      }))));

      productVariants.forEach((v, vIdx) => {
        if (Array.isArray(v.newFiles)) {
          v.newFiles.forEach(file => {
            fd.append(`variantFiles_${vIdx}`, file);
          });
        }
      });
    }

    fd.append('existingImages', JSON.stringify(existingVariantImages));
    newVariantImageFiles.forEach(file => {
      fd.append('variantImages', file);
    });

    if (form.has360View) {
      fd.append('existingSpinImages', JSON.stringify(existingSpinImages));
      newSpinImageFiles.forEach(file => {
        fd.append('spin_images', file);
      });
    }

    onSave(fd);
  };

  const combinedSpinPreviews = [
    ...existingSpinImages,
    ...newSpinImageFiles.map(f => f.preview)
  ];

  const constructedPreviewProduct = {
    ...form,
    images: [
      ...(defaultProductImagePreview ? [defaultProductImagePreview] : []),
      ...existingVariantImages,
      ...newVariantImageFiles.map(f => f.preview)
    ],
    spin_images: combinedSpinPreviews,
    attributes: optionRows.reduce((acc, r) => {
      const name = String(r.optionName || '').trim();
      const val = Array.isArray(r.optionValue) ? r.optionValue.join(', ') : String(r.optionValue || '');
      if (name && val) acc[name] = val;
      return acc;
    }, {}),
    category: categories.find(c => String(c.id) === String(form.categoryId)),
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-white rounded-xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-light bg-neutral-900 text-white">
          <div>
            <h2 className="font-playfair text-xl font-semibold">{product ? 'Edit Product' : 'Add New Product'}</h2>
            <p className="text-xs text-neutral-400 font-sans">Single Base Variant Catalog Architecture</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Live Preview button commented out as requested */}
            {/* <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="px-3 py-1.5 bg-brand-gold text-black hover:bg-brand-gold/90 text-xs font-bold rounded flex items-center gap-1.5 transition-colors uppercase tracking-wider"
            >
              <Eye size={14} /> Live Preview
            </button> */}
            <button onClick={onClose} className="p-1.5 text-neutral-400 hover:text-white transition-colors" aria-label="Close">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-8 overflow-y-auto flex-1 text-neutral-800">
          
          {/* SECTION 1: BASIC INFORMATION */}
          <div className="bg-neutral-50 p-5 rounded-lg border border-brand-light space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-brand-gold">1. Basic Information</h3>
              <span className="text-[10px] text-neutral-400">* Required Fields</span>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Product Name */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Product Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => handleNameChange(e.target.value)}
                  required
                  placeholder="e.g. Emerald Silk Kaftan"
                  className="w-full border border-brand-light px-3 py-2 text-sm focus:outline-none focus:border-brand-gold rounded-sm bg-white"
                />
              </div>

              {/* Product SKU */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Product SKU *</label>
                <input
                  type="text"
                  value={form.sku}
                  onChange={e => set('sku', e.target.value)}
                  required
                  placeholder="e.g. SKU-EMERALD"
                  className="w-full border border-brand-light px-3 py-2 text-sm focus:outline-none focus:border-brand-gold rounded-sm bg-white font-mono uppercase"
                />
              </div>

              {/* Vendor */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Vendor</label>
                <select
                  value={form.vendorId}
                  onChange={e => set('vendorId', e.target.value)}
                  className="w-full border border-brand-light bg-white px-3 py-2 text-sm focus:outline-none focus:border-brand-gold rounded-sm"
                >
                  <option value="">Select Vendor</option>
                  {vendors.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>

              {/* Warehouse */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Warehouse Location</label>
                <select
                  value={form.warehouseId}
                  onChange={e => {
                    const val = e.target.value;
                    setForm(p => ({ ...p, warehouseId: val }));
                    setProductVariants(prev => prev.map(v => ({ ...v, warehouseId: val })));
                  }}
                  className="w-full border border-brand-light bg-white px-3 py-2 text-sm focus:outline-none focus:border-brand-gold rounded-sm"
                >
                  <option value="">Select Warehouse</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name} ({w.city})</option>
                  ))}
                </select>
              </div>

              {/* Root Category */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Root Category *</label>
                <select
                  value={form.categoryId}
                  onChange={e => handleCategoryChange(e.target.value)}
                  required
                  className="w-full border border-brand-light bg-white px-3 py-2 text-sm focus:outline-none focus:border-brand-gold rounded-sm"
                >
                  <option value="">Select Root Category</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Parent Category */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-neutral-700">
                    Parent Category {filteredSubCategories.length > 0 ? '*' : '(Custom)'}
                  </label>
                  {form.categoryId && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomSubCategory(prev => !prev);
                        if (!isCustomSubCategory) setForm(p => ({ ...p, subCategoryId: '', subSubCategoryId: '' }));
                      }}
                      className="text-[10px] font-bold text-brand-gold hover:underline flex items-center gap-1"
                    >
                      {isCustomSubCategory || filteredSubCategories.length === 0 ? (filteredSubCategories.length > 0 ? 'Select Existing' : 'Custom Mode') : '+ Add New'}
                    </button>
                  )}
                </div>

                {isCustomSubCategory || (form.categoryId && filteredSubCategories.length === 0) ? (
                  <input
                    type="text"
                    value={customSubCategoryName}
                    onChange={e => setCustomSubCategoryName(e.target.value)}
                    disabled={!form.categoryId}
                    placeholder={!form.categoryId ? '— Select Root Category First —' : 'Type new parent category name...'}
                    className="w-full border border-amber-400 px-3 py-2 text-sm focus:outline-none focus:border-brand-gold rounded-sm bg-amber-50/60 font-semibold text-amber-950 placeholder:text-amber-800/50"
                  />
                ) : (
                  <select
                    value={form.subCategoryId}
                    onChange={e => handleSubCategoryChange(e.target.value)}
                    required={filteredSubCategories.length > 0}
                    disabled={!form.categoryId}
                    className="w-full border border-brand-light bg-white px-3 py-2 text-sm focus:outline-none focus:border-brand-gold rounded-sm disabled:bg-neutral-100 disabled:text-neutral-400 font-medium text-neutral-800"
                  >
                    <option value="">
                      {!form.categoryId ? '— Select Root Category First —' : 'Select Parent Category'}
                    </option>
                    {filteredSubCategories.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Child Category */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-neutral-700">
                    Child Category (Optional)
                  </label>
                  {(form.subCategoryId || customSubCategoryName.trim()) && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomSubSubCategory(prev => !prev);
                        if (!isCustomSubSubCategory) setForm(p => ({ ...p, subSubCategoryId: '' }));
                      }}
                      className="text-[10px] font-bold text-brand-gold hover:underline flex items-center gap-1"
                    >
                      {isCustomSubSubCategory || filteredSubSubCategories.length === 0 ? (filteredSubSubCategories.length > 0 ? 'Select Existing' : 'Custom Mode') : '+ Add New'}
                    </button>
                  )}
                </div>

                {isCustomSubSubCategory || ((form.subCategoryId || customSubCategoryName.trim()) && filteredSubSubCategories.length === 0) ? (
                  <input
                    type="text"
                    value={customSubSubCategoryName}
                    onChange={e => setCustomSubSubCategoryName(e.target.value)}
                    disabled={!form.subCategoryId && !customSubCategoryName.trim()}
                    placeholder={(!form.subCategoryId && !customSubCategoryName.trim()) ? '— Select Parent Category First —' : 'Type new child category name...'}
                    className="w-full border border-amber-400 px-3 py-2 text-sm focus:outline-none focus:border-brand-gold rounded-sm bg-amber-50/60 font-semibold text-amber-950 placeholder:text-amber-800/50"
                  />
                ) : (
                  <select
                    value={form.subSubCategoryId}
                    onChange={e => set('subSubCategoryId', e.target.value)}
                    disabled={!form.subCategoryId}
                    className="w-full border border-brand-light bg-white px-3 py-2 text-sm focus:outline-none focus:border-brand-gold rounded-sm disabled:bg-neutral-100 disabled:text-neutral-400 font-medium text-neutral-800"
                  >
                    <option value="">
                      {!form.subCategoryId ? '— Select Parent Category First —' : 'Select Child Category'}
                    </option>
                    {filteredSubSubCategories.map(ss => (
                      <option key={ss.id} value={ss.id}>{ss.name}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 2: DESCRIPTION */}
          <div className="bg-neutral-50 p-5 rounded-lg border border-brand-light space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-gold border-b border-neutral-200 pb-2">2. Description</h3>
            
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-neutral-700">Short Description (Cards/Listings)</label>
                <span className={`text-[11px] font-mono font-semibold ${form.shortDescription.length > 160 ? 'text-red-500' : 'text-neutral-500'}`}>
                  {form.shortDescription.length} / 160 chars
                </span>
              </div>
              <textarea
                rows={2}
                maxLength={200}
                value={form.shortDescription}
                onChange={e => set('shortDescription', e.target.value)}
                placeholder="Brief excerpt shown on product cards."
                className="w-full border border-brand-light px-3 py-2 text-sm focus:outline-none focus:border-brand-gold rounded-sm bg-white resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Long Description (Product Detail Page)</label>
              <div className="border border-brand-light rounded-sm bg-white overflow-hidden">
                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-1 p-2 bg-neutral-100 border-b border-brand-light text-xs font-semibold text-neutral-700">
                  {/* Heading buttons */}
                  <button
                    type="button"
                    title="Heading 1"
                    onClick={() => applyRichTextCommand('formatBlock', 'H1')}
                    className="px-2.5 py-1 bg-white border border-neutral-300 rounded text-[11px] font-extrabold hover:bg-brand-gold hover:text-white hover:border-brand-gold transition-colors"
                  >H1</button>
                  <button
                    type="button"
                    title="Heading 2"
                    onClick={() => applyRichTextCommand('formatBlock', 'H2')}
                    className="px-2.5 py-1 bg-white border border-neutral-300 rounded text-[11px] font-bold hover:bg-brand-gold hover:text-white hover:border-brand-gold transition-colors"
                  >H2</button>
                  <button
                    type="button"
                    title="Heading 3"
                    onClick={() => applyRichTextCommand('formatBlock', 'H3')}
                    className="px-2.5 py-1 bg-white border border-neutral-300 rounded text-[11px] font-semibold hover:bg-brand-gold hover:text-white hover:border-brand-gold transition-colors"
                  >H3</button>

                  <span className="w-px h-4 bg-neutral-300 mx-0.5" />

                  {/* List buttons */}
                  <button
                    type="button"
                    title="Bullet List"
                    onClick={() => applyRichTextCommand('insertUnorderedList')}
                    className="px-2.5 py-1 bg-white border border-neutral-300 rounded hover:bg-brand-gold hover:text-white hover:border-brand-gold transition-colors"
                  >• List</button>

                  <span className="w-px h-4 bg-neutral-300 mx-0.5" />

                  {/* Reset to paragraph */}
                  <button
                    type="button"
                    title="Normal Paragraph"
                    onClick={() => applyRichTextCommand('formatBlock', 'P')}
                    className="px-2.5 py-1 bg-white border border-neutral-300 rounded text-[11px] hover:bg-neutral-200 transition-colors"
                  >¶ Normal</button>
                </div>

                {/* Contenteditable editor */}
                <div
                  ref={richEditorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onKeyDown={handleEditorKeyDown}
                  onInput={() => {
                    if (richEditorRef.current) {
                      set('description', richEditorRef.current.innerHTML);
                    }
                  }}
                  data-placeholder="Detailed rich text description..."
                  className="w-full p-3 text-sm focus:outline-none min-h-[120px] font-sans rich-editor-area"
                  style={{ lineHeight: '1.6' }}
                />
              </div>
              <p className="text-[11px] text-neutral-400 mt-1">Use the toolbar to add headings, bullet points, and text formatting. Content renders as-is on the product page.</p>
            </div>
          </div>

          {/* SECTION 3: PRODUCT IMAGE & GALLERY */}
          <div className="bg-neutral-50 p-5 rounded-lg border border-brand-light space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-gold border-b border-neutral-200 pb-2">3. Product Image & Gallery</h3>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-neutral-700">
                Default Listing Image • Recommended 400×400px (1:1) • Max: 3MB
              </label>

              {defaultProductImagePreview ? (
                <div className="relative w-32 h-32 border border-neutral-300 rounded-2xl overflow-hidden shadow-md group bg-neutral-900">
                  <img src={defaultProductImagePreview} alt="Default Thumbnail" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setDefaultProductImageFile(null); setDefaultProductImagePreview(null); }}
                    className="absolute top-2 right-2 bg-black/80 hover:bg-red-600 text-white p-1 rounded-full shadow-lg transition-colors"
                    title="Remove Image"
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
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleDefaultImageSelect} className="hidden" />
                </label>
              )}
            </div>
          </div>

          {/* SECTION 4: VARIANT OPTIONS & COLOR PICKER */}
          <div className="bg-neutral-50 p-5 rounded-lg border border-brand-light space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand-gold">4. Variant Options & Color Picker</h3>
                <p className="text-[11px] text-neutral-500">Select pre-determined options (Color, Size, Material) or type custom specs.</p>
              </div>
              <span className="text-xs font-bold text-neutral-600 bg-neutral-200 px-2 py-0.5 rounded">{optionRows.length} Options</span>
            </div>

            <div className="space-y-4">
              {optionRows.map((row) => {
                const optName = String(row.optionName || '');
                const isColor = optName.toLowerCase() === 'color';
                const selectedValue = Array.isArray(row.optionValue)
                  ? row.optionValue.join(', ').trim()
                  : String(row.optionValue || '').trim();
                const presets = resolvePresetValues(optName);

                const toggleValue = (valToToggle) => {
                  const nextValue = selectedValue === valToToggle ? '' : valToToggle;
                  updateOptionRow(row.id, 'optionValue', nextValue);
                };

                return (
                  <div key={row.id} className="bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200 shadow-sm space-y-3 hover:border-neutral-300 transition-all">
                    {/* Header: Icon + Option Name + Red Remove Option */}
                    <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        {isColor ? (
                          <span className="text-amber-600 font-bold text-sm">🎨</span>
                        ) : (
                          <span className="text-neutral-500 font-bold text-sm">📐</span>
                        )}
                        <OptionTypeSelect
                          value={row.optionName}
                          onChange={(newName) => updateOptionRow(row.id, 'optionName', newName)}
                          usedOptions={optionRows.map(r => r.optionName)}
                        />
                        <span className="text-red-500 font-bold text-xs">*</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeOptionRow(row.id)}
                        className="text-xs font-semibold text-red-600 hover:text-red-700 hover:underline flex items-center gap-1 transition-colors"
                      >
                        <X size={14} /> Remove Option
                      </button>
                    </div>

                    {/* Sub-row: Green Dashed Add Pill Button + Value Chips */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {row.showCustomInput ? (
                        <div className="flex items-center gap-1.5 bg-white border-2 border-emerald-500 rounded-full px-3 py-1 shadow-sm">
                          {isColor && (
                            <input
                              type="color"
                              value={row.colorHex || '#8B0000'}
                              onChange={e => updateOptionRow(row.id, 'colorHex', e.target.value)}
                              className="w-5 h-5 rounded-full cursor-pointer border-0 p-0"
                            />
                          )}
                          <input
                            type="text"
                            autoFocus
                            placeholder={`Type custom ${row.optionName || 'value'}...`}
                            value={row.customInput || ''}
                            onChange={e => updateOptionRow(row.id, 'customInput', e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (row.customInput?.trim()) {
                                  toggleValue(row.customInput.trim());
                                  updateOptionRow(row.id, 'customInput', '');
                                  updateOptionRow(row.id, 'showCustomInput', false);
                                }
                              }
                            }}
                            className="text-xs font-medium focus:outline-none bg-transparent w-32 text-neutral-800"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (row.customInput?.trim()) {
                                toggleValue(row.customInput.trim());
                                updateOptionRow(row.id, 'customInput', '');
                              }
                              updateOptionRow(row.id, 'showCustomInput', false);
                            }}
                            className="text-emerald-700 text-xs font-bold hover:text-emerald-900"
                          >
                            Set
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => updateOptionRow(row.id, 'showCustomInput', true)}
                          className="border-2 border-dashed border-emerald-500 text-emerald-600 bg-emerald-50/40 hover:bg-emerald-50 text-xs font-bold px-3 py-1.5 rounded-full transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Plus size={14} /> Add {row.optionName || 'Option'}
                        </button>
                      )}

                      {/* Preset Option Values Chips (Single Value Selection) */}
                      {presets.map(val => {
                        const isSelected = selectedValue === val;
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => toggleValue(val)}
                            className={`text-xs font-medium px-3.5 py-1.5 rounded-full border transition-all cursor-pointer flex items-center gap-1.5 ${
                              isSelected
                                ? 'border-2 border-emerald-500 bg-emerald-50 text-emerald-950 font-bold shadow-sm'
                                : 'border-neutral-200 bg-white hover:bg-neutral-100 text-neutral-700'
                            }`}
                          >
                            {isColor && (
                              <span
                                className="w-3.5 h-3.5 rounded-full border border-neutral-300 shadow-sm flex-shrink-0 inline-block"
                                style={{ background: resolveColor(val) }}
                              />
                            )}
                            <span>{val}</span>
                          </button>
                        );
                      })}

                      {/* Custom Added Value Chip (if custom value selected and not in presets) */}
                      {selectedValue && !presets.includes(selectedValue) && (
                        <button
                          type="button"
                          onClick={() => toggleValue(selectedValue)}
                          className="text-xs font-bold px-3 py-1.5 rounded-full border-2 border-emerald-500 bg-emerald-50 text-emerald-950 flex items-center gap-1.5 shadow-sm"
                        >
                          {isColor && (
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-neutral-300 shadow-sm flex-shrink-0 inline-block"
                              style={{ background: resolveColor(selectedValue) }}
                            />
                          )}
                          <span>{selectedValue}</span>
                          <X size={12} className="text-emerald-700 hover:text-red-600 ml-0.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={addOptionRow}
                className="bg-brand-gold text-white text-xs px-4 py-2 font-semibold uppercase tracking-wider rounded-sm flex items-center gap-1.5 hover:bg-brand-gold/90 transition-colors"
              >
                <Plus size={14} /> Add Option
              </button>
            </div>

            {/* Generated Variant Cards */}
            {productVariants.length > 0 && (
              <div className="pt-4 border-t border-neutral-200 space-y-4">
                {productVariants.map((v, vIdx) => {
                  const totalImgs = (v.existingImages?.length || 0) + (v.newFiles?.length || 0);

                  return (
                    <div key={v.id} className="bg-white p-5 border border-amber-300 rounded-xl shadow-sm space-y-4 hover:border-amber-400 transition-colors">
                      {/* Top Header: Selected Option Value Tags & Delete Action */}
                      <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          {Object.entries(v.attributes || {}).map(([k, val]) => (
                            <span key={k} className="text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-1 rounded-md">
                              {k}: <strong className="font-bold">{val}</strong>
                            </span>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeVariantRow(v.id)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove Variant"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {/* Row 1: SKU CODE & SELLING PRICE (₹) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-600 mb-1">SKU CODE</label>
                          <input
                            type="text"
                            value={v.sku}
                            onChange={e => updateVariantRow(v.id, 'sku', e.target.value)}
                            placeholder="SKU Code"
                            className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-xs font-sans font-medium text-neutral-800 focus:outline-none focus:border-brand-gold bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-600 mb-1">SELLING PRICE (₹)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={v.price !== undefined ? v.price : ''}
                            onChange={e => updateVariantRow(v.id, 'price', e.target.value)}
                            placeholder="0.00"
                            className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-xs font-sans font-medium text-neutral-800 focus:outline-none focus:border-brand-gold bg-white"
                          />
                        </div>
                      </div>

                      {/* Row 2: MRP (₹), STOCK QTY, LOW STOCK THRESHOLD & GST RATE */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-600 mb-1">MRP (₹)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={v.mrp !== undefined ? v.mrp : ''}
                            onChange={e => updateVariantRow(v.id, 'mrp', e.target.value)}
                            placeholder="0.00"
                            className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-xs font-sans font-medium text-neutral-800 focus:outline-none focus:border-brand-gold bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-600 mb-1">STOCK QTY</label>
                          <input
                            type="number"
                            value={v.stock !== undefined ? v.stock : ''}
                            onChange={e => updateVariantRow(v.id, 'stock', e.target.value)}
                            placeholder="0"
                            className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-xs font-sans font-medium text-neutral-800 focus:outline-none focus:border-brand-gold bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-600 mb-1">LOW STOCK THRESHOLD</label>
                          <input
                            type="number"
                            value={v.lowStockThreshold || '10'}
                            onChange={e => updateVariantRow(v.id, 'lowStockThreshold', e.target.value)}
                            placeholder="10"
                            className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-xs font-sans font-medium text-neutral-800 focus:outline-none focus:border-brand-gold bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-600 mb-1">GST RATE</label>
                          <select
                            value={v.gstRate || '18%'}
                            onChange={e => updateVariantRow(v.id, 'gstRate', e.target.value)}
                            className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-xs font-sans font-medium text-neutral-800 focus:outline-none focus:border-brand-gold bg-white"
                          >
                            <option value="0%">0% (Exempt)</option>
                            <option value="5%">5% (SGST 2.5% + CGST 2.5%)</option>
                            <option value="12%">12% (SGST 6% + CGST 6%)</option>
                            <option value="18%">18% (SGST 9% + CGST 9%)</option>
                            <option value="28%">28% (SGST 14% + CGST 14%)</option>
                          </select>
                        </div>
                      </div>

                      {/* Main Variant Image (PDP / Cart / Checkout Display) */}
                      <div className="space-y-1.5 pt-2 border-t border-neutral-100">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-600">
                          Main Variant Image (PDP / Cart / Checkout Display)
                        </label>
                        {v.mainImagePreview ? (
                          <div className="relative w-24 h-24 border border-neutral-300 rounded-xl overflow-hidden shadow-md bg-neutral-900">
                            <img src={v.mainImagePreview} alt="Main Variant" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => {
                                updateVariantRow(v.id, 'mainImagePreview', '');
                                updateVariantRow(v.id, 'mainImageFile', null);
                              }}
                              className="absolute top-1.5 right-1.5 bg-black/80 hover:bg-red-600 text-white p-1 rounded-full shadow transition-colors"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <label className="border-2 border-dashed border-neutral-300 hover:border-brand-gold bg-white hover:bg-neutral-50/50 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all group">
                            <div className="flex items-center gap-1.5 text-xs text-neutral-500 font-medium group-hover:text-neutral-800">
                              <Camera size={16} className="text-neutral-400 group-hover:text-brand-gold" />
                              <span>Click to <strong>browse</strong> main image</span>
                            </div>
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              onChange={e => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  updateVariantRow(v.id, 'mainImageFile', file);
                                  updateVariantRow(v.id, 'mainImagePreview', URL.createObjectURL(file));
                                }
                              }}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>

                      {/* Variant Gallery (Max 5 Images) */}
                      <div className="space-y-1.5 pt-2 border-t border-neutral-100">
                        <div className="flex justify-between items-center">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-600">
                            VARIANT GALLERY (MAX 5 IMAGES)
                          </label>
                          <span className="text-[10px] font-mono font-bold text-amber-600">{totalImgs} / 5</span>
                        </div>
                        <div className="flex items-center gap-2 overflow-x-auto py-1 custom-scrollbar">
                          {v.existingImages?.map((imgUrl, iIdx) => (
                            <div key={`exist-${iIdx}`} className="relative w-14 h-14 border border-neutral-300 rounded-lg overflow-hidden flex-shrink-0 bg-neutral-100">
                              <img src={imgUrl} alt={`Variant ${iIdx + 1}`} className="w-full h-full object-cover" />
                              <span className="absolute top-0.5 left-0.5 bg-black/70 text-white text-[8px] font-bold px-1 rounded">#{iIdx + 1}</span>
                              <button
                                type="button"
                                onClick={() => removeVariantRowImage(v.id, false, iIdx)}
                                className="absolute top-0.5 right-0.5 bg-red-600 text-white p-0.5 rounded-full opacity-90 hover:opacity-100 shadow"
                              >
                                <X size={10} />
                              </button>
                            </div>
                          ))}
                          {v.newFiles?.map((file, iIdx) => {
                            const globalPos = (v.existingImages?.length || 0) + iIdx + 1;
                            return (
                              <div key={`new-${iIdx}`} className="relative w-14 h-14 border-2 border-brand-gold/60 rounded-lg overflow-hidden flex-shrink-0 bg-neutral-100">
                                <img src={file.preview} alt={`Upload ${globalPos}`} className="w-full h-full object-cover" />
                                <span className="absolute top-0.5 left-0.5 bg-brand-gold text-white text-[8px] font-bold px-1 rounded">#{globalPos}</span>
                                <button
                                  type="button"
                                  onClick={() => removeVariantRowImage(v.id, true, iIdx)}
                                  className="absolute top-0.5 right-0.5 bg-red-600 text-white p-0.5 rounded-full opacity-90 hover:opacity-100 shadow"
                                >
                                  <X size={10} />
                                </button>
                              </div>
                            );
                          })}
                          {totalImgs < 5 && (
                            <label className="w-14 h-14 border-2 border-dashed border-neutral-300 hover:border-brand-gold flex flex-col items-center justify-center text-neutral-400 hover:text-brand-gold cursor-pointer rounded-lg bg-neutral-50 transition-colors">
                              <Plus size={16} />
                              <span className="text-[9px] font-semibold">Image</span>
                              <input
                                type="file"
                                multiple
                                accept="image/jpeg,image/png,image/webp"
                                onChange={e => handleVariantRowFilesSelect(v.id, e)}
                                className="hidden"
                              />
                            </label>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SECTION 5: 360° INTERACTIVE VIEW & VIDEO SHOWCASE */}
          <div className="bg-neutral-50 p-5 rounded-lg border border-brand-light space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-gold border-b border-neutral-200 pb-2">5. 360° Interactive View & Video Showcase</h3>

            <div className="grid sm:grid-cols-2 gap-6">
              {/* 360° View Toggle & Reordering Grid */}
              <div className="bg-white p-4 border border-brand-light rounded-sm space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-800">Enable 360° Interactive View</span>
                  <Switch checked={form.has360View} onChange={checked => set('has360View', checked)} />
                </div>

                {form.has360View && (
                  <div className="pt-2 border-t border-neutral-200 space-y-3">
                    <label className="block text-[11px] font-semibold text-neutral-700">Upload 360° Frames ({combinedSpinPreviews.length} frames)</label>
                    <input type="file" multiple accept="image/*" onChange={handleSpinFileSelect} className="text-xs text-neutral-500" />

                    {/* Frame Reordering Grid (Drag and Drop enabled) */}
                    {combinedSpinPreviews.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-[10px] text-amber-800 font-semibold bg-amber-50 p-2 rounded border border-amber-200">
                          💡 Drag & drop frame thumbnails to easily rearrange 360° spin sequence!
                        </p>
                        <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1 bg-neutral-100 rounded border border-neutral-200">
                          {existingSpinImages.map((src, i) => (
                            <div
                              key={`expin-${i}`}
                              draggable
                              onDragStart={(e) => handleSpinDragStart(e, i)}
                              onDragOver={(e) => handleSpinDragOver(e, i)}
                              onDrop={(e) => handleSpinDrop(e, i)}
                              className="relative aspect-square border border-neutral-300 rounded overflow-hidden bg-white group cursor-grab active:cursor-grabbing hover:border-brand-gold transition-colors"
                            >
                              <img src={src} alt={`Spin ${i}`} className="w-full h-full object-cover pointer-events-none" />
                              <span className="absolute top-0.5 left-0.5 bg-black/70 text-white text-[8px] px-1 rounded font-bold">#{i + 1}</span>
                              <button type="button" onClick={() => removeSpinFrame(i, false)} className="absolute top-0.5 right-0.5 bg-red-600 text-white p-0.5 rounded-full"><X size={8} /></button>
                            </div>
                          ))}
                          {newSpinImageFiles.map((f, i) => {
                            const globalIdx = existingSpinImages.length + i;
                            return (
                              <div
                                key={`newspin-${i}`}
                                draggable
                                onDragStart={(e) => handleSpinDragStart(e, globalIdx)}
                                onDragOver={(e) => handleSpinDragOver(e, globalIdx)}
                                onDrop={(e) => handleSpinDrop(e, globalIdx)}
                                className="relative aspect-square border-2 border-brand-gold rounded overflow-hidden bg-white group cursor-grab active:cursor-grabbing hover:border-amber-600 transition-colors"
                              >
                                <img src={f.preview} alt={`New Spin ${i}`} className="w-full h-full object-cover pointer-events-none" />
                                <span className="absolute top-0.5 left-0.5 bg-brand-gold text-black text-[8px] font-bold px-1 rounded">#{globalIdx + 1}</span>
                                <button type="button" onClick={() => removeSpinFrame(i, true)} className="absolute top-0.5 right-0.5 bg-red-600 text-white p-0.5 rounded-full"><X size={8} /></button>
                              </div>
                            );
                          })}
                        </div>

                        {/* Interactive Rotation Preview */}
                        <SpinViewerPreview images={combinedSpinPreviews} />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Video Toggle & Live Video Preview */}
              <div className="bg-white p-4 border border-brand-light rounded-sm space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-800">Enable Showcase Video</span>
                  <Switch checked={form.hasVideo} onChange={checked => set('hasVideo', checked)} />
                </div>

                {form.hasVideo && (
                  <div className="pt-2 border-t border-neutral-200 space-y-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-700 mb-1">Video URL (MP4 / WebM)</label>
                      <input
                        type="text"
                        value={form.videoUrl}
                        onChange={e => set('videoUrl', e.target.value)}
                        placeholder="https://example.com/video.mp4 or /uploads/..."
                        className="w-full border border-neutral-300 px-2.5 py-1.5 text-xs focus:outline-none focus:border-brand-gold rounded-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-700 mb-1">Or Upload Video File</label>
                      <input type="file" accept="video/mp4,video/webm" onChange={e => setVideoFile(e.target.files?.[0] || null)} className="text-xs text-neutral-500" />
                    </div>

                    {/* Inline Video Player Preview */}
                    {(videoFile || form.videoUrl) && (
                      <div className="mt-2 space-y-1">
                        <label className="block text-[10px] font-bold text-neutral-500 uppercase">Inline Video Preview</label>
                        <video
                          src={videoFile ? URL.createObjectURL(videoFile) : form.videoUrl}
                          controls
                          className="w-full max-h-48 rounded border border-neutral-300 bg-black object-contain"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 6: STATUS & STOREFRONT TOGGLES */}
          <div className="bg-neutral-50 p-5 rounded-lg border border-brand-light space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-gold border-b border-neutral-200 pb-2">6. Status & Storefront Toggles</h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <label className="flex items-center justify-between bg-white p-3 border border-brand-light rounded-sm cursor-pointer">
                <span className="text-xs font-semibold text-neutral-700">Featured</span>
                <Switch checked={form.isFeatured} onChange={checked => set('isFeatured', checked)} />
              </label>

              <label className="flex items-center justify-between bg-white p-3 border border-brand-light rounded-sm cursor-pointer">
                <span className="text-xs font-semibold text-neutral-700">New Arrival</span>
                <Switch checked={form.isNewArrival} onChange={checked => set('isNewArrival', checked)} />
              </label>

              <label className="flex items-center justify-between bg-white p-3 border border-brand-light rounded-sm cursor-pointer">
                <span className="text-xs font-semibold text-neutral-700">Best Seller</span>
                <Switch checked={form.isBestSeller} onChange={checked => set('isBestSeller', checked)} />
              </label>

              <label className="flex items-center justify-between bg-white p-3 border border-brand-light rounded-sm cursor-pointer">
                <span className="text-xs font-semibold text-neutral-700">Authenticity Badge</span>
                <Switch checked={form.hasAuthenticityBadge} onChange={checked => set('hasAuthenticityBadge', checked)} />
              </label>

              <label className="flex items-center justify-between bg-white p-3 border border-brand-light rounded-sm cursor-pointer">
                <span className="text-xs font-semibold text-neutral-700">Active (Visible)</span>
                <Switch checked={form.isActive} onChange={checked => set('isActive', checked)} />
              </label>
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-brand-light">
            {/* Preview Product button commented out as requested */}
            {/* <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="px-4 py-2 text-xs font-bold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 rounded-sm transition-colors flex items-center gap-1.5 uppercase tracking-wider"
            >
              <Eye size={14} className="text-brand-gold" /> Preview Product
            </button> */}
            <div />

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 border border-neutral-300 rounded-sm transition-colors uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 text-xs font-bold text-white bg-brand-gold hover:bg-brand-gold/90 rounded-sm transition-colors uppercase tracking-wider shadow-md"
              >
                {product ? 'Update Product' : 'Add Product'}
              </button>
            </div>
          </div>
        </form>
      </motion.div>

      {/* Live Storefront Preview Modal */}
      <AnimatePresence>
        {previewOpen && (
          <ProductLivePreviewModal
            product={constructedPreviewProduct}
            onClose={() => setPreviewOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Main Products Admin Page ────────────────────────────────────────────────
const ProductsAdminPage = () => {
  const dispatch = useDispatch();
  const { items, loading, total, totalPages, page: serverPage, limit: serverLimit } = useSelector(s => s.products);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [previewProduct, setPreviewProduct] = useState(null);

  useEffect(() => {
    dispatch(fetchAdminProducts({ search: search || undefined, page, limit }));
  }, [search, page, limit, dispatch]);

  const handleSave = async (form) => {
    try {
      if (editing) {
        await dispatch(updateProduct({ id: editing.id, data: form })).unwrap();
        toast.success('Product updated successfully');
      } else {
        await dispatch(createProduct(form)).unwrap();
        toast.success('Product created successfully');
      }
      setModalOpen(false);
      setEditing(null);
      dispatch(fetchAdminProducts({ search: search || undefined }));
    } catch (err) {
      const errMsg = typeof err === 'string' ? err : (err?.message || err?.error || 'Failed to save product');
      toast.error(errMsg);
    }
  };

  const executeDelete = async (id) => {
    try {
      await dispatch(deleteProduct(id)).unwrap();
      toast.success('Product deleted successfully');
      dispatch(fetchAdminProducts({ search: search || undefined }));
    } catch (err) {
      toast.error('Failed to deleted product');
    }
  };

  const handleDelete = (id) => {
    toast((t) => (
      <div className="flex flex-col items-center text-center gap-2 p-1">
        <p className="text-sm font-semibold text-neutral-800">Confirm Deletion</p>
        <p className="text-xs text-neutral-600 max-w-xs">Are you sure you want to delete this product?</p>
        <div className="flex justify-center items-center gap-3 mt-2 w-full">
          <button
            onClick={() => {
              toast.dismiss(t.id);
              executeDelete(id);
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
    ), {
      duration: 6000,
      position: 'top-center'
    });
  };

  return (
    <AdminLayout title="Products">
      <div className="mb-6 flex justify-end">
        <button onClick={() => { setEditing(null); setModalOpen(true); }} className="btn-primary flex items-center gap-2 whitespace-nowrap" id="add-product-btn">
          <Plus size={16} /> Add Product
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <PaginationTop
          search={search}
          onSearchChange={(s) => { setSearch(s); setPage(1); }}
          searchPlaceholder="Search products..."
          currentPage={page}
          totalItems={total || 0}
          limit={limit}
          onLimitChange={(l) => { setLimit(l); setPage(1); }}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label="Products table">
            <thead>
              <tr className="bg-brand-light/40 text-left">
                {['Image', 'Name', 'Category', 'Price', 'Stock', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-brand-grey uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i} className="border-b border-brand-light">
                    {[...Array(7)].map((_, j) => <td key={j} className="px-4 py-3"><div className="skeleton h-4 w-16" /></td>)}
                  </tr>
                ))
              ) : items.map(product => (
                <tr key={product.id} className="border-b border-brand-light hover:bg-brand-light/20 transition-colors">
                  <td className="px-4 py-3">
                    <img src={product.defaultProductImage || product.images?.[0] || product.variants?.[0]?.image || 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=80'} alt={product.name} className="w-10 h-12 object-cover rounded" />
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium line-clamp-1">{product.name}</p>
                    <p className="text-xs text-brand-grey">{product.sku}</p>
                  </td>
                  <td className="px-4 py-3 text-brand-grey">
                    <div className="text-xs space-y-0.5">
                      <span className="font-medium text-brand-text block">{product.category?.name || '—'}</span>
                      {product.subcategory && (
                        <span className="text-[10px] text-brand-grey block">› {product.subcategory.name}</span>
                      )}
                      {product.subsubcategory && (
                        <span className="text-[9px] text-brand-gold block">» {product.subsubcategory.name}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold">{fmt(product.price)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${product.stock <= 5 ? 'text-red-500' : 'text-green-600'}`}>{product.stock}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${product.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {product.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setPreviewProduct(product)} className="p-1.5 text-brand-grey hover:text-brand-gold transition-colors" title="Live Preview">
                        <Eye size={14} />
                      </button>
                      <button onClick={() => { setEditing(product); setModalOpen(true); }} className="p-1.5 text-brand-grey hover:text-brand-gold transition-colors" title="Edit">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => handleDelete(product.id)} className="p-1.5 text-brand-grey hover:text-red-400 transition-colors" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginationBottom
          currentPage={page}
          totalPages={totalPages || 1}
          totalItems={total || 0}
          onPageChange={(p) => setPage(p)}
        />
      </div>

      <AnimatePresence>
        {modalOpen && <ProductModal product={editing} onClose={() => { setModalOpen(false); setEditing(null); }} onSave={handleSave} />}
        {previewProduct && <ProductLivePreviewModal product={previewProduct} onClose={() => setPreviewProduct(null)} />}
      </AnimatePresence>
    </AdminLayout>
  );
};

export default ProductsAdminPage;