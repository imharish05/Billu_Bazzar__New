import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { X, Star, ShoppingBag, Eye, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { closeQuickView } from '../redux/slices/uiSlice';
import { addLocal, openCart, setBuyNowItem } from '../redux/slices/cartSlice';
import { formatPrice } from '../utils/currency';

// Color map resolver
const resolveColor = (colorStr) => {
  if (!colorStr) return '#C58837';
  const c = String(colorStr).toLowerCase().trim();
  const colorMap = {
    black: '#111111',
    white: '#FFFFFF',
    red: '#E53E3E',
    blue: '#3182CE',
    green: '#38A169',
    yellow: '#D69E2E',
    gold: '#D4AF37',
    silver: '#C0C0C0',
    pink: '#ED64A6',
    purple: '#805AD5',
    orange: '#DD6B20',
    grey: '#718096',
    gray: '#718096',
    brown: '#744210',
    maroon: '#800000',
    navy: '#000080',
    olive: '#556B2F',
    emerald: '#50C878',
    beige: '#F5F5DC',
    cream: '#FFFDD0',
    teal: '#008080',
    lavender: '#E6E6FA',
    peach: '#FFDAB9',
    burgundy: '#800020',
    magenta: '#FF00FF',
  };
  if (colorMap[c]) return colorMap[c];
  if (c.startsWith('#') || c.startsWith('rgb')) return colorStr;
  return '#C58837';
};

// Option groups extractor from product data
const getParsedOptionGroups = (prod) => {
  const groups = {};

  if (Array.isArray(prod.variants) && prod.variants.length > 0) {
    prod.variants.forEach(v => {
      const attrs = typeof v.attributes === 'string' ? JSON.parse(v.attributes || '{}') : (v.attributes || {});
      Object.entries(attrs).forEach(([k, val]) => {
        if (!val || val === 'undefined' || val === 'null' || val === 'Standard') return;
        const keyTrimmed = k.trim();
        if (!groups[keyTrimmed]) groups[keyTrimmed] = [];
        if (!groups[keyTrimmed].includes(String(val).trim())) {
          groups[keyTrimmed].push(String(val).trim());
        }
      });
    });
  }

  const prodAttrs = typeof prod.attributes === 'string'
    ? JSON.parse(prod.attributes || '{}')
    : (prod.attributes || {});

  if (prodAttrs) {
    if (Array.isArray(prodAttrs)) {
      prodAttrs.forEach(opt => {
        const k = opt.optionName || opt.name || opt.key;
        const v = opt.optionValue || opt.value || opt.values;
        if (k && v) {
          const keyTrimmed = k.trim();
          if (!groups[keyTrimmed]) groups[keyTrimmed] = [];
          const vals = Array.isArray(v) ? v : String(v).split(',').map(s => s.trim()).filter(Boolean);
          vals.forEach(val => {
            if (!groups[keyTrimmed].includes(val)) groups[keyTrimmed].push(val);
          });
        }
      });
    } else if (typeof prodAttrs === 'object') {
      Object.entries(prodAttrs).forEach(([k, v]) => {
        if (!v || v === 'undefined' || v === 'null') return;
        const keyTrimmed = k.trim();
        if (!groups[keyTrimmed]) groups[keyTrimmed] = [];
        const vals = Array.isArray(v) ? v : String(v).split(',').map(s => s.trim()).filter(Boolean);
        vals.forEach(val => {
          if (!groups[keyTrimmed].includes(val)) groups[keyTrimmed].push(val);
        });
      });
    }
  }

  if (Object.keys(groups).length === 0) {
    return {
      colors: ['Olive Green', 'Classic Black', 'Emerald', 'Rose Gold', 'Maroon'],
      size: ['XS', 'S', 'M', 'L', 'XL']
    };
  }

  return groups;
};

const QuickViewModal = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isQuickViewOpen, quickViewProduct: product } = useSelector(s => s.ui);
  const { code: currencyCode, rate: currencyRate } = useSelector(s => s.currency);
  const { customer } = useSelector(s => s.auth);

  const [activeImgIndex, setActiveImgIndex] = useState(0);

  useEffect(() => {
    setActiveImgIndex(0);
  }, [product?.id]);

  if (!product) return null;

  const fmt = (v) => formatPrice(v, currencyCode, currencyRate);
  const inStock = product.inStock !== false;

  const defaultVariant = (product.variants && product.variants.length > 0) ? product.variants[0] : null;

  const displayPrice = defaultVariant && defaultVariant.price !== null
    ? parseFloat(defaultVariant.price)
    : parseFloat(product.price);

  const displayComparePrice = defaultVariant && defaultVariant.mrp !== null
    ? parseFloat(defaultVariant.mrp)
    : (product.comparePrice ? parseFloat(product.comparePrice) : null);

  const resolvedVariantAttr = defaultVariant
    ? (typeof defaultVariant.attributes === 'string' ? JSON.parse(defaultVariant.attributes || '{}') : (defaultVariant.attributes || {}))
    : {};

  const galleryImages = (product.images && product.images.length > 0)
    ? product.images
    : ['https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=600'];

  const handleAddToCart = () => {
    const cartItem = {
      productId: product.id,
      name: product.name,
      image: galleryImages[activeImgIndex] || (defaultVariant && defaultVariant.image) || '',
      priceAtAdd: displayPrice,
      quantity: 1,
      variantId: defaultVariant ? defaultVariant.id : null,
      selectedVariant: resolvedVariantAttr
    };
    dispatch(addLocal(cartItem));
    dispatch(closeQuickView());
    dispatch(openCart());
  };

  const handleBuyNow = () => {
    const cartItem = {
      productId: product.id,
      name: product.name,
      image: galleryImages[activeImgIndex] || (defaultVariant && defaultVariant.image) || '',
      priceAtAdd: displayPrice,
      quantity: 1,
      variantId: defaultVariant ? defaultVariant.id : null,
      selectedVariant: resolvedVariantAttr
    };
    dispatch(setBuyNowItem(cartItem));
    dispatch(closeQuickView());
    navigate('/checkout?mode=buynow');
  };

  const handleNotifyMe = () => {
    toast.success(`We will notify you at ${customer?.email || 'your email'} once ${product.name} is back in stock!`, {
      iconTheme: { primary: '#C58837', secondary: 'white' },
      style: {
        border: '1px solid #C58837',
        color: '#111111',
        fontFamily: 'Montserrat, sans-serif'
      }
    });
    dispatch(closeQuickView());
  };

  const discount = product.comparePrice
    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
    : null;

  return (
    <AnimatePresence>
      {isQuickViewOpen && (
        <>
          {/* Backdrop with backdrop blur */}
          <motion.div
            key="qv-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 md:p-6"
            onClick={() => dispatch(closeQuickView())}
            role="presentation"
          >
            {/* Modal Dialog Card */}
            <motion.div
              key="qv-modal"
              initial={{ opacity: 0, scale: 0.94, y: 25 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 25 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col md:flex-row relative shadow-[0_30px_70px_-15px_rgba(0,0,0,0.45)] border border-amber-500/20"
              onClick={e => e.stopPropagation()}
              role="dialog"
              aria-label={`Quick view: ${product.name}`}
              aria-modal="true"
            >
              {/* Floating Close Button */}
              <button
                onClick={() => dispatch(closeQuickView())}
                className="absolute top-4 right-4 z-50 p-2.5 bg-neutral-900/80 hover:bg-neutral-950 text-white hover:text-amber-400 transition-all rounded-full shadow-xl border border-white/20 backdrop-blur-md group hover:scale-105 active:scale-95 cursor-pointer"
                aria-label="Close quick view"
              >
                <X size={18} strokeWidth={2.2} className="transition-transform group-hover:rotate-90 duration-300" />
              </button>

              {/* Left Column: Image Showcase & Thumbnail Switcher */}
              <div className="w-full md:w-1/2 flex flex-col bg-neutral-950 relative overflow-hidden group min-h-[280px] md:min-h-[460px] justify-between">
                {/* Main Product Image with subtle zoom effect */}
                <div className="relative flex-1 w-full h-full min-h-0 bg-neutral-900 overflow-hidden flex items-center justify-center">
                  <img
                    src={galleryImages[activeImgIndex]}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />

                  {/* Gradient Overlay for luxury feel */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

                  {/* Top Floating Badges */}
                  <div className="absolute top-4 left-4 flex flex-col gap-2 z-10 pointer-events-none">
                    {discount > 0 && (
                      <span className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-white text-xs font-extrabold px-3.5 py-1 rounded-full shadow-lg border border-amber-300/30 flex items-center gap-1">
                        <Zap size={13} className="fill-white" /> {discount}% OFF
                      </span>
                    )}
                    {product.showAuthenticity && (
                      <span className="bg-emerald-900/90 backdrop-blur-md text-emerald-200 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow border border-emerald-500/30 flex items-center gap-1 w-fit">
                        <ShieldCheck size={11} /> 100% Authentic
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Gallery Thumbnail Strip (if multiple images) */}
                {galleryImages.length > 1 && (
                  <div className="relative z-10 bg-neutral-950/80 backdrop-blur-md px-4 py-3 border-t border-white/10 flex items-center justify-center gap-2 overflow-x-auto">
                    {galleryImages.slice(0, 5).map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveImgIndex(idx)}
                        className={`relative w-11 h-11 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 cursor-pointer ${
                          activeImgIndex === idx
                            ? 'border-amber-400 scale-105 shadow-md shadow-amber-500/30'
                            : 'border-white/20 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Detailed Product Information & Actions */}
              <div className="flex-1 min-h-0 flex flex-col p-6 sm:p-8 overflow-y-auto bg-white custom-scrollbar">
                {/* Category & Collection Tag */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[11px] font-bold text-amber-800 tracking-widest uppercase bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200/60">
                    {product.category?.name || 'Collection'}
                  </span>
                  <span className={`text-[11px] font-bold flex items-center gap-1 ${inStock ? 'text-emerald-700' : 'text-rose-600'}`}>
                    <span className={`w-2 h-2 rounded-full ${inStock ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                    {inStock ? 'In Stock' : 'Out of Stock'}
                  </span>
                </div>

                {/* Product Title */}
                <h3 className="font-playfair text-2xl sm:text-3xl font-bold text-neutral-900 leading-tight mb-2.5">
                  {product.name}
                </h3>

                {/* Rating & Reviews */}
                {Number(product.reviewCount) > 0 && Number(product.rating) > 0 && (
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex items-center gap-0.5 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      <Star size={13} className="fill-amber-500 text-amber-500" />
                      <span className="text-xs font-bold text-amber-900">{parseFloat(product.rating).toFixed(1)}</span>
                    </div>
                    <span className="text-xs text-neutral-400 font-medium">•</span>
                    <span className="text-xs text-neutral-600 font-medium">{product.reviewCount} verified reviews</span>
                  </div>
                )}

                {/* Price Display Block */}
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-3 px-4 bg-neutral-50 rounded-2xl border border-neutral-200/80 mb-5">
                  <span className="font-playfair text-2xl sm:text-3xl font-extrabold text-neutral-950">
                    {fmt(displayPrice)}
                  </span>
                  {displayComparePrice && displayComparePrice > displayPrice && (
                    <span className="text-neutral-400 text-base line-through font-medium">
                      {fmt(displayComparePrice)}
                    </span>
                  )}
                  {discount > 0 && (
                    <span className="text-amber-900 font-bold text-xs bg-amber-100/90 px-2.5 py-1 rounded-full border border-amber-300/60 ml-auto">
                      Save {discount}%
                    </span>
                  )}
                </div>

                {/* Description Excerpt */}
                <p className="text-sm text-neutral-600 leading-relaxed mb-5 line-clamp-3">
                  {product.shortDescription || product.description}
                </p>

                {/* Premium Variant Showcase Card */}
                {(() => {
                  const optionGroups = getParsedOptionGroups(product);
                  const entries = Object.entries(optionGroups).slice(0, 3);
                  if (entries.length === 0) return null;

                  return (
                    <div className="bg-gradient-to-br from-amber-50/50 via-neutral-50 to-neutral-100/60 border border-amber-200/80 rounded-2xl p-4 mb-6 shadow-sm space-y-3">
                      <div className="flex items-center justify-between border-b border-amber-200/50 pb-2">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                          <Sparkles size={13} className="text-amber-600" /> Available Variants
                        </span>
                        <span className="text-[10px] font-semibold text-neutral-500">
                          Select options in full view
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        {entries.map(([groupKey, values]) => {
                          const isColor = groupKey.toLowerCase().includes('color') || groupKey.toLowerCase().includes('colour');
                          const SHOW_LIMIT = 3;
                          const visibleVals = values.slice(0, SHOW_LIMIT);
                          const extraCount = values.length - SHOW_LIMIT;
                          const labelName = groupKey.toLowerCase() === 'color' ? 'colors' : groupKey.toLowerCase();

                          return (
                            <div key={groupKey} className="flex items-center justify-between text-xs font-sans">
                              <div className="flex items-center gap-3">
                                <span className="font-bold text-neutral-800 uppercase text-[11px] tracking-wider min-w-[55px]">
                                  {labelName}:
                                </span>
                                <div className="flex items-center gap-2">
                                  {isColor ? (
                                    visibleVals.map((val, i) => (
                                      <span key={i} className="relative group/swatch flex items-center">
                                        <span
                                          className="w-5 h-5 rounded-full border-2 border-white shadow-md ring-1 ring-neutral-300 inline-block transition-transform hover:scale-125 cursor-pointer"
                                          style={{ backgroundColor: resolveColor(val) }}
                                        />
                                        <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-neutral-900 text-white text-[10px] font-medium px-2 py-0.5 rounded shadow opacity-0 group-hover/swatch:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
                                          {val}
                                        </span>
                                      </span>
                                    ))
                                  ) : (
                                    visibleVals.map((val, i) => (
                                      <span
                                        key={i}
                                        className="px-2.5 py-1 text-[11px] font-bold bg-white text-neutral-900 border border-neutral-300 rounded-md shadow-2xs uppercase tracking-wider hover:border-amber-500 transition-colors"
                                      >
                                        {val}
                                      </span>
                                    ))
                                  )}
                                </div>
                              </div>

                              {extraCount > 0 && (
                                <span className="text-[11px] font-bold text-amber-900 bg-amber-100/90 px-2.5 py-0.5 rounded-full border border-amber-300/60 shadow-2xs">
                                  +{extraCount} {isColor ? 'available' : `${labelName} available`}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Primary Actions Grid */}
                <div className="flex flex-col gap-3 mt-auto pt-2">
                  {inStock ? (
                    <div className="flex gap-3">
                      <button
                        onClick={handleAddToCart}
                        className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-700 hover:to-amber-600 text-white text-xs font-bold tracking-widest uppercase py-3.5 rounded-xl flex-1 flex items-center justify-center gap-2 transition-all duration-200 shadow-md hover:shadow-amber-500/20 active:scale-[0.99] cursor-pointer"
                        id={`quickview-add-cart-${product.id}`}
                      >
                        <ShoppingBag size={15} />
                        Add to Cart
                      </button>
                      <button
                        onClick={handleBuyNow}
                        className="bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-bold tracking-widest uppercase py-3.5 rounded-xl flex-1 flex items-center justify-center gap-2 transition-all duration-200 shadow-md active:scale-[0.99] cursor-pointer"
                        id={`quickview-buy-now-${product.id}`}
                      >
                        Buy Now
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleNotifyMe}
                      className="bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-bold tracking-widest uppercase py-3.5 rounded-xl w-full flex items-center justify-center gap-2 transition-all duration-200 shadow-md cursor-pointer"
                      id={`quickview-notify-${product.id}`}
                    >
                      Notify Me
                    </button>
                  )}
                  <Link
                    to={`/products/${product.slug}`}
                    onClick={() => dispatch(closeQuickView())}
                    className="border-2 border-neutral-900 text-neutral-900 hover:bg-neutral-950 hover:text-white text-xs font-bold tracking-widest uppercase py-3 rounded-xl w-full flex items-center justify-center gap-2 transition-all duration-200 shadow-2xs"
                    id={`quickview-view-full-${product.id}`}
                  >
                    <Eye size={15} />
                    View Full Details
                  </Link>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default QuickViewModal;
