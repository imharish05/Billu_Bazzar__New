import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RotateCcw,
  Search,
  RefreshCw,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Truck,
  Video,
  Play,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  CreditCard,
  User,
  Package,
  Calendar,
  Copy,
  Check,
  X,
  FileText,
  AlertCircle,
  ChevronRight,
  Filter,
  Zap,
} from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import { PaginationTop, PaginationBottom } from '../components/Pagination';
import api from '../services/api';
import toast from 'react-hot-toast';
import { checkPermission } from '../utils/rbac';
import { getImageUrl } from '../utils/imageUrl';
import { getPlaceholderSvg } from '../utils/placeholder';
import currencyJs from 'currency.js';

const fmt = (v, currency = 'INR') => {
  const sym = currency === 'USD' ? '$' : currency === 'AED' ? 'AED ' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '₹';
  return currencyJs(v || 0, { symbol: sym, precision: 2 }).format();
};

const EXCLUDE_VARIANT_KEYS = new Set([
  'id', 'sku', 'variantId', 'productId', 'stock', 'price', 'mrp',
  'image', 'images', 'createdAt', 'updatedAt', 'gstRate', 'barcode', 'taxRate'
]);

export const parseVariantObject = (raw) => {
  if (!raw) return null;
  let parsed = raw;
  for (let i = 0; i < 4; i++) {
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
  if (parsed && typeof parsed === 'object') {
    if (parsed.attributes && typeof parsed.attributes === 'object') {
      parsed = parsed.attributes;
    }
    return parsed;
  }
  return null;
};

export const getVariantEntries = (ret) => {
  if (!ret) return [];
  const raw =
    ret.selectedVariant ||
    ret.orderItem?.selectedVariant ||
    ret.orderItem?.variant ||
    ret.variant ||
    ret.variantAttributes;

  const obj = parseVariantObject(raw);
  if (!obj || typeof obj !== 'object') return [];

  return Object.entries(obj).filter(
    ([k, v]) => !EXCLUDE_VARIANT_KEYS.has(k) && v !== undefined && v !== null && String(v).trim() !== ''
  );
};

const STATUS_CONFIG = {
  REQUESTED: {
    label: 'Under Review',
    color: 'bg-amber-50 text-amber-800 border border-amber-200',
    icon: Clock,
    step: 1,
  },
  APPROVED: {
    label: 'Return Approved',
    color: 'bg-blue-50 text-blue-800 border border-blue-200',
    icon: CheckCircle,
    step: 2,
  },
  PICKUP_SCHEDULED: {
    label: 'Pickup Scheduled',
    color: 'bg-purple-50 text-purple-800 border border-purple-200',
    icon: Truck,
    step: 2,
  },
  PICKED_UP: {
    label: 'Item Picked Up',
    color: 'bg-indigo-50 text-indigo-800 border border-indigo-200',
    icon: Truck,
    step: 3,
  },
  RECEIVED_AT_WAREHOUSE: {
    label: 'Under Inspection',
    color: 'bg-teal-50 text-teal-800 border border-teal-200',
    icon: RefreshCw,
    step: 3,
  },
  REFUNDED: {
    label: 'Refunded',
    color: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
    icon: CheckCircle,
    step: 4,
  },
  REJECTED: {
    label: 'Rejected',
    color: 'bg-red-50 text-red-800 border border-red-200',
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

const ReturnsAdminPage = () => {
  const { admin } = useSelector((s) => s.auth);
  const canUpdate = checkPermission(admin, 'update_orders');

  const [returns, setReturns] = useState([]);
  const [statusCounts, setStatusCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Selected Return Details / Status Modal
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectedReason, setRejectedReason] = useState('');
  const [pickupDate, setPickupDate] = useState('');
  const [refundTransactionRef, setRefundTransactionRef] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRefunding, setIsRefunding] = useState(false);
  const [showRefundConfirm, setShowRefundConfirm] = useState(false);

  // Video Lightbox Modal
  const [previewVideoUrl, setPreviewVideoUrl] = useState(null);
  // Image Lightbox Modal
  const [previewImageUrl, setPreviewImageUrl] = useState(null);
  // Copied state indicator
  const [copiedKey, setCopiedKey] = useState(null);

  const fetchReturns = async () => {
    setLoading(true);
    try {
      const res = await api.get('/returns/admin/all', {
        params: {
          status: activeTab === 'All' ? undefined : activeTab,
          search: search || undefined,
          page,
          limit,
        },
      });
      if (res.data?.success) {
        setReturns(res.data.returns || []);
        setTotal(res.data.total || 0);
        setTotalPages(res.data.totalPages || 1);
        if (res.data.statusCounts) {
          setStatusCounts(res.data.statusCounts);
        }
      }
    } catch (err) {
      toast.error('Failed to load return requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, [activeTab, page, limit]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchReturns();
  };

  const handleOpenInspectModal = (item) => {
    setSelectedReturn(item);
    setNewStatus(item.status);
    setAdminNotes(item.adminNotes || '');
    setRejectedReason(item.rejectedReason || '');
    setPickupDate(item.pickupDate ? item.pickupDate.slice(0, 10) : '');
    setRefundTransactionRef(item.refundTransactionRef || '');
    setShowRefundConfirm(false);
  };

  const handleStatusUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!selectedReturn) return;
    if (!newStatus) {
      toast.error('Please select a return status.');
      return;
    }
    if (newStatus === 'REJECTED' && !rejectedReason.trim()) {
      toast.error('Please specify a rejection reason for the customer.');
      return;
    }

    setIsUpdating(true);
    try {
      const res = await api.patch(`/returns/admin/${selectedReturn.id}/status`, {
        status: newStatus,
        adminNotes: adminNotes.trim() || undefined,
        rejectedReason: newStatus === 'REJECTED' ? rejectedReason.trim() : undefined,
        pickupDate: newStatus === 'PICKUP_SCHEDULED' ? pickupDate : undefined,
        refundTransactionRef: newStatus === 'REFUNDED' ? refundTransactionRef.trim() : undefined,
      });

      if (res.data?.success) {
        toast.success(res.data.message || 'Return status updated successfully.');
        const updatedReturn = res.data.returnRequest;
        if (updatedReturn) {
          setSelectedReturn(updatedReturn);
          setNewStatus(updatedReturn.status);
          setAdminNotes(updatedReturn.adminNotes || '');
          setRejectedReason(updatedReturn.rejectedReason || '');
          setPickupDate(updatedReturn.pickupDate ? updatedReturn.pickupDate.slice(0, 10) : '');
          setRefundTransactionRef(updatedReturn.refundTransactionRef || '');
        }
        fetchReturns();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update return status.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleInitiateRazorpayRefund = () => {
    if (!selectedReturn) return;
    setShowRefundConfirm(true);
  };

  const handleConfirmRazorpayRefund = async () => {
    if (!selectedReturn) return;

    setIsRefunding(true);
    try {
      const res = await api.post(`/returns/admin/${selectedReturn.id}/refund`);
      if (res.data?.success) {
        toast.success(res.data.message || `Razorpay refund successful! Ref: ${res.data.refundId}`);
        setRefundTransactionRef(res.data.refundId || '');
        setNewStatus('REFUNDED');
        if (res.data.returnRequest) {
          setSelectedReturn(res.data.returnRequest);
        }
        fetchReturns();
        setShowRefundConfirm(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to initiate Razorpay refund.');
    } finally {
      setIsRefunding(false);
    }
  };

  const copyToClipboard = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const totalAllCount = statusCounts.All || total;
  const inReviewCount = statusCounts.REQUESTED || 0;
  const inProgressCount =
    (statusCounts.APPROVED || 0) +
    (statusCounts.PICKUP_SCHEDULED || 0) +
    (statusCounts.PICKED_UP || 0) +
    (statusCounts.RECEIVED_AT_WAREHOUSE || 0);
  const refundedCount = statusCounts.REFUNDED || 0;
  const rejectedCount = statusCounts.REJECTED || 0;

  return (
    <AdminLayout title="Returns & Refunds Management">
      <div className="space-y-5">
        {/* Metric Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border border-neutral-200/80 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 bg-neutral-100 text-neutral-800 rounded-xl flex items-center justify-center shrink-0">
              <RotateCcw size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Total Returns
              </p>
              <p className="text-xl font-bold text-neutral-900 mt-0.5">{totalAllCount}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-amber-200/80 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 bg-amber-50 text-amber-700 rounded-xl flex items-center justify-center shrink-0 border border-amber-200/60">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
                Under Review
              </p>
              <p className="text-xl font-bold text-amber-900 mt-0.5">{inReviewCount}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-blue-200/80 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 bg-blue-50 text-blue-700 rounded-xl flex items-center justify-center shrink-0 border border-blue-200/60">
              <Truck size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
                Pickup / In Progress
              </p>
              <p className="text-xl font-bold text-blue-900 mt-0.5">{inProgressCount}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-emerald-200/80 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center shrink-0 border border-emerald-200/60">
              <CheckCircle size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                Refunded
              </p>
              <p className="text-xl font-bold text-emerald-900 mt-0.5">{refundedCount}</p>
            </div>
          </div>
        </div>

        {/* Action Bar: Tabs & Search */}
        <div className="bg-white rounded-xl p-4 border border-neutral-200/80 shadow-xs space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs font-semibold">
              {[
                { id: 'All', label: `All (${totalAllCount})` },
                { id: 'REQUESTED', label: `Under Review (${inReviewCount})` },
                { id: 'APPROVED', label: `Approved (${statusCounts.APPROVED || 0})` },
                { id: 'PICKUP_SCHEDULED', label: `Pickup Scheduled (${statusCounts.PICKUP_SCHEDULED || 0})` },
                { id: 'PICKED_UP', label: `Picked Up (${statusCounts.PICKED_UP || 0})` },
                { id: 'RECEIVED_AT_WAREHOUSE', label: `In Warehouse (${statusCounts.RECEIVED_AT_WAREHOUSE || 0})` },
                { id: 'REFUNDED', label: `Refunded (${refundedCount})` },
                { id: 'REJECTED', label: `Rejected (${rejectedCount})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                    activeTab === tab.id
                      ? 'bg-neutral-900 text-white font-bold shadow-xs'
                      : 'bg-neutral-50 text-neutral-600 hover:bg-neutral-100 border border-neutral-200/60'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search & Refresh */}
            <div className="flex items-center gap-2">
              <form onSubmit={handleSearchSubmit} className="relative min-w-[220px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search Return #, Product, Order..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 border border-neutral-200 rounded-lg text-xs bg-neutral-50 focus:bg-white focus:border-brand-gold focus:outline-none"
                />
              </form>
              <button
                onClick={fetchReturns}
                title="Refresh List"
                className="p-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg transition-colors cursor-pointer"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          <PaginationTop
            page={page}
            limit={limit}
            total={total}
            onPageChange={setPage}
            onLimitChange={(l) => {
              setLimit(l);
              setPage(1);
            }}
          />
        </div>

        {/* Returns Table */}
        <div className="bg-white rounded-xl border border-neutral-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-neutral-50/80 border-b border-neutral-200/80 text-neutral-600 uppercase font-semibold tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Return ID / Date</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Order #</th>
                  <th className="py-3.5 px-4">Product / Variant</th>
                  <th className="py-3.5 px-4">Refund Amount</th>
                  <th className="py-3.5 px-4">Reason</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-neutral-500">
                      <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-brand-gold" />
                      <p>Loading return requests...</p>
                    </td>
                  </tr>
                ) : returns.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-neutral-500">
                      <RotateCcw size={32} className="mx-auto mb-2 text-neutral-300" />
                      <p className="font-semibold text-neutral-700 text-sm">No return requests found</p>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        {activeTab !== 'All'
                          ? `No requests with status "${activeTab}"`
                          : 'Customer return requests will appear here.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  returns.map((ret) => {
                    const config = STATUS_CONFIG[ret.status] || STATUS_CONFIG.REQUESTED;
                    const StatusIcon = config.icon;
                    const itemImage =
                      getImageUrl(ret.productImage || ret.orderItem?.productImage) ||
                      getPlaceholderSvg(ret.productName || 'Product');

                    const dateStr = ret.createdAt
                      ? new Date(ret.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '-';

                    return (
                      <tr key={ret.id} className="hover:bg-neutral-50/70 transition-colors">
                        {/* Return ID & Date */}
                        <td className="py-3.5 px-4 align-middle">
                          <span className="font-mono font-bold text-neutral-900 block">
                            {ret.returnNumber}
                          </span>
                          <span className="text-[11px] text-neutral-400 block mt-0.5">{dateStr}</span>
                        </td>

                        {/* Customer */}
                        <td className="py-3.5 px-4 align-middle">
                          <p className="font-semibold text-neutral-900">
                            {ret.customer?.name || 'Customer'}
                          </p>
                          {ret.customer?.phone && (
                            <p className="text-[11px] text-neutral-500">{ret.customer.phone}</p>
                          )}
                          {ret.customer?.email && (
                            <p className="text-[10px] text-neutral-400 truncate max-w-[150px]">
                              {ret.customer.email}
                            </p>
                          )}
                        </td>

                        {/* Order Ref */}
                        <td className="py-3.5 px-4 align-middle">
                          <span className="font-semibold text-neutral-900 block">
                            #{ret.order?.orderNumber || ret.orderId}
                          </span>
                          <span className="text-[11px] text-neutral-500 block uppercase">
                            {ret.order?.paymentMethod || 'Prepaid'}
                          </span>
                        </td>

                        {/* Product & Variant */}
                        <td className="py-3.5 px-4 align-middle">
                          <div className="flex items-center gap-2.5 max-w-xs">
                            <img
                              src={itemImage}
                              alt={ret.productName}
                              className="w-10 h-12 object-cover rounded border border-neutral-200 shrink-0 bg-neutral-50"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = getPlaceholderSvg(ret.productName || 'Product');
                              }}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-neutral-900 truncate" title={ret.productName}>
                                {ret.productName}
                              </p>
                              {(() => {
                                const variantEntries = getVariantEntries(ret);
                                if (variantEntries.length === 0) return null;
                                return (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {variantEntries.map(([k, v]) => (
                                      <span
                                        key={k}
                                        className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200/60 font-medium text-[10px]"
                                      >
                                        <span className="text-neutral-500 mr-1 capitalize">{k}:</span>
                                        <span className="font-semibold">{String(v)}</span>
                                      </span>
                                    ))}
                                  </div>
                                );
                              })()}
                              <span className="inline-block px-1.5 py-0.5 bg-neutral-100 text-neutral-700 rounded text-[10px] font-bold mt-1">
                                Qty: {ret.quantity}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Refund Amount */}
                        <td className="py-3.5 px-4 align-middle font-bold text-neutral-900">
                          <span className="text-brand-gold font-mono text-sm">
                            {fmt(ret.refundAmount, ret.currency || 'INR')}
                          </span>
                        </td>

                        {/* Reason */}
                        <td className="py-3.5 px-4 align-middle">
                          <span className="font-medium text-neutral-800 block">
                            {REASON_LABELS[ret.reason] || ret.reason}
                          </span>
                          {ret.reasonDetails && (
                            <span className="text-[11px] text-neutral-400 italic block truncate max-w-[140px]">
                              "{ret.reasonDetails}"
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 align-middle text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${config.color}`}
                          >
                            <StatusIcon size={12} />
                            {config.label}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 align-middle text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenInspectModal(ret)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-neutral-900 text-white hover:bg-brand-gold rounded-lg font-semibold text-xs transition-colors shadow-xs cursor-pointer"
                          >
                            <Eye size={13} />
                            <span>Details</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <PaginationBottom
            page={page}
            limit={limit}
            total={total}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      </div>

      {/* INSPECT & UPDATE STATUS MODAL */}
      <AnimatePresence>
        {selectedReturn && (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
            onClick={() => setSelectedReturn(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white rounded-2xl max-w-5xl xl:max-w-6xl w-full shadow-2xl overflow-hidden my-6 border border-neutral-200 max-h-[92vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Top Bar (Clean white background matching Admin standards) */}
              <div className="sticky top-0 bg-white z-20 px-6 py-4 border-b border-neutral-200 flex items-center justify-between flex-wrap gap-3 shrink-0 text-neutral-900">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-50 text-brand-gold rounded-xl shrink-0">
                    <RotateCcw size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="font-playfair text-lg sm:text-xl font-bold text-neutral-900">
                        Return Claim #{selectedReturn.returnNumber}
                      </h3>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                          (STATUS_CONFIG[selectedReturn.status] || STATUS_CONFIG.REQUESTED).color
                        }`}
                      >
                        {(STATUS_CONFIG[selectedReturn.status] || STATUS_CONFIG.REQUESTED).label}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Order #{selectedReturn.order?.orderNumber || selectedReturn.orderId} · Claim Date:{' '}
                      {new Date(selectedReturn.createdAt).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedReturn(null)}
                  className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-full hover:bg-neutral-100 transition-colors cursor-pointer"
                  title="Close modal"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Scrollable Body (2 Columns) */}
              <div className="p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
                {/* LEFT COLUMN: Inspection, Proofs & Details (7 cols) */}
                <div className="lg:col-span-7 space-y-4">
                  {/* Product & Refund Snapshot */}
                  <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200/80 flex items-start gap-4">
                    <img
                      src={
                        getImageUrl(selectedReturn.productImage || selectedReturn.orderItem?.productImage) ||
                        getPlaceholderSvg(selectedReturn.productName || 'Product')
                      }
                      alt={selectedReturn.productName}
                      className="w-16 h-20 object-cover rounded-lg border border-neutral-200 bg-white shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-neutral-900 text-sm leading-snug">
                        {selectedReturn.productName}
                      </h4>
                      {(() => {
                        const variantEntries = getVariantEntries(selectedReturn);
                        if (variantEntries.length === 0) return null;
                        return (
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {variantEntries.map(([k, v]) => (
                              <span
                                key={k}
                                className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200/80 text-[11px] font-medium"
                              >
                                <span className="text-neutral-500 mr-1 capitalize">{k}:</span>
                                <span className="font-bold">{String(v)}</span>
                              </span>
                            ))}
                          </div>
                        );
                      })()}
                      <div className="flex items-center gap-3 mt-2 text-xs">
                        <span className="px-2 py-0.5 bg-white border border-neutral-200 text-neutral-700 rounded font-semibold">
                          Return Qty: {selectedReturn.quantity}
                        </span>
                        <span className="font-bold text-neutral-900">
                          Refund Amount:{' '}
                          <span className="text-brand-gold font-bold font-mono text-sm">
                            {fmt(selectedReturn.refundAmount, selectedReturn.currency || 'INR')}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Customer & Order Information */}
                  <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200/80 space-y-2.5">
                    <h5 className="font-bold text-neutral-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <User size={13} className="text-brand-gold" /> Customer & Order Payment Info
                    </h5>
                    <div className="grid grid-cols-2 gap-2 text-neutral-600">
                      <div>
                        <span className="text-neutral-400 block text-[10px]">Customer Name:</span>
                        <span className="font-semibold text-neutral-900">
                          {selectedReturn.customer?.name || 'Customer'}
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-400 block text-[10px]">Contact Phone:</span>
                        <span className="font-semibold text-neutral-900">
                          {selectedReturn.customer?.phone || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-400 block text-[10px]">Customer Email:</span>
                        <span className="font-semibold text-neutral-900 truncate block">
                          {selectedReturn.customer?.email || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-400 block text-[10px]">Payment Mode:</span>
                        <span className="font-semibold text-neutral-900 uppercase">
                          {selectedReturn.order?.paymentMethod || 'Razorpay / Online'}
                        </span>
                      </div>
                      <div className="col-span-2 pt-1 border-t border-neutral-200/60 flex items-center justify-between">
                        <div>
                          <span className="text-neutral-400 block text-[10px]">Razorpay / Gateway Payment ID:</span>
                          <span className="font-mono font-bold text-neutral-900 text-[11px]">
                            {selectedReturn.order?.razorpay_payment_id || selectedReturn.order?.paymentGatewayRef || 'N/A (COD / Manual)'}
                          </span>
                        </div>
                        {selectedReturn.order?.razorpay_payment_id && (
                          <button
                            type="button"
                            onClick={() => copyToClipboard(selectedReturn.order?.razorpay_payment_id, 'rzp_pid')}
                            className="p-1 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                            title="Copy Razorpay Payment ID"
                          >
                            {copiedKey === 'rzp_pid' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Reason for Return */}
                  <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200/80 space-y-1.5">
                    <h5 className="font-bold text-amber-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <AlertCircle size={13} className="text-amber-700" /> Stated Return Reason
                    </h5>
                    <p className="font-bold text-neutral-900">
                      {REASON_LABELS[selectedReturn.reason] || selectedReturn.reason}
                    </p>
                    {selectedReturn.reasonDetails && (
                      <p className="text-neutral-700 italic bg-white p-2.5 rounded-lg border border-amber-100 leading-relaxed">
                        "{selectedReturn.reasonDetails}"
                      </p>
                    )}
                  </div>

                  {/* COMPULSORY UNBOXING VIDEO PROOF SECTION */}
                  <div className="p-4 bg-neutral-900 text-white rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldCheck size={16} className="text-brand-gold" />
                        <h5 className="font-bold uppercase tracking-wider text-[11px] text-brand-gold">
                          Compulsory Unboxing Video Proof
                        </h5>
                      </div>
                      {selectedReturn.unboxingVideoUrl && (
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 font-bold rounded text-[10px]">
                          Attached
                        </span>
                      )}
                    </div>

                    {selectedReturn.unboxingVideoUrl ? (
                      <div className="space-y-2">
                        {selectedReturn.unboxingVideoUrl.startsWith('http') &&
                        (selectedReturn.unboxingVideoUrl.includes('drive.google') ||
                          selectedReturn.unboxingVideoUrl.includes('youtube')) ? (
                          <div className="p-3 bg-neutral-800 rounded-lg flex items-center justify-between gap-2">
                            <span className="text-xs text-neutral-300 truncate max-w-xs">
                              {selectedReturn.unboxingVideoUrl}
                            </span>
                            <a
                              href={selectedReturn.unboxingVideoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 bg-brand-gold text-neutral-900 font-bold rounded text-xs flex items-center gap-1 hover:brightness-110 shrink-0"
                            >
                              <ExternalLink size={13} /> Open Video Link
                            </a>
                          </div>
                        ) : (
                          <div className="bg-black rounded-lg overflow-hidden flex flex-col items-center">
                            <video
                              src={selectedReturn.unboxingVideoUrl}
                              controls
                              className="max-h-56 w-full object-contain rounded-lg"
                            />
                            {/* <div className="p-2 w-full flex justify-end">
                              <button
                                type="button"
                                onClick={() => setPreviewVideoUrl(selectedReturn.unboxingVideoUrl)}
                                className="text-[11px] text-brand-gold hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                              >
                                <Play size={11} /> Expand Fullscreen Player
                              </button>
                            </div> */}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-red-400 italic">
                        No unboxing video link or file found for this return request.
                      </p>
                    )}
                  </div>

                  {/* Supplementary Photos */}
                  {Array.isArray(selectedReturn.images) && selectedReturn.images.length > 0 && (
                    <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200/80 space-y-2">
                      <h5 className="font-bold text-neutral-800 uppercase tracking-wider text-[11px]">
                        Supplementary Photos ({selectedReturn.images.length})
                      </h5>
                      <div className="grid grid-cols-4 gap-2">
                        {selectedReturn.images.map((img, idx) => (
                          <img
                            key={idx}
                            src={img}
                            alt={`Proof ${idx + 1}`}
                            onClick={() => setPreviewImageUrl(img)}
                            className="w-full h-16 object-cover rounded-lg border border-neutral-200 cursor-pointer hover:opacity-80 transition-opacity bg-white"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bank Details for COD Refunds */}
                  {selectedReturn.bankDetails && typeof selectedReturn.bankDetails === 'object' && (
                    <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200/80 space-y-2.5">
                      <h5 className="font-bold text-emerald-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                        <CreditCard size={13} className="text-emerald-700" /> COD Refund Bank / UPI Info
                      </h5>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {selectedReturn.bankDetails.accountHolderName && (
                          <div className="flex items-center justify-between p-2 bg-white rounded border border-emerald-100">
                            <div>
                              <span className="text-[10px] text-neutral-400 block">Holder Name:</span>
                              <span className="font-bold text-neutral-900">
                                {selectedReturn.bankDetails.accountHolderName}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                copyToClipboard(selectedReturn.bankDetails.accountHolderName, 'name')
                              }
                              className="p-1 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                            >
                              {copiedKey === 'name' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                            </button>
                          </div>
                        )}
                        {selectedReturn.bankDetails.accountNumber && (
                          <div className="flex items-center justify-between p-2 bg-white rounded border border-emerald-100">
                            <div>
                              <span className="text-[10px] text-neutral-400 block">Account Number:</span>
                              <span className="font-bold font-mono text-neutral-900">
                                {selectedReturn.bankDetails.accountNumber}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                copyToClipboard(selectedReturn.bankDetails.accountNumber, 'acc')
                              }
                              className="p-1 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                            >
                              {copiedKey === 'acc' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                            </button>
                          </div>
                        )}
                        {selectedReturn.bankDetails.ifscCode && (
                          <div className="flex items-center justify-between p-2 bg-white rounded border border-emerald-100">
                            <div>
                              <span className="text-[10px] text-neutral-400 block">IFSC Code:</span>
                              <span className="font-bold font-mono text-neutral-900">
                                {selectedReturn.bankDetails.ifscCode}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                copyToClipboard(selectedReturn.bankDetails.ifscCode, 'ifsc')
                              }
                              className="p-1 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                            >
                              {copiedKey === 'ifsc' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                            </button>
                          </div>
                        )}
                        {selectedReturn.bankDetails.upiId && (
                          <div className="flex items-center justify-between p-2 bg-white rounded border border-emerald-100">
                            <div>
                              <span className="text-[10px] text-neutral-400 block">UPI ID:</span>
                              <span className="font-bold text-neutral-900">
                                {selectedReturn.bankDetails.upiId}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                copyToClipboard(selectedReturn.bankDetails.upiId, 'upi')
                              }
                              className="p-1 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                            >
                              {copiedKey === 'upi' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* RIGHT COLUMN: Status Transition & Timeline (5 cols) */}
                <div className="lg:col-span-5 space-y-4">
                  {/* Status Lifecycle Progression */}
                  <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200/80 space-y-3">
                    <h5 className="font-bold text-neutral-800 uppercase tracking-wider text-[11px] flex items-center justify-between">
                      <span>Status Lifecycle Progression</span>
                      {selectedReturn.status === 'REJECTED' && (
                        <span className="text-[10px] bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded border border-red-200 uppercase">
                          Claim Rejected
                        </span>
                      )}
                    </h5>
                    <div className="space-y-3 relative pl-1">
                      {(() => {
                        const STEPS = [
                          { key: 'REQUESTED', label: '1. Claim Requested' },
                          { key: 'APPROVED', label: '2. Return Approved' },
                          { key: 'PICKUP_SCHEDULED', label: '3. Pickup Scheduled' },
                          { key: 'PICKED_UP', label: '4. Picked Up by Courier' },
                          { key: 'RECEIVED_AT_WAREHOUSE', label: '5. Received at Warehouse' },
                          { key: 'REFUNDED', label: '6. Refund Completed' },
                        ];

                        const STEP_INDEXES = {
                          REQUESTED: 0,
                          APPROVED: 1,
                          PICKUP_SCHEDULED: 2,
                          PICKED_UP: 3,
                          RECEIVED_AT_WAREHOUSE: 4,
                          REFUNDED: 5,
                        };

                        let timeline = selectedReturn.statusTimeline || {};
                        if (typeof timeline === 'string') {
                          try { timeline = JSON.parse(timeline); } catch (e) { timeline = {}; }
                        }

                        const currentStatusIdx = STEP_INDEXES[selectedReturn.status] ?? -1;

                        return STEPS.map((step, idx) => {
                          const isExplicitlyRecorded = Boolean(timeline[step.key]);
                          const isReached = isExplicitlyRecorded || (currentStatusIdx >= idx && selectedReturn.status !== 'REJECTED');
                          const isCurrent = selectedReturn.status === step.key;

                          const rawDate = timeline[step.key] || (isCurrent ? selectedReturn.updatedAt : null);
                          const dateStr = rawDate
                            ? new Date(rawDate).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : isReached
                            ? 'Completed'
                            : null;

                          return (
                            <div key={step.key} className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div
                                  className={`w-3 h-3 rounded-full flex items-center justify-center transition-all ${
                                    isReached
                                      ? isCurrent
                                        ? 'bg-emerald-600 ring-4 ring-emerald-100 shadow-2xs'
                                        : 'bg-emerald-500'
                                      : 'bg-neutral-300'
                                  }`}
                                />
                                <span
                                  className={`truncate ${
                                    isCurrent
                                      ? 'text-emerald-900 font-bold'
                                      : isReached
                                      ? 'text-neutral-900 font-semibold'
                                      : 'text-neutral-400'
                                  }`}
                                >
                                  {step.label}
                                </span>
                                {isCurrent && (
                                  <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-full uppercase">
                                    Active Stage
                                  </span>
                                )}
                              </div>
                              {dateStr && (
                                <span className="text-[10px] text-neutral-500 font-mono shrink-0 ml-2">
                                  {dateStr}
                                </span>
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  {/* Razorpay Automated Refund Card / Completed State */}
                  {selectedReturn.status === 'REFUNDED' ? (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between text-emerald-900 font-bold text-xs">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle size={15} className="text-emerald-600" />
                          <span>Refund Completed & Restocked</span>
                        </div>
                        <span className="font-mono text-emerald-700 font-bold">
                          {fmt(selectedReturn.refundAmount, selectedReturn.currency || 'INR')}
                        </span>
                      </div>
                      {selectedReturn.refundTransactionRef && (
                        <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-emerald-100 text-xs">
                          <div>
                            <span className="text-[10px] text-neutral-400 block">Gateway / UTR Reference:</span>
                            <span className="font-mono font-bold text-neutral-900 text-[11px]">
                              {selectedReturn.refundTransactionRef}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(selectedReturn.refundTransactionRef, 'refund_ref')}
                            className="p-1 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                            title="Copy Refund Reference"
                          >
                            {copiedKey === 'refund_ref' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : selectedReturn.status === 'RECEIVED_AT_WAREHOUSE' ? (
                    selectedReturn.order?.razorpay_payment_id || (selectedReturn.order?.paymentGatewayRef && !String(selectedReturn.order.paymentGatewayRef).startsWith('COD')) ? (
                      <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50/70 border border-blue-200/90 rounded-xl space-y-3 shadow-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Zap size={15} className="text-blue-600 fill-blue-600" />
                            <span className="font-bold text-neutral-900 text-xs uppercase tracking-wider">
                              Automated Razorpay Refund
                            </span>
                          </div>
                          <span className="px-2 py-0.5 bg-blue-600 text-white rounded text-[10px] font-bold">
                            Product Amount
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-600 leading-relaxed">
                          Package is received at warehouse. Click below to initiate an instant partial refund of{' '}
                          <strong className="text-neutral-900 font-mono font-bold">
                            {fmt(selectedReturn.refundAmount, selectedReturn.currency || 'INR')}
                          </strong>{' '}
                          directly from Razorpay back to the customer's original payment method, mark as REFUNDED, and restock inventory.
                        </p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleInitiateRazorpayRefund();
                          }}
                          disabled={isRefunding || isUpdating || !canUpdate}
                          className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-lg text-xs transition-all shadow-xs disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Zap size={14} className={isRefunding ? 'animate-bounce' : ''} />
                          {isRefunding ? 'Processing Razorpay Refund...' : ` Initiate Razorpay Refund (${fmt(selectedReturn.refundAmount, selectedReturn.currency || 'INR')})`}
                        </button>
                      </div>
                    ) : (
                      <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl text-xs space-y-1">
                        <span className="font-bold text-amber-900 block text-[11px] uppercase tracking-wider">
                          COD / Offline Order Refund
                        </span>
                        <p className="text-[11px] text-amber-800 leading-snug">
                          Item received at warehouse. This order was placed via Cash On Delivery. Transfer the product refund of{' '}
                          <strong className="text-neutral-900 font-bold">{fmt(selectedReturn.refundAmount, selectedReturn.currency || 'INR')}</strong>{' '}
                          to the customer's Bank / UPI details on the left, then select <strong>REFUNDED</strong> and enter the bank UTR reference below.
                        </p>
                      </div>
                    )
                  ) : (
                    <div className="p-3.5 bg-neutral-100 border border-neutral-200 rounded-xl text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-neutral-700 text-[11px] uppercase tracking-wider">
                        <Clock size={13} className="text-neutral-500" /> Refund Action Locked
                      </div>
                      <p className="text-[11px] text-neutral-500 leading-snug">
                        The return is currently at <strong>{STATUS_CONFIG[selectedReturn.status]?.label || selectedReturn.status}</strong>. The automated refund option will unlock once the returned parcel is received at the warehouse and marked as <strong>RECEIVED AT WAREHOUSE</strong>.
                      </p>
                    </div>
                  )}

                  {/* Status Update Form */}
                  <form
                    onSubmit={handleStatusUpdateSubmit}
                    className="p-4 bg-white rounded-xl border-2 border-brand-gold/40 shadow-xs space-y-3.5"
                  >
                    <h5 className="font-bold text-neutral-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <RotateCcw size={13} className="text-brand-gold" /> Update Return Status
                    </h5>

                    {/* Status Dropdown */}
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                        Target Status *
                      </label>
                      <select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs font-semibold bg-white focus:border-brand-gold focus:outline-none cursor-pointer"
                        required
                        disabled={!canUpdate}
                      >
                        <option value="REQUESTED">REQUESTED (Under Review)</option>
                        <option value="APPROVED">APPROVED (Accept Return)</option>
                        <option value="PICKUP_SCHEDULED">PICKUP SCHEDULED (Courier Arranged)</option>
                        <option value="PICKED_UP">PICKED UP (Item Collected)</option>
                        <option value="RECEIVED_AT_WAREHOUSE">RECEIVED AT WAREHOUSE (Under Inspection)</option>
                        <option value="REFUNDED">REFUNDED (Complete & Restock)</option>
                        <option value="REJECTED">REJECTED (Decline Return)</option>
                      </select>
                    </div>

                    {/* Conditional Pickup Date Input */}
                    {newStatus === 'PICKUP_SCHEDULED' && (
                      <div>
                        <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                          Scheduled Pickup Date
                        </label>
                        <input
                          type="date"
                          value={pickupDate}
                          onChange={(e) => setPickupDate(e.target.value)}
                          className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs focus:border-brand-gold focus:outline-none"
                        />
                      </div>
                    )}

                    {/* Conditional Refund Reference Input */}
                    {newStatus === 'REFUNDED' && (
                      <div>
                        <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                          Refund Transaction / UTR Ref
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. UTR123456789 or Gateway Ref"
                          value={refundTransactionRef}
                          onChange={(e) => setRefundTransactionRef(e.target.value)}
                          className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs focus:border-brand-gold focus:outline-none font-mono"
                        />
                        {(selectedReturn.order?.razorpay_payment_id || (selectedReturn.order?.paymentGatewayRef && !String(selectedReturn.order.paymentGatewayRef).startsWith('COD'))) && selectedReturn.status === 'RECEIVED_AT_WAREHOUSE' && (
                          <div className="mt-1.5 flex items-center justify-between text-[11px]">
                            <span className="text-neutral-500">Or trigger gateway automatically:</span>
                            <button
                              type="button"
                              onClick={handleInitiateRazorpayRefund}
                              disabled={isRefunding || isUpdating || !canUpdate}
                              className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 underline cursor-pointer"
                            >
                              <Zap size={11} /> Initiate Razorpay Refund
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Conditional Rejection Reason Input */}
                    {newStatus === 'REJECTED' && (
                      <div>
                        <label className="block text-[11px] font-bold text-red-700 uppercase tracking-wider mb-1">
                          Customer Rejection Notice *
                        </label>
                        <textarea
                          rows={2}
                          value={rejectedReason}
                          onChange={(e) => setRejectedReason(e.target.value)}
                          placeholder="Explain why this return request was declined (e.g., Unboxing video shows unbroken original seal)..."
                          className="w-full px-3 py-2 border border-red-300 rounded-lg text-xs bg-red-50/50 focus:border-red-500 focus:outline-none resize-none"
                          required
                        />
                      </div>
                    )}

                    {/* Admin Internal Notes */}
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                        Admin Internal Notes / Remarks (Optional)
                      </label>
                      <textarea
                        rows={2}
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        placeholder="Internal notes visible on audit log..."
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs focus:border-brand-gold focus:outline-none resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isUpdating || !canUpdate}
                      className="w-full py-2.5 px-4 bg-neutral-900 hover:bg-brand-gold text-white font-bold rounded-lg text-xs transition-all shadow-xs disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <CheckCircle size={14} />
                      {isUpdating ? 'Saving Status...' : 'Apply Status Update'}
                    </button>
                  </form>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CENTERED RAZORPAY REFUND CONFIRMATION MODAL */}
      <AnimatePresence>
        {showRefundConfirm && selectedReturn && (
          <div
            className="fixed inset-0 z-[99999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            style={{ zIndex: 99999 }}
            onClick={() => !isRefunding && setShowRefundConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-left border border-neutral-200 relative overflow-hidden"
              style={{ zIndex: 100000 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                type="button"
                disabled={isRefunding}
                onClick={() => setShowRefundConfirm(false)}
                className="absolute top-4 right-4 p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer disabled:opacity-50"
              >
                <X size={18} />
              </button>

              {/* Header Icon & Title */}
              <div className="flex items-start gap-3.5 mb-4">
                {/* <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
                  <Zap size={22} className="fill-blue-600/20" />
                </div> */}
                <div className="flex-1 pr-6">
                  <h3 className="text-base font-bold text-neutral-900 leading-tight">
                    Initiate Automated Razorpay Refund?
                  </h3>
                  <p className="text-xs text-neutral-500 mt-1">
                    Please confirm the refund details before triggering the gateway API.
                  </p>
                </div>
              </div>

              {/* Details Card */}
              <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200/80 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500 font-medium">Refund Amount:</span>
                  <span className="text-sm font-bold text-neutral-900 font-mono">
                    {fmt(selectedReturn.refundAmount, selectedReturn.currency || 'INR')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500 font-medium">Payment ID:</span>
                  <span
                    className="font-mono text-neutral-800 font-semibold truncate max-w-[200px]"
                    title={selectedReturn.order?.razorpay_payment_id || selectedReturn.order?.paymentGatewayRef || 'N/A'}
                  >
                    {selectedReturn.order?.razorpay_payment_id || selectedReturn.order?.paymentGatewayRef || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500 font-medium">Return Claim:</span>
                  <span className="font-mono text-neutral-800 font-semibold">
                    #{selectedReturn.returnNumber}
                  </span>
                </div>
              </div>

              {/* Notice Banner */}
              <div className="mt-3.5 p-3 bg-blue-50/70 border border-blue-100 rounded-xl flex items-start gap-2.5 text-[11px] text-blue-950 leading-relaxed">
                <ShieldCheck size={16} className="text-blue-600 shrink-0 mt-0.5" />
                <span>
                  This will trigger the Razorpay Refund API and immediately credit the product amount back to the customer's original payment method, set status to <strong>REFUNDED</strong>, and restock inventory.
                </span>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={isRefunding}
                  onClick={() => setShowRefundConfirm(false)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isRefunding}
                  onClick={handleConfirmRazorpayRefund}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isRefunding ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Processing Refund...
                    </>
                  ) : (
                    <>
                      <Zap size={14} />
                      Confirm & Initiate Refund
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Video Fullscreen Player Lightbox */}
      <AnimatePresence>
        {previewVideoUrl && (
          <div
            className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
            onClick={() => setPreviewVideoUrl(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-neutral-900 rounded-2xl overflow-hidden max-w-3xl w-full shadow-2xl relative border border-neutral-800"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-neutral-800 text-white">
                <div className="flex items-center gap-2">
                  <Video size={18} className="text-brand-gold" />
                  <span className="text-sm font-semibold">Unboxing Video Inspection</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewVideoUrl(null)}
                  className="p-1 text-neutral-400 hover:text-white rounded-full transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-4 bg-black flex items-center justify-center min-h-[360px]">
                <video
                  src={previewVideoUrl}
                  controls
                  autoPlay
                  className="max-h-[75vh] w-full object-contain rounded-lg"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Image Fullscreen Lightbox */}
      <AnimatePresence>
        {previewImageUrl && (
          <div
            className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
            onClick={() => setPreviewImageUrl(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-2xl max-h-[85vh] relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setPreviewImageUrl(null)}
                className="absolute -top-10 right-0 p-1 text-white hover:text-brand-gold cursor-pointer"
              >
                <X size={24} />
              </button>
              <img
                src={previewImageUrl}
                alt="Inspection Fullscreen"
                className="max-h-[80vh] w-full object-contain rounded-xl shadow-2xl bg-black"
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
};

export default ReturnsAdminPage;
