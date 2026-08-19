import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, Circle, MapPin, Truck, CreditCard, FileText, Phone, MessageSquare, RefreshCw, XCircle, Star, X } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchOrderById, cancelCustomerOrder } from '../../redux/slices/ordersSlice';
import { createReview } from '../../redux/slices/reviewsSlice';
import { formatPrice, formatOrderAmount } from '../../utils/currency';
import { printInvoice } from '../../utils/invoiceGenerator';
import { getImageUrl } from '../../utils/imageUrl';
import { getPlaceholderSvg } from '../../utils/placeholder';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  PENDING_PAYMENT: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  PAID: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  PENDING: 'bg-amber-50 text-amber-700 border border-amber-200',
  CONFIRMED: 'bg-blue-50 text-blue-700 border border-blue-200',
  PROCESSING: 'bg-purple-50 text-purple-700 border border-purple-200',
  SHIPPED: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  OUT_FOR_DELIVERY: 'bg-orange-50 text-orange-700 border border-orange-200',
  DELIVERED: 'bg-green-50 text-green-700 border border-green-200',
  CANCELLED: 'bg-red-50 text-red-700 border border-red-200',
  RETURNED: 'bg-gray-100 text-gray-600 border border-gray-200',
  REFUNDED: 'bg-teal-50 text-teal-700 border border-teal-200',
};

const STATUS_LABELS = {
  PENDING_PAYMENT: 'Pending Payment',
  PAID: 'Paid',
  PENDING: 'Order Placed',
  CONFIRMED: 'Confirmed',
  PROCESSING: 'Processing',
  SHIPPED: 'Dispatched',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  RETURNED: 'Returned',
  REFUNDED: 'Refunded',
};

