import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import {
  RotateCcw,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  Video,
  Play,
  FileText,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  X,
} from 'lucide-react';
import { fetchMyReturns } from '../../redux/slices/returnsSlice';
import { formatPrice, formatOrderAmount } from '../../utils/currency';
import { getImageUrl } from '../../utils/imageUrl';
import { getPlaceholderSvg } from '../../utils/placeholder';

const STATUS_CONFIG = {
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

const REASON_LABELS = {
  DAMAGED_PRODUCT: 'Damaged / Broken Item',
  WRONG_ITEM_SENT: 'Wrong Product Sent',
  DEFECTIVE_OR_NOT_WORKING: 'Defective / Faulty Product',
  MISMATCH_WITH_DESCRIPTION: 'Mismatched with Description',
  MISSING_PARTS_ACCESSORIES: 'Missing Accessories / Parts',
  OTHER: 'Other Quality Issue',
};

const ReturnsRefundsPage = () => {
  const dispatch = useDispatch();
  const { items: returns = [], loading, error } = useSelector((s) => s.returns);
  const currency = useSelector((s) => s.currency?.current || 'INR');

  const [activeTab, setActiveTab] = useState('ALL');
  const [activeVideoModal, setActiveVideoModal] = useState(null);

  useEffect(() => {
    dispatch(fetchMyReturns());
  }, [dispatch]);

  const totalCount = returns.length;
  const inReviewCount = returns.filter((r) => r.status === 'REQUESTED').length;
  const inProgressCount = returns.filter((r) =>
    ['APPROVED', 'PICKUP_SCHEDULED', 'PICKED_UP', 'RECEIVED_AT_WAREHOUSE'].includes(r.status)
  ).length;
  const refundedCount = returns.filter((r) => r.status === 'REFUNDED').length;
  const totalRefundedAmount = returns
    .filter((r) => r.status === 'REFUNDED')
    .reduce((sum, r) => sum + (Number(r.refundAmount) || 0), 0);

  const filteredReturns = returns.filter((r) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'IN_REVIEW') return r.status === 'REQUESTED';
    if (activeTab === 'IN_PROGRESS')
      return ['APPROVED', 'PICKUP_SCHEDULED', 'PICKED_UP', 'RECEIVED_AT_WAREHOUSE'].includes(r.status);
    if (activeTab === 'REFUNDED') return r.status === 'REFUNDED';
    if (activeTab === 'REJECTED') return r.status === 'REJECTED';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-neutral-200/80 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-2 bg-amber-50 text-brand-gold rounded-lg">
                <RotateCcw size={20} />
              </span>
              <h1 className="font-playfair text-2xl font-bold text-neutral-900">
                Returns & Refunds
              </h1>
            </div>
            <p className="text-xs md:text-sm text-neutral-500">
              Track the status of your individual product return requests and refund timeline.
            </p>
          </div>
          <Link
            to="/returns"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-gold hover:underline"
          >
            <FileText size={14} /> Read Full Return Policy
          </Link>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-5 border-t border-neutral-100">
          <div className="bg-neutral-50/80 p-3.5 rounded-lg border border-neutral-100">
            <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block">
              Total Requests
            </span>
            <span className="text-xl font-bold text-neutral-900 mt-1 block">{totalCount}</span>
          </div>
          <div className="bg-amber-50/60 p-3.5 rounded-lg border border-amber-100">
            <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider block">
              Under Review
            </span>
            <span className="text-xl font-bold text-amber-800 mt-1 block">{inReviewCount}</span>
          </div>
          <div className="bg-blue-50/60 p-3.5 rounded-lg border border-blue-100">
            <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider block">
              Pickup / In Progress
            </span>
            <span className="text-xl font-bold text-blue-800 mt-1 block">{inProgressCount}</span>
          </div>
          <div className="bg-emerald-50/60 p-3.5 rounded-lg border border-emerald-100">
            <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">
              Total Refunded
            </span>
            <span className="text-xl font-bold text-emerald-800 mt-1 block">
              {formatOrderAmount(totalRefundedAmount, currency)}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs font-semibold">
        {[
          { id: 'ALL', label: `All (${totalCount})` },
          { id: 'IN_REVIEW', label: `In Review (${inReviewCount})` },
          { id: 'IN_PROGRESS', label: `Pickup / Active (${inProgressCount})` },
          { id: 'REFUNDED', label: `Refunded (${refundedCount})` },
          { id: 'REJECTED', label: `Rejected (${returns.filter((r) => r.status === 'REJECTED').length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-neutral-900 text-white shadow-xs font-bold'
                : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200/80'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content List */}
      {loading && returns.length === 0 ? (
        <div className="bg-white rounded-xl border border-neutral-200/80 p-12 text-center shadow-xs">
          <RefreshCw size={28} className="animate-spin text-brand-gold mx-auto mb-3" />
          <p className="text-neutral-500 text-sm">Loading your return records...</p>
        </div>
      ) : error ? (
        <div className="bg-white rounded-xl border border-red-200 p-8 text-center shadow-xs">
          <AlertCircle size={32} className="text-red-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-red-700">{error}</p>
          <button
            onClick={() => dispatch(fetchMyReturns())}
            className="mt-3 px-4 py-1.5 text-xs font-semibold bg-red-50 text-red-700 border border-red-200 rounded-md hover:bg-red-100"
          >
            Try Again
          </button>
        </div>
      ) : filteredReturns.length === 0 ? (
        <div className="bg-white rounded-xl border border-neutral-200/80 p-12 text-center shadow-xs">
          <div className="w-14 h-14 bg-amber-50 text-brand-gold rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-200/60">
            <RotateCcw size={26} />
          </div>
          <h2 className="font-playfair text-lg font-bold text-neutral-900 mb-1">
            No Return Requests Found
          </h2>
          <p className="text-neutral-500 text-xs md:text-sm max-w-md mx-auto mb-6 leading-relaxed">
            {activeTab === 'ALL'
              ? 'You have not submitted any return or refund requests. You can request returns for individual items from your Delivered Orders page within 24 hours of delivery.'
              : `There are no return requests matching the "${activeTab.toLowerCase().replace('_', ' ')}" filter.`}
          </p>
          <Link
            to="/account/orders"
            className="btn-primary inline-flex items-center gap-2 text-xs py-2.5 px-5 shadow-xs"
          >
            <Package size={14} /> View Delivered Orders
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReturns.map((item) => {
            const config = STATUS_CONFIG[item.status] || STATUS_CONFIG.REQUESTED;
            const StatusIcon = config.icon;
            const itemImage =
              getImageUrl(item.productImage || item.orderItem?.productImage) ||
              getPlaceholderSvg(item.productName || 'Product');

            const orderDateStr = item.order?.createdAt
              ? new Date(item.order.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : null;

            const requestDateStr = item.createdAt
              ? new Date(item.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '';

            const isVideoLink =
              item.unboxingVideoUrl &&
              (item.unboxingVideoUrl.startsWith('http') ||
                item.unboxingVideoUrl.includes('drive.google') ||
                item.unboxingVideoUrl.includes('youtube') ||
                item.unboxingVideoUrl.includes('youtu.be'));

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-neutral-200/80 rounded-xl overflow-hidden shadow-xs hover:border-brand-gold/40 transition-colors"
              >
                {/* Card Top Header */}
                <div className="bg-neutral-50/70 border-b border-neutral-100 p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-mono font-bold text-neutral-900 px-2 py-0.5 bg-white border border-neutral-200 rounded">
                      {item.returnNumber}
                    </span>
                    {item.order && (
                      <span className="text-neutral-500">
                        Order:{' '}
                        <Link
                          to={`/account/orders/${item.order.id}`}
                          className="font-semibold text-neutral-900 hover:text-brand-gold hover:underline"
                        >
                          #{item.order.orderNumber || item.order.id}
                        </Link>
                        {orderDateStr && ` (${orderDateStr})`}
                      </span>
                    )}
                    <span className="text-neutral-400">·</span>
                    <span className="text-neutral-500">Requested on: {requestDateStr}</span>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${config.color}`}
                  >
                    <StatusIcon size={13} />
                    {config.label}
                  </span>
                </div>

                {/* Card Body */}
                <div className="p-4 sm:p-5">
                  <div className="flex flex-col md:flex-row gap-5">
                    {/* Item Image & Basic Info */}
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <img
                        src={itemImage}
                        alt={item.productName}
                        className="w-20 h-24 object-cover rounded-lg border border-neutral-100 shrink-0 bg-neutral-50"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = getPlaceholderSvg(item.productName || 'Product');
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-neutral-900 text-sm leading-snug">
                          {item.productName}
                        </h3>
                        {item.selectedVariant &&
                          typeof item.selectedVariant === 'object' &&
                          Object.keys(item.selectedVariant).length > 0 && (
                            <p className="text-xs text-neutral-500 mt-1">
                              {Object.entries(item.selectedVariant)
                                .map(([k, v]) => `${k}: ${v}`)
                                .join(' · ')}
                            </p>
                          )}
                        <div className="flex items-center gap-3 mt-2 text-xs">
                          <span className="px-2 py-0.5 bg-neutral-100 text-neutral-700 rounded font-medium">
                            Return Qty: {item.quantity}
                          </span>
                          <span className="font-semibold text-neutral-900">
                            Refund Value:{' '}
                            <span className="text-brand-gold font-bold">
                              {formatOrderAmount(item.refundAmount, item.currency || currency)}
                            </span>
                          </span>
                        </div>

                        {/* Reason badge */}
                        <div className="mt-3 flex items-center gap-2 flex-wrap text-xs">
                          <span className="font-medium text-neutral-500">Reason:</span>
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200/60 rounded text-[11px] font-semibold">
                            {REASON_LABELS[item.reason] || item.reason}
                          </span>
                        </div>
                        {item.reasonDetails && (
                          <p className="text-xs text-neutral-600 mt-1 italic bg-neutral-50 p-2 rounded border border-neutral-100">
                            "{item.reasonDetails}"
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Unboxing Video Proof & Inspection Box */}
                    <div className="md:w-72 bg-neutral-50 p-4 rounded-xl border border-neutral-200/60 flex flex-col justify-between gap-3 shrink-0">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
                            <ShieldCheck size={14} className="text-brand-gold" />
                            Unboxing Video Proof
                          </span>
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                            Attached
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-500 leading-relaxed">
                          Compulsory continuous unboxing video verified for this claim.
                        </p>
                      </div>

                      {item.unboxingVideoUrl && (
                        <div>
                          {isVideoLink ? (
                            <a
                              href={item.unboxingVideoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-neutral-900 text-white rounded-lg text-xs font-semibold hover:bg-neutral-800 transition-colors shadow-xs"
                            >
                              <ExternalLink size={13} />
                              <span>Open Video Proof Link</span>
                            </a>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setActiveVideoModal(item.unboxingVideoUrl)}
                              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-neutral-900 text-white rounded-lg text-xs font-semibold hover:bg-neutral-800 transition-colors shadow-xs"
                            >
                              <Play size={13} className="fill-white" />
                              <span>Play Unboxing Video</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status Timeline Bar */}
                  {item.status !== 'REJECTED' && (
                    <div className="mt-5 pt-4 border-t border-neutral-100">
                      <div className="grid grid-cols-4 gap-2 text-center">
                        {[
                          { key: 'REQUESTED', label: '1. Requested', desc: 'Under Review' },
                          { key: 'APPROVED', label: '2. Approved', desc: 'Pickup Arranged' },
                          { key: 'PICKED_UP', label: '3. Picked Up', desc: 'Warehouse Transit' },
                          { key: 'REFUNDED', label: '4. Refunded', desc: 'Amount Credited' },
                        ].map((step, idx) => {
                          const currentStepNum = config.step;
                          const isDone = currentStepNum >= idx + 1;
                          const isCurrent = currentStepNum === idx + 1;

                          return (
                            <div key={step.key} className="space-y-1">
                              <div
                                className={`h-1.5 rounded-full transition-all ${
                                  isDone
                                    ? 'bg-brand-gold'
                                    : 'bg-neutral-200'
                                }`}
                              />
                              <p
                                className={`text-[11px] font-bold ${
                                  isCurrent
                                    ? 'text-brand-gold'
                                    : isDone
                                    ? 'text-neutral-800'
                                    : 'text-neutral-400'
                                }`}
                              >
                                {step.label}
                              </p>
                              <p className="text-[10px] text-neutral-400 hidden sm:block">
                                {step.desc}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Admin notes / Rejection notice if present */}
                  {item.adminNotes && (
                    <div className="mt-4 p-3 bg-blue-50/70 border border-blue-100 rounded-lg text-xs text-blue-900">
                      <span className="font-bold block mb-0.5">Admin Update:</span>
                      {item.adminNotes}
                    </div>
                  )}
                  {item.rejectedReason && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                      <span className="font-bold block mb-0.5">Rejection Reason:</span>
                      {item.rejectedReason}
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="bg-neutral-50/40 border-t border-neutral-100 px-5 py-3 flex items-center justify-between flex-wrap gap-2 text-xs">
                  <div className="text-neutral-500">
                    Need help?{' '}
                    <a
                      href="https://wa.me/919876500000"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-gold font-semibold hover:underline"
                    >
                      Contact Support
                    </a>
                  </div>
                  {item.order && (
                    <Link
                      to={`/account/orders/${item.order.id}`}
                      className="inline-flex items-center gap-1 font-semibold text-neutral-800 hover:text-brand-gold transition-colors"
                    >
                      <span>View Order</span>
                      <ChevronRight size={14} />
                    </Link>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

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
                  className="p-1 text-neutral-400 hover:text-white rounded-full transition-colors"
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
    </div>
  );
};

export default ReturnsRefundsPage;
