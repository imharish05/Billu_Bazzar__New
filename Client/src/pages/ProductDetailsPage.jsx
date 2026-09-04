import { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Heart, Star, ChevronRight, ChevronLeft, Share2, Shield, Truck, RotateCcw, ZoomIn, Play, Mail, CheckCircle2, X, Tag, Copy, Edit3, Trash2, Store, Building2, FileText } from 'lucide-react';
import { fetchProduct, fetchProducts } from '../redux/slices/productsSlice';
import { addLocal, openCart, setBuyNowItem } from '../redux/slices/cartSlice';
import { toggleItem } from '../redux/slices/wishlistSlice';
import { openQuickView } from '../redux/slices/uiSlice';
import Footer from '../components/Footer';
import ProductCard from '../components/ProductCard';
import Product360Viewer from '../components/Product360Viewer';
import { formatPrice } from '../utils/currency';
import { getPlaceholderSvg } from '../utils/placeholder';
import api from '../services/api';
import toast from 'react-hot-toast';

import { fetchProductReviews, createReview, updateReview, deleteReview } from '../redux/slices/reviewsSlice';

/** Map common color names → CSS color / gradient values for swatch circles */
const COLOR_MAP = {
  red: '#e53e3e', crimson: '#dc143c', maroon: '#800000', pink: '#f687b3', rose: '#f43f5e', magenta: '#d53f8c', hotpink: '#ff69b4', blush: '#ffb6c1',
  blue: '#3b82f6', navy: '#1e3a8a', cobalt: '#0047ab', royal: '#4169e1', sky: '#38bdf8', cyan: '#06b6d4', teal: '#0d9488', aqua: '#00ffff',
  green: '#22c55e', olive: '#6b8e23', mint: '#3eb489', emerald: '#10b981', forest: '#228b22', lime: '#84cc16', sage: '#9dc183',
  yellow: '#f59e0b', gold: '#b8860b', amber: '#f59e0b', lemon: '#fff44f', mustard: '#ffdb58',
  orange: '#f97316', coral: '#ff6b6b', salmon: '#fa8072', peach: '#ffcba4',
  purple: '#9333ea', lavender: '#c4b5fd', violet: '#7c3aed', indigo: '#6366f1', mauve: '#9f8fba', plum: '#8b008b', lilac: '#c8a2c8', burgundy: '#800020',
  brown: '#92400e', tan: '#d2b48c', beige: '#f5f5dc', caramel: '#c68642', chocolate: '#7b3f00', coffee: '#6f4e37',
  black: '#111111', charcoal: '#374151', grey: '#9ca3af', gray: '#9ca3af', silver: '#c0c0c0', ash: '#b2beb5', steel: '#4682b4', neutral: '#d1d5db',
  white: '#f9fafb', cream: '#fffdd0', ivory: '#fffff0', off: '#faf9f6', clear: 'linear-gradient(135deg,#e2e8f0 0%,#cbd5e1 100%)', 'pastel blue': '#90caf9',
  multicolor: 'linear-gradient(135deg,#e53e3e 0%,#f59e0b 25%,#22c55e 50%,#3b82f6 75%,#9333ea 100%)',
  multi: 'linear-gradient(135deg,#e53e3e 0%,#f59e0b 25%,#22c55e 50%,#3b82f6 75%,#9333ea 100%)',
  printed: 'linear-gradient(135deg,#f687b3 0%,#f59e0b 33%,#38bdf8 66%,#22c55e 100%)',
};

/** Resolve a color name / value to a CSS background string */
const resolveColor = (name = '') => {
  const lower = name.toLowerCase().trim();
  if (COLOR_MAP[lower]) return COLOR_MAP[lower];
  for (const [key, val] of Object.entries(COLOR_MAP)) {
    if (lower.includes(key)) return val;
  }
  return lower; // fallback — may be a valid CSS color
};

