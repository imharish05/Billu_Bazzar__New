import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import {
  ArrowLeft,
  RotateCcw,
  Check,
  Circle,
  Truck,
  Video,
  Play,
  FileText,
  ExternalLink,
  RefreshCw,
  XCircle,
  ShieldCheck,
  X,
  Phone,
  MessageSquare,
  Package,
  Calendar,
} from 'lucide-react';
import { fetchReturnById, clearCurrentReturn } from '../../redux/slices/returnsSlice';
import { formatOrderAmount } from '../../utils/currency';
import { getImageUrl } from '../../utils/imageUrl';
import { getPlaceholderSvg } from '../../utils/placeholder';

const STATUS_COLORS = {
  REQUESTED: 'bg-amber-50 text-amber-800 border border-amber-200',
  APPROVED: 'bg-blue-50 text-blue-800 border border-blue-200',
  PICKUP_SCHEDULED: 'bg-purple-50 text-purple-800 border border-purple-200',
  PICKED_UP: 'bg-indigo-50 text-indigo-800 border border-indigo-200',
  RECEIVED_AT_WAREHOUSE: 'bg-teal-50 text-teal-800 border border-teal-200',
  REFUNDED: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
  REJECTED: 'bg-red-50 text-red-800 border border-red-200',
};

const STATUS_LABELS = {
  REQUESTED: 'Under Review',
  APPROVED: 'Return Approved',
  PICKUP_SCHEDULED: 'Pickup Scheduled',
  PICKED_UP: 'Item Picked Up',
  RECEIVED_AT_WAREHOUSE: 'Under Inspection',
  REFUNDED: 'Refund Processed',
  REJECTED: 'Request Rejected',
};

const REASON_LABELS = {
  DAMAGED_PRODUCT: 'Damaged / Broken Item',
  WRONG_ITEM_SENT: 'Wrong Product Sent',
  DEFECTIVE_OR_NOT_WORKING: 'Defective / Faulty Product',
  MISMATCH_WITH_DESCRIPTION: 'Mismatched with Description',
  MISSING_PARTS_ACCESSORIES: 'Missing Accessories / Parts',
  OTHER: 'Other Quality Issue',
};

