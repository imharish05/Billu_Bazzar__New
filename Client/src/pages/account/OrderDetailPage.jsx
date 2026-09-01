import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, Circle, MapPin, Truck, CreditCard, FileText, Phone, MessageSquare, RefreshCw, XCircle, Star, X, AlertTriangle, RotateCcw, Video, Upload, ShieldAlert, ShieldCheck, Play, ExternalLink, Clock, CheckCircle, Trash2, Film } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchOrderById, cancelCustomerOrder } from '../../redux/slices/ordersSlice';
import { fetchProfile } from '../../redux/slices/authSlice';
import { createReview } from '../../redux/slices/reviewsSlice';
import { createReturnRequest } from '../../redux/slices/returnsSlice';
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

const RETURN_STATUS_CONFIG = {
  REQUESTED: {
    label: 'Under Review',
    color: 'bg-amber-50 text-amber-800 border-amber-200',
    icon: Clock,
    step: 1,
  },
  APPROVED: {
    label: 'Return Approved',
    color: 'bg-blue-50 text-blue-800 border-blue-200',
    icon: CheckCircle,
    step: 2,
  },
  PICKUP_SCHEDULED: {
    label: 'Pickup Scheduled',
    color: 'bg-purple-50 text-purple-800 border-purple-200',
    icon: Truck,
    step: 2,
  },
  PICKED_UP: {
    label: 'Item Picked Up',
    color: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    icon: Truck,
    step: 3,
  },
  RECEIVED_AT_WAREHOUSE: {
    label: 'Under Inspection',
    color: 'bg-teal-50 text-teal-800 border-teal-200',
    icon: RefreshCw,
    step: 3,
  },
  REFUNDED: {
    label: 'Refund Processed',
    color: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    icon: CheckCircle,
    step: 4,
  },
  REJECTED: {
    label: 'Request Rejected',
    color: 'bg-red-50 text-red-800 border-red-200',
    icon: XCircle,
    step: 0,
  },
};

