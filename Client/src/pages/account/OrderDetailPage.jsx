import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, Circle, MapPin, Truck, CreditCard, FileText, Phone, MessageSquare, RefreshCw, XCircle, Star, X } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchOrderById, cancelCustomerOrder } from '../../redux/slices/ordersSlice';
import { createReview } from '../../redux/slices/reviewsSlice';
import { formatPrice } from '../../utils/currency';
import { printInvoice } from '../../utils/invoiceGenerator';
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
  PAID: 'Payment Received',
  PENDING: 'Order Placed',
  CONFIRMED: 'Confirmed',
  PROCESSING: 'Processing',
  SHIPPED: 'Shipped',
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
      { key: 'SHIPPED', label: 'Shipped' },
      { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
      { key: 'DELIVERED', label: 'Delivered' },
    ];

    if (order.status === 'CANCELLED') {
      return [
        { label: 'Order Placed', date: order.createdAt, done: true },
        { label: 'Cancelled', date: order.updatedAt || order.createdAt, done: true },
      ];
    }

    const orderSequence = ['PENDING_PAYMENT', 'PAID', 'PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'];
    const currentIndex = orderSequence.indexOf(order.status);
    const baseDate = new Date(order.createdAt);

    return steps.map((step, idx) => {
      const stepIndex = orderSequence.indexOf(step.key);
      const done = stepIndex <= currentIndex || order.status === 'DELIVERED';

      let date = null;
      if (done) {
        if (step.key === 'PENDING') {
          date = order.createdAt;
        } else if (step.key === order.status) {
          date = order.updatedAt || order.createdAt;
        } else if (step.key === 'DELIVERED' && order.deliveredAt) {
          date = order.deliveredAt;
        }
      }

      return { label: step.label, date, done };
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
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        if (typeof parsed === 'object' && parsed !== null) return parsed;
      } catch {
        return null;
      }
    }
    if (typeof val === 'object') return val;
    return null;
  };

  const renderAddress = (rawAddr) => {
    const addr = parseAddressObj(rawAddr);
    if (!addr) return <p className="text-neutral-400 text-sm">No address details recorded</p>;
    if (addr.plainText) {
      return <p className="text-neutral-600 text-sm leading-relaxed">{addr.plainText}</p>;
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
      <div className="text-sm">
        {name && <p className="font-semibold text-neutral-900 mb-0.5">{name}</p>}
        <p className="text-neutral-600 leading-relaxed">
          {line1}{line2 ? `, ${line2}` : ''}{landmark ? ` (near ${landmark})` : ''}{city ? `, ${city}` : ''}{state ? `, ${state}` : ''} {pincode}
          {country ? `, ${country}` : ''}
        </p>
        {(phone || email) && (
          <p className="text-neutral-500 text-xs mt-2 pt-1 border-t border-neutral-100">
            {phone && <span>Phone: {phone}</span>}
            {phone && email && <span> · </span>}
            {email && <span>Email: {email}</span>}
          </p>
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
      <div className="bg-white shadow-sm p-6 mb-5 border border-neutral-100 rounded-lg flex justify-between items-start flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1.5 flex-wrap">
            <h1 className="font-playfair text-xl font-bold text-neutral-900">Order #{order.orderNumber}</h1>
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
          className="btn-outline flex items-center gap-1.5 text-xs py-2 px-4 hover:bg-brand-light transition-colors"
          id="btn-download-invoice"
        >
          <FileText size={14} /> Download Invoice
        </button>
      </div>

      {/* Tracking timeline */}
      <div className="bg-white shadow-sm p-6 mb-5 border border-neutral-100 rounded-lg">
        <h2 className="font-semibold text-sm mb-5 text-neutral-950">Order Tracking</h2>
        <div className="flex items-start overflow-x-auto pb-2 scrollbar-hide">
          {trackingSteps.map((step, i) => (
            <div key={step.label} className="flex-1 min-w-[80px] flex flex-col items-center text-center relative">
              {i !== 0 && (
                <div className={`absolute top-3 right-1/2 w-full h-0.5 -z-0 ${trackingSteps[i - 1]?.done ? 'bg-brand-gold' : 'bg-neutral-200'}`} />
              )}
              <div className={`w-6 h-6 rounded-full flex items-center justify-center z-10 ${step.done ? 'bg-brand-gold text-white' : 'bg-neutral-100 text-neutral-400'}`}>
                {step.done ? <Check size={13} /> : <Circle size={8} />}
              </div>
              <p className={`text-xs mt-2 font-medium ${step.done ? 'text-neutral-900' : 'text-neutral-400'}`}>{step.label}</p>
              {step.date && (
                <p className="text-[10px] text-neutral-500 mt-0.5">
                  {new Date(step.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Shipping Address & Payment Card Grid */}
      <div className="grid md:grid-cols-2 gap-5 mb-5">
        {/* Shipping Address */}
        <div className="bg-white shadow-sm p-6 border border-neutral-100 rounded-lg flex gap-3">
          <MapPin size={18} className="text-brand-gold flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h2 className="text-sm font-semibold mb-3 text-neutral-900">Shipping Address</h2>
            {renderAddress(order.shippingAddress)}
          </div>
        </div>

        {/* Payment & Billing Details */}
        <div className="bg-white shadow-sm p-6 border border-neutral-100 rounded-lg flex gap-3">
          <CreditCard size={18} className="text-brand-gold flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h2 className="text-sm font-semibold mb-3 text-neutral-900">Payment & Billing</h2>

            <div className="mb-4 bg-neutral-50 p-3 rounded border border-neutral-100">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-neutral-500">Method</span>
                <span className="text-xs font-semibold text-neutral-800">{order.paymentMethod || 'Online Payment'}</span>
              </div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-neutral-500">Payment Status</span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${order.paymentStatus === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                  {order.paymentStatus || 'UNPAID'}
                </span>
              </div>
              {order.razorpay_payment_id && (
                <div className="mt-2 pt-2 border-t border-neutral-200/60">
                  <span className="text-[10px] text-neutral-400 block uppercase tracking-wider font-semibold">Razorpay Transaction ID</span>
                  <span className="text-xs font-mono font-medium text-brand-gold select-all">{order.razorpay_payment_id}</span>
                </div>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold text-neutral-500 mb-1">Billing Address</p>
              {renderAddress(order.billingAddress || order.shippingAddress)}
            </div>
          </div>
        </div>
      </div>

      {/* Item details */}
      <div className="bg-white shadow-sm p-6 mb-5 border border-neutral-100 rounded-lg">
        <h2 className="font-semibold text-sm mb-4 text-neutral-900">Ordered Items ({order.items?.length || 0})</h2>
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
                  src={item.productImage || item.image || '/placeholder.jpg'}
                  alt={item.productName || item.name || 'Product'}
                  className="w-16 h-20 object-cover rounded border border-neutral-100 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-neutral-900 truncate">{item.productName || item.name}</p>
                  {variantInfo && (
                    <p className="text-xs text-brand-grey mt-0.5">{variantInfo}</p>
                  )}
                  <p className="text-xs text-neutral-500 mt-1">
                    Qty: {item.quantity} × {formatPrice(item.unitPrice || item.price, currency)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <span className="text-sm font-bold text-brand-gold">
                    {formatPrice(item.totalPrice || (item.quantity * (item.unitPrice || item.price)), currency)}
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
            <span>{formatPrice(subtotal, currency)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-green-600 font-medium">
              <span>Discount (Coupon / Loyalty)</span>
              <span>-{formatPrice(discountAmount, currency)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Shipping Fee</span>
            <span>{shippingAmount === 0 ? 'FREE' : formatPrice(shippingAmount, currency)}</span>
          </div>
          <div className="flex justify-between">
            <span>Estimated Taxes (GST)</span>
            <span>{formatPrice(taxAmount, currency)}</span>
          </div>
          <div className="flex justify-between items-center pt-4 border-t border-neutral-200 text-neutral-900 font-bold text-base">
            <span>Total Value</span>
            <span className="text-brand-gold">{formatPrice(totalAmount, currency)}</span>
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
            className="btn-outline flex items-center gap-1.5 text-xs py-2 px-4 hover:bg-neutral-900 hover:text-white rounded"
            id="btn-order-support"
          >
            <MessageSquare size={14} /> Support Chat
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
              Share your feedback for your delivered purchase (Order #{order.orderNumber})
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