const ReturnDetailPage = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { current: returnItem, loading, error } = useSelector((s) => s.returns);
  const currency = useSelector((s) => s.currency?.current || 'INR');
  const [activeVideoModal, setActiveVideoModal] = useState(null);

  useEffect(() => {
    if (id) {
      dispatch(fetchReturnById(id));
    }
    return () => {
      dispatch(clearCurrentReturn());
    };
  }, [id, dispatch]);

  if (loading && !returnItem) {
    return (
      <div className="bg-white shadow-sm p-12 text-center my-6 border border-neutral-100 rounded-lg">
        <RefreshCw size={28} className="animate-spin text-brand-gold mx-auto mb-3" />
        <p className="text-brand-grey text-sm">Loading return tracking details...</p>
      </div>
    );
  }

  if (error || !returnItem) {
    return (
      <div className="bg-white shadow-sm p-12 text-center my-6 border border-neutral-200 rounded-lg">
        <XCircle size={36} className="text-red-400 mx-auto mb-3" />
        <h2 className="font-playfair text-xl font-bold mb-2 text-neutral-900">Return Request Not Found</h2>
        <p className="text-brand-grey text-sm mb-6">{error || 'The requested return record could not be retrieved.'}</p>
        <Link to="/account/orders" className="btn-primary inline-flex items-center gap-2 text-xs py-2.5 px-5">
          <ArrowLeft size={14} /> Back to My Orders
        </Link>
      </div>
    );
  }

  const orderId = returnItem.order?.id || returnItem.orderId;
  const orderNumber = returnItem.order?.orderNumber || (orderId ? `Order #${orderId}` : '');
  const orderDateStr = returnItem.order?.createdAt
    ? new Date(returnItem.order.createdAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

  const requestDateStr = returnItem.createdAt
    ? new Date(returnItem.createdAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const isVideoLink =
    returnItem.unboxingVideoUrl &&
    (returnItem.unboxingVideoUrl.startsWith('http') ||
      returnItem.unboxingVideoUrl.includes('drive.google') ||
      returnItem.unboxingVideoUrl.includes('youtube') ||
      returnItem.unboxingVideoUrl.includes('youtu.be'));

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

  const variantObj = parseVariant(returnItem.selectedVariant);
  const EXCLUDE_KEYS = new Set(['id', 'sku', 'variantId', 'productId', 'stock', 'price', 'mrp']);
  const variantEntries = variantObj
    ? Object.entries(variantObj).filter(([k, v]) => !EXCLUDE_KEYS.has(k) && v !== undefined && v !== null && v !== '')
    : [];
  const variantInfo = variantEntries.length > 0
    ? variantEntries.map(([k, v]) => `${k}: ${v}`).join(' · ')
    : null;

  const itemImage =
    getImageUrl(returnItem.productImage || returnItem.orderItem?.productImage) ||
    getPlaceholderSvg(returnItem.productName || 'Product');

  // Tracking stepper logic matching OrderDetailPage
  const returnSteps = [
    { key: 'REQUESTED', label: '1. Requested', desc: 'Under Review' },
    { key: 'APPROVED', label: '2. Approved', desc: 'Pickup Arranged' },
    { key: 'PICKED_UP', label: '3. Picked Up', desc: 'Warehouse Transit' },
    { key: 'REFUNDED', label: '4. Refunded', desc: 'Amount Credited' },
  ];

  const stepOrder = ['REQUESTED', 'APPROVED', 'PICKUP_SCHEDULED', 'PICKED_UP', 'RECEIVED_AT_WAREHOUSE', 'REFUNDED'];
  const getStepIndex = (status) => {
    if (status === 'REQUESTED') return 0;
    if (status === 'APPROVED' || status === 'PICKUP_SCHEDULED') return 1;
    if (status === 'PICKED_UP' || status === 'RECEIVED_AT_WAREHOUSE') return 2;
    if (status === 'REFUNDED') return 3;
    return 0;
  };

  const currentStepIdx = returnItem.status === 'REJECTED' ? -1 : getStepIndex(returnItem.status);

  let timeline = returnItem.statusTimeline || {};
  if (typeof timeline === 'string') {
    try { timeline = JSON.parse(timeline); } catch (e) { timeline = {}; }
  }

  const renderEmbeddedVideo = (rawUrl) => {
    if (!rawUrl) return null;
    const url = String(rawUrl).trim();

    // 1. YouTube Match
    const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/i);
    if (ytMatch && ytMatch[1]) {
      return (
        <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black shadow-xs border border-neutral-200">
          <iframe
            src={`https://www.youtube.com/embed/${ytMatch[1]}`}
            title="Unboxing Video Proof"
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }

    // 2. Google Drive Match
    const driveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
    if (driveMatch && driveMatch[1]) {
      return (
        <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black shadow-xs border border-neutral-200">
          <iframe
            src={`https://drive.google.com/file/d/${driveMatch[1]}/preview`}
            title="Unboxing Video Proof"
            className="w-full h-full border-0"
            allow="autoplay; encrypted-media"
            allowFullScreen
          />
        </div>
      );
    }

    // 3. Direct Video File (MP4, WebM, local uploaded file, or other direct video stream)
    return (
      <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black shadow-xs border border-neutral-200 flex items-center justify-center">
        <video
          src={url}
          controls
          playsInline
          preload="metadata"
          className="w-full h-full object-contain"
        >
          Your browser does not support video playback.
        </video>
      </div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      {/* Top Back Navigation Link */}
      <Link
        to={orderId ? `/account/orders/${orderId}` : '/account/orders'}
        className="inline-flex items-center gap-1.5 text-sm text-brand-grey hover:text-brand-gold mb-5 transition-colors"
      >
        <ArrowLeft size={15} /> Back to {orderNumber ? `Order ${orderNumber}` : 'My Orders'}
      </Link>

      {/* 1. Main Return Metadata Header */}
      <div className="bg-white shadow-sm p-4 sm:p-6 mb-5 border border-neutral-100 rounded-lg flex justify-between items-start flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1.5 flex-wrap">
            <h1 className="font-playfair text-xl font-bold text-neutral-900">Return {returnItem.returnNumber}</h1>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${STATUS_COLORS[returnItem.status] || 'bg-gray-100'}`}>
              {STATUS_LABELS[returnItem.status] || returnItem.status}
            </span>
          </div>
          <p className="text-xs text-brand-grey">
            Requested on {requestDateStr}
            {orderNumber && (
              <>
                {' '}· Order{' '}
                <Link to={`/account/orders/${orderId}`} className="font-semibold text-neutral-800 hover:text-brand-gold hover:underline">
                  {orderNumber}
                </Link>
                {orderDateStr && ` (${orderDateStr})`}
              </>
            )}
          </p>
        </div>
        {orderId && (
          <Link
            to={`/account/orders/${orderId}`}
            className="group inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold uppercase tracking-wider text-neutral-700 bg-white border border-neutral-300 rounded-lg shadow-sm hover:border-brand-gold hover:text-brand-gold hover:bg-amber-50/50 hover:shadow active:scale-95 transition-all duration-200 cursor-pointer"
          >
            <Package size={14} className="text-neutral-500 group-hover:text-brand-gold transition-colors" />
            <span>View Full Order</span>
          </Link>
        )}
      </div>

      {/* Scheduled Courier Pickup Banner */}
      {returnItem.pickupDate && returnItem.status !== 'REJECTED' && (
        <div className="bg-purple-50/90 border border-purple-200/90 p-4 sm:p-5 mb-5 rounded-xl shadow-xs flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0 shadow-xs">
              <Truck size={22} />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-900 block flex items-center gap-1.5">
                <Calendar size={13} className="text-purple-600" /> Scheduled Doorstep Pickup Date
              </span>
              <p className="text-base sm:text-lg font-bold text-neutral-900 mt-0.5">
                {new Date(returnItem.pickupDate).toLocaleDateString('en-IN', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
              <p className="text-xs text-purple-700 mt-0.5">
                Our logistics partner will arrive on this date to collect the parcel. Please keep the item boxed with tags intact.
              </p>
            </div>
          </div>
          <span className="px-3.5 py-1.5 bg-white border border-purple-200 text-purple-900 rounded-lg text-xs font-bold shadow-xs">
            📦 Pickup Scheduled
          </span>
        </div>
      )}

      {/* 2. Tracking Stepper Card */}
      {returnItem.status === 'REJECTED' ? (
        <div className="bg-white shadow-sm p-4 sm:p-6 mb-5 border border-red-100 rounded-lg">
          <div className="flex items-center gap-2.5 mb-2">
            <XCircle size={18} className="text-red-500" />
            <h2 className="font-semibold text-sm text-red-900">Return Request Rejected</h2>
          </div>
          <p className="text-xs text-neutral-600 leading-relaxed">
            {returnItem.rejectedReason || 'This return claim did not meet the verification criteria.'}
          </p>
        </div>
      ) : (
        <div className="bg-white shadow-sm p-4 sm:p-6 mb-5 border border-neutral-100 rounded-lg">
          <div className="flex items-center justify-between gap-3 mb-5">
            <h2 className="font-semibold text-sm text-neutral-950 flex items-center gap-2">
              <RotateCcw size={16} className="text-brand-gold" /> Return Progress
            </h2>
            <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${STATUS_COLORS[returnItem.status] || 'bg-gray-100'}`}>
              {STATUS_LABELS[returnItem.status] || returnItem.status}
            </span>
          </div>

          {/* Desktop Stepper */}
          <div className="hidden md:flex items-start justify-between relative px-2">
            {returnSteps.map((step, i) => {
              const done = i <= currentStepIdx;
              const isCurrent = i === currentStepIdx;
              const stepDate = timeline[step.key] || (i === 0 ? returnItem.createdAt : (isCurrent ? returnItem.updatedAt : null));

              return (
                <div key={step.key} className="flex-1 flex flex-col items-center text-center relative min-w-0">
                  {/* Connecting Line */}
                  {i !== 0 && (
                    <div
                      className={`absolute top-3.5 right-1/2 w-full h-0.5 -z-0 transition-colors ${
                        done ? 'bg-brand-gold' : 'bg-neutral-200'
                      }`}
                    />
                  )}
                  {/* Step Node */}
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center z-10 transition-all ${
                      done
                        ? 'bg-brand-gold text-white shadow-xs'
                        : 'bg-neutral-100 text-neutral-400 border border-neutral-200'
                    } ${isCurrent ? 'ring-4 ring-amber-100' : ''}`}
                  >
                    {done ? (
                      <Check size={14} className="stroke-[2.5]" />
                    ) : (
                      <Circle size={7} className="fill-neutral-300" />
                    )}
                  </div>
                  {/* Label */}
                  <p
                    className={`text-xs mt-2.5 font-medium px-1 leading-snug break-words max-w-[110px] ${
                      done ? 'text-neutral-900 font-semibold' : 'text-neutral-400'
                    }`}
                  >
                    {step.label}
                  </p>
                  <p className="text-[10px] text-neutral-400 mt-0.5">
                    {step.desc}
                  </p>
                  {stepDate && (
                    <p className="text-[10px] text-neutral-500 mt-0.5">
                      {new Date(stepDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Mobile Stepper */}
          <div className="block md:hidden space-y-0 pl-1">
            {returnSteps.map((step, i) => {
              const isLast = i === returnSteps.length - 1;
              const done = i <= currentStepIdx;
              const isCurrent = i === currentStepIdx;
              const stepDate = timeline[step.key] || (i === 0 ? returnItem.createdAt : (isCurrent ? returnItem.updatedAt : null));

              return (
                <div key={step.key} className="flex items-start gap-3.5 relative">
                  {!isLast && (
                    <div
                      className={`absolute left-[13px] top-7 bottom-0 w-0.5 -translate-x-1/2 ${
                        i + 1 <= currentStepIdx ? 'bg-brand-gold' : 'bg-neutral-200'
                      }`}
                    />
                  )}
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 z-10 transition-all ${
                      done
                        ? 'bg-brand-gold text-white shadow-xs'
                        : 'bg-neutral-100 text-neutral-400 border border-neutral-200'
                    } ${isCurrent ? 'ring-4 ring-amber-100' : ''}`}
                  >
                    {done ? (
                      <Check size={14} className="stroke-[2.5]" />
                    ) : (
                      <Circle size={7} className="fill-neutral-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 pb-5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className={`text-xs sm:text-sm font-semibold ${done ? 'text-neutral-900' : 'text-neutral-400'}`}>
                        {step.label}
                      </p>
                      {isCurrent && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-amber-50 text-brand-gold border border-amber-200/60 rounded-full">
                          Current Status
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-500 mt-0.5">{step.desc}</p>
                    {stepDate && (
                      <p className="text-[10px] text-neutral-400 mt-0.5">
                        {new Date(stepDate).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Grid: Returned Item Details (Left) & Unboxing Video Proof (Right) */}
      <div className="grid md:grid-cols-2 gap-5 mb-5">
        {/* Returned Item Snapshot Card */}
        <div className="bg-white shadow-sm p-4 sm:p-6 border border-neutral-100 rounded-lg">
          <h2 className="font-sans text-sm font-semibold mb-4 text-neutral-900">Returned Item Details</h2>
          <div className="flex items-start gap-4">
            <img
              src={itemImage}
              alt={returnItem.productName || 'Product'}
              className="w-20 h-24 object-cover rounded border border-neutral-100 shrink-0 bg-neutral-50"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = getPlaceholderSvg(returnItem.productName || 'Product');
              }}
            />
            <div className="flex-1 min-w-0 space-y-1.5">
              <h3 className="font-semibold text-neutral-900 text-sm leading-snug">
                {returnItem.productName}
              </h3>
              {variantInfo && (
                <p className="text-xs text-brand-grey">{variantInfo}</p>
              )}
              <div className="flex items-center gap-3 text-xs pt-1">
                <span className="text-neutral-500">Return Quantity: <span className="font-semibold text-neutral-800">{returnItem.quantity}</span></span>
              </div>
              <div className="pt-2 border-t border-neutral-100 flex items-center justify-between">
                <span className="text-xs text-neutral-500">Refund Value</span>
                <span className="text-sm font-bold text-brand-gold">
                  {formatOrderAmount(returnItem.refundAmount, returnItem.currency || currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Reason Section */}
          <div className="mt-4 pt-4 border-t border-neutral-100 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-neutral-500">Reason for Return:</span>
              <span className="px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200/60 rounded text-[11px] font-semibold">
                {REASON_LABELS[returnItem.reason] || returnItem.reason}
              </span>
            </div>
            {returnItem.reasonDetails && (
              <p className="text-xs text-neutral-600 italic bg-neutral-50 p-2.5 rounded border border-neutral-100 leading-relaxed">
                "{returnItem.reasonDetails}"
              </p>
            )}
          </div>
        </div>

        {/* Unboxing Video Proof Box with Direct Video Player */}
        <div className="bg-white shadow-sm p-4 sm:p-6 border border-neutral-100 rounded-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <h2 className="font-sans text-sm font-semibold text-neutral-900 flex items-center gap-2">
                <ShieldCheck size={16} className="text-brand-gold" /> Verification Proof
              </h2>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                Verified Attached
              </span>
            </div>
            <p className="text-xs text-neutral-500 leading-relaxed mb-3">
              Compulsory parcel unboxing video verified for this claim.
            </p>

            {/* Direct Embedded Video Player */}
            {returnItem.unboxingVideoUrl ? (
              <div className="my-2">
                {renderEmbeddedVideo(returnItem.unboxingVideoUrl)}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-[11px] text-neutral-400 font-medium">Parcel Opening Proof</span>
                  {isVideoLink && (
                    <a
                      href={returnItem.unboxingVideoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-neutral-600 hover:text-brand-gold font-medium inline-flex items-center gap-1 transition-colors"
                    >
                      <ExternalLink size={12} /> Open Original Link
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 bg-neutral-50 rounded-lg text-center text-xs text-neutral-400">
                No video proof attached.
              </div>
            )}

            {/* Supplementary Photos if any */}
            {Array.isArray(returnItem.images) && returnItem.images.length > 0 && (
              <div className="mt-4 pt-3 border-t border-neutral-100">
                <p className="text-[11px] font-semibold text-neutral-600 uppercase tracking-wider mb-2">
                  Uploaded Photos ({returnItem.images.length})
                </p>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {returnItem.images.map((imgUrl, idx) => (
                    <a
                      key={idx}
                      href={imgUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 w-14 h-14 rounded border border-neutral-200 overflow-hidden hover:opacity-80 transition-opacity"
                    >
                      <img src={imgUrl} alt={`Proof ${idx + 1}`} className="w-full h-full object-cover" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Admin Update / Notes if present */}
      {returnItem.adminNotes && (
        <div className="bg-white shadow-sm p-4 sm:p-5 mb-5 border border-blue-100 rounded-lg">
          <span className="text-xs font-bold text-blue-900 uppercase tracking-wider block mb-1">
            Admin Update:
          </span>
          <p className="text-xs text-blue-800 leading-relaxed">{returnItem.adminNotes}</p>
        </div>
      )}

      {/* 5. Customer Concierge Support Bar */}
      <div className="bg-white shadow-sm p-5 border border-neutral-100 rounded-lg flex justify-between items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-neutral-500 text-xs">
          <Phone size={14} className="text-brand-gold" />
          <span>Need help with this return request? Contact our concierge team.</span>
        </div>
        <div className="flex gap-3">
          <Link
            to="/returns"
            className="group inline-flex items-center gap-1.5 px-4 py-2 border border-neutral-300 text-neutral-700 text-xs font-semibold rounded-lg bg-white shadow-sm hover:border-brand-gold hover:text-brand-gold hover:bg-amber-50/50 hover:shadow active:scale-95 transition-all duration-200"
          >
            <FileText size={14} className="text-neutral-500 group-hover:text-brand-gold transition-colors" />
            <span>Return Policy</span>
          </Link>
          <a
            href="https://wa.me/919876500000"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-1.5 px-4 py-2 border border-neutral-300 text-neutral-700 text-xs font-semibold rounded-lg bg-white shadow-sm hover:border-brand-gold hover:text-brand-gold hover:bg-amber-50/50 hover:shadow active:scale-95 transition-all duration-200"
          >
            <MessageSquare size={14} className="text-neutral-500 group-hover:text-brand-gold transition-colors" />
            <span>Support Chat</span>
          </a>
        </div>
      </div>

      {/* Video Modal Player */}
      <AnimatePresence>
        {activeVideoModal && (
          <div
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setActiveVideoModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-neutral-900 rounded-2xl overflow-hidden max-w-2xl w-full shadow-2xl relative border border-neutral-800"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-neutral-800 text-white">
                <div className="flex items-center gap-2">
                  <Video size={18} className="text-brand-gold" />
                  <span className="text-sm font-semibold">Unboxing Video Proof</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveVideoModal(null)}
                  className="p-1 text-neutral-400 hover:text-white rounded-full transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-4 bg-black flex items-center justify-center min-h-[300px]">
                <video
                  src={activeVideoModal}
                  controls
                  autoPlay
                  className="max-h-[70vh] w-full object-contain rounded-lg"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ReturnDetailPage;