const ProductDetailsPage = () => {
  const { slug } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { current: product, items: allProducts, loading } = useSelector(s => s.products);
  const { items: wishlist } = useSelector(s => s.wishlist);
  const { items: cartItems } = useSelector(s => s.cart);
  const { code: currencyCode, rate: currencyRate } = useSelector(s => s.currency);

  const fmt = (v, aed) => formatPrice(v, currencyCode, currencyRate, aed);

  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('description');
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const [viewMode, setViewMode] = useState('standard'); // 'standard', 'spin', 'ar'
  const [videoOpen, setVideoOpen] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState('');
  const [notifySuccess, setNotifySuccess] = useState(false);
  const videoRef = useRef(null);
  const [videoSpeed, setVideoSpeed] = useState(0.8);

  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useSelector(s => s.auth || {});
  const reviewsState = useSelector(s => s.reviews);

  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewBody, setReviewBody] = useState('');
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [reviewImage, setReviewImage] = useState(null);
  const [reviewImagePreview, setReviewImagePreview] = useState(null);
  const reviewImageRef = useRef(null);

  useEffect(() => {
    if (product && product.id) {
      dispatch(fetchProductReviews(product.id));
    }
  }, [product?.id, dispatch]);

  useEffect(() => {
    if (searchParams.get('writeReview') === 'true') {
      setActiveTab('reviews');
      setTimeout(() => {
        const reviewsEl = document.getElementById('reviews');
        if (reviewsEl) reviewsEl.scrollIntoView({ behavior: 'smooth' });
      }, 150);
      if (reviewsState.userCanReview) {
        setReviewModalOpen(true);
      }
    }
  }, [searchParams, reviewsState.userCanReview]);

  const handleOpenWriteReview = () => {
    if (reviewsState.userReview) {
      setEditingReviewId(reviewsState.userReview.id);
      setReviewRating(reviewsState.userReview.rating || 5);
      setReviewTitle(reviewsState.userReview.title || '');
      setReviewBody(reviewsState.userReview.body || '');
    } else {
      setEditingReviewId(null);
      setReviewRating(5);
      setReviewTitle('');
      setReviewBody('');
    }
    setReviewImage(null);
    setReviewImagePreview(null);
    setReviewModalOpen(true);
  };

  const handleOpenEditReview = (rev) => {
    setEditingReviewId(rev.id);
    setReviewRating(rev.rating || 5);
    setReviewTitle(rev.title || '');
    setReviewBody(rev.body || '');
    setReviewImage(null);
    setReviewImagePreview(null);
    setReviewModalOpen(true);
  };

  const handleReviewImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const MAX_SIZE_MB = 5;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Image too large. Please upload an image under ${MAX_SIZE_MB}MB.`);
      e.target.value = '';
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are allowed (JPG, PNG, WEBP, etc.)');
      e.target.value = '';
      return;
    }
    setReviewImage(file);
    setReviewImagePreview(URL.createObjectURL(file));
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewBody.trim()) {
      toast.error('Please write a review comment.');
      return;
    }
    try {
      if (editingReviewId) {
        const res = await dispatch(updateReview({
          id: editingReviewId,
          rating: reviewRating,
          title: reviewTitle,
          body: reviewBody,
          productId: product.id,
        }));
        if (updateReview.fulfilled.match(res)) {
          toast.success('Your review has been updated!');
          setReviewModalOpen(false);
          if (product?.slug) dispatch(fetchProduct(product.slug));
        } else {
          toast.error(res.payload || 'Failed to update review');
        }
      } else {
        const res = await dispatch(createReview({
          productId: product.id,
          orderId: reviewsState.eligibleOrderId,
          rating: reviewRating,
          title: reviewTitle,
          body: reviewBody,
        }));
        if (createReview.fulfilled.match(res)) {
          toast.success('Thank you! Your review has been published.');
          setReviewModalOpen(false);
          if (product?.slug) dispatch(fetchProduct(product.slug));
        } else {
          toast.error(res.payload || 'Failed to submit review');
        }
      }
    } catch (err) {
      toast.error('An unexpected error occurred.');
    }
  };

  const handleDeleteReview = async (reviewId) => {
    try {
      const res = await dispatch(deleteReview({ id: reviewId, productId: product.id }));
      if (deleteReview.fulfilled.match(res)) {
        toast.success('Review deleted successfully.');
        if (product?.slug) dispatch(fetchProduct(product.slug));
      } else {
        toast.error(res.payload || 'Failed to delete review');
      }
    } catch (err) {
      toast.error('An error occurred while deleting.');
    }
  };

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = videoSpeed;
    }
  }, [videoSpeed, videoOpen]);

  const attributes = useMemo(() => {
    if (!product || !product.attributes) return {};
    if (typeof product.attributes === 'string') {
      try {
        return JSON.parse(product.attributes);
      } catch (e) {
        return {};
      }
    }
    return product.attributes;
  }, [product]);

  const relatedProducts = useMemo(() => {
    if (!product) return [];
    return allProducts
      .filter(p => p.categoryId === product.categoryId && p.id !== product.id)
      .slice(0, 4);
  }, [allProducts, product]);

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
      let vImgs = v.images;
      if (typeof vImgs === 'string') {
        try {
          vImgs = JSON.parse(vImgs);
        } catch (e) {
          vImgs = [];
        }
      }
      return { ...v, attributes: attrs || {}, images: Array.isArray(vImgs) ? vImgs : [] };
    });
  }, [product]);

  const [selectedAttributes, setSelectedAttributes] = useState({});

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

  const variantAttributeValues = useMemo(() => {
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
  }, [parsedVariants, variantAttributeKeys]);

  useEffect(() => {
    if (product && parsedVariants.length > 0) {
      const firstValid = parsedVariants.find(v => v.stock === undefined || parseInt(v.stock, 10) > 0) || parsedVariants[0];
      setSelectedAttributes(firstValid.attributes || {});
    } else {
      setSelectedAttributes({});
    }
  }, [product, parsedVariants]);

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

    if (exactMatch) {
      nextAttrs = exactMatch.attributes || tentativeAttrs;
    } else {
      // 2. Find candidate variants that have groupKey = value
      const candidateVariants = parsedVariants.filter(v =>
        v.attributes && String(v.attributes[groupKey]).toLowerCase() === String(value).toLowerCase()
      );

      if (candidateVariants.length > 0) {
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
      }
    }

    setSelectedAttributes(nextAttrs);
  };

  const selectedVariant = useMemo(() => {
    if (!product || parsedVariants.length === 0) return null;
    return parsedVariants.find(v => {
      return variantAttributeKeys.every(key => 
        v.attributes && String(v.attributes[key]).toLowerCase() === String(selectedAttributes[key] || '').toLowerCase()
      );
    });
  }, [parsedVariants, selectedAttributes, variantAttributeKeys]);

  const currentSelectedAttrs = useMemo(() => {
    if (selectedVariant && selectedVariant.attributes) return selectedVariant.attributes;
    if (selectedSize) return { size: selectedSize };
    return {};
  }, [selectedVariant, selectedSize]);

  const isWishlisted = product ? wishlist.some(item => {
    const sameProd = Number(item.productId || item.id) === Number(product.id);
    if (!sameProd) return false;
    const targetVarId = selectedVariant ? selectedVariant.id : null;
    if (targetVarId || item.variantId) {
      return Number(item.variantId) === Number(targetVarId);
    }
    const hasAttrsA = item.selectedVariant && Object.keys(item.selectedVariant).length > 0;
    const hasAttrsB = currentSelectedAttrs && Object.keys(currentSelectedAttrs).length > 0;
    if (hasAttrsA || hasAttrsB) {
      const a = item.selectedVariant || {};
      const b = currentSelectedAttrs || {};
      const keysA = Object.keys(a).sort();
      const keysB = Object.keys(b).sort();
      if (keysA.length !== keysB.length) return false;
      return keysA.every(k => String(a[k]).toLowerCase() === String(b[k]).toLowerCase());
    }
    return true;
  }) : false;

  const inCart = product ? cartItems.some(i => Number(i.productId || i.id) === Number(product.id)) : false;

  const rawImages = useMemo(() => {
    if (!product) return [];
    if (Array.isArray(product.images) && product.images.length > 0) return product.images;
    if (product.defaultProductImage) return [product.defaultProductImage];
    return [getPlaceholderSvg(product.name || 'Product')];
  }, [product]);

  const baseImages = useMemo(() => {
    if (!product) return [];
    return rawImages.map(img => typeof img === 'string' && img.length > 2 ? img : getPlaceholderSvg(product.name || 'Product'));
  }, [product, rawImages]);

  const images = useMemo(() => {
    if (!product) return [];

    if (selectedVariant) {
      let vImgs = selectedVariant.images;
      if (typeof vImgs === 'string') {
        try { vImgs = JSON.parse(vImgs); } catch (e) { vImgs = []; }
      }
      const list = [];
      if (selectedVariant.image && typeof selectedVariant.image === 'string' && selectedVariant.image.trim() !== '') {
        list.push(selectedVariant.image);
      }
      if (Array.isArray(vImgs)) {
        vImgs.forEach(img => {
          if (img && typeof img === 'string' && img.trim() !== '' && !list.includes(img)) {
            list.push(img);
          }
        });
      }
      if (list.length > 0) {
        return list.slice(0, 5);
      }
    }

    return baseImages;
  }, [product, baseImages, selectedVariant]);

  const allLightboxImages = useMemo(() => {
    if (!product) return [];
    const list = [...images];
    if (Array.isArray(product.variants)) {
      product.variants.forEach(v => {
        if (v.image && !list.includes(v.image)) list.push(v.image);
        if (Array.isArray(v.images)) {
          v.images.forEach(img => {
            if (img && !list.includes(img)) list.push(img);
          });
        }
      });
    }
    return list;
  }, [product, images]);

  useEffect(() => {
    if (!isImageModalOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') {
        setLightboxIndex(prev => (prev - 1 + allLightboxImages.length) % allLightboxImages.length);
      } else if (e.key === 'ArrowRight') {
        setLightboxIndex(prev => (prev + 1) % allLightboxImages.length);
      } else if (e.key === 'Escape') {
        setIsImageModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isImageModalOpen, allLightboxImages.length]);

  // When selectedVariant changes, automatically select the variant's first image (index 0)
  useEffect(() => {
    if (selectedVariant) {
      setSelectedImage(0);
    }
  }, [selectedVariant?.id]);

  useEffect(() => {
    if (slug) dispatch(fetchProduct(slug));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [slug, dispatch]);

  useEffect(() => {
    if (allProducts.length === 0) {
      dispatch(fetchProducts({ limit: 40 }));
    }
  }, [allProducts.length, dispatch]);

  useEffect(() => {
    if (product) {
      document.title = `${product.name} — Billu Bazaar`;
    }
  }, [product]);

  const handleAddToCart = () => {
    if (!product) return;
    if (inCart) {
      navigate('/cart');
      return;
    }

    const targetVariantId = selectedVariant ? selectedVariant.id : null;
    const existing = (cartItems || []).find(i => Number(i.productId || i.id) === Number(product.id) && (targetVariantId ? Number(i.variantId) === Number(targetVariantId) : true));
    const currentInCart = existing ? Number(existing.quantity || 0) : 0;

    if (currentInCart + quantity > displayStock) {
      const allowedAdd = Math.max(0, displayStock - currentInCart);
      if (allowedAdd === 0) {
        toast.error(`Maximum available stock (${displayStock} items) is already in your cart.`);
        return;
      }
      toast.error(`Only ${displayStock} items available in stock. Adding ${allowedAdd} instead of ${quantity}.`);
    }

    const finalQty = Math.min(quantity, Math.max(1, displayStock - currentInCart));

    const cartItem = {
      productId: product.id,
      name: product.name,
      image: (selectedVariant && selectedVariant.image) || images[0],
      priceAtAdd: displayPrice,
      quantity: finalQty,
      variantId: selectedVariant ? selectedVariant.id : null,
      gstRate: (selectedVariant && selectedVariant.gstRate) || product.gstRate || '0%',
      product: product,
      selectedVariant: selectedVariant 
        ? { ...selectedVariant.attributes, gstRate: selectedVariant.gstRate || product.gstRate || '0%' } 
        : (selectedSize ? { size: selectedSize } : {})
    };
    dispatch(addLocal(cartItem));
    dispatch(openCart());
  };

  const handleBuyNow = () => {
    if (!product) return;
    if (displayStock <= 0) {
      toast.error('Item is out of stock.');
      return;
    }
    const finalQty = Math.min(quantity, displayStock);
    const cartItem = {
      productId: product.id,
      name: product.name,
      image: (selectedVariant && selectedVariant.image) || images[0],
      priceAtAdd: displayPrice,
      quantity: finalQty,
      variantId: selectedVariant ? selectedVariant.id : null,
      gstRate: (selectedVariant && selectedVariant.gstRate) || product.gstRate || '0%',
      product: product,
      selectedVariant: selectedVariant 
        ? { ...selectedVariant.attributes, gstRate: selectedVariant.gstRate || product.gstRate || '0%' } 
        : (selectedSize ? { size: selectedSize } : {})
    };
    dispatch(setBuyNowItem(cartItem));
    navigate('/checkout?mode=buynow');
  };

  const handleWishlistToggle = () => {
    if (!product) return;
    const payload = {
      id: product.id,
      productId: product.id,
      name: product.name,
      slug: product.slug,
      image: (selectedVariant && selectedVariant.image) || images[0] || '',
      price: displayPrice,
      comparePrice: displayComparePrice,
      inStock: displayStock > 0,
      categoryName: product.category?.name || 'Lifestyle',
      rating: product.rating || 4.5,
      reviewCount: product.reviewCount || 10,
      variantId: selectedVariant ? selectedVariant.id : null,
      selectedVariant: selectedVariant 
        ? selectedVariant.attributes 
        : (selectedSize ? { size: selectedSize } : {})
    };
    dispatch(toggleItem(payload));
  };

  if (loading || !product) {
    return (
      <main id="main-content">
        <div className="max-w-site mx-auto px-6 md:px-8 py-12">
          <div className="grid md:grid-cols-2 gap-12">
            <div className="skeleton aspect-square" />
            <div className="space-y-6 pt-8">
              <div className="skeleton h-8 w-3/4" />
              <div className="skeleton h-6 w-1/3" />
              <div className="skeleton h-10 w-1/2" />
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-4 w-full" />)}
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  const displayPrice = selectedVariant && selectedVariant.price !== null
    ? parseFloat(selectedVariant.price)
    : parseFloat(product.price);

  const displayPriceAED = (selectedVariant && selectedVariant.priceAED !== null && selectedVariant.priceAED !== undefined && selectedVariant.priceAED !== '')
    ? selectedVariant.priceAED
    : (product.priceAED || null);

  const displayComparePrice = selectedVariant && selectedVariant.mrp !== null
    ? parseFloat(selectedVariant.mrp)
    : (product.comparePrice ? parseFloat(product.comparePrice) : null);

  const displayComparePriceAED = (selectedVariant && selectedVariant.mrpAED !== null && selectedVariant.mrpAED !== undefined && selectedVariant.mrpAED !== '')
    ? selectedVariant.mrpAED
    : (product.comparePriceAED || null);

  const displayStock = selectedVariant
    ? parseInt(selectedVariant.stock, 10)
    : parseInt(product.stock, 10);

  const discount = displayComparePrice && displayComparePrice > displayPrice
    ? Math.round(((displayComparePrice - displayPrice) / displayComparePrice) * 100)
    : null;

  const sizes = !product.variants || product.variants.length === 0
    ? (attributes?.sizes || ['S', 'M', 'L', 'XL'])
    : [];

  const vendorName = product.vendor?.name || product.vendorName || attributes?.vendorName || attributes?.sellerName || 'Billu Bazaar Official';
  const rawVendorGst = product.vendor?.gstin || product.vendorGst || product.vendor?.gst || attributes?.vendorGst || attributes?.gstin || attributes?.gstNumber || '29ABCDE1234F1Z5';
  const vendorGst = String(rawVendorGst).toUpperCase();



  const handleNotifySubmit = async (e) => {
    e.preventDefault();
    if (!notifyEmail.trim()) return;
    try {
      await api.post('/stock-alerts', {
        productId: product.id,
        variantId: selectedVariant ? selectedVariant.id : null,
        selectedVariant: currentSelectedAttrs,
        email: notifyEmail.trim()
      });
      setNotifySuccess(true);
      toast.success(`Restock notification alert registered for ${notifyEmail.trim()}!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to register restock alert.');
    }
  };

  return (
    <main id="main-content" className="overflow-x-hidden w-full max-w-full">
      {/* Breadcrumb */}
      <div className="max-w-site mx-auto px-4 sm:px-6 md:px-8 py-4">
        <nav className="text-xs text-brand-grey flex items-center gap-1 flex-wrap" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-brand-gold transition-colors">Home</Link>
          <ChevronRight size={12} />
          <Link to="/products" className="hover:text-brand-gold transition-colors">Products</Link>
          {product.category && (
            <>
              <ChevronRight size={12} />
              <Link to={`/products?category=${product.category?.slug}`} className="hover:text-brand-gold transition-colors">{product.category?.name}</Link>
            </>
          )}
          <ChevronRight size={12} />
          <span className="text-brand-text truncate max-w-xs">{product.name}</span>
        </nav>
      </div>

      {/* Product Layout */}
      <div className="max-w-site mx-auto px-4 sm:px-6 md:px-8">
        <div className="grid md:grid-cols-2 gap-8 lg:gap-16">
          {/* Images */}
          <div className="flex flex-col flex-1">
            <div className="flex flex-col-reverse md:flex-row gap-3 sm:gap-4">
              {/* Thumbnails */}
              <div className="flex md:flex-col gap-2.5 sm:gap-3 w-full md:w-20 overflow-x-auto md:overflow-x-visible flex-shrink-0 px-0.5 py-1.5 md:p-0 scrollbar-none max-w-full">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => { setSelectedImage(i); setViewMode('standard'); }}
                    className={`w-16 h-20 sm:w-20 sm:h-24 flex-shrink-0 overflow-hidden border-2 rounded-lg transition-all ${selectedImage === i && viewMode === 'standard' ? 'border-brand-gold ring-2 ring-brand-gold/30 scale-[1.02]' : 'border-neutral-200 hover:border-brand-grey'}`}
                    aria-label={`Product image ${i + 1}`}
                    id={`thumb-${i}`}
                  >
                    <img
                      src={img}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = getPlaceholderSvg(product.name);
                      }}
                    />
                  </button>
                ))}
              </div>

              {/* Main image */}
              <div
                className="relative flex-1 aspect-square bg-brand-light overflow-hidden"
              >
                {viewMode === 'spin' ? (
                  <Product360Viewer product={product} onClose={() => setViewMode('standard')} />
                ) : (
                  <div
                    className="w-full h-full relative cursor-zoom-in group"
                    onClick={() => {
                      setLightboxIndex(selectedImage);
                      setIsImageModalOpen(true);
                    }}
                  >
                    <AnimatePresence mode="wait">
                      <motion.img
                        key={selectedImage}
                        src={images[selectedImage]}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = getPlaceholderSvg(product.name);
                        }}
                      />
                    </AnimatePresence>
                    {discount && (
                      <span className="absolute top-4 left-4 bg-brand-gold text-white text-xs font-bold px-3 py-1">
                        −{discount}%
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLightboxIndex(selectedImage);
                        setIsImageModalOpen(true);
                      }}
                      className="absolute top-4 right-4 w-9 h-9 bg-white/80 hover:bg-white text-neutral-900 rounded-full flex items-center justify-center transition-all shadow-md z-10 hover:scale-110"
                      aria-label="Zoom image"
                    >
                      <ZoomIn size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Interactive media bar — only show buttons when media exists */}
            {((product?.spin_images?.length >= 2) || (product?.spinImageCount >= 2 && product?.spinImagePath) || product?.videoUrl || product?.hasVideo) && (
              <div className="flex gap-2 mt-3 w-full">
                {((product?.spin_images?.length >= 2) || (product?.spinImageCount >= 2 && product?.spinImagePath)) && (
                  <button
                    onClick={() => setViewMode(viewMode === 'spin' ? 'standard' : 'spin')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 border text-xs font-medium transition-all ${viewMode === 'spin' ? 'bg-brand-text text-white border-brand-text' : 'border-brand-light text-brand-text hover:border-brand-text'}`}
                  >
                    <RotateCcw size={14} /> 360° Spin
                  </button>
                )}
                {(product?.videoUrl || product?.hasVideo) && (
                  <button
                    onClick={() => setVideoOpen(true)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-3 border border-brand-light text-brand-text hover:border-brand-text text-xs font-medium transition-all"
                  >
                    <Play size={14} /> Watch Showcase
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex flex-col gap-4 sm:gap-5 w-full max-w-full overflow-hidden px-1">
            <div className="flex items-center justify-between gap-3 flex-wrap w-full max-w-full">
              {product.category && (
                <p className="text-brand-gold text-xs tracking-[0.2em] uppercase font-semibold">
                  {product.category?.name}
                </p>
              )}
              {vendorName && (
                <div className="w-full sm:w-auto flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-[11px] sm:text-xs text-neutral-700 bg-neutral-100/90 p-3 rounded-xl border border-neutral-200 shadow-2xs font-medium max-w-full overflow-hidden">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Store size={14} className="text-brand-gold flex-shrink-0" />
                    <span className="truncate">Seller: <strong className="text-neutral-900 font-bold">{vendorName}</strong></span>
                  </div>
                  {vendorGst && (
                    <div className="text-neutral-500 sm:border-l border-neutral-300 sm:pl-2 text-[10px] sm:text-xs font-mono">
                      GST: <strong className="text-neutral-900 font-semibold uppercase">{vendorGst}</strong>
                    </div>
                  )}
                </div>
              )}
            </div>

            <h1 className="font-playfair text-2xl sm:text-3xl md:text-4xl font-bold text-brand-text leading-tight break-words">
              {product.name}
            </h1>

            {/* Rating */}
            {/* Rating — shown ONLY if product has real reviews */}
            {Number(reviewsState.totalCount || product.reviewCount) > 0 && Number(reviewsState.averageRating || product.rating) > 0 && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <div className="flex">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} size={16} className={s <= Math.round(Number(reviewsState.averageRating || product.rating)) ? 'fill-brand-gold text-brand-gold' : 'fill-brand-light text-brand-light'} />
                  ))}
                </div>
                <span className="text-sm text-brand-grey font-medium">
                  {parseFloat(reviewsState.averageRating || product.rating).toFixed(1)} ({reviewsState.totalCount || product.reviewCount} {Number(reviewsState.totalCount || product.reviewCount) === 1 ? 'review' : 'reviews'})
                </span>
                <a href="#reviews" onClick={() => setActiveTab('reviews')} className="text-sm text-brand-gold hover:underline font-medium">Read reviews</a>
              </div>
            )}

            {/* Price — React Bits price reveal pattern (inline motion) */}
            <motion.div
              className="flex flex-wrap items-baseline gap-x-3 gap-y-1"
              key={displayPrice}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="font-playfair text-2xl sm:text-3xl md:text-4xl font-bold text-brand-text whitespace-nowrap">{fmt(displayPrice, displayPriceAED)}</span>
              {displayComparePrice && (
                <span className="text-base sm:text-lg md:text-xl text-brand-grey line-through whitespace-nowrap">{fmt(displayComparePrice, displayComparePriceAED)}</span>
              )}
              {discount && (
                <span className="text-brand-gold font-semibold text-xs sm:text-sm bg-brand-gold/10 px-2.5 py-0.5 rounded-sm whitespace-nowrap">Save {discount}%</span>
              )}
              <span className="text-xs text-neutral-500 font-normal self-center ml-1">(Incl. of all taxes)</span>
            </motion.div>

            <p className="text-brand-grey text-sm leading-relaxed">{product.shortDescription}</p>


            {/* Dynamic Variant Attributes selectors (Amazon-Style Variant Matrix) */}
            {product.variants && product.variants.length > 0 && variantAttributeKeys.map(key => {
              const currentVal = selectedAttributes[key];
              const values = variantAttributeValues[key] || [];
              const isColorKey = key.toLowerCase() === 'color' || key.toLowerCase() === 'colour';

              return (
                <div key={key} className="space-y-2.5">
                  {/* Header: KEY: Value */}
                  <p className="font-extrabold text-sm text-neutral-900 tracking-wider uppercase">
                    {key}: {currentVal && <span className="text-[#964B00] font-bold ml-1.5 normal-case">{currentVal}</span>}
                  </p>

                  {isColorKey ? (
                    /* ── Color Swatch Selector ── */
                    <div className="flex flex-wrap items-center gap-3">
                      {values.map(val => {
                        const directVariantMatch = parsedVariants.length > 0 ? parsedVariants.find(v =>
                          variantAttributeKeys.every(k =>
                            v.attributes && String(v.attributes[k]).toLowerCase() === String(k === key ? val : (selectedAttributes[k] || '')).toLowerCase()
                          )
                        ) : null;
                        const anyVariantWithVal = parsedVariants.length > 0 ? parsedVariants.find(v =>
                          v.attributes && String(v.attributes[key]).toLowerCase() === String(val).toLowerCase()
                        ) : true;
                        const isOutOfStock = directVariantMatch
                          ? (directVariantMatch.stock !== undefined && parseInt(directVariantMatch.stock, 10) <= 0)
                          : (anyVariantWithVal && anyVariantWithVal.stock !== undefined ? parseInt(anyVariantWithVal.stock, 10) <= 0 : false);
                        const isSelected = String(currentVal || '').toLowerCase() === String(val).toLowerCase();
                        const cssColor = resolveColor(val);
                        const isGradient = cssColor.includes('gradient');
                        const lowerVal = val.toLowerCase();
                        const isLightColor = ['white', 'cream', 'beige', 'ivory', 'off', 'yellow', 'lemon'].some(c => lowerVal.includes(c)) || cssColor === '#f9fafb' || cssColor === '#ffffff';

                        return (
                          <button
                            key={val}
                            type="button"
                            disabled={!directVariantMatch && !anyVariantWithVal}
                            onClick={() => handleSelectAttribute(key, val)}
                            title={isOutOfStock ? `${val} — Out of stock` : (!directVariantMatch && anyVariantWithVal ? `Click to select variant with ${key}: ${val}` : val)}
                            className="relative group focus-visible:outline-none cursor-pointer"
                            aria-label={`Select ${key} ${val}`}
                          >
                            <span
                              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                                isSelected
                                  ? 'border-2 border-[#D4AF37] p-0.5 ring-2 ring-[#D4AF37]/30 scale-105'
                                  : (!directVariantMatch && anyVariantWithVal ? 'border-2 border-dashed border-amber-400 p-0.5 hover:scale-105' : 'border-2 border-transparent p-0.5 hover:scale-105')
                              }`}
                            >
                              <span
                                className={`w-full h-full rounded-full flex items-center justify-center shadow-md relative overflow-hidden ${
                                  isOutOfStock && !isSelected ? 'opacity-40' : ''
                                }`}
                                style={isGradient
                                  ? { background: cssColor, boxShadow: 'inset 0 0 0 1.5px rgba(0,0,0,0.18), 0 1px 3px rgba(0,0,0,0.12)' }
                                  : { backgroundColor: cssColor, boxShadow: 'inset 0 0 0 1.5px rgba(0,0,0,0.18), 0 1px 3px rgba(0,0,0,0.12)' }
                                }
                              >
                                {isOutOfStock && (
                                  <span className="absolute inset-0 rounded-full overflow-hidden">
                                    <span
                                      className="absolute inset-0"
                                      style={{
                                        background: 'repeating-linear-gradient(135deg,transparent,transparent 4px,rgba(255,255,255,0.55) 4px,rgba(255,255,255,0.55) 5px)'
                                      }}
                                    />
                                  </span>
                                )}
                                {isSelected && (
                                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                    <path
                                      d="M2.5 7L5.5 10L11.5 4"
                                      stroke={isLightColor ? '#111111' : '#ffffff'}
                                      strokeWidth="2.5"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                )}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    /* ── Non-color Variant Selector (Text Pills) ── */
                    <div className="flex flex-wrap gap-3">
                      {values.map(val => {
                        const directVariantMatch = parsedVariants.length > 0 ? parsedVariants.find(v =>
                          variantAttributeKeys.every(k =>
                            v.attributes && String(v.attributes[k]).toLowerCase() === String(k === key ? val : (selectedAttributes[k] || '')).toLowerCase()
                          )
                        ) : null;
                        const anyVariantWithVal = parsedVariants.length > 0 ? parsedVariants.find(v =>
                          v.attributes && String(v.attributes[key]).toLowerCase() === String(val).toLowerCase()
                        ) : true;
                        const isOutOfStock = directVariantMatch
                          ? (directVariantMatch.stock !== undefined && parseInt(directVariantMatch.stock, 10) <= 0)
                          : (anyVariantWithVal && anyVariantWithVal.stock !== undefined ? parseInt(anyVariantWithVal.stock, 10) <= 0 : false);
                        const isSelected = String(currentVal || '').toLowerCase() === String(val).toLowerCase();

                        let btnStyle = "bg-white text-neutral-900 border border-neutral-300 hover:border-neutral-400 cursor-pointer";
                        if (isSelected) {
                          if (isOutOfStock) {
                            btnStyle = "bg-neutral-950 text-amber-400 border-neutral-950 shadow-md font-extrabold line-through opacity-85 cursor-pointer ring-2 ring-amber-400/40";
                          } else {
                            btnStyle = "bg-black text-[#F5B800] border-black shadow-md font-extrabold cursor-pointer";
                          }
                        } else if (isOutOfStock) {
                          btnStyle = "bg-neutral-100 text-neutral-400 border border-neutral-300 line-through opacity-60 hover:opacity-85 cursor-pointer";
                        } else if (!directVariantMatch && anyVariantWithVal) {
                          btnStyle = "bg-amber-50/40 text-neutral-800 border border-dashed border-amber-300 hover:border-amber-500 hover:bg-amber-100/50 cursor-pointer";
                        } else if (!anyVariantWithVal) {
                          btnStyle = "bg-neutral-100 text-neutral-400 border border-dashed border-neutral-200 line-through opacity-40 cursor-not-allowed";
                        }

                        return (
                          <button
                            key={val}
                            type="button"
                            disabled={!directVariantMatch && !anyVariantWithVal}
                            onClick={() => handleSelectAttribute(key, val)}
                            className={`px-5 py-2.5 min-w-[80px] rounded-2xl text-sm font-extrabold transition-all duration-150 focus-visible:outline-none ${btnStyle}`}
                            title={isOutOfStock ? `${val} — Out of stock` : (!directVariantMatch && anyVariantWithVal ? `Click to select variant with ${key}: ${val}` : `${key}: ${val}`)}
                          >
                            {val}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Size selector (Fallback for simple products) */}
            {(!product.variants || product.variants.length === 0) && sizes.length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <p className="font-medium text-sm">Select Size {selectedSize && <span className="text-brand-gold">— {selectedSize}</span>}</p>
                  {/* <button className="text-xs text-brand-gold underline focus-visible:outline-brand-gold" id="size-guide-btn">Size Guide</button> */}
                </div>
                <div className="flex flex-wrap gap-2">
                  {sizes.map(size => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setSelectedSize(size)}
                      className={`w-12 h-12 border text-sm font-medium transition-all focus-visible:outline-brand-gold ${selectedSize === size ? 'border-brand-text bg-brand-text text-white' : 'border-brand-light text-brand-text hover:border-brand-grey'}`}
                      id={`size-${size}`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-4">
              <p className="font-semibold text-xs sm:text-sm text-neutral-900 flex-shrink-0">Quantity</p>
              <div className="flex items-center border border-neutral-300 rounded bg-white">
                <button type="button" onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-9 h-9 flex items-center justify-center hover:bg-neutral-100 transition-colors focus-visible:outline-brand-gold font-bold text-neutral-700" aria-label="Decrease quantity">−</button>
                <span className="w-9 text-center font-bold text-xs sm:text-sm text-neutral-900">{quantity}</span>
                <button
                  type="button"
                  onClick={() => {
                    if (quantity >= displayStock) {
                      toast.error(`Maximum available stock reached (${displayStock} items).`);
                    } else {
                      setQuantity(q => Math.min(displayStock, q + 1));
                    }
                  }}
                  disabled={quantity >= displayStock}
                  className={`w-9 h-9 flex items-center justify-center transition-colors focus-visible:outline-brand-gold font-bold ${quantity >= displayStock ? 'bg-neutral-100 text-neutral-300 cursor-not-allowed' : 'hover:bg-neutral-100 text-neutral-700'}`}
                  aria-label="Increase quantity"
                  title={quantity >= displayStock ? `Max stock available: ${displayStock}` : 'Increase quantity'}
                >+</button>
              </div>
              <span className="text-[11px] sm:text-xs font-medium text-brand-grey flex-shrink-0">{displayStock} in stock</span>
            </div>

            {/* CTA buttons */}
            <div className="flex flex-col gap-3 w-full max-w-full overflow-hidden">
              {displayStock > 0 ? (
                <div className="flex flex-col sm:flex-row gap-3 w-full">
                  <button
                    onClick={handleAddToCart}
                    className="bg-brand-gold hover:bg-[#a8712a] text-white font-bold text-xs sm:text-sm tracking-wider uppercase py-3.5 sm:py-4 w-full sm:flex-1 flex items-center justify-center gap-2 transition-all duration-200 rounded-lg shadow-sm cursor-pointer"
                    id="pdp-add-cart"
                  >
                    <ShoppingBag size={18} />
                    {inCart ? 'View Cart' : 'Add to Cart'}
                  </button>
                  <button
                    onClick={handleBuyNow}
                    className="bg-neutral-950 hover:bg-neutral-800 text-white font-bold text-xs sm:text-sm tracking-wider uppercase py-3.5 sm:py-4 w-full sm:flex-1 flex items-center justify-center gap-2 transition-all duration-200 rounded-lg shadow-sm cursor-pointer"
                    id="pdp-buy-now"
                  >
                    Buy Now
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setNotifySuccess(false)}
                  className="bg-neutral-950 hover:bg-neutral-800 text-white font-semibold text-sm tracking-wider uppercase py-4 w-full flex items-center justify-center gap-2 transition-all duration-200 shadow-sm"
                  id="pdp-notify"
                >
                  <Mail size={16} /> Out of Stock — Notify Me
                </button>
              )}
              <button
                onClick={handleWishlistToggle}
                className={`border font-semibold text-sm tracking-wider uppercase py-4 w-full flex items-center justify-center gap-2 transition-all duration-200 ${
                  isWishlisted 
                    ? 'border-red-400 text-red-500 bg-red-50/50 hover:bg-red-50 hover:text-red-600 hover:border-red-500' 
                    : 'border-neutral-950 text-neutral-950 hover:bg-neutral-950 hover:text-white bg-transparent'
                }`}
                id="pdp-wishlist"
              >
                <Heart size={18} className={isWishlisted ? 'fill-current text-red-500' : ''} />
                {isWishlisted ? 'Wishlisted' : 'Wishlist'}
              </button>

              {/* Restock Notification Form */}
              {displayStock <= 0 && !notifySuccess && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  onSubmit={handleNotifySubmit}
                  className="bg-brand-light p-4 rounded-xl border border-brand-light space-y-3"
                >
                  <p className="text-xs font-semibold text-brand-text">Get notified when this item is back in stock:</p>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      required
                      placeholder="Enter your email address"
                      value={notifyEmail}
                      onChange={e => setNotifyEmail(e.target.value)}
                      className="flex-1 bg-white border border-brand-light px-3 py-2 text-xs focus:outline-none focus:border-brand-gold"
                    />
                    <button type="submit" className="bg-brand-gold hover:bg-amber-600 text-white px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors">
                      Alert Me
                    </button>
                  </div>
                </motion.form>
              )}

              {displayStock <= 0 && notifySuccess && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-green-50 text-green-700 p-4 rounded-xl border border-green-200 flex items-start gap-2.5"
                >
                  <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold">Subscription Active</p>
                    <p className="text-[11px] text-green-600/90 mt-0.5">We will send an email alert to {notifyEmail} as soon as this item is back in stock.</p>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Trust signals */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-4 pt-4 border-t border-brand-light w-full max-w-full overflow-hidden">
              {[
                { icon: Truck, label: 'Free Shipping', sub: 'on orders ₹1499+' },
                { icon: RotateCcw, label: 'Easy Returns', sub: '7-day policy' },
                { icon: Shield, label: 'Secure Pay', sub: '100% secured' },
              ].map(({ icon: Icon, label, sub }) => (
                <div key={label} className="flex flex-col items-center text-center gap-0.5 sm:gap-1 px-0.5 min-w-0">
                  <Icon size={18} className="text-brand-gold flex-shrink-0" strokeWidth={1.5} />
                  <p className="text-[10px] sm:text-xs font-semibold text-neutral-900 truncate w-full">{label}</p>
                  <p className="text-[9px] sm:text-[11px] text-brand-grey truncate w-full">{sub}</p>
                </div>
              ))}
            </div>

            {/* Vendor & GST Information Card */}
            {/* <div className="bg-neutral-50 border border-brand-light p-4 md:p-5 rounded-xl flex items-center justify-between gap-4 shadow-xs">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-11 h-11 rounded-full bg-brand-gold/10 text-brand-gold flex items-center justify-center font-bold text-base border border-brand-gold/20 flex-shrink-0">
                  <Building2 size={22} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-brand-grey tracking-wider uppercase">Sold & Fulfilled By</span>
                    <span className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 font-semibold px-2.5 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 size={12} /> Verified Vendor
                    </span>
                  </div>
                  <p className="text-base md:text-lg font-bold text-neutral-900 truncate mt-1">
                    {vendorName}
                  </p>
                </div>
              </div>

              <div className="text-right border-l border-brand-light pl-5 flex-shrink-0">
                <span className="text-xs font-semibold text-brand-grey tracking-wider uppercase block mb-0.5">Vendor GST</span>
                <span className="text-base md:text-lg font-bold text-neutral-900 uppercase">
                  {vendorGst}
                </span>
              </div>
            </div> */}

            {/* Authenticity Certificate Card */}
            {product.showAuthenticity && (
              <div className="bg-amber-50/50 border border-amber-200/50 p-4 rounded-xl flex items-start gap-3">
                <Shield size={24} className="text-brand-gold flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-brand-text tracking-wider uppercase">Authenticity Guaranteed</p>
                  <p className="text-[11px] text-brand-grey mt-0.5 leading-relaxed">
                    Certified 100% genuine luxury item. Accompanied by official designer brand tags, validation certificates, and master artisan credentials.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tabs — Description / Reviews */}
        <div className="mt-12 sm:mt-16 border-t border-brand-light" id="reviews">
          <div className="flex border-b border-neutral-200/60 overflow-x-auto scrollbar-none" role="tablist">
            {['description', 'reviews'].map(tab => (
              <button
                key={tab}
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                id={`pdp-tab-${tab}`}
                className={`px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold capitalize border-b-2 transition-colors whitespace-nowrap ${activeTab === tab ? 'border-brand-gold text-brand-gold' : 'border-transparent text-brand-grey hover:text-brand-text'}`}
              >
                {tab === 'reviews' ? `Reviews (${reviewsState.totalCount || 0})` : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="py-8">
            {activeTab === 'description' && (
              <div className="w-full">
                {product.description ? (
                  <div
                    className="prose-description text-brand-grey leading-relaxed w-full"
                    dangerouslySetInnerHTML={{ __html: product.description }}
                  />
                ) : (
                  <p className="text-brand-grey leading-relaxed text-sm italic">No description available.</p>
                )}
              </div>
            )}
            {activeTab === 'reviews' && (
              <div className="space-y-8 w-full">
                {/* Summary & Rating Breakdown Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                  {/* Review Summary Card */}
                  <div className="bg-neutral-50 p-4 sm:p-6 rounded-lg border border-neutral-200/60 flex flex-col justify-between overflow-hidden">
                    <div>
                      <h3 className="font-playfair text-xl font-bold text-neutral-900 mb-2">Customer Reviews</h3>
                      {reviewsState.totalCount > 0 ? (
                        <div className="flex items-center gap-4">
                          <span className="text-4xl font-bold text-brand-gold">{parseFloat(reviewsState.averageRating).toFixed(1)}</span>
                          <div>
                            <div className="flex gap-0.5 mb-1">
                              {[1, 2, 3, 4, 5].map(s => (
                                <Star key={s} size={16} className={s <= Math.round(reviewsState.averageRating) ? 'fill-brand-gold text-brand-gold' : 'fill-brand-light text-brand-light'} />
                              ))}
                            </div>
                            <span className="text-xs text-neutral-500">Based on {reviewsState.totalCount} {reviewsState.totalCount === 1 ? 'review' : 'reviews'}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-neutral-500">No reviews yet for this product.</p>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-neutral-200/60 flex items-center justify-between gap-3 flex-wrap">
                      {reviewsState.userCanReview ? (
                        !reviewsState.userReview && (
                          <button
                            onClick={handleOpenWriteReview}
                            className="px-5 py-2.5 bg-amber-400 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-2 cursor-pointer"
                          >
                            <Star size={15} /> Write a Review
                          </button>
                        )
                      ) : (
                        <p className="text-xs text-neutral-500 italic">
                          {isAuthenticated ? (
                            'Customers who buy this product will be able to review it after delivery!'
                          ) : (
                            <span>
                              <Link to="/account?view=login" className="text-amber-600 font-semibold hover:underline">Sign in</Link> & purchase this item to leave a review after delivery.
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Star Breakdown */}
                  {reviewsState.totalCount > 0 && (
                    <div className="space-y-2 bg-white p-5 border border-neutral-200/60 rounded-lg shadow-sm flex flex-col justify-center">
                      {[5, 4, 3, 2, 1].map((star) => {
                        const count = reviewsState.ratingBreakdown?.[star] || 0;
                        const percentage = reviewsState.totalCount > 0 ? Math.round((count / reviewsState.totalCount) * 100) : 0;
                        return (
                          <div key={star} className="flex items-center gap-3 text-xs text-neutral-600">
                            <span className="w-14 font-medium">{star} Stars</span>
                            <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                              <div className="h-full bg-brand-gold transition-all duration-500 rounded-full" style={{ width: `${percentage}%` }} />
                            </div>
                            <span className="w-10 text-right font-mono text-[11px] text-neutral-400">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Reviews List */}
                <div className="space-y-6 pt-2">
                  {reviewsState.reviews.length === 0 ? (
                    <p className="text-sm text-neutral-500 italic">No reviews yet. Customers who buy this product will be able to review it after delivery!</p>
                  ) : (
                    reviewsState.reviews.map(review => (
                      <motion.div
                        key={review.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white p-4 sm:p-6 rounded-lg border border-neutral-200/60 shadow-sm relative w-full overflow-hidden"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-brand-gold/10 text-brand-gold font-bold flex items-center justify-center text-sm border border-brand-gold/20">
                              {(review.reviewerName || 'U')[0].toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm text-neutral-900">{review.reviewerName}</span>
                                {review.isVerifiedPurchase && (
                                  <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded border border-emerald-100">Verified Buyer</span>
                                )}
                              </div>
                              <span className="text-[11px] text-neutral-400">{new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 my-2">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} size={13} className={s <= review.rating ? 'fill-brand-gold text-brand-gold' : 'fill-neutral-200 text-neutral-200'} />
                          ))}
                        </div>

                        {review.title && <h4 className="font-semibold text-sm text-neutral-900 mb-1">{review.title}</h4>}
                        <p className="text-sm text-neutral-600 leading-relaxed whitespace-pre-line">{review.body}</p>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Review Modal Form */}
        <AnimatePresence>
          {reviewModalOpen && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setReviewModalOpen(false)}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl relative"
                onClick={e => e.stopPropagation()}
              >
                <button
                  onClick={() => setReviewModalOpen(false)}
                  className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-neutral-700 transition-colors rounded-full"
                >
                  <X size={18} />
                </button>

                <h3 className="font-playfair text-xl font-bold mb-1 text-neutral-900">
                  {editingReviewId ? 'Edit Your Review' : 'Write a Product Review'}
                </h3>
                <p className="text-xs text-neutral-500 mb-5">
                  Share your experience with <span className="font-semibold text-neutral-800">{product.name}</span>
                </p>

                <form onSubmit={handleSubmitReview} className="space-y-4">
                  {/* Rating Stars Picker */}
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5 uppercase tracking-wider">Rating</label>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewRating(star)}
                          className="p-1 hover:scale-110 transition-transform focus:outline-none"
                        >
                          <Star
                            size={26}
                            className={star <= reviewRating ? 'fill-brand-gold text-brand-gold' : 'fill-neutral-200 text-neutral-300'}
                          />
                        </button>
                      ))}
                      <span className="text-xs font-bold text-brand-gold ml-2">{reviewRating} / 5 Stars</span>
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1 uppercase tracking-wider">Review Title (Optional)</label>
                    <input
                      type="text"
                      value={reviewTitle}
                      onChange={e => setReviewTitle(e.target.value)}
                      placeholder="e.g. Excellent quality, perfect fit!"
                      className="w-full px-3 py-2 border border-neutral-200 rounded text-sm focus:border-brand-gold focus:outline-none"
                    />
                  </div>

                  {/* Body */}
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1 uppercase tracking-wider">Review Comments *</label>
                    <textarea
                      rows={4}
                      value={reviewBody}
                      onChange={e => setReviewBody(e.target.value)}
                      placeholder="Tell us what you liked or disliked about this product after your purchase..."
                      className="w-full px-3 py-2 border border-neutral-200 rounded text-sm focus:border-brand-gold focus:outline-none resize-none"
                      required
                    />
                  </div>

                  {/* Photo Upload (Optional, max 5MB) */}
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1 uppercase tracking-wider">
                      Add a Photo <span className="font-normal text-neutral-400 normal-case">(Optional · Max 5MB · JPG / PNG / WEBP)</span>
                    </label>
                    {reviewImagePreview ? (
                      <div className="relative inline-block">
                        <img
                          src={reviewImagePreview}
                          alt="Review preview"
                          className="w-24 h-24 object-cover rounded-lg border border-neutral-200 shadow-sm"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setReviewImage(null);
                            setReviewImagePreview(null);
                            if (reviewImageRef.current) reviewImageRef.current.value = '';
                          }}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow"
                          aria-label="Remove image"
                        >
                          <X size={11} />
                        </button>
                        <p className="text-[10px] text-neutral-400 mt-1">
                          {reviewImage ? `${(reviewImage.size / (1024 * 1024)).toFixed(2)} MB` : ''}
                        </p>
                      </div>
                    ) : (
                      <label className="flex items-center gap-3 cursor-pointer w-full border border-dashed border-neutral-300 hover:border-brand-gold rounded-lg px-4 py-3 transition-colors bg-neutral-50 hover:bg-amber-50/30 group">
                        <span className="text-2xl text-neutral-400 group-hover:text-brand-gold transition-colors">📷</span>
                        <div>
                          <p className="text-xs font-semibold text-neutral-600 group-hover:text-brand-gold transition-colors">Click to upload a photo</p>
                          <p className="text-[10px] text-neutral-400 mt-0.5">Maximum file size: 5MB</p>
                        </div>
                        <input
                          ref={reviewImageRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleReviewImageChange}
                        />
                      </label>
                    )}
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setReviewModalOpen(false)}
                      className="px-4 py-2 border border-neutral-200 text-neutral-600 text-xs font-semibold rounded hover:bg-neutral-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={reviewsState.submitting}
                      className="btn-primary text-xs py-2 px-5 disabled:opacity-50"
                    >
                      {reviewsState.submitting ? 'Saving...' : (editingReviewId ? 'Update Review' : 'Submit Review')}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Related Creations */}
      {relatedProducts.length > 0 && (
        <div className="border-t border-brand-light pt-16 max-w-site mx-auto px-6 md:px-8">
          <h2 className="font-playfair text-2xl font-bold text-brand-text">Related Creations</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 py-10">
            {relatedProducts.map((p, idx) => (
              <ProductCard key={p.id} product={p} index={idx} />
            ))}
          </div>
        </div>
      )}

      {/* Video Lightbox Modal */}
      <AnimatePresence>
        {videoOpen && (
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setVideoOpen(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-4xl aspect-video bg-black shadow-2xl overflow-hidden rounded-xl"
            >
              <button
                onClick={() => setVideoOpen(false)}
                className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 text-white w-9 h-9 rounded-full flex items-center justify-center transition-colors z-10"
                aria-label="Close Video"
              >
                <X size={20} />
              </button>
              {(() => {
                const rawUrl = product.videoUrl;
                if (!rawUrl && !product.hasVideo) {
                  return (
                    <div className="flex flex-col items-center justify-center w-full h-full text-white/80 text-sm font-medium gap-2">
                      <p>No video showcase uploaded for this product.</p>
                    </div>
                  );
                }

                // Check YouTube / Vimeo / Direct file
                const urlStr = (rawUrl || '').trim();
                const ytMatch = urlStr.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
                if (ytMatch && ytMatch[1]) {
                  return (
                    <iframe
                      src={`https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1`}
                      title="Product Video Showcase"
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  );
                }

                const vimeoMatch = urlStr.match(/vimeo\.com\/(?:video\/)?(\d+)/);
                if (vimeoMatch && vimeoMatch[1]) {
                  return (
                    <iframe
                      src={`https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`}
                      title="Product Video Showcase"
                      className="w-full h-full border-0"
                      allow="autoplay; fullscreen; picture-in-picture"
                      allowFullScreen
                    />
                  );
                }

                // Local upload or direct MP4 URL
                const directSrc = urlStr || 'https://assets.mixkit.co/videos/preview/mixkit-luxury-gold-rings-on-a-display-42866-large.mp4';
                return (
                  <video
                    ref={videoRef}
                    src={directSrc}
                    className="w-full h-full object-contain"
                    controls
                    autoPlay
                    playsInline
                    preload="auto"
                  />
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Fullscreen Image Lightbox Modal */}
      <AnimatePresence>
        {isImageModalOpen && allLightboxImages.length > 0 && (
          <div className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-between p-4 md:p-6 select-none" onClick={e => e.target === e.currentTarget && setIsImageModalOpen(false)}>
            {/* Top Toolbar */}
            <div className="w-full max-w-7xl flex items-center justify-between z-20 text-white">
              <div>
                <h3 className="font-playfair text-base md:text-lg font-semibold">{product.name}</h3>
                <p className="text-xs text-neutral-400 font-mono">
                  Image {lightboxIndex + 1} of {allLightboxImages.length}
                </p>
              </div>
              <button
                onClick={() => setIsImageModalOpen(false)}
                className="w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors"
                aria-label="Close Lightbox"
              >
                <X size={22} />
              </button>
            </div>

            {/* Center Stage with Previous & Next Navigation Arrows */}
            <div className="relative w-full max-w-6xl flex-1 flex items-center justify-center py-4 overflow-hidden">
              {allLightboxImages.length > 1 && (
                <button
                  type="button"
                  onClick={() => setLightboxIndex(prev => (prev - 1 + allLightboxImages.length) % allLightboxImages.length)}
                  className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/15 hover:bg-white/30 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-all z-30 shadow-lg hover:scale-110"
                  aria-label="Previous Image"
                >
                  <ChevronLeft size={28} />
                </button>
              )}

              <AnimatePresence mode="wait">
                <motion.img
                  key={lightboxIndex}
                  src={allLightboxImages[lightboxIndex]}
                  alt={`${product.name} - View ${lightboxIndex + 1}`}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2 }}
                  className="max-h-[72vh] max-w-[85vw] object-contain shadow-2xl rounded-lg border border-white/10"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = getPlaceholderSvg(product.name);
                  }}
                />
              </AnimatePresence>

              {allLightboxImages.length > 1 && (
                <button
                  type="button"
                  onClick={() => setLightboxIndex(prev => (prev + 1) % allLightboxImages.length)}
                  className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/15 hover:bg-white/30 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-all z-30 shadow-lg hover:scale-110"
                  aria-label="Next Image"
                >
                  <ChevronRight size={28} />
                </button>
              )}
            </div>

            {/* Bottom Thumbnails Strip for Variant & Gallery Images */}
            {allLightboxImages.length > 1 && (
              <div className="w-full max-w-4xl overflow-x-auto py-2 px-4 flex justify-center gap-3 z-20">
                {allLightboxImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setLightboxIndex(i)}
                    className={`w-16 h-20 rounded border-2 overflow-hidden flex-shrink-0 transition-all ${
                      lightboxIndex === i ? 'border-brand-gold scale-105 shadow-md' : 'border-white/20 hover:border-white/60 opacity-60'
                    }`}
                  >
                    <img src={img} alt={`Thumb ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </AnimatePresence>

      <Footer />
    </main>
  );
};

export default ProductDetailsPage;