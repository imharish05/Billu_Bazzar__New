import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { X, Star, ShoppingBag, Eye, ShieldCheck, Sparkles, Zap, Heart, Plus, Minus, Check, Mail, CheckCircle2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import { closeQuickView } from '../redux/slices/uiSlice';
import { addLocal, openCart, setBuyNowItem } from '../redux/slices/cartSlice';
import { toggleItem as toggleWishlistLocal } from '../redux/slices/wishlistSlice';
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

// Extract option groups from product data when DB variants don't exist
const getParsedOptionGroups = (prod) => {
  const groups = {};

  const prodAttrs = typeof prod?.attributes === 'string'
    ? (() => { try { return JSON.parse(prod.attributes || '{}'); } catch (e) { return {}; } })()
    : (prod?.attributes || {});

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
      Color: ['Olive Green', 'Classic Black', 'Emerald', 'Rose Gold', 'Maroon'],
      Size: ['XS', 'S', 'M', 'L', 'XL']
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
  const wishlist = useSelector(s => s.wishlist?.items || []);

  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedAttributes, setSelectedAttributes] = useState({});

  const [notifyEmail, setNotifyEmail] = useState('');
  const [notifySuccess, setNotifySuccess] = useState(false);
  const [submittingNotify, setSubmittingNotify] = useState(false);

  useEffect(() => {
    if (customer?.email) {
      setNotifyEmail(customer.email);
    }
  }, [customer?.email]);

  // Parse DB variants
  const parsedVariants = useMemo(() => {
    if (!product || !product.variants) return [];
    return product.variants.map(v => {
      let attrs = v.attributes;
      if (typeof attrs === 'string') {
        try {
          attrs = JSON.parse(attrs);
        } catch (e) {
          attrs = {};
        }
      }
      return { ...v, attributes: attrs || {} };
    });
  }, [product]);

  // Extract unique variant attribute keys (e.g., Color, Size)
  const variantAttributeKeys = useMemo(() => {
    if (!product || parsedVariants.length === 0) return [];
    const keys = new Set();
    parsedVariants.forEach(v => {
      if (v.attributes) {
        Object.keys(v.attributes).forEach(k => keys.add(k));
      }
    });
    return Array.from(keys);
  }, [product, parsedVariants]);

  // Extract unique attribute values per key
  const variantAttributeValues = useMemo(() => {
    if (variantAttributeKeys.length === 0) {
      return getParsedOptionGroups(product || {});
    }
    const valuesMap = {};
    variantAttributeKeys.forEach(key => {
      const valSet = new Set();
      parsedVariants.forEach(v => {
        if (v.attributes && v.attributes[key]) {
          valSet.add(v.attributes[key]);
        }
      });
      valuesMap[key] = Array.from(valSet);
    });
    return valuesMap;
  }, [product, parsedVariants, variantAttributeKeys]);

  // Initialize selected attributes when product changes
  useEffect(() => {
    if (!product) return;
    setActiveImgIndex(0);
    setQuantity(1);
    setNotifySuccess(false);

    if (parsedVariants.length > 0) {
      setSelectedAttributes(parsedVariants[0].attributes || {});
    } else {
      const fallbackGroups = getParsedOptionGroups(product);
      const initialAttrs = {};
      Object.entries(fallbackGroups).forEach(([k, vals]) => {
        if (vals && vals.length > 0) initialAttrs[k] = vals[0];
      });
      setSelectedAttributes(initialAttrs);
    }
  }, [product?.id, parsedVariants]);

  // Match selected variant
  const selectedVariant = useMemo(() => {
    if (!product || parsedVariants.length === 0) return null;
    return parsedVariants.find(v => {
      return variantAttributeKeys.every(key => 
        v.attributes && String(v.attributes[key]).toLowerCase() === String(selectedAttributes[key] || '').toLowerCase()
      );
    });
  }, [product, parsedVariants, selectedAttributes, variantAttributeKeys]);

  if (!product) return null;

  const fmt = (v) => formatPrice(v, currencyCode, currencyRate);

  // Dynamic pricing based on selected variant
  const displayPrice = selectedVariant && selectedVariant.price !== null && selectedVariant.price !== undefined
    ? parseFloat(selectedVariant.price)
    : parseFloat(product.price || 0);

  const displayComparePrice = selectedVariant && selectedVariant.mrp !== null && selectedVariant.mrp !== undefined
    ? parseFloat(selectedVariant.mrp)
    : (product.comparePrice ? parseFloat(product.comparePrice) : null);

  const inStock = selectedVariant
    ? (selectedVariant.stock !== undefined ? selectedVariant.stock > 0 : true)
    : product.inStock !== false;

  const stockLimit = selectedVariant?.stock !== undefined ? parseInt(selectedVariant.stock, 10) : (product.stock || 10);

  const baseImages = (product.images && product.images.length > 0)
    ? product.images
    : (product.defaultProductImage ? [product.defaultProductImage] : []);

  const galleryImages = baseImages.length > 0
    ? baseImages
    : ['https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=600'];

  const currentSelectedAttrs = selectedVariant?.attributes || selectedAttributes;

  const isWishlisted = wishlist.some(item => {
    const sameProd = Number(item.productId || item.id) === Number(product.id);
    if (!sameProd) return false;
    const targetVarId = selectedVariant ? selectedVariant.id : null;
    if (targetVarId || item.variantId) {
      return Number(item.variantId) === Number(targetVarId);
    }
    return true;
  });

  const handleSelectAttribute = (groupKey, value) => {
    if (!parsedVariants || parsedVariants.length === 0) {
      setSelectedAttributes(prev => ({ ...prev, [groupKey]: value }));
      return;
    }

    const tentativeAttrs = { ...selectedAttributes, [groupKey]: value };

    // 1. Exact match with current selectedAttributes + (groupKey: value)
    const exactMatch = parsedVariants.find(v =>
      variantAttributeKeys.every(k =>
        v.attributes && String(v.attributes[k]).toLowerCase() === String(tentativeAttrs[k] || '').toLowerCase()
      )
    );

    let nextAttrs = tentativeAttrs;
    let targetVariant = exactMatch;

    if (exactMatch) {
      nextAttrs = exactMatch.attributes || tentativeAttrs;
    } else {
      // 2. Find candidate variants that have groupKey = value
      const candidateVariants = parsedVariants.filter(v =>
        v.attributes && String(v.attributes[groupKey]).toLowerCase() === String(value).toLowerCase()
      );

      if (candidateVariants.length > 0) {
        // Pick candidate variant that shares max matching attributes with selectedAttributes
        let bestVariant = candidateVariants[0];
        let maxMatchCount = -1;

        candidateVariants.forEach(candidate => {
          let matchCount = 0;
          variantAttributeKeys.forEach(k => {
            if (k !== groupKey && candidate.attributes && selectedAttributes[k]) {
              if (String(candidate.attributes[k]).toLowerCase() === String(selectedAttributes[k]).toLowerCase()) {
                matchCount++;
              }
            }
          });
          if (matchCount > maxMatchCount) {
            maxMatchCount = matchCount;
            bestVariant = candidate;
          }
        });

        nextAttrs = bestVariant.attributes || tentativeAttrs;
        targetVariant = bestVariant;
      }
    }

    setSelectedAttributes(nextAttrs);

    // If selected variant has a specific image, switch gallery active index to match
    if (targetVariant && targetVariant.image) {
      const imgIdx = galleryImages.findIndex(img => img === targetVariant.image);
      if (imgIdx > -1) {
        setActiveImgIndex(imgIdx);
      }
    }
  };

  const handleAddToCart = () => {
    const cartItem = {
      productId: product.id,
      name: product.name,
      image: galleryImages[activeImgIndex] || (selectedVariant && selectedVariant.image) || '',
      priceAtAdd: displayPrice,
      quantity,
      variantId: selectedVariant ? selectedVariant.id : null,
      selectedVariant: currentSelectedAttrs
    };
    dispatch(addLocal(cartItem));
    dispatch(closeQuickView());
    dispatch(openCart());
  };

  const handleBuyNow = () => {
    const cartItem = {
      productId: product.id,
      name: product.name,
      image: galleryImages[activeImgIndex] || (selectedVariant && selectedVariant.image) || '',
      priceAtAdd: displayPrice,
      quantity,
      variantId: selectedVariant ? selectedVariant.id : null,
      selectedVariant: currentSelectedAttrs
    };
    dispatch(setBuyNowItem(cartItem));
    dispatch(closeQuickView());
    navigate('/checkout?mode=buynow');
  };

  const handleToggleWishlist = () => {
    const payload = {
      id: product.id,
      productId: product.id,
      variantId: selectedVariant ? selectedVariant.id : null,
      selectedVariant: currentSelectedAttrs,
      name: product.name,
      slug: product.slug,
      image: galleryImages[activeImgIndex] || '',
      price: displayPrice,
      comparePrice: displayComparePrice,
      inStock,
      category: product.category,
      rating: product.rating,
      reviewCount: product.reviewCount
    };
    dispatch(toggleWishlistLocal(payload));
    toast.success(isWishlisted ? 'Removed from Wishlist' : 'Added to Wishlist', {
      iconTheme: { primary: '#C58837', secondary: 'white' },
      style: {
        border: '1px solid #C58837',
        color: '#111111',
        fontFamily: 'Montserrat, sans-serif'
      }
    });
  };

  const handleNotifySubmit = async (e) => {
    if (e) e.preventDefault();
    if (!notifyEmail.trim()) {
      toast.error('Please enter a valid email address.');
      return;
    }
    try {
      setSubmittingNotify(true);
      await api.post('/stock-alerts', {
        productId: product.id,
        variantId: selectedVariant ? selectedVariant.id : null,
        selectedVariant: currentSelectedAttrs,
        email: notifyEmail.trim()
      });
      setNotifySuccess(true);
      toast.success(`Restock notification registered for ${notifyEmail.trim()}!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to register restock alert.');
    } finally {
      setSubmittingNotify(false);
    }
  };

  const discount = displayComparePrice && displayComparePrice > displayPrice
    ? Math.round(((displayComparePrice - displayPrice) / displayComparePrice) * 100)
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
            {/* Modal Dialog Card - Fixed Height Container (h-[88vh] md:h-[620px] max-h-[680px]) */}
            <motion.div
              key="qv-modal"
              initial={{ opacity: 0, scale: 0.94, y: 25 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 25 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className="bg-white rounded-3xl w-full max-w-4xl h-[88vh] md:h-[620px] max-h-[680px] overflow-hidden flex flex-col md:flex-row relative shadow-[0_30px_70px_-15px_rgba(0,0,0,0.45)] border border-amber-500/20"
              onClick={e => e.stopPropagation()}
              role="dialog"
              aria-label={`Quick view: ${product.name}`}
              aria-modal="true"
            >
              {/* Top Close Button */}
              <button
                onClick={() => dispatch(closeQuickView())}
                className="absolute top-3.5 right-3.5 z-50 p-2.5 bg-neutral-900/80 hover:bg-neutral-950 text-white hover:text-amber-400 transition-all rounded-full shadow-xl border border-white/20 backdrop-blur-md group hover:scale-105 active:scale-95 cursor-pointer"
                aria-label="Close quick view"
              >
                <X size={18} strokeWidth={2.2} className="transition-transform group-hover:rotate-90 duration-300" />
              </button>

              {/* Left Column: Image Showcase & Thumbnail Switcher (Fixed height flex container) */}
              <div className="w-full md:w-1/2 h-48 sm:h-64 md:h-full flex flex-col bg-neutral-950 relative overflow-hidden flex-shrink-0 justify-between">
                {/* Main Product Image with subtle zoom effect */}
                <div className="relative flex-1 w-full h-full min-h-0 bg-neutral-900 overflow-hidden flex items-center justify-center">
                  <img
                    src={galleryImages[activeImgIndex]}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />

                  {/* Gradient Overlay for luxury feel */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

                  {/* Top Left Floating Badges */}
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
                  <div className="relative z-10 bg-neutral-950/80 backdrop-blur-md px-4 py-2.5 border-t border-white/10 flex items-center justify-center gap-2 overflow-x-auto">
                    {galleryImages.slice(0, 5).map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveImgIndex(idx)}
                        className={`relative w-10 h-10 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 cursor-pointer ${
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

              {/* Right Column: Detailed Product Information & Actions (Scrolls internally inside fixed height) */}
              <div className="flex-1 h-full min-h-0 flex flex-col p-5 sm:p-7 overflow-y-auto bg-white custom-scrollbar">
                {/* Category & Stock Tag Row */}
                <div className="flex flex-wrap items-center gap-2.5 mb-2 pr-12">
                  <span className="text-[11px] font-bold text-amber-800 tracking-widest uppercase bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200/60">
                    {product.category?.name || 'Collection'}
                  </span>
                  <span className={`text-[11px] font-bold flex items-center gap-1.5 px-2.5 py-1 rounded-md ${inStock ? 'text-emerald-700 bg-emerald-50 border border-emerald-200/60' : 'text-rose-600 bg-rose-50 border border-rose-200/60'}`}>
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
                  <div className="flex items-center gap-2 mb-3.5">
                    <div className="flex items-center gap-0.5 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      <Star size={13} className="fill-amber-500 text-amber-500" />
                      <span className="text-xs font-bold text-amber-900">{parseFloat(product.rating).toFixed(1)}</span>
                    </div>
                    <span className="text-xs text-neutral-400 font-medium">•</span>
                    <span className="text-xs text-neutral-600 font-medium">{product.reviewCount} verified reviews</span>
                  </div>
                )}

                {/* Price Display Block */}
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-3 px-4 bg-neutral-50 rounded-2xl border border-neutral-200/80 mb-4">
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
                <p className="text-sm text-neutral-600 leading-relaxed mb-4 line-clamp-2 sm:line-clamp-3">
                  {product.shortDescription || product.description}
                </p>

                {/* Interactive Variant Selection Block */}
                {Object.keys(variantAttributeValues).length > 0 && (
                  <div className="bg-gradient-to-br from-amber-50/40 via-neutral-50 to-neutral-100/50 border border-amber-200/70 rounded-2xl p-4 mb-4 shadow-2xs space-y-3.5">
                    <div className="flex items-center justify-between border-b border-amber-200/50 pb-2">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                        <Sparkles size={13} className="text-amber-600" /> Select Options
                      </span>
                      {selectedVariant && (
                        <span className="text-[10px] font-semibold text-emerald-700 flex items-center gap-1">
                          <Check size={11} /> Variant Ready
                        </span>
                      )}
                    </div>

                    <div className="space-y-3">
                      {Object.entries(variantAttributeValues).map(([groupKey, values]) => {
                        if (!values || values.length === 0) return null;
                        const isColor = groupKey.toLowerCase().includes('color') || groupKey.toLowerCase().includes('colour');
                        const selectedVal = selectedAttributes[groupKey] || values[0];

                        return (
                          <div key={groupKey} className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-neutral-800 uppercase text-[11px] tracking-wider">
                                {groupKey}: <span className="font-extrabold text-amber-900 capitalize">{selectedVal}</span>
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              {isColor ? (
                                values.map((val, i) => {
                                  const isSelected = String(selectedVal).toLowerCase() === String(val).toLowerCase();
                                  const directVariantMatch = parsedVariants.length > 0 ? parsedVariants.find(v =>
                                    variantAttributeKeys.every(k =>
                                      v.attributes && String(v.attributes[k]).toLowerCase() === String(k === groupKey ? val : (selectedAttributes[k] || '')).toLowerCase()
                                    )
                                  ) : null;
                                  const anyVariantWithVal = parsedVariants.length > 0 ? parsedVariants.find(v =>
                                    v.attributes && String(v.attributes[groupKey]).toLowerCase() === String(val).toLowerCase()
                                  ) : true;
                                  const isOutOfStock = directVariantMatch
                                    ? (directVariantMatch.stock !== undefined && parseInt(directVariantMatch.stock, 10) <= 0)
                                    : (anyVariantWithVal && anyVariantWithVal.stock !== undefined ? parseInt(anyVariantWithVal.stock, 10) <= 0 : false);

                                  let ringStyle = 'border-transparent opacity-75 hover:opacity-100 hover:scale-105 cursor-pointer';
                                  if (isSelected) {
                                    ringStyle = 'border-amber-600 scale-110 shadow-md ring-2 ring-amber-400/40 cursor-pointer';
                                  } else if (isOutOfStock) {
                                    ringStyle = 'border-neutral-300 opacity-50 hover:opacity-80 hover:scale-105 cursor-pointer';
                                  } else if (!directVariantMatch && anyVariantWithVal) {
                                    ringStyle = 'border-dashed border-amber-400 opacity-80 hover:opacity-100 hover:scale-105 cursor-pointer';
                                  }

                                  return (
                                    <button
                                      key={i}
                                      type="button"
                                      disabled={!directVariantMatch && !anyVariantWithVal}
                                      onClick={() => handleSelectAttribute(groupKey, val)}
                                      className={`relative p-0.5 rounded-full border-2 transition-all cursor-pointer ${ringStyle}`}
                                      title={isOutOfStock ? `${val} — Out of stock` : (!directVariantMatch && anyVariantWithVal ? `Click to select variant with ${groupKey}: ${val}` : val)}
                                      aria-label={`Select color ${val}`}
                                    >
                                      <span
                                        className="w-6 h-6 rounded-full border border-white/60 shadow-xs inline-block flex items-center justify-center relative overflow-hidden"
                                        style={{ backgroundColor: resolveColor(val) }}
                                      >
                                        {isOutOfStock && (
                                          <span className="absolute inset-0 bg-neutral-900/50 flex items-center justify-center">
                                            <span className="w-full h-0.5 bg-rose-500 rotate-45 transform" />
                                          </span>
                                        )}
                                        {isSelected && (
                                          <Check size={12} className={['white', 'cream', 'beige', 'yellow', 'gold'].includes(val.toLowerCase()) ? 'text-black' : 'text-white'} />
                                        )}
                                      </span>
                                    </button>
                                  );
                                })
                              ) : (
                                values.map((val, i) => {
                                  const isSelected = String(selectedVal).toLowerCase() === String(val).toLowerCase();
                                  const directVariantMatch = parsedVariants.length > 0 ? parsedVariants.find(v =>
                                    variantAttributeKeys.every(k =>
                                      v.attributes && String(v.attributes[k]).toLowerCase() === String(k === groupKey ? val : (selectedAttributes[k] || '')).toLowerCase()
                                    )
                                  ) : null;
                                  const anyVariantWithVal = parsedVariants.length > 0 ? parsedVariants.find(v =>
                                    v.attributes && String(v.attributes[groupKey]).toLowerCase() === String(val).toLowerCase()
                                  ) : true;
                                  const isOutOfStock = directVariantMatch
                                    ? (directVariantMatch.stock !== undefined && parseInt(directVariantMatch.stock, 10) <= 0)
                                    : (anyVariantWithVal && anyVariantWithVal.stock !== undefined ? parseInt(anyVariantWithVal.stock, 10) <= 0 : false);

                                  let btnStyle = "bg-white text-neutral-800 border-neutral-300 hover:border-amber-500 hover:bg-amber-50/50 cursor-pointer";
                                  if (isSelected) {
                                    if (isOutOfStock) {
                                      btnStyle = "bg-neutral-950 text-amber-400 border-neutral-900 shadow-sm scale-[1.02] ring-2 ring-amber-400/30 font-extrabold line-through opacity-85 cursor-pointer";
                                    } else {
                                      btnStyle = "bg-neutral-950 text-amber-400 border-neutral-900 shadow-sm scale-[1.02] ring-2 ring-amber-400/30 font-extrabold cursor-pointer";
                                    }
                                  } else if (isOutOfStock) {
                                    btnStyle = "bg-neutral-100 text-neutral-400 border-neutral-200 line-through opacity-60 hover:opacity-80 cursor-pointer";
                                  } else if (!directVariantMatch && anyVariantWithVal) {
                                    btnStyle = "bg-amber-50/40 text-neutral-700 border-dashed border-amber-300 hover:border-amber-500 hover:bg-amber-100/50 cursor-pointer";
                                  } else if (!anyVariantWithVal) {
                                    btnStyle = "bg-neutral-100 text-neutral-400 border-dashed border-neutral-200 line-through opacity-40 cursor-not-allowed";
                                  }

                                  return (
                                    <button
                                      key={i}
                                      type="button"
                                      disabled={!directVariantMatch && !anyVariantWithVal}
                                      onClick={() => handleSelectAttribute(groupKey, val)}
                                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all border cursor-pointer ${btnStyle}`}
                                      title={isOutOfStock ? `${val} — Out of stock` : (!directVariantMatch && anyVariantWithVal ? `Click to select variant with ${groupKey}: ${val}` : `${groupKey}: ${val}`)}
                                    >
                                      {val}
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Quantity Control & Actions Grid */}
                <div className="flex flex-col gap-3 mt-auto pt-2">
                  {/* Quantity Selector & Wishlist Button Row */}
                  <div className="flex items-center gap-2.5">
                    <div className="flex-1 flex items-center justify-between py-2 px-3.5 bg-neutral-50 rounded-xl border border-neutral-200 h-11">
                      <span className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                        Quantity
                      </span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setQuantity(q => Math.max(1, q - 1))}
                          disabled={quantity <= 1}
                          className="w-7 h-7 rounded-lg bg-white border border-neutral-300 flex items-center justify-center text-neutral-800 hover:bg-neutral-100 disabled:opacity-40 transition-colors cursor-pointer"
                          aria-label="Decrease quantity"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="w-6 text-center text-xs font-extrabold text-neutral-900">
                          {quantity}
                        </span>
                        <button
                          onClick={() => setQuantity(q => Math.min(stockLimit, q + 1))}
                          disabled={quantity >= stockLimit}
                          className="w-7 h-7 rounded-lg bg-white border border-neutral-300 flex items-center justify-center text-neutral-800 hover:bg-neutral-100 disabled:opacity-40 transition-colors cursor-pointer"
                          aria-label="Increase quantity"
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Wishlist Button beside Quantity */}
                    <button
                      onClick={handleToggleWishlist}
                      className={`h-11 w-11 rounded-xl border transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                        isWishlisted
                          ? 'bg-rose-600 text-white border-rose-600 shadow-md'
                          : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-800 border-neutral-200 hover:border-amber-400'
                      }`}
                      aria-label="Wishlist toggle"
                      title={isWishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
                    >
                      <Heart size={18} className={`shrink-0 ${isWishlisted ? 'fill-white' : ''}`} />
                    </button>
                  </div>

                  {inStock ? (
                    <div className="grid grid-cols-1 min-[340px]:grid-cols-2 gap-2.5">
                      <button
                        onClick={handleAddToCart}
                        className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-700 hover:to-amber-600 text-white text-[11px] sm:text-xs font-bold tracking-wider sm:tracking-widest uppercase py-3.5 px-3 sm:px-4 rounded-xl flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap transition-all duration-200 shadow-md hover:shadow-amber-500/20 active:scale-[0.99] cursor-pointer overflow-hidden min-w-0"
                        id={`quickview-add-cart-${product.id}`}
                      >
                        <ShoppingBag size={15} className="shrink-0" />
                        <span className="truncate">Add to Cart</span>
                      </button>
                      <button
                        onClick={handleBuyNow}
                        className="bg-neutral-950 hover:bg-neutral-800 text-white text-[11px] sm:text-xs font-bold tracking-wider sm:tracking-widest uppercase py-3.5 px-3 sm:px-4 rounded-xl flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap transition-all duration-200 shadow-md active:scale-[0.99] cursor-pointer overflow-hidden min-w-0"
                        id={`quickview-buy-now-${product.id}`}
                      >
                        <Zap size={15} className="shrink-0 text-amber-400" />
                        <span className="truncate">Buy Now</span>
                      </button>
                    </div>
                  ) : (
                    <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                          <Mail size={14} className="text-amber-600" /> Out of Stock
                        </span>
                        <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                          Restock Alert
                        </span>
                      </div>
                      {!notifySuccess ? (
                        <form onSubmit={handleNotifySubmit} className="space-y-2">
                          <p className="text-[11px] text-neutral-600 font-medium">Enter your email to get notified immediately when restocked:</p>
                          <div className="flex gap-2">
                            <input
                              type="email"
                              required
                              placeholder="Enter your email"
                              value={notifyEmail}
                              onChange={e => setNotifyEmail(e.target.value)}
                              className="flex-1 bg-white border border-neutral-300 rounded-lg px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:border-amber-500 shadow-xs"
                            />
                            <button
                              type="submit"
                              disabled={submittingNotify}
                              className="bg-neutral-950 hover:bg-neutral-800 disabled:opacity-50 text-amber-400 px-3.5 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                            >
                              {submittingNotify ? 'Saving...' : 'Notify Me'}
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="bg-emerald-50 text-emerald-800 p-2.5 rounded-lg border border-emerald-200 text-xs flex items-center gap-2">
                          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                          <div>
                            <p className="font-bold">Subscription Active!</p>
                            <p className="text-[11px] text-emerald-700">We will email <span className="font-semibold">{notifyEmail}</span> as soon as this item is restocked.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <Link
                    to={`/products/${product.slug}`}
                    onClick={() => dispatch(closeQuickView())}
                    className="border-2 border-neutral-900 text-neutral-900 hover:bg-neutral-950 hover:text-white text-xs font-bold tracking-widest uppercase py-2.5 px-4 rounded-xl w-full flex items-center justify-center gap-2 transition-all duration-200 shadow-2xs overflow-hidden"
                    id={`quickview-view-full-${product.id}`}
                  >
                    <Eye size={15} className="shrink-0" />
                    <span>View Full Details</span>
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