const RETURN_REASON_LABELS = {
  DAMAGED_PRODUCT: 'Damaged / Broken Item',
  WRONG_ITEM_SENT: 'Wrong Product Sent',
  DEFECTIVE_OR_NOT_WORKING: 'Defective / Faulty Product',
  MISMATCH_WITH_DESCRIPTION: 'Mismatched with Description',
  MISSING_PARTS_ACCESSORIES: 'Missing Accessories / Parts',
  OTHER: 'Other Quality Issue',
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

  // Return item modal states
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [targetReturnItem, setTargetReturnItem] = useState(null);
  const [returnQty, setReturnQty] = useState(1);
  const [returnReason, setReturnReason] = useState('DAMAGED_PRODUCT');
  const [returnReasonDetails, setReturnReasonDetails] = useState('');
  const [returnVideoFile, setReturnVideoFile] = useState(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState(null);
  const [returnImageFiles, setReturnImageFiles] = useState([]);
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [bankUpi, setBankUpi] = useState('');
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);
  const [activeVideoModal, setActiveVideoModal] = useState(null);

  // Manage live video file preview URL with proper memory cleanup
  useEffect(() => {
    if (returnVideoFile) {
      const objUrl = URL.createObjectURL(returnVideoFile);
      setVideoPreviewUrl(objUrl);
      return () => {
        URL.revokeObjectURL(objUrl);
      };
    } else {
      setVideoPreviewUrl(null);
    }
  }, [returnVideoFile]);

  const orderReturnRequests = (() => {
    const list = [];
    if (order && Array.isArray(order.returnRequests) && order.returnRequests.length > 0) {
      list.push(...order.returnRequests);
    }
    if (order && Array.isArray(order.items)) {
      order.items.forEach(item => {
        if (Array.isArray(item.returnRequests)) {
          item.returnRequests.forEach(r => {
            if (!list.some(existing => (existing.id && existing.id === r.id) || (existing.returnNumber && existing.returnNumber === r.returnNumber))) {
              list.push(r);
            }
          });
        }
      });
    }
    return list;
  })();

  const handleOpenReviewModal = (item) => {
    setTargetItem(item);
    setReviewRating(5);
    setReviewTitle('');
    setReviewBody('');
    setReviewModalOpen(true);
  };

  const handleOpenReturnModal = (item) => {
    setTargetReturnItem(item);
    setReturnQty(1);
    setReturnReason('DAMAGED_PRODUCT');
    setReturnReasonDetails('');
    setReturnVideoFile(null);
    setReturnImageFiles([]);
    setBankAccountName('');
    setBankAccountNumber('');
    setBankIfsc('');
    setBankUpi('');
    setReturnModalOpen(true);
  };

  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    if (!targetReturnItem) return;

    if (!returnVideoFile) {
      toast.error('Compulsory parcel opening/unboxing video file is required.');
      return;
    }

    setIsSubmittingReturn(true);
    try {
      const formData = new FormData();
      formData.append('orderId', order.id);
      formData.append('orderItemId', targetReturnItem.id);
      formData.append('quantity', returnQty);
      formData.append('reason', returnReason);
      if (returnReasonDetails.trim()) {
        formData.append('reasonDetails', returnReasonDetails.trim());
      }
      formData.append('video', returnVideoFile);

      if (returnImageFiles && returnImageFiles.length > 0) {
        for (let i = 0; i < returnImageFiles.length; i++) {
          formData.append('images', returnImageFiles[i]);
        }
      }

      if (bankAccountName || bankAccountNumber || bankIfsc || bankUpi) {
        formData.append('bankDetails', JSON.stringify({
          accountHolderName: bankAccountName.trim(),
          accountNumber: bankAccountNumber.trim(),
          ifscCode: bankIfsc.trim(),
          upiId: bankUpi.trim(),
        }));
      }

      const res = await dispatch(createReturnRequest(formData));
      if (createReturnRequest.fulfilled.match(res)) {
        toast.success('Return request submitted successfully with compulsory unboxing video!');
        setReturnModalOpen(false);
        dispatch(fetchOrderById(id));
      } else {
        toast.error(res.payload || 'Failed to submit return request');
      }
    } catch (err) {
      toast.error('Failed to submit return request');
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewBody.trim() || !targetItem) return;
    const resolvedProductId = targetItem.productId || targetItem.product?.id || targetItem.Product?.id || targetItem.id;
    try {
      const res = await dispatch(createReview({
        productId: resolvedProductId,
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

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('Ordered by mistake');
  const [cancelReasonDetails, setCancelReasonDetails] = useState('');

  const handleOpenCancelModal = () => {
    setCancelReason('Ordered by mistake');
    setCancelReasonDetails('');
    setCancelModalOpen(true);
  };
  const handleCancelOrder = handleOpenCancelModal;

  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    const finalReason = cancelReason === 'Other'
      ? (cancelReasonDetails.trim() || 'Other reason')
      : (cancelReasonDetails.trim() ? `${cancelReason} - ${cancelReasonDetails.trim()}` : cancelReason);

    if (!finalReason || finalReason.trim().length < 3) {
      toast.error('Please select or specify a valid reason for cancellation.');
      return;
    }

    setIsCancelling(true);
    try {
      const result = await dispatch(cancelCustomerOrder({ id, reason: finalReason }));
      if (cancelCustomerOrder.fulfilled.match(result)) {
        toast.success('Your order has been cancelled successfully.');
        setCancelModalOpen(false);
        dispatch(fetchOrderById(id));
        dispatch(fetchProfile());
      } else {
        toast.error(result.payload || 'Failed to cancel order.');
      }
    } catch (err) {
      toast.error('An unexpected error occurred while cancelling order.');
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
  const totalDiscount = parseFloat(order.discountAmount || 0);
  const explicitCouponDisc = parseFloat(order.couponDiscount || 0);
  const explicitLoyaltyDisc = parseFloat(order.loyaltyDiscount || 0);

  let resolvedCouponDiscount = explicitCouponDisc;
  let resolvedLoyaltyDiscount = explicitLoyaltyDisc;

  if (resolvedCouponDiscount === 0 && resolvedLoyaltyDiscount === 0 && totalDiscount > 0) {
    if (order.couponId || order.coupon) {
      resolvedCouponDiscount = totalDiscount;
    } else {
      resolvedLoyaltyDiscount = totalDiscount;
    }
  }

  const explicitGw = parseFloat(order.giftWrapFee || order.giftWrapPrice || 0);
  const calculatedGwDiff = Math.round(parseFloat(order.totalAmount || 0) - (subtotal + shippingAmount - totalDiscount));
  const giftWrapFee = explicitGw > 0 ? explicitGw : (calculatedGwDiff > 0 ? calculatedGwDiff : 0);
  const totalAmount = parseFloat(order.totalAmount || (subtotal + shippingAmount + giftWrapFee - totalDiscount));

  // 24-hour cancellation window calculation
  const orderPlacedTime = new Date(order.createdAt).getTime();
  const hoursSincePlaced = (Date.now() - orderPlacedTime) / (1000 * 60 * 60);
  const isWithin24Hours = hoursSincePlaced <= 24;
  const canCancel = ['PENDING', 'PENDING_PAYMENT', 'PAID', 'CONFIRMED'].includes(order.status) && isWithin24Hours;
  const hoursLeft = Math.max(0, Math.floor(24 - hoursSincePlaced));
  const minsLeft = Math.max(0, Math.floor(((24 - hoursSincePlaced) % 1) * 60));

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <Link to="/account/orders" className="inline-flex items-center gap-1.5 text-sm text-brand-grey hover:text-brand-gold mb-5 transition-colors" id="back-to-orders">
        <ArrowLeft size={15} /> Back to Orders
      </Link>

      {/* Main Order Metadata Header */}
      <div className="bg-white shadow-sm p-4 sm:p-6 mb-5 border border-neutral-100 rounded-lg">
        <div className="flex justify-between items-start flex-wrap gap-4">
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

          <div className="flex items-center gap-2.5 flex-wrap">
            {canCancel && (
              <button
                onClick={handleOpenCancelModal}
                disabled={isCancelling}
                className="group inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold uppercase tracking-wider text-red-600 bg-red-50/70 border border-red-200 rounded-lg hover:bg-red-600 hover:text-white hover:border-red-600 transition-all duration-200 shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50"
                id="btn-cancel-order"
                title={`Cancel order (Window closes in ${hoursLeft}h ${minsLeft}m)`}
              >
                {isCancelling ? (
                  <RefreshCw size={13} className="animate-spin text-red-600 group-hover:text-white" />
                ) : (
                  <XCircle size={14} />
                )}
                <span>{isCancelling ? 'Cancelling…' : 'Cancel Order'}</span>
              </button>
            )}

            <button 
              onClick={handleDownloadInvoice}
              className="group inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold uppercase tracking-wider text-neutral-700 bg-white border border-neutral-300 rounded-lg shadow-sm hover:border-brand-gold hover:text-brand-gold hover:bg-amber-50/50 hover:shadow active:scale-95 transition-all duration-200 cursor-pointer"
              id="btn-download-invoice"
            >
              <FileText size={14} className="text-neutral-500 group-hover:text-brand-gold transition-colors" />
              <span>Download Invoice</span>
            </button>
          </div>
        </div>

        {canCancel && (
          <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs text-amber-900 bg-amber-50/60 p-2.5 rounded-md border border-amber-200/50">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-600 shrink-0" />
              <span>
                <strong>24-Hour Cancellation Window:</strong> You can cancel this order within 24 hours of placement ({hoursLeft}h {minsLeft}m remaining).
              </span>
            </div>
          </div>
        )}
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
                  <span className="text-[11px] text-neutral-400 block uppercase tracking-wider font-semibold">Payment Transaction ID</span>
                  <span className="text-sm font-mono font-medium text-brand-gold select-all">{order.razorpay_payment_id}</span>
                </div>
              )}
              {order.statusTimeline?.refundGatewayRef && (
                <div className="mt-2 pt-2 border-t border-neutral-200/60">
                  <span className="text-[11px] text-emerald-700 block uppercase tracking-wider font-bold">Refund Reference ID</span>
                  <span className="text-sm font-mono font-bold text-emerald-800 select-all">{order.statusTimeline.refundGatewayRef}</span>
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

            const itemReturn = orderReturnRequests.find(
              (r) => String(r.orderItemId) === String(item.id) || (item.returnRequests && item.returnRequests.some((ir) => String(ir.id) === String(r.id)))
            );
            const hasActiveReturn = Boolean(itemReturn || (item.returnStatus && item.returnStatus !== 'NONE'));
            const isItemReturned = Boolean(
              itemReturn ||
              (item.returnStatus && item.returnStatus !== 'NONE') ||
              order.status === 'RETURNED' ||
              order.paymentStatus === 'REFUNDED'
            );

            return (
              <div key={item.id || idx} className="flex items-center gap-4 py-3 border-b border-neutral-100 last:border-0 flex-wrap sm:flex-nowrap">
                <img
                  src={getImageUrl(item.displayImage || item.variantImage || item.variant?.image || item.image || item.productImage || item.product?.defaultProductImage) || getPlaceholderSvg(item.productName || item.name || 'Product')}
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
                    <div className="flex items-center gap-2 flex-wrap justify-end mt-1">
                      {hasActiveReturn ? (
                        <Link
                          to={`/account/returns/${itemReturn?.id || itemReturn?.returnNumber || item.id}`}
                          className="px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-xs"
                        >
                          <RotateCcw size={12} className="text-brand-gold" />
                          <span>Track Return</span>
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenReturnModal(item)}
                          className="px-3 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-200 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw size={12} /> Return Item
                        </button>
                      )}
                      {!isItemReturned && (
                        <button
                          type="button"
                          onClick={() => handleOpenReviewModal(item)}
                          className="px-3 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Star size={12} /> Write Review
                        </button>
                      )}
                    </div>
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
          {resolvedCouponDiscount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Coupon Discount{order.coupon?.code ? ` (${order.coupon.code})` : ''}</span>
              <span>-{formatOrderAmount(resolvedCouponDiscount, currency)}</span>
            </div>
          )}
          {resolvedLoyaltyDiscount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Loyalty Points Redeemed{order.redeemedPoints ? ` (${order.redeemedPoints} pts)` : ''}</span>
              <span>-{formatOrderAmount(resolvedLoyaltyDiscount, currency)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Shipping Fee</span>
            <span>{shippingAmount === 0 ? 'FREE' : formatOrderAmount(shippingAmount, currency)}</span>
          </div>
          {giftWrapFee > 0 && (
            <div className="flex justify-between">
              <span>Gift Wrap Packaging</span>
              <span>{formatOrderAmount(giftWrapFee, currency)}</span>
            </div>
          )}
          <div className="pt-4 border-t border-neutral-200">
            <div className="flex justify-between items-center text-neutral-900 font-bold text-base">
              <span>Total Value</span>
              <span className="text-brand-gold">{formatOrderAmount(totalAmount, currency)}</span>
            </div>
            <p className="text-[11px] font-medium text-neutral-500 text-right mt-0.5">(Includes GST)</p>
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
              onClick={handleOpenCancelModal}
              disabled={isCancelling}
              className="px-4 py-2 border border-red-200 text-red-600 text-xs font-semibold rounded hover:bg-red-50 transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
              id="btn-cancel-order-bottom"
            >
              <XCircle size={14} />
              <span>{isCancelling ? 'Cancelling...' : 'Cancel Order'}</span>
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

      {/* Return Item Request Modal Form */}
      {returnModalOpen && targetReturnItem && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={() => setReturnModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl relative my-auto max-h-[92vh] overflow-y-auto border border-neutral-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Close Button */}
            <button
              onClick={() => setReturnModalOpen(false)}
              className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors rounded-full"
              aria-label="Close return modal"
            >
              <X size={18} />
            </button>

            {/* Modal Header */}
            <div className="flex items-start gap-2.5 sm:gap-3 mb-3 pr-8">
              <div className="p-2 sm:p-2.5 bg-amber-50 text-brand-gold rounded-xl shrink-0">
                <RotateCcw size={20} />
              </div>
              <div className="min-w-0">
                <h3 className="font-playfair text-lg sm:text-xl font-bold text-neutral-900 leading-tight">
                  Request Item Return
                </h3>
                <p className="text-[11px] sm:text-xs text-neutral-500 mt-0.5 truncate">
                  Order #{order.orderNumber || order.id} · Individual Item Return
                </p>
              </div>
            </div>

            {/* Target Item Snapshot */}
            <div className="my-3 p-2.5 sm:p-3 bg-neutral-50 rounded-xl border border-neutral-200/70 flex items-center gap-3">
              <img
                src={
                  getImageUrl(
                    targetReturnItem.displayImage ||
                      targetReturnItem.variantImage ||
                      targetReturnItem.variant?.image ||
                      targetReturnItem.image ||
                      targetReturnItem.productImage ||
                      targetReturnItem.product?.defaultProductImage
                  ) || getPlaceholderSvg(targetReturnItem.productName || targetReturnItem.name || 'Product')
                }
                alt={targetReturnItem.productName || targetReturnItem.name}
                className="w-12 h-14 object-cover rounded-lg border border-neutral-200 shrink-0 bg-white"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = getPlaceholderSvg(targetReturnItem.productName || targetReturnItem.name || 'Product');
                }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-neutral-900 truncate">
                  {targetReturnItem.productName || targetReturnItem.name}
                </p>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  Ordered Qty: <span className="font-semibold text-neutral-800">{targetReturnItem.quantity}</span> · Price: <span className="font-semibold text-neutral-800">{formatOrderAmount(targetReturnItem.unitPrice || targetReturnItem.price, currency)}</span>
                </p>
              </div>
            </div>

            <form onSubmit={handleReturnSubmit} className="space-y-3.5 text-left">
              {/* Return Quantity */}
              {targetReturnItem.quantity > 1 && (
                <div>
                  <label className="block text-[11px] sm:text-xs font-semibold text-neutral-700 mb-1 uppercase tracking-wider">
                    Quantity to Return *
                  </label>
                  <select
                    value={returnQty}
                    onChange={(e) => setReturnQty(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs sm:text-sm focus:border-brand-gold focus:outline-none bg-white"
                    required
                  >
                    {Array.from({ length: targetReturnItem.quantity }, (_, i) => i + 1).map((qty) => (
                      <option key={qty} value={qty}>
                        {qty} {qty === 1 ? 'item' : 'items'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Reason Dropdown */}
              <div>
                <label className="block text-[11px] sm:text-xs font-semibold text-neutral-700 mb-1 uppercase tracking-wider">
                  Reason for Return *
                </label>
                <select
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs sm:text-sm focus:border-brand-gold focus:outline-none bg-white"
                  required
                >
                  <option value="DAMAGED_PRODUCT">Damaged / Broken item upon delivery</option>
                  <option value="WRONG_ITEM_SENT">Wrong product / variant delivered</option>
                  <option value="DEFECTIVE_OR_NOT_WORKING">Defective or malfunctioning product</option>
                  <option value="MISMATCH_WITH_DESCRIPTION">Product mismatched website description</option>
                  <option value="MISSING_PARTS_ACCESSORIES">Missing parts / accessories</option>
                  <option value="OTHER">Other quality issue</option>
                </select>
              </div>

              {/* Reason Details */}
              <div>
                <label className="block text-[11px] sm:text-xs font-semibold text-neutral-700 mb-1 uppercase tracking-wider">
                  Description of Issue (Optional)
                </label>
                <textarea
                  rows={2}
                  value={returnReasonDetails}
                  onChange={(e) => setReturnReasonDetails(e.target.value)}
                  placeholder="Please describe the issue in detail..."
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs sm:text-sm focus:border-brand-gold focus:outline-none resize-none bg-white"
                />
              </div>

              {/* COMPULSORY UNBOXING VIDEO SECTION (Fully Responsive) */}
              <div className="p-3.5 sm:p-4 bg-amber-500/10 border-2 border-brand-gold/40 rounded-xl sm:rounded-2xl space-y-3">
                <div className="flex items-start gap-2.5 sm:gap-3">
                  <div className="p-1.5 bg-brand-gold/20 text-brand-gold rounded-lg shrink-0 mt-0.5">
                    <ShieldAlert size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-neutral-900 font-playfair tracking-wide leading-snug">
                      Unboxing Video Proof <span className="text-red-500 font-bold">*</span>
                    </h4>
                    <p className="text-[11px] text-neutral-600 mt-1 leading-relaxed">
                      As per our return policy, a continuous parcel opening video from seal breaking to product inspection is strictly required.
                    </p>
                  </div>
                </div>

                {/* Video Upload Dropzone or Live Video Preview */}
                {!returnVideoFile ? (
                  <div>
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-neutral-300 hover:border-brand-gold bg-white p-4 sm:p-5 rounded-xl cursor-pointer transition-all text-center group shadow-2xs hover:shadow-xs">
                      <div className="w-10 h-10 rounded-full bg-amber-50 group-hover:bg-amber-100 flex items-center justify-center text-brand-gold mb-2 transition-colors">
                        <Upload size={18} />
                      </div>
                      <span className="text-xs font-semibold text-neutral-800">
                        Click to select unboxing video file
                      </span>
                      <span className="text-[10px] text-neutral-400 mt-0.5 font-medium">
                        MP4, WEBM, MOV up to 50MB
                      </span>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 50 * 1024 * 1024) {
                              toast.error('Video file size exceeds 50MB limit. Please upload a smaller video.');
                              return;
                            }
                            setReturnVideoFile(file);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-neutral-200 p-3 sm:p-3.5 space-y-2.5 shadow-2xs">
                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-neutral-100">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded bg-amber-50 text-brand-gold flex items-center justify-center shrink-0">
                          <Film size={15} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-neutral-900 truncate max-w-[140px] sm:max-w-[260px]">
                            {returnVideoFile.name}
                          </p>
                          <p className="text-[10px] text-neutral-500 font-mono">
                            {(returnVideoFile.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReturnVideoFile(null)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0"
                        title="Remove video file"
                      >
                        <Trash2 size={12} /> Remove
                      </button>
                    </div>

                    {/* Video Player Preview */}
                    {videoPreviewUrl && (
                      <div className="relative rounded-lg overflow-hidden bg-black aspect-video max-h-52 sm:max-h-60 flex items-center justify-center shadow-inner">
                        <video
                          src={videoPreviewUrl}
                          controls
                          playsInline
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bank Details for COD Refunds */}
              {(order.paymentMethod?.toLowerCase().includes('cod') ||
                order.paymentMethod?.toLowerCase().includes('cash')) && (
                <div className="p-3 sm:p-3.5 bg-neutral-50 rounded-xl border border-neutral-200/80 space-y-2">
                  <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                    Bank / UPI Details for Refund
                  </h4>
                  <p className="text-[11px] text-neutral-500">
                    Because this order was paid via Cash on Delivery, please provide your bank or UPI details for refund transfer.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Account Holder Name"
                      value={bankAccountName}
                      onChange={(e) => setBankAccountName(e.target.value)}
                      className="px-3 py-2 border border-neutral-200 rounded-lg text-xs focus:border-brand-gold focus:outline-none bg-white"
                    />
                    <input
                      type="text"
                      placeholder="Account Number"
                      value={bankAccountNumber}
                      onChange={(e) => setBankAccountNumber(e.target.value)}
                      className="px-3 py-2 border border-neutral-200 rounded-lg text-xs focus:border-brand-gold focus:outline-none bg-white"
                    />
                    <input
                      type="text"
                      placeholder="Bank IFSC Code"
                      value={bankIfsc}
                      onChange={(e) => setBankIfsc(e.target.value)}
                      className="px-3 py-2 border border-neutral-200 rounded-lg text-xs focus:border-brand-gold focus:outline-none bg-white"
                    />
                    <input
                      type="text"
                      placeholder="UPI ID (e.g. name@upi)"
                      value={bankUpi}
                      onChange={(e) => setBankUpi(e.target.value)}
                      className="px-3 py-2 border border-neutral-200 rounded-lg text-xs focus:border-brand-gold focus:outline-none bg-white"
                    />
                  </div>
                </div>
              )}

              {/* Modal Action Buttons */}
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setReturnModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2.5 sm:py-2 border border-neutral-200 text-neutral-600 text-xs font-semibold rounded-lg hover:bg-neutral-50 text-center transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReturn}
                  className="w-full sm:w-auto btn-primary text-xs py-2.5 sm:py-2 px-6 disabled:opacity-50 inline-flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <RotateCcw size={14} />
                  {isSubmittingReturn ? 'Submitting Return...' : 'Submit Return Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                  Cancel Order {order.orderNumber}
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Please review the cancellation terms and select your reason.
                </p>
              </div>
            </div>

            {/* Policy Highlights Box
            <div className="bg-amber-50/80 border border-amber-200/80 rounded-lg p-3 text-xs text-amber-950 space-y-1.5 mb-4">
              <p className="font-semibold text-amber-900 flex items-center gap-1.5">
                <span>📋 Cancellation & Refund Policies:</span>
              </p>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-amber-900/90 leading-relaxed">
                <li>
                  <strong>Same-Day / 24-Hour Free Cancellation:</strong> Orders can only be cancelled within 24 hours of placement (free of charge).
                </li>
                <li>
                  <strong>Packed / Dispatched Orders:</strong> Once the order is packed or dispatched, cancellation is strictly not permitted.
                </li>
                <li>
                  <strong>Refund Process:</strong> If you paid online, 100% full refund will be initiated to your original payment method automatically within <strong>5–7 business days</strong>.
                </li>
                <li>
                  <strong>Promotional/Sale Items:</strong> Orders placed during special sales may have restricted cancellation windows.
                </li>
              </ul>
            </div> */}

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

    </motion.div>
  );
};

export default OrderDetailPage;