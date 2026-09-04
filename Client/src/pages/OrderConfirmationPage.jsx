import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Package, Download, MapPin, Clock, RefreshCw, ShoppingBag, CreditCard, ExternalLink, ArrowRight, AlertTriangle, XCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Footer from '../components/Footer';
import { printInvoice } from '../utils/invoiceGenerator';
import { formatPrice, formatOrderAmount } from '../utils/currency';
import { fetchOrderById, cancelCustomerOrder } from '../redux/slices/ordersSlice';
import { getImageUrl } from '../utils/imageUrl';
import { getPlaceholderSvg } from '../utils/placeholder';
import api from '../services/api';

/* Helper to parse variant JSON strings safely */
const parseVariant = (val) => {
  if (!val) return null;
  let parsed = val;
  for (let i = 0; i < 5; i++) {
    if (typeof parsed === 'string') {
      const trimmed = parsed.trim();
      if (
        (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
        (trimmed.startsWith('"') && trimmed.endsWith('"'))
      ) {
        try {
          const next = JSON.parse(parsed);
          if (next === parsed) break;
          parsed = next;
        } catch {
          break;
        }
      } else {
        break;
      }
    } else {
      break;
    }
  }
  if (Array.isArray(parsed) && parsed.length > 0) parsed = parsed[0];
  if (typeof parsed === 'object' && parsed !== null) return parsed;
  return null;
};

/* Helper to format variant attributes into human-readable string */
const getVariantString = (rawVariant) => {
  const variantObj = parseVariant(rawVariant);
  if (variantObj) {
    const EXCLUDE_KEYS = new Set(['id', 'sku', 'variantId', 'productId', 'stock', 'price', 'mrp', 'image', 'createdAt', 'updatedAt', 'gstRate']);
    const entries = Object.entries(variantObj).filter(([k, v]) => !EXCLUDE_KEYS.has(k) && v !== undefined && v !== null && v !== '');
    if (entries.length > 0) {
      return entries.map(([k, v]) => `${k}: ${v}`).join(' · ');
    }
  }
  if (typeof rawVariant === 'string' && !rawVariant.startsWith('{') && !rawVariant.startsWith('[')) {
    return rawVariant;
  }
  return null;
};

/* Helper to calculate dynamic tracking steps based on order.status & paymentStatus */
const calculateTrackingSteps = (currentStatus, currentPaymentStatus) => {
  const status = (currentStatus || 'CONFIRMED').toUpperCase();
  const isPaid = (currentPaymentStatus || '').toUpperCase() === 'PAID' || status === 'PAID' || status === 'CONFIRMED';

  if (status === 'CANCELLED') {
    return [
      { status: 'Order Placed', done: true },
      { status: 'Order Cancelled', done: true, isCancelled: true },
    ];
  }

  if (status === 'RETURNED' || status === 'REFUNDED') {
    return [
      { status: 'Order Placed', done: true },
      { status: 'Delivered', done: true },
      { status: status === 'RETURNED' ? 'Item Returned' : 'Refunded', done: true, isReturn: true },
    ];
  }

  const statusLevelMap = {
    PENDING_PAYMENT: isPaid ? 1 : 0,
    PAID: 1,
    PENDING: 1,
    CONFIRMED: 1,
    PROCESSING: 2,
    SHIPPED: 3,
    OUT_FOR_DELIVERY: 4,
    DELIVERED: 5,
  };

  const currentLevel = statusLevelMap[status] !== undefined ? statusLevelMap[status] : 1;

  const baseSteps = [
    { status: 'Order Placed', level: 0 },
    { status: 'Payment Confirmed', level: 1 },
    { status: 'Processing', level: 2 },
    { status: 'Dispatched', level: 3 },
    { status: 'Out for Delivery', level: 4 },
    { status: 'Delivered', level: 5 },
  ];

  return baseSteps.map(step => ({
    status: step.status,
    done: currentLevel >= step.level || (step.level === 1 && isPaid) || status === 'DELIVERED',
  }));
};

const OrderConfirmationPage = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const orderIdFromUrl = searchParams.get('orderId') || searchParams.get('orderNumber') || searchParams.get('cartId');

  const { current: order } = useSelector(s => s.orders);
  const { code: currencyCode } = useSelector(s => s.currency);

  const [refreshing, setRefreshing] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('Ordered by mistake');
  const [cancelReasonDetails, setCancelReasonDetails] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const targetId = orderIdFromUrl || order?.id || order?.orderNumber;

  useEffect(() => {
    if (!targetId) return;
    let isMounted = true;

    dispatch(fetchOrderById(targetId)).then(async (action) => {
      if (!isMounted) return;
      const fetchedOrder = action.payload?.order || action.payload;
      if (fetchedOrder && (fetchedOrder.paymentStatus === 'UNPAID' || fetchedOrder.status === 'PENDING_PAYMENT')) {
        const isSuccess = searchParams.get('status') === 'success' || Boolean(searchParams.get('gateway'));
        if (isSuccess) {
          try {
            const orderRef = searchParams.get('orderRef') || searchParams.get('tran_order_ref') || searchParams.get('cartId') || undefined;
            const res = await api.post('/payments/verify', { orderId: fetchedOrder.id, orderRef });
            if (res.data?.success && isMounted) {
              dispatch(fetchOrderById(targetId));
            }
          } catch (err) {
            console.warn('[OrderConfirmation] Auto-verify payment failed:', err.message);
          }
        }
      }
    });

    return () => { isMounted = false; };
  }, [targetId, dispatch]);

  const handleManualRefresh = async () => {
    if (!targetId || refreshing) return;
    setRefreshing(true);
    await dispatch(fetchOrderById(targetId));
    setTimeout(() => setRefreshing(false), 500);
  };

  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    if (!order?.id) return;
    const finalReason = cancelReason === 'Other'
      ? (cancelReasonDetails.trim() || 'Other reason')
      : (cancelReasonDetails.trim() ? `${cancelReason} - ${cancelReasonDetails.trim()}` : cancelReason);

    if (!finalReason || finalReason.trim().length < 3) {
      toast.error('Please select or specify a valid reason for cancellation.');
      return;
    }

    setIsCancelling(true);
    try {
      const result = await dispatch(cancelCustomerOrder({ id: order.id, reason: finalReason }));
      if (cancelCustomerOrder.fulfilled.match(result)) {
        toast.success('Your order has been cancelled successfully.');
        setCancelModalOpen(false);
        if (targetId) dispatch(fetchOrderById(targetId));
      } else {
        toast.error(result.payload || 'Failed to cancel order.');
      }
    } catch (err) {
      toast.error('An unexpected error occurred while cancelling order.');
    } finally {
      setIsCancelling(false);
    }
  };

  const fmt = (v) => formatOrderAmount(v, order?.currency || currencyCode);

  const isSuccessParam = searchParams.get('status') === 'success';
  const displayStatus = (order?.status === 'PENDING_PAYMENT' && isSuccessParam) ? 'CONFIRMED' : (order?.status || 'CONFIRMED');
  const displayPaymentStatus = (order?.paymentStatus === 'UNPAID' && (isSuccessParam || order?.status === 'CONFIRMED' || order?.status === 'PAID')) ? 'PAID' : (order?.paymentStatus || 'PAID');

  // 24-hour cancellation window calculation
  const orderPlacedTime = new Date(order?.createdAt || Date.now()).getTime();
  const hoursSincePlaced = (Date.now() - orderPlacedTime) / (1000 * 60 * 60);
  const isWithin24Hours = hoursSincePlaced <= 24;
  const canCancel = order && ['PENDING', 'PENDING_PAYMENT', 'PAID', 'CONFIRMED'].includes(order.status) && isWithin24Hours;
  const hoursLeft = Math.max(0, Math.floor(24 - hoursSincePlaced));
  const minsLeft = Math.max(0, Math.floor(((24 - hoursSincePlaced) % 1) * 60));

  const trackingSteps = calculateTrackingSteps(displayStatus, displayPaymentStatus);

  let addr = order?.shippingAddress || {};
  if (typeof addr === 'string') {
    try { addr = JSON.parse(addr); } catch (e) { addr = {}; }
  }
  const addrName = addr.fullName || addr.name || order?.customer?.name || 'Valued Customer';
  const addrLine1 = addr.flatHouse || addr.line1 || addr.addressLine1 || '';
  const addrLine2 = addr.areaStreet || addr.line2 || addr.addressLine2 || '';
  const addrCityStateZip = [
    addr.city,
    addr.state,
    addr.pincode || addr.zipCode || addr.zip_code
  ].filter(Boolean).join(', ');
  const addrPhone = addr.phone || order?.customer?.phone;
  const addrEmail = addr.email || order?.customer?.email;

  // Order items resolution
  const items = order?.items || order?.OrderItems || [];
  const subtotal = Number(order?.subtotal || items.reduce((sum, item) => sum + (Number(item.totalPrice) || (Number(item.quantity || item.qty || 1) * Number(item.unitPrice || item.price || 0))), 0));
  const totalDiscount = Number(order?.discountAmount || order?.discount || 0);
  const explicitCouponDisc = Number(order?.couponDiscount || 0);
  const explicitLoyaltyDisc = Number(order?.loyaltyDiscount || 0);

  let resolvedCouponDiscount = explicitCouponDisc;
  let resolvedLoyaltyDiscount = explicitLoyaltyDisc;

  if (resolvedCouponDiscount === 0 && resolvedLoyaltyDiscount === 0 && totalDiscount > 0) {
    if (order?.couponId || order?.coupon) {
      resolvedCouponDiscount = totalDiscount;
    } else {
      resolvedLoyaltyDiscount = totalDiscount;
    }
  }

  const shippingAmount = Number(order?.shippingAmount || 0);
  const explicitGw = Number(order?.giftWrapFee || order?.giftWrapPrice || 0);
  const calculatedGwDiff = Math.round(Number(order?.totalAmount || 0) - (subtotal + shippingAmount - totalDiscount));
  const giftWrapFee = explicitGw > 0 ? explicitGw : (calculatedGwDiff > 0 ? calculatedGwDiff : 0);
  const totalAmount = Number(order?.totalAmount || (subtotal + shippingAmount + giftWrapFee - totalDiscount));

  return (
    <main id="main-content">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-12">
        {/* Success header */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="text-center mb-8 sm:mb-12"
        >
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-sm border border-green-100">
            <CheckCircle size={48} className="text-green-500 animate-pulse sm:w-[52px] sm:h-[52px]" strokeWidth={1.5} />
          </div>
          <h1 className="font-playfair text-3xl sm:text-4xl font-bold text-brand-text mb-2">Order Confirmed!</h1>
          <p className="text-brand-grey text-sm sm:text-base">Thank you for shopping at Billu Bazaar.</p>
          {order && (
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mt-3">
              <span className="text-brand-gold font-bold text-base sm:text-lg">Order #{String(order.orderNumber || order.id || '').replace(/^#/, '')}</span>
              <span className={`text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider ${
                displayStatus === 'DELIVERED' || displayStatus === 'PAID' || displayStatus === 'CONFIRMED'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : displayStatus === 'CANCELLED'
                  ? 'bg-red-100 text-red-700 border border-red-300'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}>
                {displayStatus.replace(/_/g, ' ')}
              </span>
            </div>
          )}
        </motion.div>

        {/* Order details grid */}
        {order && (
          <div className="grid md:grid-cols-2 gap-4 sm:gap-6 mb-6">
            {/* Left Card: Order Summary */}
            <div className="bg-white shadow-sm p-5 sm:p-6 border border-brand-light rounded-xl flex flex-col justify-between">
              <div>
                <h3 className="font-playfair text-base sm:text-lg font-bold text-brand-text mb-4 flex items-center gap-2.5">
                  <Package size={20} className="text-brand-gold shrink-0" /> Order Details
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-brand-grey shrink-0 whitespace-nowrap">Order Total</span>
                    <span className="font-bold text-brand-gold text-base text-right">{fmt(totalAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-brand-grey shrink-0 whitespace-nowrap">Payment Method</span>
                    <span className="font-medium text-brand-text text-right">{order.paymentMethod || 'Credit / Debit Card'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-brand-grey shrink-0 whitespace-nowrap">Payment Status</span>
                    <span className="font-semibold text-emerald-600 text-right">{displayPaymentStatus}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-brand-grey shrink-0 whitespace-nowrap">Total Items</span>
                    <span className="font-medium text-brand-text text-right">{items.length} {items.length === 1 ? 'item' : 'items'}</span>
                  </div>
                  {order.createdAt && (
                    <div className="flex items-center justify-between gap-4 pt-1 border-t border-neutral-100">
                      <span className="text-brand-grey shrink-0 whitespace-nowrap">Order Date</span>
                      <span className="text-neutral-700 text-right text-xs">
                        {new Date(order.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  )}
                  {order.razorpay_payment_id && (
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-brand-grey shrink-0 whitespace-nowrap">Transaction ID</span>
                      <span className="text-[11px] font-mono text-neutral-600 text-right truncate max-w-[170px]" title={order.razorpay_payment_id}>
                        {order.razorpay_payment_id}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Card: Shipping Address */}
            <div className="bg-white shadow-sm p-5 sm:p-6 border border-brand-light rounded-xl">
              <h3 className="font-playfair text-base sm:text-lg font-bold text-brand-text mb-4 flex items-center gap-2.5">
                <MapPin size={20} className="text-brand-gold shrink-0" /> 
                Shipping Address
              </h3>
              <div className="text-sm font-sans space-y-1">
                <p className="font-semibold text-brand-text text-sm">{addrName}</p>
                {addrLine1 && <p className="text-neutral-600 text-sm mt-1">{addrLine1}</p>}
                {addrLine2 && <p className="text-neutral-600 text-sm">{addrLine2}</p>}
                {addr.landmark && <p className="text-neutral-500 text-sm">Near {addr.landmark}</p>}
                {addrCityStateZip && <p className="text-neutral-600 text-sm mt-1">{addrCityStateZip}</p>}
                {addr.country && <p className="font-medium text-brand-text text-sm mt-0.5">{addr.country}</p>}
                {(addrPhone || addrEmail) && (
                  <div className="text-neutral-500 text-sm mt-3 pt-2.5 border-t border-neutral-100 space-y-1">
                    {addrPhone && (
                      <p className="text-sm text-neutral-700">
                        <span className="font-medium text-neutral-900">Phone: </span>
                        <span className="text-neutral-600">{addrPhone}</span>
                      </p>
                    )}
                    {addrEmail && (
                      <p className="text-sm text-neutral-700 break-all">
                        <span className="font-medium text-neutral-900">Email: </span>
                        <span className="text-neutral-600">{addrEmail}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Order Items List Card */}
        {order && items.length > 0 && (
          <div className="bg-white shadow-sm p-5 sm:p-6 mb-6 border border-brand-light rounded-xl">
            <div className="flex items-center justify-between gap-3 pb-4 mb-4 border-b border-neutral-100">
              <h3 className="font-playfair text-base sm:text-lg font-bold text-brand-text flex items-center gap-2.5">
                <ShoppingBag size={20} className="text-brand-gold shrink-0" />
                <span>Order Items</span>
                <span className="text-xs font-sans font-medium text-neutral-500 bg-neutral-100 px-2.5 py-0.5 rounded-full">
                  {items.length} {items.length === 1 ? 'item' : 'items'}
                </span>
              </h3>
            </div>

            {/* Items List */}
            <div className="divide-y divide-neutral-100">
              {items.map((item, idx) => {
                const variantInfo = getVariantString(item.selectedVariant || item.variant);
                const rawImg = item.displayImage || item.variantImage || item.variant?.image || item.image || item.productImage || item.product?.images?.[0] || item.product?.image;
                const imgSrc = getImageUrl(rawImg) || getPlaceholderSvg(item.productName || item.name || 'Product');
                const productName = item.productName || item.name || item.product?.title || 'Luxury Item';
                const qty = Number(item.quantity || item.qty || 1);
                const unitPrice = Number(item.unitPrice || item.price || 0);
                const lineTotal = Number(item.totalPrice || (qty * unitPrice));
                const productSlug = item.product?.slug || item.productId || item.product?.id;

                return (
                  <div key={item.id || idx} className="py-4 first:pt-0 last:pb-0 flex items-center gap-3 sm:gap-4">
                    {/* Thumbnail Image */}
                    <div className="w-16 h-20 sm:w-20 sm:h-24 rounded-lg overflow-hidden border border-neutral-200/80 bg-neutral-50 flex-shrink-0 relative">
                      <img
                        src={imgSrc}
                        alt={productName}
                        className="w-full h-full object-cover object-center"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = getPlaceholderSvg(productName);
                        }}
                      />
                    </div>

                    {/* Item Details */}
                    <div className="flex-1 min-w-0 pr-1">
                      {productSlug ? (
                        <Link
                          to={`/product/${productSlug}`}
                          className="font-semibold text-sm sm:text-base text-neutral-900 hover:text-brand-gold transition-colors line-clamp-1 block"
                        >
                          {productName}
                        </Link>
                      ) : (
                        <h4 className="font-semibold text-sm sm:text-base text-neutral-900 line-clamp-1">
                          {productName}
                        </h4>
                      )}

                      {/* Variant Attributes */}
                      {variantInfo && (
                        <div className="mt-1">
                          <span className="inline-flex items-center text-[11px] sm:text-xs font-medium text-amber-900 bg-amber-50/80 border border-amber-200/60 px-2 py-0.5 rounded-md">
                            {variantInfo}
                          </span>
                        </div>
                      )}

                      {/* Quantity & Unit Price */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500 mt-1.5">
                        <span>Qty: <strong className="text-neutral-800">{qty}</strong></span>
                        <span className="text-neutral-300">•</span>
                        <span>Unit Price: <strong className="text-neutral-800">{fmt(unitPrice)}</strong></span>
                      </div>
                    </div>

                    {/* Line Total */}
                    <div className="text-right flex-shrink-0 self-center">
                      <div className="text-sm sm:text-base font-bold text-brand-gold">
                        {fmt(lineTotal)}
                      </div>
                      {qty > 1 && (
                        <div className="text-[10px] sm:text-xs text-neutral-400 mt-0.5">
                          ({qty} × {fmt(unitPrice)})
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Financial Breakdown Summary */}
            <div className="mt-5 pt-4 border-t border-neutral-100 space-y-2 text-xs sm:text-sm text-neutral-600">
              <div className="flex items-center justify-between">
                <span>Subtotal</span>
                <span className="font-medium text-neutral-900">{fmt(subtotal)}</span>
              </div>

              {resolvedCouponDiscount > 0 && (
                <div className="flex items-center justify-between text-emerald-600 font-medium">
                  <span>Coupon Discount{order?.coupon?.code ? ` (${order.coupon.code})` : ''}</span>
                  <span>-{fmt(resolvedCouponDiscount)}</span>
                </div>
              )}

              {resolvedLoyaltyDiscount > 0 && (
                <div className="flex items-center justify-between text-emerald-600 font-medium">
                  <span>Loyalty Points Redeemed{order?.redeemedPoints ? ` (${order.redeemedPoints} pts)` : ''}</span>
                  <span>-{fmt(resolvedLoyaltyDiscount)}</span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span>Shipping Fee</span>
                <span className="font-medium text-neutral-900">
                  {shippingAmount === 0 ? <span className="text-emerald-600 font-semibold uppercase text-xs">Free</span> : fmt(shippingAmount)}
                </span>
              </div>

              {giftWrapFee > 0 && (
                <div className="flex items-center justify-between">
                  <span>Gift Wrap Packaging</span>
                  <span className="font-medium text-neutral-900">{fmt(giftWrapFee)}</span>
                </div>
              )}

              <div className="pt-3 mt-2 border-t border-neutral-200 flex items-center justify-between font-bold text-sm sm:text-base text-neutral-900">
                <span>Total Amount</span>
                <span className="text-brand-gold text-base sm:text-lg">{fmt(totalAmount)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Order Tracking */}
        <div className="bg-white shadow-sm p-5 sm:p-6 mb-6 border border-brand-light rounded-xl">
          <div className="flex items-center justify-between gap-3 mb-6">
            <h3 className="font-playfair text-base sm:text-lg font-bold text-brand-text flex items-center gap-2 min-w-0">
              <Clock size={20} className="text-brand-gold shrink-0" />
              <span className="truncate">Live Order Tracking</span>
            </h3>
            <button
              type="button"
              onClick={handleManualRefresh}
              className="text-xs text-neutral-700 hover:text-brand-text flex items-center gap-1.5 bg-neutral-100 hover:bg-neutral-200 px-3.5 py-1.5 rounded-full border border-neutral-200/80 transition-all font-medium cursor-pointer shrink-0 active:scale-95"
              title="Click to refresh order status"
            >
              <RefreshCw size={13} className={`text-brand-gold ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Syncing...' : 'Refresh Status'}</span>
            </button>
          </div>

          <div className="relative pl-2">
            <div className="absolute left-[17px] top-3 bottom-3 w-0.5 bg-neutral-200" aria-hidden="true" />
            <div className="space-y-6">
              {trackingSteps.map((step, i) => (
                <motion.div
                  key={step.status}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-4 relative z-10"
                >
                  <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                    step.isCancelled
                      ? 'bg-red-500 border-red-500 text-white shadow-sm'
                      : step.done 
                      ? 'bg-brand-gold border-brand-gold text-white shadow-sm ring-4 ring-brand-gold/10' 
                      : 'bg-white border-neutral-300'
                  }`}>
                    {step.done && (
                      <div className="w-2.5 h-2.5 rounded-full bg-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`font-semibold text-sm ${step.done ? 'text-brand-text' : 'text-neutral-400'}`}>
                      {step.status}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Cancellation Notice Banner */}
        {canCancel && (
          <div className="mb-8 bg-amber-50/90 border border-amber-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 shadow-2xs">
            <div className="flex items-center gap-3 text-xs text-amber-950">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0 text-amber-700">
                <AlertTriangle size={16} />
              </div>
              <div>
                <p className="font-bold text-neutral-900">24-Hour Free Cancellation Active</p>
                <p className="text-amber-800 text-[11px] mt-0.5">
                  You can cancel this order within 24 hours of placement ({hoursLeft}h {minsLeft}m remaining).
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCancelModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-600 hover:text-white transition-all shadow-2xs cursor-pointer active:scale-95 shrink-0"
              id="confirm-cancel-btn-banner"
            >
              <XCircle size={14} /> Cancel Order
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={() => printInvoice(order)} className="btn-outline flex items-center justify-center gap-2 flex-1 py-3.5" id="download-invoice">
            <Download size={16} /> Download Invoice
          </button>
          <Link to="/account/orders" className="btn-primary flex items-center justify-center gap-2 flex-1 py-3.5" id="view-orders">
            View All Orders
          </Link>
        </div>

        <div className="text-center mt-10">
          <Link to="/products" className="text-brand-gold font-semibold text-sm hover:underline focus-visible:outline-brand-gold inline-flex items-center gap-1.5" id="continue-shopping-confirm">
            ← Continue Shopping
          </Link>
        </div>
      </div>

      {/* ── Order Cancellation Modal ───────────────────────────────────────── */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-4 sm:p-6 relative border border-neutral-100 max-h-[90vh] flex flex-col">
            <button
              onClick={() => !isCancelling && setCancelModalOpen(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-700 p-1 rounded-full hover:bg-neutral-100 transition-colors"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="font-playfair text-lg font-bold text-neutral-900 leading-tight">
                  Cancel Order #{String(order?.orderNumber || order?.id || '').replace(/^#/, '')}
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Please review the cancellation terms and select your reason ({hoursLeft}h {minsLeft}m window remaining).
                </p>
              </div>
            </div>

            <form onSubmit={handleCancelSubmit} className="space-y-4 overflow-y-auto flex-1 pr-1">
              {/* Reason Selection */}
              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1.5 uppercase tracking-wider">
                  Reason for Cancellation <span className="text-red-500">*</span>
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:border-brand-gold font-medium text-neutral-800"
                  required
                >
                  <option value="Ordered by mistake">Ordered by mistake</option>
                  <option value="Found a better price / alternative elsewhere">Found a better price / alternative elsewhere</option>
                  <option value="Incorrect delivery address / contact details">Incorrect delivery address / contact details</option>
                  <option value="Delivery time is too long / delayed">Delivery time is too long / delayed</option>
                  <option value="Need to change variant, size, or color">Need to change variant, size, or color</option>
                  <option value="Changed mind / No longer required">Changed mind / No longer required</option>
                  <option value="Other">Other reason (specify below)</option>
                </select>
              </div>

              {/* Reason Details */}
              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1.5 uppercase tracking-wider">
                  Additional Details {cancelReason === 'Other' ? <span className="text-red-500">*</span> : <span className="text-neutral-400 font-normal">(Optional)</span>}
                </label>
                <textarea
                  rows={2}
                  value={cancelReasonDetails}
                  onChange={(e) => setCancelReasonDetails(e.target.value)}
                  placeholder={cancelReason === 'Other' ? "Please explain why you wish to cancel this order..." : "Any additional notes for our support team..."}
                  required={cancelReason === 'Other'}
                  className="w-full border border-neutral-200 rounded-lg p-2.5 text-xs bg-white focus:outline-none focus:border-brand-gold"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  disabled={isCancelling}
                  onClick={() => setCancelModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2 border border-neutral-200 text-neutral-600 text-xs font-semibold rounded-lg hover:bg-neutral-50 transition-colors"
                >
                  Keep Order
                </button>
                <button
                  type="submit"
                  disabled={isCancelling}
                  className="w-full sm:w-auto px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
                  id="btn-confirm-cancel-order"
                >
                  {isCancelling ? (
                    <>
                      <RefreshCw size={13} className="animate-spin text-white" />
                      <span>Cancelling Order…</span>
                    </>
                  ) : (
                    <>
                      <XCircle size={14} />
                      <span>Confirm Cancellation</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </main>
  );
};

export default OrderConfirmationPage;

