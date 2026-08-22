'use strict';
const fs = require('fs');
const path = require('path');

const pageContent = `import { useState, useEffect } from 'react';
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
      const res = await api.patch(\`/returns/admin/\${selectedReturn.id}/status\`, {
        status: newStatus,
        adminNotes: adminNotes.trim() || undefined,
        rejectedReason: newStatus === 'REJECTED' ? rejectedReason.trim() : undefined,
        pickupDate: newStatus === 'PICKUP_SCHEDULED' ? pickupDate : undefined,
        refundTransactionRef: newStatus === 'REFUNDED' ? refundTransactionRef.trim() : undefined,
      });

      if (res.data?.success) {
        toast.success(res.data.message || 'Return status updated successfully.');
        setSelectedReturn(res.data.returnRequest || null);
        fetchReturns();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update return status.');
    } finally {
      setIsUpdating(false);
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
                { id: 'All', label: \`All (\${totalAllCount})\` },
                { id: 'REQUESTED', label: \`Under Review (\${inReviewCount})\` },
                { id: 'APPROVED', label: \`Approved (\${statusCounts.APPROVED || 0})\` },
                { id: 'PICKUP_SCHEDULED', label: \`Pickup Scheduled (\${statusCounts.PICKUP_SCHEDULED || 0})\` },
                { id: 'PICKED_UP', label: \`Picked Up (\${statusCounts.PICKED_UP || 0})\` },
                { id: 'RECEIVED_AT_WAREHOUSE', label: \`In Warehouse (\${statusCounts.RECEIVED_AT_WAREHOUSE || 0})\` },
                { id: 'REFUNDED', label: \`Refunded (\${refundedCount})\` },
                { id: 'REJECTED', label: \`Rejected (\${rejectedCount})\` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setPage(1);
                  }}
                  className={\`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all \${
                    activeTab === tab.id
                      ? 'bg-neutral-900 text-white font-bold shadow-xs'
                      : 'bg-neutral-50 text-neutral-600 hover:bg-neutral-100 border border-neutral-200/60'
                  }\`}
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
                  <th className="py-3.5 px-4 text-center">Unboxing Video Proof</th>
                  <th className="py-3.5 px-4">Reason</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-neutral-500">
                      <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-brand-gold" />
                      <p>Loading return requests...</p>
                    </td>
                  </tr>
                ) : returns.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-neutral-500">
                      <RotateCcw size={32} className="mx-auto mb-2 text-neutral-300" />
                      <p className="font-semibold text-neutral-700 text-sm">No return requests found</p>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        {activeTab !== 'All'
                          ? \`No requests with status \"\${activeTab}\"\`
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
                    const isVideoLink =
                      ret.unboxingVideoUrl &&
                      (ret.unboxingVideoUrl.startsWith('http') ||
                        ret.unboxingVideoUrl.includes('drive.google') ||
                        ret.unboxingVideoUrl.includes('youtube') ||
                        ret.unboxingVideoUrl.includes('youtu.be'));

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
                              {ret.selectedVariant &&
                                typeof ret.selectedVariant === 'object' &&
                                Object.keys(ret.selectedVariant).length > 0 && (
                                  <p className="text-[11px] text-neutral-500 truncate">
                                    {Object.entries(ret.selectedVariant)
                                      .map(([k, v]) => \`\${k}: \${v}\`)
                                      .join(' · ')}
                                  </p>
                                )}
                              <span className="inline-block px-1.5 py-0.5 bg-neutral-100 text-neutral-700 rounded text-[10px] font-bold mt-0.5">
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

                        {/* Unboxing Video Proof */}
                        <td className="py-3.5 px-4 align-middle text-center">
                          {ret.unboxingVideoUrl ? (
                            isVideoLink ? (
                              <a
                                href={ret.unboxingVideoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-brand-gold border border-amber-200/80 rounded-md text-[11px] font-semibold transition-colors"
                              >
                                <ExternalLink size={12} /> Link
                              </a>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setPreviewVideoUrl(ret.unboxingVideoUrl)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 text-white rounded-md text-[11px] font-semibold transition-colors shadow-xs cursor-pointer"
                              >
                                <Play size={11} className="fill-white" /> Watch Video
                              </button>
                            )
                          ) : (
                            <span className="text-red-500 text-[11px] font-semibold flex items-center justify-center gap-1">
                              <ShieldAlert size={12} /> Missing
                            </span>
                          )}
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
                            className={\`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold \${config.color}\`}
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
                            <span>Inspect & Update</span>
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
              className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden my-6 border border-neutral-200 max-h-[92vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Top Bar */}
              <div className="bg-neutral-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 rounded-lg text-brand-gold">
                    <RotateCcw size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-playfair text-lg font-bold">
                        Return Claim #{selectedReturn.returnNumber}
                      </h3>
                      <span
                        className={\`px-2.5 py-0.5 rounded-full text-[11px] font-bold \${
                          (STATUS_CONFIG[selectedReturn.status] || STATUS_CONFIG.REQUESTED).color
                        }\`}
                      >
                        {(STATUS_CONFIG[selectedReturn.status] || STATUS_CONFIG.REQUESTED).label}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Order #{selectedReturn.order?.orderNumber || selectedReturn.orderId} · Claim Date:{' '}
                      {new Date(selectedReturn.createdAt).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedReturn(null)}
                  className="p-1.5 text-neutral-400 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
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
                      {selectedReturn.selectedVariant &&
                        typeof selectedReturn.selectedVariant === 'object' &&
                        Object.keys(selectedReturn.selectedVariant).length > 0 && (
                          <p className="text-neutral-500 text-[11px] mt-1">
                            {Object.entries(selectedReturn.selectedVariant)
                              .map(([k, v]) => \`\${k}: \${v}\`)
                              .join(' · ')}
                          </p>
                        )}
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
                  <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200/80 space-y-2">
                    <h5 className="font-bold text-neutral-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <User size={13} className="text-brand-gold" /> Customer & Order Info
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
                          {selectedReturn.order?.paymentMethod || 'Prepaid'}
                        </span>
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
                            <div className="p-2 w-full flex justify-end">
                              <button
                                type="button"
                                onClick={() => setPreviewVideoUrl(selectedReturn.unboxingVideoUrl)}
                                className="text-[11px] text-brand-gold hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                              >
                                <Play size={11} /> Expand Fullscreen Player
                              </button>
                            </div>
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
                            alt={\`Proof \${idx + 1}\`}
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
                  {/* Status Timeline History */}
                  <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200/80 space-y-3">
                    <h5 className="font-bold text-neutral-800 uppercase tracking-wider text-[11px]">
                      Status Lifecycle Progression
                    </h5>
                    <div className="space-y-2.5">
                      {[
                        { key: 'REQUESTED', label: '1. Claim Requested' },
                        { key: 'APPROVED', label: '2. Return Approved' },
                        { key: 'PICKUP_SCHEDULED', label: '3. Pickup Scheduled' },
                        { key: 'PICKED_UP', label: '4. Picked Up by Courier' },
                        { key: 'RECEIVED_AT_WAREHOUSE', label: '5. Received at Warehouse' },
                        { key: 'REFUNDED', label: '6. Refund Completed' },
                      ].map((step) => {
                        const isReached =
                          selectedReturn.statusTimeline &&
                          selectedReturn.statusTimeline[step.key];
                        const dateStr = isReached
                          ? new Date(selectedReturn.statusTimeline[step.key]).toLocaleDateString(
                              'en-IN',
                              {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              }
                            )
                          : null;

                        return (
                          <div key={step.key} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <div
                                className={\`w-2.5 h-2.5 rounded-full \${
                                  isReached ? 'bg-emerald-500' : 'bg-neutral-300'
                                }\`}
                              />
                              <span
                                className={\`font-medium \${
                                  isReached ? 'text-neutral-900 font-semibold' : 'text-neutral-400'
                                }\`}
                              >
                                {step.label}
                              </span>
                            </div>
                            {dateStr && <span className="text-[10px] text-neutral-400 font-mono">{dateStr}</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>

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
                        <option value="PICKUP_SCHEDULED">PICKUP_SCHEDULED (Courier Arranged)</option>
                        <option value="PICKED_UP">PICKED_UP (Item Collected)</option>
                        <option value="RECEIVED_AT_WAREHOUSE">RECEIVED_AT_WAREHOUSE (Under Inspection)</option>
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
`;

const targetPath = path.join(__dirname, '../Admin/src/pages/ReturnsAdminPage.jsx');
fs.writeFileSync(targetPath, pageContent, 'utf8');
console.log('ReturnsAdminPage.jsx successfully written to:', targetPath);
