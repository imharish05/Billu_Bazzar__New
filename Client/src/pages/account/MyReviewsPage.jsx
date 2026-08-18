import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Edit3, Trash2, Eye, Package, MessageSquare, CheckCircle, AlertCircle, X, Loader2, ExternalLink, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchMyDeliveredItems, createReview, updateReview, deleteReview } from '../../redux/slices/reviewsSlice';
import toast from 'react-hot-toast';

const StarPicker = ({ value, onChange }) => (
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map(s => (
      <button
        key={s}
        type="button"
        onClick={() => onChange(s)}
        className="transition-transform hover:scale-110"
      >
        <Star
          size={22}
          className={s <= value ? 'fill-amber-400 text-amber-400' : 'fill-neutral-200 text-neutral-200'}
        />
      </button>
    ))}
  </div>
);

const RatingStars = ({ rating, size = 14 }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map(s => (
      <Star
        key={s}
        size={size}
        className={s <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'fill-neutral-200 text-neutral-200'}
      />
    ))}
  </div>
);

const EditReviewModal = ({ item, onClose, onSave, submitting }) => {
  const [rating, setRating] = useState(item.existingReview?.rating || 5);
  const [title, setTitle] = useState(item.existingReview?.title || '');
  const [body, setBody] = useState(item.existingReview?.body || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!body.trim()) return toast.error('Please write your review before submitting.');
    onSave({ rating, title, body });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-full hover:bg-neutral-100 text-neutral-400">
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <img
            src={item.productImage || '/placeholder.jpg'}
            alt={item.productName}
            className="w-12 h-14 object-cover rounded-lg border border-neutral-100"
          />
          <div>
            <h3 className="font-semibold text-neutral-900 text-sm">{item.productName}</h3>
            <p className="text-xs text-neutral-400">Order #{item.orderNumber}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-2">Your Rating</label>
            <StarPicker value={rating} onChange={setRating} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Review Title (optional)</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Summarize your experience..."
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:border-amber-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Your Review <span className="text-red-500">*</span></label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={4}
              placeholder="Share your experience with this product..."
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm resize-none focus:border-amber-400 focus:outline-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-amber-400 hover:bg-amber-500 text-white font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : (item.existingReview ? 'Save Review' : 'Submit Review')}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

