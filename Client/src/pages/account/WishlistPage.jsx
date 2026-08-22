import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { Heart, ShoppingBag, Eye, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { toggleItem } from '../../redux/slices/wishlistSlice';
import { formatPrice } from '../../utils/currency';
import { addLocal, openCart } from '../../redux/slices/cartSlice';
import { getImageUrl } from '../../utils/imageUrl';
import { getPlaceholderSvg } from '../../utils/placeholder';

const WishlistPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { code: currencyCode, rate: currencyRate } = useSelector(s => s.currency);
  
  // Real Redux Wishlist items (containing fully detailed product objects)
  const items = useSelector(s => s.wishlist.items) || [];
  const cartItems = useSelector(s => s.cart?.items || []);

  const isItemInCart = (item) => cartItems.some(i => Number(i.productId || i.id) === Number(item.productId || item.id));

  const fmt = (v) => formatPrice(v, currencyCode, currencyRate);

  const remove = (item) => {
    dispatch(toggleItem(item));
    toast.success('Removed from wishlist', {
      style: {
        border: '1px solid #C58837',
        color: '#111111',
        fontFamily: 'Montserrat, sans-serif'
      }
    });
  };

  const addToCart = (item) => {
    if (isItemInCart(item)) {
      navigate('/cart');
      return;
    }
    if (!item.inStock) {
      toast.error('Item is currently out of stock');
      return;
    }
    dispatch(addLocal({ 
      productId: item.productId || item.id, 
      variantId: item.variantId || null,
      selectedVariant: item.selectedVariant || {},
      name: item.name, 
      image: item.image, 
      priceAtAdd: item.price, 
      quantity: 1 
    }));
    dispatch(openCart());
    toast.success(`${item.name} added to cart`, {
      iconTheme: { primary: '#C58837', secondary: 'white' },
      style: {
        border: '1px solid #C58837',
        color: '#111111',
        fontFamily: 'Montserrat, sans-serif'
      }
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.25 }}
      className="w-full"
    >
      <div className="flex items-center justify-between mb-6 pb-2 border-b border-brand-light">
        <h1 className="font-playfair text-2xl font-semibold text-brand-text">My Wishlist</h1>
        <span className="text-xs text-brand-grey font-medium">({items.length} {items.length === 1 ? 'item' : 'items'})</span>
      </div>

      {items.length === 0 ? (
        <div className="bg-white border border-brand-light p-16 text-center">
          <Heart size={48} className="text-brand-gold/40 mx-auto mb-4 animate-pulse" strokeWidth={1} />
          <p className="font-playfair text-xl text-brand-text mb-2">Your Wishlist is Empty</p>
          <p className="text-brand-grey text-xs md:text-sm mb-6 max-w-sm mx-auto">
            Explore our collections and save your favorite products, apparel, and lifestyle curations here.
          </p>
          <Link to="/products" className="btn-primary inline-block" id="wishlist-empty-shop">Explore Products</Link>
        </div>
      ) : (
        /* Grid structured identical to Product Listing Page (4-columns on desktop) */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {items.map((item, index) => {
            const discount = (item.comparePrice && Number(item.comparePrice) > Number(item.price))
              ? Math.round(((Number(item.comparePrice) - Number(item.price)) / Number(item.comparePrice)) * 100)
              : null;

            const variantEntries = item.selectedVariant ? Object.entries(item.selectedVariant).filter(([k,v]) => v) : [];
            const variantText = variantEntries.length > 0 ? variantEntries.map(([k,v]) => `${k}: ${v}`).join(' · ') : null;

            return (
              <motion.article
                key={`${item.id || item.productId}_${item.variantId || JSON.stringify(item.selectedVariant || {})}_${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="relative bg-white flex flex-col border border-brand-light shadow-sm hover:shadow-md transition-all duration-300"
                aria-label={item.name}
              >
                {/* Image Wrap - "group" class here so hover trigger is isolated to the image */}
                <div className="group block relative overflow-hidden aspect-[3/4] bg-brand-light">
                  <img
                    src={getImageUrl(item.image) || getPlaceholderSvg(item.name || 'Product')}
                    alt={item.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                    onError={(e) => { e.target.onerror = null; e.target.src = getPlaceholderSvg(item.name || 'Product'); }}
                  />

                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none">
                    {!item.inStock && (
                      <span className="bg-red-600 text-white text-[9px] font-bold px-2 py-0.5 tracking-wider uppercase rounded-sm">
                        Sold Out
                      </span>
                    )}
                    {discount !== null && discount > 0 && (
                      <span className="bg-brand-gold text-white text-[9px] font-bold px-2 py-0.5 rounded-sm">
                        -{discount}%
                      </span>
                    )}
                  </div>

                  {/* Remove Button (Red Heart on top right) */}
                  <button
                    onClick={(e) => { e.preventDefault(); remove(item); }}
                    className="absolute top-3 right-3 p-2 rounded-full bg-white/95 text-red-500 shadow-sm hover:scale-110 hover:bg-white transition-all duration-200 focus-visible:outline-brand-gold z-20"
                    aria-label={`Remove ${item.name} from wishlist`}
                    id={`wishlist-remove-${item.id}`}
                  >
                    <Heart size={14} className="fill-current" />
                  </button>

                  {/* Hover Actions - Slide-up overlay (triggers ONLY on image group hover) */}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/90 flex translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out z-10">
                    <Link
                      to={`/products/${item.slug}`}
                      className="flex-1 flex items-center justify-center gap-1.5 py-3 text-white text-[10px] font-medium hover:bg-white/10 transition-colors border-r border-white/10 text-center"
                      id={`qv-${item.id}`}
                    >
                      <Eye size={12} /> View Details
                    </Link>
                    <button
                      onClick={() => addToCart(item)}
                      disabled={!item.inStock && !isItemInCart(item)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-3 text-white text-[10px] font-medium hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      id={`add-cart-${item.id}`}
                    >
                      <ShoppingBag size={12} /> {isItemInCart(item) ? 'View Cart' : 'Add to Cart'}
                    </button>
                  </div>
                </div>

                {/* Info Area */}
                <div className="p-3 flex-1 flex flex-col justify-between">
                  <div>
                    <p className="text-[10px] text-brand-gold font-medium tracking-widest uppercase mb-1">
                      {item.categoryName}
                    </p>
                    <Link 
                      to={`/products/${item.slug}`} 
                      className="hover:text-brand-gold text-brand-text transition-colors line-clamp-2"
                    >
                      <h3 className="font-inter font-medium text-xs md:text-sm leading-snug">
                        {item.name}
                      </h3>
                    </Link>
                    {variantText && (
                      <p className="text-[10px] text-brand-gold font-medium mt-1">
                        {variantText}
                      </p>
                    )}
                  </div>

                  <div className="mt-3">
                    {/* Star Rating */}
                    {Number(item.reviewCount) > 0 && Number(item.rating) > 0 && (
                      <div className="flex items-center gap-0.5 mb-1.5">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star 
                            key={s} 
                            size={10} 
                            className={s <= Math.round(Number(item.rating)) ? 'fill-brand-gold text-brand-gold' : 'fill-brand-light text-brand-light'} 
                          />
                        ))}
                        <span className="text-[9px] text-brand-grey ml-1">({item.reviewCount})</span>
                      </div>
                    )}

                    {/* Price Grid */}
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs md:text-sm text-brand-text">
                        {fmt(item.price)}
                      </span>
                      {item.comparePrice && Number(item.comparePrice) > Number(item.price) && (
                        <span className="text-brand-grey text-[10px] md:text-xs line-through">
                          {fmt(item.comparePrice)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};

export default WishlistPage;