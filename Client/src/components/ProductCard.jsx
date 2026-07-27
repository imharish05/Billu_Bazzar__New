import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { Heart, ShoppingBag, Eye, Star, RotateCcw } from 'lucide-react';
import { openQuickView } from '../redux/slices/uiSlice';
import { addLocal, openCart } from '../redux/slices/cartSlice';
import { toggleItem } from '../redux/slices/wishlistSlice';
import { formatPrice } from '../utils/currency';
import { getPlaceholderSvg } from '../utils/placeholder';

/** Map common color names → CSS color values for swatch display */
const COLOR_MAP = {
  red: '#e53e3e', crimson: '#dc143c', maroon: '#800000', pink: '#f687b3', rose: '#f43f5e', magenta: '#d53f8c',
  blue: '#3b82f6', navy: '#1e3a8a', cobalt: '#0047ab', royal: '#4169e1', sky: '#38bdf8', cyan: '#06b6d4', teal: '#0d9488',
  green: '#22c55e', olive: '#6b8e23', mint: '#3eb489', emerald: '#10b981', forest: '#228b22', lime: '#84cc16',
  yellow: '#f59e0b', gold: '#b8860b', amber: '#f59e0b', lemon: '#fff44f',
  orange: '#f97316', coral: '#ff6b6b', salmon: '#fa8072',
  purple: '#9333ea', lavender: '#c4b5fd', violet: '#7c3aed', indigo: '#6366f1', mauve: '#9f8fba', plum: '#8b008b', lilac: '#c8a2c8',
  brown: '#92400e', tan: '#d2b48c', beige: '#f5f5dc', caramel: '#c68642',
  black: '#111111', charcoal: '#374151', grey: '#9ca3af', gray: '#9ca3af', silver: '#c0c0c0', steel: '#4682b4', neutral: '#d1d5db',
  white: '#f9fafb', cream: '#fffdd0', ivory: '#fffff0', off: '#faf9f6', clear: 'linear-gradient(135deg,#e2e8f0,#cbd5e1)', 'pastel blue': '#90caf9',
  multicolor: 'linear-gradient(135deg,#e53e3e,#f59e0b,#22c55e,#3b82f6,#9333ea)',
  multi: 'linear-gradient(135deg,#e53e3e,#f59e0b,#22c55e,#3b82f6,#9333ea)',
};

const resolveColor = (name = '') => {
  const lower = name.toLowerCase().trim();
  // Exact match
  if (COLOR_MAP[lower]) return COLOR_MAP[lower];
  // Partial match — find first key that appears in the color string
  for (const [key, val] of Object.entries(COLOR_MAP)) {
    if (lower.includes(key)) return val;
  }
  // Fallback: try as a CSS color directly (handles hex, rgb, named)
  return lower;
};

/**
 * ProductCard — used in grids, carousels, search results.
 * Hover state exposes quick-view + add-to-cart. Framer Motion stagger entrance.
 * NOT glass — uses standard white card surface per spec.
 */