const MyReviewsPage = () => {
  const dispatch = useDispatch();
  const { deliveredItems, submitting } = useSelector(s => s.reviews);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState(null);
  const [expandedView, setExpandedView] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all' | 'reviewed' | 'pending'

  useEffect(() => {
    dispatch(fetchMyDeliveredItems()).finally(() => setLoading(false));
  }, [dispatch]);

  const handleSaveReview = async ({ rating, title, body }) => {
    if (!editingItem) return;
    try {
      if (editingItem.existingReview) {
        await dispatch(updateReview({
          id: editingItem.existingReview.id,
          rating,
          title,
          body,
          productId: editingItem.productId,
        })).unwrap();
        toast.success('Review updated successfully!');
      } else {
        await dispatch(createReview({
          productId: editingItem.productId,
          orderId: editingItem.orderId,
          rating,
          title,
          body,
        })).unwrap();
        toast.success('Review submitted successfully!');
      }
      // Refresh list
      dispatch(fetchMyDeliveredItems());
      setEditingItem(null);
    } catch (err) {
      toast.error(err || 'Failed to save review');
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm('Delete your review for this product?')) return;
    try {
      await dispatch(deleteReview({ id: item.existingReview.id, productId: item.productId })).unwrap();
      toast.success('Review deleted.');
      dispatch(fetchMyDeliveredItems());
    } catch (err) {
      toast.error(err || 'Failed to delete review');
    }
  };

  const filtered = deliveredItems.filter(item => {
    if (filter === 'reviewed') return !!item.existingReview;
    if (filter === 'pending') return !item.existingReview;
    return true;
  });

  const reviewedCount = deliveredItems.filter(i => !!i.existingReview).length;
  const pendingCount = deliveredItems.filter(i => !i.existingReview).length;

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-playfair font-bold text-neutral-900">My Reviews</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Reviews you've written for delivered products. You can view, edit, or delete them anytime.
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-6">
        {[
          { label: 'Delivered Items', value: deliveredItems.length, icon: Package, color: 'text-brand-gold' },
          { label: 'Reviews Written', value: reviewedCount, icon: CheckCircle, color: 'text-green-600' },
          { label: 'Pending Reviews', value: pendingCount, icon: AlertCircle, color: 'text-amber-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white border border-neutral-200/80 rounded-xl p-3.5 sm:p-4 text-center shadow-xs flex flex-col items-center justify-center">
            <Icon size={18} className={`${color} mb-1`} />
            <p className="text-lg sm:text-xl font-bold text-neutral-900">{value}</p>
            <p className="text-[11px] sm:text-xs text-neutral-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1 scrollbar-hide">
        {[
          { key: 'all', label: 'All Purchases' },
          { key: 'reviewed', label: 'Reviewed' },
          { key: 'pending', label: 'Awaiting Review' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`whitespace-nowrap px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex-shrink-0 ${filter === tab.key ? 'bg-amber-400 text-white shadow-sm' : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 size={28} className="animate-spin text-amber-400" />
          <p className="text-sm text-neutral-500">Loading your purchases...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-neutral-200/80 rounded-2xl p-8 sm:p-12 text-center shadow-sm">
          <MessageSquare size={40} className="text-neutral-300 mx-auto mb-3" strokeWidth={1.5} />
          <h3 className="font-semibold text-neutral-800 mb-1">
            {filter === 'pending' ? 'No Pending Reviews' : filter === 'reviewed' ? 'No Reviews Yet' : 'No Delivered Orders Yet'}
          </h3>
          <p className="text-xs sm:text-sm text-neutral-500 max-w-xs mx-auto leading-relaxed">
            {filter === 'all'
              ? 'Once your orders are delivered, you can share your experience here.'
              : filter === 'pending'
              ? 'All your delivered products have been reviewed!'
              : 'Start reviewing your delivered products to help other shoppers.'}
          </p>
          {filter === 'all' && (
            <Link to="/account/orders" className="mt-5 inline-block px-5 py-2.5 bg-amber-400 text-white text-xs sm:text-sm font-semibold rounded-xl hover:bg-amber-500 transition-colors shadow-sm">
              View My Orders
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((item, idx) => (
              <motion.div
                key={`${item.orderId}-${item.productId}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ delay: idx * 0.04, duration: 0.2 }}
                className="bg-white border border-neutral-200/80 rounded-2xl shadow-sm p-4 sm:p-5"
              >
                {/* Product Header Row: Image + Details + Status Badge */}
                <div className="flex items-start gap-3.5 sm:gap-4">
                  <Link to={item.productSlug ? `/products/${item.productSlug}` : '#'}>
                    <img
                      src={item.productImage || '/placeholder.jpg'}
                      alt={item.productName}
                      className="w-16 h-20 sm:w-20 sm:h-24 object-cover rounded-xl border border-neutral-100 flex-shrink-0 hover:opacity-90 transition-opacity shadow-xs"
                    />
                  </Link>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-2">
                      <div>
                        <Link
                          to={item.productSlug ? `/products/${item.productSlug}` : '#'}
                          className="font-semibold text-neutral-900 hover:text-amber-600 transition-colors text-sm sm:text-base flex items-center gap-1.5 leading-snug"
                        >
                          <span className="truncate">{item.productName}</span>
                          <ExternalLink size={13} className="text-neutral-400 flex-shrink-0" />
                        </Link>
                        <p className="text-[11px] sm:text-xs text-neutral-400 mt-0.5">
                          Order #{item.orderNumber} · {new Date(item.deliveredAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>

                      {/* Status Badge */}
                      <div className="mt-0.5 sm:mt-0">
                        {item.existingReview ? (
                          <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                            <Check size={12} /> Reviewed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200/80">
                            Awaiting Review
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Review Content & Actions: Spans full width below header */}
                <div className="mt-3.5 sm:mt-4 space-y-3">
                  {/* Existing Review Preview Box */}
                  {item.existingReview && (
                    <div className="bg-neutral-50/80 rounded-xl p-3.5 sm:p-4 border border-neutral-200/60 w-full space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <RatingStars rating={item.existingReview.rating} size={14} />
                          <span className="text-xs font-bold text-neutral-800">{item.existingReview.rating}.0</span>
                        </div>
                        {item.existingReview.isApproved ? (
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded border border-emerald-200/60">Published</span>
                        ) : (
                          <span className="text-[10px] font-semibold text-amber-700 bg-amber-100/60 px-2 py-0.5 rounded border border-amber-200/60">Pending Approval</span>
                        )}
                      </div>
                      {item.existingReview.title && (
                        <h4 className="text-xs sm:text-sm font-semibold text-neutral-900">{item.existingReview.title}</h4>
                      )}
                      <p className={`text-xs sm:text-sm text-neutral-600 leading-relaxed ${expandedView !== `${item.orderId}-${item.productId}` ? 'line-clamp-2 sm:line-clamp-3' : ''}`}>
                        {item.existingReview.body}
                      </p>
                      {item.existingReview.body?.length > 100 && (
                        <button
                          className="text-[11px] text-amber-600 font-semibold mt-1 hover:underline inline-block"
                          onClick={() => setExpandedView(prev => prev === `${item.orderId}-${item.productId}` ? null : `${item.orderId}-${item.productId}`)}
                        >
                          {expandedView === `${item.orderId}-${item.productId}` ? 'Show Less' : 'Read More'}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Actions Row */}
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    {item.existingReview ? (
                      <>
                        <button
                          onClick={() => setEditingItem(item)}
                          className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-colors"
                        >
                          <Edit3 size={13} /> Edit Review
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-colors"
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                        <Link
                          to={item.productSlug ? `/products/${item.productSlug}` : '#'}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-neutral-100 text-neutral-700 hover:bg-neutral-200 border border-neutral-200 transition-colors"
                        >
                          <Eye size={13} /> View Product
                        </Link>
                      </>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                        <button
                          onClick={() => setEditingItem(item)}
                          className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-xs font-semibold rounded-xl bg-amber-400 text-white hover:bg-amber-500 shadow-sm transition-colors cursor-pointer"
                        >
                          <Star size={14} /> Write a Review
                        </button>
                        <Link
                          to={item.productSlug ? `/products/${item.productSlug}?writeReview=true` : '#'}
                          className="inline-flex items-center justify-center gap-1 px-3.5 py-2.5 text-xs font-medium text-neutral-500 hover:text-neutral-900 border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-colors"
                        >
                          <ExternalLink size={13} /> View Product
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Edit Modal */}
      <AnimatePresence>
        {editingItem && (
          <EditReviewModal
            item={editingItem}
            onClose={() => setEditingItem(null)}
            onSave={handleSaveReview}
            submitting={submitting}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default MyReviewsPage;
