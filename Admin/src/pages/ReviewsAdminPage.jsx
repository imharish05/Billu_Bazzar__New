import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, CheckCircle, XCircle, Trash2, Search, RefreshCw, MessageSquare, ShieldCheck, Filter, Eye, X } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import { PaginationTop, PaginationBottom } from '../components/Pagination';
import api from '../services/api';
import toast from 'react-hot-toast';
import { checkPermission } from '../utils/rbac';
import { getImageUrl } from '../utils/imageUrl';

const ReviewsAdminPage = () => {
  const { admin } = useSelector((s) => s.auth);
  const canDeleteReview = checkPermission(admin, 'delete_review');
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'approved', 'pending'
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [viewingReview, setViewingReview] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reviews/admin/all', {
        params: {
          status: statusFilter,
          search: searchQuery,
          page,
          limit,
        },
      });
      if (res.data?.success) {
        setReviews(res.data.reviews || []);
        setTotal(res.data.total || res.data.count || 0);
        setTotalPages(res.data.totalPages || 1);
      }
    } catch (err) {
      toast.error('Failed to load reviews.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [statusFilter, page, limit]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchReviews();
  };

  const handleToggleStatus = async (reviewId, currentStatus) => {
    const newStatus = !currentStatus;
    setUpdatingId(reviewId);

    // 1. Optimistic UI update
    setReviews((prev) =>
      prev.map((r) => (r.id === reviewId ? { ...r, isApproved: newStatus } : r))
    );

    try {
      // 2. Silent backend sync
      const res = await api.patch(`/reviews/admin/${reviewId}/status`, { isApproved: newStatus });
      if (res.data?.success) {
        toast.success(`Review ${newStatus ? 'Approved' : 'Rejected'} successfully!`);
      } else {
        // Rollback
        setReviews((prev) =>
          prev.map((r) => (r.id === reviewId ? { ...r, isApproved: currentStatus } : r))
        );
        toast.error(res.data?.message || 'Failed to update review status');
      }
    } catch (err) {
      // Rollback
      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, isApproved: currentStatus } : r))
      );
      toast.error('Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteReview = (reviewId) => {
    toast((t) => (
      <div className="flex flex-col items-center text-center gap-2 p-1 min-w-[260px]">
        <p className="text-sm font-bold text-neutral-800">Delete this review?</p>
        <p className="text-xs text-neutral-500 max-w-xs">This action cannot be undone.</p>
        <div className="flex justify-center items-center gap-3 mt-2 w-full">
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              setUpdatingId(reviewId);
              try {
                const res = await api.delete(`/reviews/${reviewId}`);
                if (res.data?.success) {
                  toast.success('Review deleted successfully.');
                  fetchReviews();
                } else {
                  toast.error(res.data?.message || 'Failed to delete review');
                }
              } catch (err) {
                toast.error('Failed to delete review');
              } finally {
                setUpdatingId(null);
              }
            }}
            className="px-3.5 py-1.5 text-xs bg-red-600 text-white rounded font-medium hover:bg-red-700 shadow-sm transition-colors"
          >
            Yes, Delete
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="px-3.5 py-1.5 text-xs border border-neutral-300 rounded text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    ), {
      duration: 6000,
      position: 'top-center',
      style: {
        borderRadius: '12px',
        background: '#ffffff',
        color: '#1a1a1a',
        border: '1px solid #E5E7EB',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        padding: '14px 18px',
      },
    });
  };

  const totalReviews = reviews.length;
  const approvedCount = reviews.filter(r => r.isApproved).length;
  const pendingCount = reviews.filter(r => !r.isApproved).length;

  return (
    <AdminLayout title="Product Reviews & Moderation">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-5 rounded-lg border border-neutral-200/80 shadow-sm flex items-center gap-4">
            <div className="p-3 rounded-full bg-brand-gold/10 text-brand-gold">
              <MessageSquare size={22} />
            </div>
            <div>
              <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider">Total Reviews</p>
              <h3 className="text-2xl font-bold text-neutral-900">{totalReviews}</h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-lg border border-neutral-200/80 shadow-sm flex items-center gap-4">
            <div className="p-3 rounded-full bg-emerald-50 text-emerald-600">
              <ShieldCheck size={22} />
            </div>
            <div>
              <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider">Approved Reviews</p>
              <h3 className="text-2xl font-bold text-emerald-600">{approvedCount}</h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-lg border border-neutral-200/80 shadow-sm flex items-center gap-4">
            <div className="p-3 rounded-full bg-amber-50 text-amber-600">
              <Filter size={22} />
            </div>
            <div>
              <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider">Pending / Rejected</p>
              <h3 className="text-2xl font-bold text-amber-600">{pendingCount}</h3>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white p-4 rounded-lg border border-neutral-200/80 shadow-sm mb-6 flex flex-col sm:flex-row justify-between items-center gap-4 flex-wrap">
          {/* Status Tabs */}
          <div className="flex gap-2">
            {[
              { key: 'all', label: 'All Reviews' },
              { key: 'approved', label: 'Approved' },
              { key: 'pending', label: 'Pending / Unapproved' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${statusFilter === tab.key ? 'bg-brand-gold text-white shadow-sm' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Search product, customer, title..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-neutral-200 rounded-lg text-xs focus:border-brand-gold focus:outline-none"
              />
            </div>
            <button type="submit" className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5">
              Filter
            </button>
            <button type="button" onClick={() => { setSearchQuery(''); setStatusFilter('all'); }} className="p-2 border border-neutral-200 text-neutral-500 rounded-lg hover:bg-neutral-50">
              <RefreshCw size={14} />
            </button>
          </form>
        </div>

        {/* Reviews Table */}
        <div className="bg-white rounded-lg border border-neutral-200/80 shadow-sm overflow-hidden">
          <PaginationTop
            search={searchQuery}
            onSearchChange={(s) => { setSearchQuery(s); setPage(1); }}
            searchPlaceholder="Search product, customer, title..."
            currentPage={page}
            totalItems={total}
            limit={limit}
            onLimitChange={(l) => { setLimit(l); setPage(1); }}
          />
          {loading ? (
            <div className="p-12 text-center">
              <RefreshCw size={24} className="animate-spin text-brand-gold mx-auto mb-2" />
              <p className="text-xs text-neutral-500">Loading reviews...</p>
            </div>
          ) : reviews.length === 0 ? (
            <div className="p-12 text-center">
              <MessageSquare size={36} className="text-neutral-300 mx-auto mb-2" strokeWidth={1.5} />
              <h3 className="font-semibold text-neutral-800 text-base mb-1">No Reviews Found</h3>
              <p className="text-xs text-neutral-500">No customer reviews match the selected filter criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200 text-[11px] uppercase tracking-wider font-semibold text-neutral-500">
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Rating</th>
                    <th className="py-3 px-4">Review Content</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-xs">
                  {reviews.map((r) => (
                    <tr key={r.id} className="hover:bg-neutral-50/60 transition-colors">
                      {/* Product */}
                      <td className="py-4 px-4 min-w-[200px]">
                        <div className="flex items-center gap-3">
                          <img
                            src={getImageUrl(r.productImage) || '/placeholder.jpg'}
                            alt={r.productName}
                            className="w-10 h-12 object-cover rounded border border-neutral-100 flex-shrink-0"
                            onError={(e) => { e.target.onerror = null; e.target.src = '/placeholder.jpg'; }}
                          />
                          <div>
                            <p className="font-semibold text-neutral-900 line-clamp-1">{r.productName}</p>
                            <span className="text-[10px] text-neutral-400 font-mono">ID #{r.productId}</span>
                          </div>
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="py-4 px-4 min-w-[150px]">
                        <p className="font-semibold text-neutral-900">{r.reviewerName}</p>
                        <p className="text-[11px] text-neutral-400 truncate">{r.reviewerEmail}</p>
                        {r.isVerifiedPurchase && (
                          <span className="inline-block text-[9px] bg-emerald-50 text-emerald-700 font-semibold px-1.5 py-0.5 rounded mt-0.5 border border-emerald-100">
                            Verified Buyer
                          </span>
                        )}
                      </td>

                      {/* Rating */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} size={13} className={s <= r.rating ? 'fill-brand-gold text-brand-gold' : 'fill-neutral-200 text-neutral-200'} />
                          ))}
                          <span className="font-bold text-neutral-800 ml-1 text-xs">{r.rating}.0</span>
                        </div>
                      </td>

                      {/* Content */}
                      <td className="py-4 px-4 max-w-md">
                        {r.title && <p className="font-semibold text-neutral-900 mb-0.5">{r.title}</p>}
                        <p className="text-neutral-600 leading-relaxed line-clamp-3">{r.body}</p>
                      </td>

                      {/* Date */}
                      <td className="py-4 px-4 whitespace-nowrap text-neutral-500 text-[11px]">
                        {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>

                      {/* Status Badge */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border ${r.isApproved ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                          {r.isApproved ? 'Approved' : 'Pending / Rejected'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setViewingReview(r)}
                            className="p-1.5 text-neutral-500 hover:text-brand-gold hover:bg-amber-50 border border-neutral-200 rounded transition-colors"
                            title="View Full Details"
                          >
                            <Eye size={15} />
                          </button>

                          <button
                            onClick={() => handleToggleStatus(r.id, r.isApproved)}
                            disabled={updatingId === r.id}
                            className={`px-2.5 py-1.5 text-xs font-semibold rounded flex items-center gap-1 transition-colors ${r.isApproved ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/80' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/80'}`}
                            title={r.isApproved ? 'Unapprove / Reject Review' : 'Approve Review'}
                          >
                            {r.isApproved ? (
                              <>
                                <XCircle size={14} /> Reject
                              </>
                            ) : (
                              <>
                                <CheckCircle size={14} /> Approve
                              </>
                            )}
                          </button>

                          {canDeleteReview && (
                            <button
                              onClick={() => handleDeleteReview(r.id)}
                              disabled={updatingId === r.id}
                              className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Delete Review"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <PaginationBottom
            currentPage={page}
            totalPages={totalPages}
            totalItems={total}
            onPageChange={(p) => setPage(p)}
          />
        </div>

        {/* View Full Review Details Modal */}
        <AnimatePresence>
          {viewingReview && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs" onClick={() => setViewingReview(null)}>
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-xl p-6 relative overflow-hidden"
                onClick={e => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-neutral-100 mb-5">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="text-brand-gold" size={20} />
                    <h3 className="font-bold text-neutral-900 text-base sm:text-lg">Review Details</h3>
                  </div>
                  <button
                    onClick={() => setViewingReview(null)}
                    className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Body content */}
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                  {/* Product Information */}
                  <div className="flex items-center gap-4 bg-neutral-50 p-3.5 rounded-xl border border-neutral-100">
                    <img
                      src={getImageUrl(viewingReview.productImage) || '/placeholder.jpg'}
                      alt={viewingReview.productName}
                      className="w-14 h-16 object-cover rounded-lg border border-neutral-200 bg-white flex-shrink-0"
                      onError={(e) => { e.target.onerror = null; e.target.src = '/placeholder.jpg'; }}
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">Product Name</span>
                      <h4 className="font-bold text-neutral-900 text-sm truncate">{viewingReview.productName}</h4>
                      <p className="text-xs text-neutral-500 font-mono mt-0.5">Product ID: #{viewingReview.productId}</p>
                    </div>
                  </div>

                  {/* Customer & Rating Info Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-100">
                      <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">Customer Details</span>
                      <p className="font-bold text-neutral-900 text-sm mt-1">{viewingReview.reviewerName || 'Anonymous'}</p>
                      <p className="text-xs text-neutral-500 truncate">{viewingReview.reviewerEmail || 'No email'}</p>
                      {viewingReview.isVerifiedPurchase && (
                        <span className="inline-block text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full mt-2 border border-emerald-200">
                          ✓ Verified Buyer
                        </span>
                      )}
                    </div>

                    <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-100">
                      <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">Rating & Submission</span>
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} size={15} className={s <= viewingReview.rating ? 'fill-brand-gold text-brand-gold' : 'fill-neutral-200 text-neutral-200'} />
                          ))}
                        </div>
                        <span className="font-bold text-neutral-900 text-xs">{viewingReview.rating}.0 / 5</span>
                      </div>
                      <p className="text-[11px] text-neutral-500 mt-2">
                        {new Date(viewingReview.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex items-center justify-between bg-neutral-50 p-3 rounded-xl border border-neutral-100">
                    <span className="text-xs font-semibold text-neutral-600">Moderation Status:</span>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${viewingReview.isApproved ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                      {viewingReview.isApproved ? 'Approved' : 'Pending / Rejected'}
                    </span>
                  </div>

                  {/* Full Review Content */}
                  <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100 space-y-2">
                    <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">Review Content</span>
                    {viewingReview.title && (
                      <h4 className="font-bold text-neutral-900 text-sm border-b border-neutral-200/60 pb-2">{viewingReview.title}</h4>
                    )}
                    <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap pt-1">{viewingReview.body}</p>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-4 mt-4 border-t border-neutral-100 gap-3">
                  <button
                    onClick={() => {
                      handleToggleStatus(viewingReview.id, viewingReview.isApproved);
                      setViewingReview(prev => prev ? { ...prev, isApproved: !prev.isApproved } : null);
                    }}
                    className={`px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors ${viewingReview.isApproved ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'}`}
                  >
                    {viewingReview.isApproved ? <><XCircle size={15} /> Reject Review</> : <><CheckCircle size={15} /> Approve Review</>}
                  </button>

                  <button
                    onClick={() => setViewingReview(null)}
                    className="px-5 py-2 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </AdminLayout>
  );
};

export default ReviewsAdminPage;