const ProductCard = ({ product, index = 0 }) => {
  const dispatch = useDispatch();
  const wishlist = useSelector(s => s.wishlist.items) || [];
  const { code: currencyCode, rate: currencyRate } = useSelector(s => s.currency);
  const [imgLoaded, setImgLoaded] = useState(false);

  const resolveDefaultVariant = (prod) => {
    if (prod.variants && prod.variants.length > 0) {
      const v = prod.variants[0];
      const attrs = typeof v.attributes === 'string' ? JSON.parse(v.attributes || '{}') : (v.attributes || {});
      return {
        variantId: v.id,
        price: v.price !== null && v.price !== undefined ? parseFloat(v.price) : parseFloat(prod.price),
        mrp: v.mrp !== null && v.mrp !== undefined ? parseFloat(v.mrp) : (prod.comparePrice ? parseFloat(prod.comparePrice) : null),
        image: v.image || prod.defaultProductImage || prod.images?.[0] || '',
        attributes: attrs
      };
    }

    const prodAttrs = typeof prod.attributes === 'string' ? JSON.parse(prod.attributes || '{}') : (prod.attributes || {});
    const defaultAttrs = {};

    Object.entries(prodAttrs).forEach(([k, v]) => {
      if (Array.isArray(v) && v.length > 0) {
        const keyName = k.toLowerCase() === 'sizes' ? 'size' : (k.toLowerCase().endsWith('s') && k.length > 3 ? k.slice(0, -1) : k);
        defaultAttrs[keyName] = v[0];
      } else if (typeof v === 'string' || typeof v === 'number') {
        defaultAttrs[k] = v;
      }
    });

    if (Object.keys(defaultAttrs).length === 0) {
      defaultAttrs['variant'] = 'Standard';
    }

    return {
      variantId: null,
      price: parseFloat(prod.price),
      mrp: prod.comparePrice ? parseFloat(prod.comparePrice) : null,
      image: prod.defaultProductImage || prod.images?.[0] || '',
      attributes: defaultAttrs
    };
  };

  const resolvedDefault = resolveDefaultVariant(product);

  const isWishlisted = wishlist.some(item => {
    const sameProd = Number(item.productId || item.id) === Number(product.id);
    if (!sameProd) return false;
    if (resolvedDefault.variantId || item.variantId) {
      return Number(item.variantId) === Number(resolvedDefault.variantId);
    }
    const hasAttrsA = item.selectedVariant && Object.keys(item.selectedVariant).length > 0;
    const hasAttrsB = resolvedDefault.attributes && Object.keys(resolvedDefault.attributes).length > 0;
    if (hasAttrsA || hasAttrsB) {
      const a = item.selectedVariant || {};
      const b = resolvedDefault.attributes || {};
      const keysA = Object.keys(a).sort();
      const keysB = Object.keys(b).sort();
      if (keysA.length !== keysB.length) return false;
      return keysA.every(k => String(a[k]).toLowerCase() === String(b[k]).toLowerCase());
    }
    return true;
  });

  const fmt = (v) => formatPrice(v, currencyCode, currencyRate);

  const displayPrice = resolvedDefault.price;
  const displayComparePrice = resolvedDefault.mrp;

  const discount = (displayComparePrice && Number(displayComparePrice) > Number(displayPrice))
    ? Math.round(((Number(displayComparePrice) - Number(displayPrice)) / Number(displayComparePrice)) * 100)
    : null;

  const handleAddToCart = (e) => {
    e.preventDefault();
    const cartPayload = {
      id: product.id,
      name: product.name,
      slug: product.slug,
      image: resolvedDefault.image || product.defaultProductImage || product.images?.[0] || '',
      price: displayPrice,
      comparePrice: displayComparePrice,
      stock: product.stock,
      variantId: resolvedDefault.variantId,
      selectedVariant: resolvedDefault.attributes,
      quantity: 1
    };
    dispatch(addLocal(cartPayload));
    dispatch(openCart());
  };

  const handleWishlistToggle = (e) => {
    e.preventDefault();
    const wishlistPayload = {
      id: product.id,
      productId: product.id,
      name: product.name,
      slug: product.slug,
      image: resolvedDefault.image || product.defaultProductImage || product.images?.[0] || '',
      price: displayPrice,
      comparePrice: displayComparePrice,
      inStock: product.stock > 0,
      categoryName: product.category?.name || 'Lifestyle',
      rating: product.rating || 4.5,
      reviewCount: product.reviewCount || 10,
      variantId: resolvedDefault.variantId,
      selectedVariant: resolvedDefault.attributes
    };
    dispatch(toggleItem(wishlistPayload));
  };

  return (
    /* Staggered grid entrance — Framer Motion */
    <motion.article
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07 }}
      className="relative bg-white flex flex-col border border-neutral-200/60 shadow-sm hover:shadow-md transition-all duration-300"
      aria-label={product.name}
    >
      {/* Image */}
      <Link to={`/products/${product.slug}`} className="group block relative overflow-hidden aspect-[3/4] bg-brand-light" target="_blank" rel="noopener noreferrer">
        {/* Skeleton while image loads */}
        {!imgLoaded && <div className="skeleton absolute inset-0" aria-hidden="true" />}
        <img
          src={resolvedDefault.image || product.defaultProductImage || product.images?.[0] || getPlaceholderSvg(product.name)}
          alt={product.name}
          className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
          loading="lazy"
          onLoad={() => setImgLoaded(true)}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = getPlaceholderSvg(product.name);
          }}
        />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {product.spin_images?.length > 1 && (
            <span className="bg-black/70 backdrop-blur text-white text-[9px] font-bold px-1.5 py-0.5 tracking-wider uppercase flex items-center gap-1 border border-white/10 rounded-sm">
              <RotateCcw size={9} /> 360°
            </span>
          )}
          {product.isNewArrival && (
            <span className="bg-brand-text text-white text-[10px] font-bold px-2 py-0.5 tracking-wider uppercase">New</span>
          )}
          {discount !== null && discount > 0 && (
            <span className="bg-brand-gold text-white text-[10px] font-bold px-2 py-0.5">−{discount}%</span>
          )}
          {product.isBestSeller && (discount === null || discount <= 0) && (
            <span className="bg-white text-brand-text text-[10px] font-bold px-2 py-0.5 border border-brand-text">Best Seller</span>
          )}
        </div>

        {/* Wishlist */}
        <button
          onClick={handleWishlistToggle}
          className={`absolute top-3 right-3 p-2 rounded-full shadow-sm transition-all duration-200 ${isWishlisted ? 'bg-red-50 text-red-500' : 'bg-white/80 text-brand-grey hover:text-red-400'} focus-visible:outline-brand-gold`}
          aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          id={`wishlist-${product.id}`}
        >
          <Heart size={16} className={isWishlisted ? 'fill-current' : ''} />
        </button>

        {/* Hover overlay — quick-view + add to cart */}
        <div className="absolute bottom-0 left-0 right-0 bg-black/90 flex translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out z-10">
          <button
            onClick={(e) => { e.preventDefault(); dispatch(openQuickView(product)); }}
            className="flex-1 flex items-center justify-center gap-1.5 lg:gap-2 py-3 text-white text-xs font-medium hover:bg-white/10 transition-colors border-r border-white/20 focus-visible:outline-white"
            aria-label={`Quick view ${product.name}`}
            id={`qv-${product.id}`}
          >
            <Eye size={14} /> <span className="hidden lg:inline">Quick View</span>
          </button>
          <button
            onClick={handleAddToCart}
            className="flex-1 flex items-center justify-center gap-1.5 lg:gap-2 py-3 text-white text-xs font-medium hover:bg-white/10 transition-colors focus-visible:outline-white"
            aria-label={`Add ${product.name} to cart`}
            id={`add-cart-${product.id}`}
          >
            <ShoppingBag size={14} /> <span className="hidden lg:inline">Add to Cart</span>
          </button>
        </div>
      </Link>

      {/* Info */}
      <div className="p-4 flex-1 flex flex-col">
        {product.category && (
          <p className="text-[11px] text-brand-gold font-medium tracking-widest uppercase mb-1">
            {product.category?.name || ''}
          </p>
        )}
        <Link to={`/products/${product.slug}`} className="hover:text-brand-gold transition-colors" target="_blank" rel="noopener noreferrer">
          <h3 className="font-inter font-medium text-sm leading-snug text-brand-text line-clamp-2 mb-2">
            {product.name}
          </h3>
        </Link>
        {Number(product.reviewCount) > 0 && Number(product.rating) > 0 && (
          <div className="flex items-center gap-1 mb-2">
            {[1,2,3,4,5].map(s => (
              <Star key={s} size={11} className={s <= Math.round(Number(product.rating)) ? 'fill-brand-gold text-brand-gold' : 'fill-brand-light text-brand-light'} />
            ))}
            <span className="text-[11px] text-brand-grey ml-1 font-medium">{parseFloat(product.rating).toFixed(1)} ({product.reviewCount})</span>
          </div>
        )}
        {(() => {
          const entries = Object.entries(resolvedDefault.attributes || {}).filter(([k, v]) => {
            if (!v || v === 'undefined' || v === 'null') return false;
            if (k === 'variant' && v === 'Standard') return false;
            const kLower = k.toLowerCase();
            return kLower !== 'color' && kLower !== 'colour';
          });
          if (entries.length === 0) return null;
          const attrString = entries.map(([k, v]) => `${k}: ${v}`).join(' · ');
          return (
            <p className="text-xs text-brand-gold font-medium mt-0.5 mb-1 line-clamp-1" title={attrString}>
              {attrString}
            </p>
          );
        })()}

        {/* Color swatches — collect unique colors from all variants */}
        {(() => {
          const variants = product.variants || [];
          const colorKey = variants.length > 0
            ? Object.keys(
                (typeof variants[0]?.attributes === 'string'
                  ? JSON.parse(variants[0]?.attributes || '{}')
                  : variants[0]?.attributes) || {}
              ).find(k => k.toLowerCase() === 'color' || k.toLowerCase() === 'colour')
            : null;

          if (!colorKey) {
            // No variant colors — try product-level attributes
            const prodAttrs = typeof product.attributes === 'string'
              ? JSON.parse(product.attributes || '{}')
              : (product.attributes || {});
            const colorAttrKey = Object.keys(prodAttrs).find(k => k.toLowerCase() === 'color' || k.toLowerCase() === 'colour' || k.toLowerCase() === 'colors' || k.toLowerCase() === 'colours');
            if (!colorAttrKey) return null;
            const colorList = Array.isArray(prodAttrs[colorAttrKey])
              ? prodAttrs[colorAttrKey]
              : [prodAttrs[colorAttrKey]];
            const SHOW = 3;
            const visible = colorList.slice(0, SHOW);
            const extra = colorList.length - SHOW;
            return (
              <div className="flex items-center gap-1.5 mb-1.5">
                {visible.map((c, i) => (
                  <span
                    key={i}
                    title={c}
                    className="w-4 h-4 rounded-full border border-neutral-300 shadow-sm flex-shrink-0"
                    style={{ background: resolveColor(c) }}
                  />
                ))}
                {extra > 0 && (
                  <span className="text-[10px] text-brand-grey font-medium">+{extra} more</span>
                )}
              </div>
            );
          }

          // Collect unique color values from variants
          const colorValues = [];
          const seen = new Set();
          variants.forEach(v => {
            const attrs = typeof v.attributes === 'string' ? JSON.parse(v.attributes || '{}') : (v.attributes || {});
            const c = attrs[colorKey];
            if (c && !seen.has(c)) { seen.add(c); colorValues.push(c); }
          });
          if (colorValues.length === 0) return null;

          const SHOW = 3;
          const visible = colorValues.slice(0, SHOW);
          const extra = colorValues.length - SHOW;

          return (
            <div className="flex items-center gap-1.5 mb-1.5">
              {visible.map((c, i) => (
                <span
                  key={i}
                  title={c}
                  className="w-4 h-4 rounded-full border border-neutral-300 shadow-sm flex-shrink-0"
                  style={{ background: resolveColor(c) }}
                />
              ))}
              {extra > 0 && (
                <span className="text-[10px] text-brand-grey font-medium">+{extra} more</span>
              )}
            </div>
          );
        })()}

        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-auto">
          <span className="font-semibold text-brand-text whitespace-nowrap">{fmt(displayPrice)}</span>
          {displayComparePrice && Number(displayComparePrice) > Number(displayPrice) && (
            <span className="text-brand-grey text-sm line-through whitespace-nowrap">{fmt(displayComparePrice)}</span>
          )}
        </div>
      </div>
    </motion.article>
  );
};

export default ProductCard;
