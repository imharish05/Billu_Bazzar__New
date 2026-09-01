import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, ShoppingBag, ChevronRight, Tag, Gift } from 'lucide-react';
import { removeLocal, addLocal, clearLocal, openCart, fetchCart } from '../redux/slices/cartSlice';
import Footer from '../components/Footer';
import { formatPrice } from '../utils/currency';
import { getImageUrl } from '../utils/imageUrl';
import api from '../services/api';
import { toast } from 'react-hot-toast';

import { formatVariantName } from '../utils/variantFormatter';

const FREE_SHIP = 1499;

const CartPage = () => {
  const dispatch = useDispatch();
  const { items, subtotal } = useSelector(s => s.cart);
  const { code: currencyCode, rate: currencyRate } = useSelector(s => s.currency);

  const [giftWrap, setGiftWrap] = useState(false);
  const [giftMessage, setGiftMessage] = useState('');
  const [giftService, setGiftService] = useState(null);

  const fmt = (v) => formatPrice(v, currencyCode, currencyRate);

  const countWords = (text) => {
    if (!text || !text.trim()) return 0;
    return text.trim().split(/\s+/).filter(Boolean).length;
  };

  const handleGiftMessageChange = (e) => {
    const text = e.target.value;
    const words = text.trim().split(/\s+/).filter(Boolean);
    if (words.length <= 500) {
      setGiftMessage(text);
    } else {
      const trimmed = text.trim().split(/\s+/).slice(0, 500).join(' ');
      setGiftMessage(trimmed);
    }
  };

  const isGiftServiceActive = Boolean(giftService && giftService.isActive !== false);
  const giftWrapAmount = giftService ? Number(giftService.amount || 0) : 0;

  useEffect(() => { 
    document.title = 'Your Cart — Billu Bazaar'; 
    dispatch(fetchCart());
  }, [dispatch]);

  // Fetch gift service config
  useEffect(() => {
    api.get('/gift-service')
      .then(res => {
        if (res.data?.success) {
          setGiftService(res.data.giftService);
        }
      })
      .catch(() => {});
  }, []);



  useEffect(() => {
    if (items && items.length > 0) {
      const missingDetails = items.some(i => !i.name && !i.product?.name);
      if (missingDetails) {
        dispatch(syncCart(items));
      }
    }
  }, [items, dispatch]);



  if (items.length === 0) {
    return (
      <main id="main-content">
        <div className="max-w-site mx-auto px-6 md:px-8 py-24 flex flex-col items-center text-center">
          <ShoppingBag size={64} className="text-brand-light mb-6" strokeWidth={1} />
          <h1 className="font-playfair text-3xl font-bold mb-3">Your Cart is Empty</h1>
          <p className="text-brand-grey mb-8">Looks like you haven't added anything yet. Explore our curated collections.</p>
          <Link to="/products" className="btn-primary" id="empty-cart-shop">Start Shopping</Link>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main id="main-content">
      <div className="max-w-site mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-12">
        <h1 className="font-playfair text-h2 font-bold mb-2">Shopping Cart</h1>
        <p className="text-brand-grey mb-8">{items.length} {items.length === 1 ? 'item' : 'items'}</p>



        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Cart items */}
          <div className="lg:col-span-2 space-y-4">
            <AnimatePresence mode="popLayout">
              {items.map((item, idx) => {
                const rawName = item.product?.name || item.productName || item.name;
                const name = (rawName && String(rawName).trim()) ? String(rawName).trim() : `Product #${item.productId || item.id || idx + 1}`;

                let img = item.variant?.image || item.variantImage || item.image || item.productImage || item.product?.defaultProductImage || (item.product?.images && item.product.images[0]);
                if (!img || img === 'undefined') {
                  img = 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=200';
                } else {
                  img = getImageUrl(img);
                }

                const variantText = formatVariantName(item.selectedVariant || item.variant?.attributes || item.variant);

                return (
                  <motion.div
                    key={`${item.productId || item.id}_${item.variantId || JSON.stringify(item.selectedVariant || {})}_${idx}`}
                    layout
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    exit={{ opacity: 0, x: 100, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="bg-white shadow-sm flex gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border border-neutral-100"
                  >
                    <img
                      src={img}
                      alt={name}
                      className="w-20 h-24 sm:w-24 sm:h-28 object-cover flex-shrink-0 rounded border border-neutral-200"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=200';
                      }}
                    />
                    <div className="flex-1 flex flex-col min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0 pr-1">
                          <p className="font-semibold text-neutral-900 text-sm sm:text-base leading-tight">{name}</p>
                          {variantText && (
                            <p className="text-xs text-brand-gold font-medium mt-1">{variantText}</p>
                          )}
                        </div>
                        <button
                          onClick={() => dispatch(removeLocal({ productId: item.productId || item.id, variantId: item.variantId, selectedVariant: item.selectedVariant }))}
                          className="text-brand-grey hover:text-red-400 transition-colors p-1 focus-visible:outline-brand-gold flex-shrink-0"
                          aria-label={`Remove ${name} from cart`}
                          id={`remove-${item.productId || item.id}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="mt-auto pt-3">
                        <p className="font-semibold text-brand-text text-sm sm:text-base mb-2">{fmt((item.priceAtAdd || item.price || 0) * item.quantity)}</p>
                        {(() => {
                          const availStock = item.variant?.stock ?? item.product?.stock ?? item.availableStock ?? 9999;
                          const isMax = item.quantity >= availStock;
                          return (
                            <div className="flex items-center border border-brand-light w-fit rounded-sm overflow-hidden">
                              <button
                                onClick={() => item.quantity <= 1 ? dispatch(removeLocal({ productId: item.productId || item.id, variantId: item.variantId, selectedVariant: item.selectedVariant })) : dispatch(addLocal({ ...item, quantity: -1 }))}
                                className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center hover:bg-brand-light transition-colors focus-visible:outline-brand-gold text-sm"
                                aria-label="Decrease"
                              >−</button>
                              <span className="w-8 sm:w-10 text-center text-xs sm:text-sm font-medium">{item.quantity}</span>
                              <button
                                onClick={() => {
                                  if (isMax) {
                                    toast.error(`Maximum available stock reached (${availStock} items).`);
                                  } else {
                                    dispatch(addLocal({ ...item, quantity: 1 }));
                                  }
                                }}
                                disabled={isMax}
                                className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center transition-colors focus-visible:outline-brand-gold text-sm ${isMax ? 'bg-neutral-100 text-neutral-300 cursor-not-allowed' : 'hover:bg-brand-light'}`}
                                aria-label="Increase"
                                title={isMax ? `Max stock available: ${availStock}` : 'Increase quantity'}
                              >+</button>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            <button
              onClick={() => dispatch(clearLocal())}
              className="text-sm text-brand-grey hover:text-red-400 transition-colors flex items-center gap-2 focus-visible:outline-brand-gold mt-4"
              id="clear-cart-btn"
            >
              <Trash2 size={14} /> Clear Cart
            </button>

            {/* Gift wrapping option block */}
            {isGiftServiceActive && (
              <div className="bg-white border border-brand-light p-4 sm:p-6 shadow-sm space-y-4 mt-6 rounded-lg">
                <h3 className="font-playfair text-base font-semibold flex items-center gap-2 text-brand-text">
                  <Gift size={18} className="text-brand-gold" /> Premium Gift Services
                </h3>
                
                <div className="flex flex-col gap-3">
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={giftWrap}
                      onChange={(e) => {
                        setGiftWrap(e.target.checked);
                        if (!e.target.checked) setGiftMessage('');
                      }}
                      className="w-4 h-4 mt-0.5 accent-brand-gold rounded border-brand-light"
                    />
                    <div className="text-xs">
                      <p className="font-medium text-brand-text">
                        {giftService?.label || 'Add Premium Gift Wrapping'} (+{fmt(giftWrapAmount)})
                      </p>
                      <p className="text-brand-grey mt-0.5">
                        {giftService?.description || 'Meticulously wrapped in our signature gold foil box with a silk ribbon casing.'}
                      </p>
                    </div>
                  </label>

                  {giftWrap && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-2 pt-2"
                    >
                      <label className="block text-xs font-semibold text-brand-grey" htmlFor="gift-msg">
                        Personalized Message (Complimentary)
                      </label>
                      <textarea
                        id="gift-msg"
                        rows={3}
                        value={giftMessage}
                        onChange={handleGiftMessageChange}
                        placeholder="Write your special message here... (e.g. Happy Anniversary! With love, Priya)"
                        className="w-full border border-brand-light p-3 text-xs focus:outline-none focus:border-brand-gold bg-transparent resize-none rounded-sm placeholder-brand-grey/40"
                      />
                      <div className="flex justify-between items-center text-[10px] text-brand-grey">
                        <span>{countWords(giftMessage)} / 500 words</span>
                        <span>{Math.max(0, 500 - countWords(giftMessage))} words remaining</span>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="space-y-4">
            <div className="bg-white shadow-sm p-4 sm:p-6 border border-brand-light rounded-lg">
              <h2 className="font-playfair text-xl font-semibold mb-5">Order Summary</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-brand-grey">Subtotal</span><span className="font-medium text-brand-text">{fmt(subtotal)}</span></div>
                <div className="border-t border-brand-light pt-3 flex justify-between font-semibold text-base">
                  <span>Total</span><span className="text-brand-gold">{fmt(subtotal)}</span>
                </div>
              </div>
              <p className="text-xs text-brand-grey mt-4 pt-3 border-t border-brand-light/40 italic">
                * Taxes, shipping, and discounts will be calculated at checkout.
              </p>

              <Link to="/checkout" state={{ giftWrap: giftWrap && isGiftServiceActive, giftMessage, giftWrapPrice: giftWrapAmount }} className="btn-primary w-full text-center block mt-6" id="cart-checkout">
                Proceed to Checkout
              </Link>
              <Link to="/products" className="btn-outline w-full text-center block mt-3" id="cart-continue">
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
};

export default CartPage;