const OrderDetailPage = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { current: order, loading, error } = useSelector(s => s.orders);
  const [isCancelling, setIsCancelling] = useState(false);

  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [targetItem, setTargetItem] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewBody, setReviewBody] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const handleOpenReviewModal = (item) => {
    setTargetItem(item);
    setReviewRating(5);
    setReviewTitle('');
    setReviewBody('');
    setReviewModalOpen(true);
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewBody.trim() || !targetItem) return;
    setIsSubmittingReview(true);
    try {
      const res = await dispatch(createReview({
        productId: targetItem.productId,
        orderId: order.id,
        rating: reviewRating,
        title: reviewTitle,
        body: reviewBody,
      }));
      if (createReview.fulfilled.match(res)) {
        toast.success('Thank you! Your product review has been submitted.');
        setReviewModalOpen(false);
        dispatch(fetchOrderById(id));
      } else {
        toast.error(res.payload || 'Failed to submit review');
      }
    } catch (err) {
      toast.error('Failed to submit review');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  useEffect(() => {
    if (id) {
      dispatch(fetchOrderById(id));
    }
  }, [id, dispatch]);

  const handleCancelOrder = async () => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    setIsCancelling(true);
    try {
      const result = await dispatch(cancelCustomerOrder(id));
      if (cancelCustomerOrder.fulfilled.match(result)) {
        toast.success('Your order has been cancelled successfully.');
      } else {
        toast.error(result.payload || 'Failed to cancel order.');
      }
    } catch (err) {
      toast.error('An unexpected error occurred.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleDownloadInvoice = () => {
    if (order) {
      printInvoice(order);
      toast.success('Tax invoice generated!');
    } else {
      toast.error('Order details not ready for invoice printing.');
    }
  };

  if (loading && !order) {
    return (
      <div className="bg-white shadow-sm p-12 text-center my-6">
        <RefreshCw size={28} className="animate-spin text-brand-gold mx-auto mb-3" />
        <p className="text-brand-grey text-sm">Loading order details...</p>
      </div>
    );
  }

  if (error || !order || String(order.id) !== String(id)) {
    return (
      <div className="bg-white shadow-sm p-12 text-center my-6 border border-neutral-200 rounded-lg">
        <XCircle size={36} className="text-red-400 mx-auto mb-3" />
        <h2 className="font-playfair text-xl font-bold mb-2">Order Not Found</h2>
        <p className="text-brand-grey text-sm mb-6">{error || 'The requested order could not be retrieved.'}</p>
        <Link to="/account/orders" className="btn-primary inline-flex items-center gap-2 text-xs py-2.5 px-5">
          <ArrowLeft size={14} /> Back to My Orders
        </Link>
      </div>
    );
  }

  const currency = order.currency || 'INR';

  // Generate tracking steps based on order status
  const trackingSteps = (() => {
    const steps = [
      { key: 'PENDING', label: 'Order Placed' },
      { key: 'CONFIRMED', label: 'Confirmed' },
      { key: 'PROCESSING', label: 'Processing' },
      { key: 'SHIPPED', label: 'Dispatched' },
      { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
      { key: 'DELIVERED', label: 'Delivered' },
    ];

    let timeline = order.statusTimeline || {};
    if (typeof timeline === 'string') {
      try { timeline = JSON.parse(timeline); } catch (e) { timeline = {}; }
    }

    if (order.status === 'CANCELLED') {
      return [
        { label: 'Order Placed', date: timeline.PENDING || order.createdAt, done: true },
        { label: 'Cancelled', date: timeline.CANCELLED || order.updatedAt || order.createdAt, done: true, isCancelled: true },
      ];
    }

    const orderSequence = ['PENDING_PAYMENT', 'PAID', 'PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'];
    const currentIndex = orderSequence.indexOf(order.status);

    return steps.map((step, idx) => {
      const stepIndex = orderSequence.indexOf(step.key);
      const done = stepIndex <= currentIndex || order.status === 'DELIVERED';
      const isCurrent = step.key === order.status || (step.key === 'PENDING' && (order.status === 'PENDING_PAYMENT' || order.status === 'PAID'));

      let date = null;
      if (done) {
        if (timeline && timeline[step.key]) {
          date = timeline[step.key];
        } else if (step.key === 'PENDING') {
          date = timeline.PENDING || timeline.PENDING_PAYMENT || order.createdAt;
        } else if (step.key === order.status) {
          date = order.updatedAt || order.createdAt;
        } else if (step.key === 'DELIVERED' && order.deliveredAt) {
          date = order.deliveredAt;
        } else {
          // For intermediate completed steps on legacy orders before statusTimeline was logged,
          // display the order creation / update timestamp as fallback so it's not blank
          date = order.createdAt;
        }
      }

      return { label: step.label, key: step.key, date, done, isCurrent };
    });
  })();

  const parseAddressObj = (addr) => {
    if (!addr) return null;
    if (typeof addr === 'string') {
      try {
        const parsed = JSON.parse(addr);
        if (typeof parsed === 'object' && parsed !== null) return parsed;
      } catch {
        return { plainText: addr };
      }
    }
    if (typeof addr === 'object') return addr;
    return null;
  };

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

  const renderAddress = (rawAddr) => {
    const addr = parseAddressObj(rawAddr);
    if (!addr) return <p className="text-neutral-400 text-sm">No address details recorded</p>;
    if (addr.plainText) {
      return <p className="text-neutral-600 text-sm leading-relaxed font-sans">{addr.plainText}</p>;
    }
    const name = addr.fullName || addr.name || `${addr.firstName || ''} ${addr.lastName || ''}`.trim();
    const phone = addr.phone || addr.mobile || '';
    const email = addr.email || '';
    const line1 = addr.flatHouse || addr.addressLine1 || addr.line1 || '';
    const line2 = addr.areaStreet || addr.addressLine2 || addr.line2 || '';
    const landmark = addr.landmark || '';
    const city = addr.city || '';
    const state = addr.state || '';
    const pincode = addr.pincode || addr.postalCode || '';
    const country = addr.country || '';

    return (
      <div className="text-sm font-sans space-y-1">
        {name && <p className="font-semibold text-neutral-900 text-sm mb-0.5">{name}</p>}
        <p className="text-neutral-600 text-sm leading-relaxed">
          {line1}{line2 ? `, ${line2}` : ''}{landmark ? ` (near ${landmark})` : ''}{city ? `, ${city}` : ''}{state ? `, ${state}` : ''} {pincode}
          {country ? `, ${country}` : ''}
        </p>
        {(phone || email) && (
          <div className="text-neutral-500 text-sm mt-3 pt-2 border-t border-neutral-100 space-y-1">
            {phone && (
              <p className="text-sm text-neutral-700">
                <span className="font-medium text-neutral-900">Phone : </span>
                <span className="text-neutral-600">{phone}</span>
              </p>
            )}
            {email && (
              <p className="text-sm text-neutral-700 break-all">
                <span className="font-medium text-neutral-900">Email : </span>
                <span className="text-neutral-600">{email}</span>
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  const subtotal = parseFloat(order.subtotal || 0);
  const taxAmount = parseFloat(order.taxAmount || 0);
  const shippingAmount = parseFloat(order.shippingAmount || 0);
  const discountAmount = parseFloat(order.discountAmount || 0);
  const totalAmount = parseFloat(order.totalAmount || 0);

  const canCancel = ['PENDING', 'PENDING_PAYMENT', 'CONFIRMED'].includes(order.status);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <Link to="/account/orders" className="inline-flex items-center gap-1.5 text-sm text-brand-grey hover:text-brand-gold mb-5 transition-colors" id="back-to-orders">
        <ArrowLeft size={15} /> Back to Orders
      </Link>

      {/* Main Order Metadata Header */}
      <div className="bg-white shadow-sm p-4 sm:p-6 mb-5 border border-neutral-100 rounded-lg flex justify-between items-start flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1.5 flex-wrap">
            <h1 className="font-playfair text-xl font-bold text-neutral-900">Order {order.orderNumber}</h1>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${STATUS_COLORS[order.status] || 'bg-gray-100'}`}>
              {STATUS_LABELS[order.status] || order.status}
            </span>
          </div>
          <p className="text-xs text-brand-grey">
            Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <button 
          onClick={handleDownloadInvoice}
          className="group inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold uppercase tracking-wider text-neutral-700 bg-white border border-neutral-300 rounded-lg shadow-sm hover:border-brand-gold hover:text-brand-gold hover:bg-amber-50/50 hover:shadow active:scale-95 transition-all duration-200 cursor-pointer"
          id="btn-download-invoice"
        >
          <FileText size={14} className="text-neutral-500 group-hover:text-brand-gold transition-colors" />
          <span>Download Invoice</span>
        </button>
      </div>

      {/* Tracking timeline */}
      <div className="bg-white shadow-sm p-4 sm:p-6 mb-5 border border-neutral-100 rounded-lg">
        <div className="flex items-center justify-between gap-3 mb-5">
          <h2 className="font-semibold text-sm text-neutral-950 flex items-center gap-2">
            <Truck size={16} className="text-brand-gold" /> Order Tracking
          </h2>
          <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${STATUS_COLORS[order.status] || 'bg-gray-100'}`}>
            {STATUS_LABELS[order.status] || order.status}
          </span>
        </div>

        {/* Desktop / Tablet Horizontal Stepper (>= md) */}
        <div className="hidden md:flex items-start justify-between relative px-2">
          {trackingSteps.map((step, i) => (
            <div key={step.label} className="flex-1 flex flex-col items-center text-center relative min-w-0">
              {/* Horizontal connecting line */}
              {i !== 0 && (
                <div
                  className={`absolute top-3.5 right-1/2 w-full h-0.5 -z-0 transition-colors ${
                    trackingSteps[i]?.done ? 'bg-brand-gold' : 'bg-neutral-200'
                  }`}
                />
              )}
              {/* Step Circle Node */}
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center z-10 transition-all ${
                  step.isCancelled
                    ? 'bg-red-500 text-white shadow-xs'
                    : step.done
                    ? 'bg-brand-gold text-white shadow-xs'
                    : 'bg-neutral-100 text-neutral-400 border border-neutral-200'
                } ${step.isCurrent && !step.isCancelled ? 'ring-4 ring-amber-100' : ''}`}
              >
                {step.isCancelled ? (
                  <X size={14} className="stroke-[2.5]" />
                ) : step.done ? (
                  <Check size={14} className="stroke-[2.5]" />
                ) : (
                  <Circle size={7} className="fill-neutral-300" />
                )}
              </div>
              {/* Label */}
              <p
                className={`text-xs mt-2.5 font-medium px-1 leading-snug break-words max-w-[110px] ${
                  step.done ? 'text-neutral-900 font-semibold' : 'text-neutral-400'
                }`}
              >
                {step.label}
              </p>
              {/* Date */}
              {step.date && (
                <p className="text-[10px] text-neutral-500 mt-0.5">
                  {new Date(step.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Mobile Vertical Stepper (< md) */}
        <div className="block md:hidden space-y-0 pl-1">
          {trackingSteps.map((step, i) => {
            const isLast = i === trackingSteps.length - 1;
            return (
              <div key={step.label} className="flex items-start gap-3.5 relative">
                {/* Vertical connecting line */}
                {!isLast && (
                  <div
                    className={`absolute left-[13px] top-7 bottom-0 w-0.5 -translate-x-1/2 ${
                      trackingSteps[i + 1]?.done ? 'bg-brand-gold' : 'bg-neutral-200'
                    }`}
                  />
                )}
                {/* Step Circle Node */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 z-10 transition-all ${
                    step.isCancelled
                      ? 'bg-red-500 text-white shadow-xs'
                      : step.done
                      ? 'bg-brand-gold text-white shadow-xs'
                      : 'bg-neutral-100 text-neutral-400 border border-neutral-200'
                  } ${step.isCurrent && !step.isCancelled ? 'ring-4 ring-amber-100' : ''}`}
                >
                  {step.isCancelled ? (
                    <X size={14} className="stroke-[2.5]" />
                  ) : step.done ? (
                    <Check size={14} className="stroke-[2.5]" />
                  ) : (
                    <Circle size={7} className="fill-neutral-300" />
                  )}
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0 pb-5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p
                      className={`text-xs sm:text-sm font-semibold ${
                        step.done ? 'text-neutral-900' : 'text-neutral-400'
                      }`}
                    >
                      {step.label}
                    </p>
                    {step.isCurrent && !step.isCancelled && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-amber-50 text-brand-gold border border-amber-200/60 rounded-full">
                        Current Status
                      </span>
                    )}
                  </div>
                  {step.date && (
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      {new Date(step.date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Shipping Address & Payment Card Grid */}
      <div className="grid md:grid-cols-2 gap-5 mb-5">
        {/* Shipping Address */}
        <div className="bg-white shadow-sm p-4 sm:p-6 border border-neutral-100 rounded-lg flex gap-3">
          {/* <MapPin size={18} className="text-brand-gold flex-shrink-0 mt-0.5" /> */}
          <div className="flex-1">
            <h2 className="font-sans text-sm font-semibold mb-3 text-neutral-900">Shipping Address</h2>
            {renderAddress(order.shippingAddress)}
          </div>
        </div>

        {/* Payment & Billing Details */}
        <div className="bg-white shadow-sm p-4 sm:p-6 border border-neutral-100 rounded-lg flex gap-3">
          {/* <CreditCard size={18} className="text-brand-gold flex-shrink-0 mt-0.5" /> */}
          <div className="flex-1">
            <h2 className="font-sans text-sm font-semibold mb-3 text-neutral-900">Payment & Billing</h2>

            <div className="mb-4 bg-neutral-50 p-3 rounded border border-neutral-100 text-sm">
              <div className="flex justify-between items-center mb-1">
                <span className="text-neutral-500 text-sm">Method</span>
                <span className="font-semibold text-neutral-800 text-sm">{order.paymentMethod || 'Online Payment'}</span>
              </div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-neutral-500 text-sm">Payment Status</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${order.paymentStatus === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                  {order.paymentStatus || 'UNPAID'}
                </span>
              </div>
              {order.razorpay_payment_id && (
                <div className="mt-2 pt-2 border-t border-neutral-200/60">
                  <span className="text-[11px] text-neutral-400 block uppercase tracking-wider font-semibold">Razorpay Transaction ID</span>
                  <span className="text-sm font-mono font-medium text-brand-gold select-all">{order.razorpay_payment_id}</span>
                </div>
              )}
            </div>

            <div>
              <p className="font-sans text-sm font-semibold text-neutral-500 mb-1">Billing Address</p>
              {renderAddress(order.billingAddress || order.shippingAddress)}
            </div>
          </div>
        </div>
      </div>

      {/* Item details */}
      <div className="bg-white shadow-sm p-4 sm:p-6 mb-5 border border-neutral-100 rounded-lg">
        <h2 className="font-sans font-semibold text-xs sm:text-sm mb-4 text-neutral-900">Ordered Items ({order.items?.length || 0})</h2>
        <div className="space-y-4">
          {(order.items || []).map((item, idx) => {
            const variantObj = parseVariant(item.selectedVariant);
            const EXCLUDE_KEYS = new Set(['id', 'sku', 'variantId', 'productId', 'stock', 'price', 'mrp']);
            const variantEntries = variantObj
              ? Object.entries(variantObj).filter(([k, v]) => !EXCLUDE_KEYS.has(k) && v !== undefined && v !== null && v !== '')
              : [];
            const variantInfo = variantEntries.length > 0
              ? variantEntries.map(([k, v]) => `${k}: ${v}`).join(' · ')
              : null;

            return (
              <div key={item.id || idx} className="flex items-center gap-4 py-3 border-b border-neutral-100 last:border-0 flex-wrap sm:flex-nowrap">
                <img
                  src={getImageUrl(item.productImage || item.image) || getPlaceholderSvg(item.productName || item.name || 'Product')}
                  alt={item.productName || item.name || 'Product'}
                  className="w-16 h-20 object-cover rounded border border-neutral-100 flex-shrink-0"
                  onError={(e) => { e.target.onerror = null; e.target.src = getPlaceholderSvg(item.productName || item.name || 'Product'); }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-neutral-900 truncate">{item.productName || item.name}</p>
                  {variantInfo && (
                    <p className="text-xs text-brand-grey mt-0.5">{variantInfo}</p>
                  )}
                  <p className="text-xs text-neutral-500 mt-1">
                    Qty: {item.quantity} × {formatOrderAmount(item.unitPrice || item.price, currency)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <span className="text-sm font-bold text-brand-gold">
                    {formatOrderAmount(item.totalPrice || (item.quantity * (item.unitPrice || item.price)), currency)}
                  </span>
                  {order.status === 'DELIVERED' && (
                    <button
                      onClick={() => handleOpenReviewModal(item)}
                      className="px-3 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer mt-1"
                    >
                      <Star size={12} /> Write Review
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Financial summary */}
        <div className="mt-6 pt-5 border-t border-neutral-100 space-y-2 text-sm text-neutral-600">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatOrderAmount(subtotal, currency)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount (Coupon / Loyalty)</span>
              <span>-{formatOrderAmount(discountAmount, currency)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Shipping Fee</span>
            <span>{shippingAmount === 0 ? 'FREE' : formatOrderAmount(shippingAmount, currency)}</span>
          </div>
          {taxAmount > 0 && (
            <div className="flex justify-between">
              <span>GST ({order?.taxRate ? `${Number(order.taxRate)}% Included` : 'Included'})</span>
              <span>{formatOrderAmount(taxAmount, currency)}</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-4 border-t border-neutral-200 text-neutral-900 font-bold text-base">
            <span>Total Value</span>
            <span className="text-brand-gold">{formatOrderAmount(totalAmount, currency)}</span>
          </div>
        </div>
      </div>

      {/* Customer Action Bar */}
      <div className="bg-white shadow-sm p-5 border border-neutral-100 rounded-lg flex justify-between items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-neutral-500 text-xs">
          <Phone size={14} className="text-brand-gold" />
          <span>Need help with this order? Contact our luxury concierge team.</span>
        </div>
        <div className="flex gap-3">
          {canCancel && (
            <button
              onClick={handleCancelOrder}
              disabled={isCancelling}
              className="px-4 py-2 border border-red-200 text-red-600 text-xs font-semibold rounded hover:bg-red-50 transition-colors disabled:opacity-50"
              id="btn-cancel-order"
            >
              {isCancelling ? 'Cancelling...' : 'Cancel Order'}
            </button>
          )}
          <a
            href="https://wa.me/919876500000"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-1.5 px-4 py-2 border border-neutral-300 text-neutral-700 text-xs font-semibold rounded-lg bg-white shadow-sm hover:border-brand-gold hover:text-brand-gold hover:bg-amber-50/50 hover:shadow active:scale-95 transition-all duration-200"
            id="btn-order-support"
          >
            <MessageSquare size={14} className="text-neutral-500 group-hover:text-brand-gold transition-colors" />
            <span>Support Chat</span>
          </a>
        </div>
      </div>

      {/* Review Modal Form */}
      {reviewModalOpen && targetItem && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setReviewModalOpen(false)}>
          <div
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
              Review {targetItem.productName || targetItem.name}
            </h3>
            <p className="text-xs text-neutral-500 mb-5">
              Share your feedback for your delivered purchase (Order {order.orderNumber})
            </p>

            <form onSubmit={handleReviewSubmit} className="space-y-4">
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
                  placeholder="e.g. Absolutely loved it!"
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
                  placeholder="Describe what you liked or disliked about the product..."
                  className="w-full px-3 py-2 border border-neutral-200 rounded text-sm focus:border-brand-gold focus:outline-none resize-none"
                  required
                />
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
                  disabled={isSubmittingReview}
                  className="btn-primary text-xs py-2 px-5 disabled:opacity-50"
                >
                  {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default OrderDetailPage;