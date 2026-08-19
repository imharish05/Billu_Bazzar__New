import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Package, ChevronRight, RefreshCw } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchMyOrders } from '../../redux/slices/ordersSlice';
import { formatPrice, formatOrderAmount } from '../../utils/currency';
import { getImageUrl } from '../../utils/imageUrl';
import { getPlaceholderSvg } from '../../utils/placeholder';

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
  SHIPPED: 'Shipped',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  RETURNED: 'Returned',
  REFUNDED: 'Refunded',
};

const OrdersPage = () => {
  const dispatch = useDispatch();
  const { items: orders, loading, error } = useSelector(s => s.orders);

  useEffect(() => {
    dispatch(fetchMyOrders());
  }, [dispatch]);

  const sortedOrders = [...orders].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <div className="flex justify-between items-center mb-5">
        <h1 className="font-playfair text-xl font-semibold">My Orders</h1>
        {loading && <RefreshCw size={16} className="animate-spin text-brand-gold" />}
      </div>

      {loading && sortedOrders.length === 0 ? (
        <div className="bg-white shadow-sm p-12 text-center">
          <div className="h-8 w-8 border-2 border-brand-gold border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-brand-grey text-sm">Fetching your orders from server...</p>
        </div>
      ) : error && sortedOrders.length === 0 ? (
        <div className="bg-white shadow-sm p-8 text-center border border-red-100">
          <p className="text-red-600 text-sm mb-3">{error}</p>
          <button onClick={() => dispatch(fetchMyOrders())} className="btn-outline text-xs px-4 py-2">
            Try Again
          </button>
        </div>
      ) : sortedOrders.length === 0 ? (
        <div className="bg-white shadow-sm p-12 text-center">
          <Package size={40} className="text-brand-light mx-auto mb-3" strokeWidth={1} />
          <p className="font-playfair text-xl mb-2">No orders yet</p>
          <p className="text-brand-grey text-sm mb-4">Start exploring our luxury curated collections</p>
          <Link to="/products" className="btn-primary" id="orders-empty-shop">Shop Now</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedOrders.map(order => {
            const itemCount = (order.items || []).reduce((sum, item) => sum + (item.quantity || 1), 0);
            const firstItem = order.items && order.items[0];

            return (
              <Link
                key={order.id}
                to={`/account/orders/${order.id}`}
                className="block bg-white shadow-sm hover:shadow-md transition-all p-5 border border-neutral-100 hover:border-brand-gold/40 rounded-lg group"
                id={`order-row-${order.id}`}
              >
                <div className="flex justify-between items-start mb-3 flex-wrap gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-neutral-900 text-base">Order {order.orderNumber}</p>
                      {order.currency && (
                        <span className="text-[10px] uppercase bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded font-mono">
                          {order.currency}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-brand-grey mt-0.5">
                      {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-700'}`}>
                      {STATUS_LABELS[order.status] || order.status}
                    </span>
                  </div>
                </div>

                {/* Optional Product Thumbnail Preview */}
                {firstItem && (() => {
                  let vObj = firstItem.selectedVariant;
                  for (let i = 0; i < 5; i++) {
                    if (typeof vObj === 'string') {
                      try { const next = JSON.parse(vObj); if (next === vObj) break; vObj = next; } catch { break; }
                    } else break;
                  }
                  const EXCLUDE = new Set(['id', 'sku', 'variantId', 'productId', 'stock', 'price', 'mrp']);
                  const vEntries = (vObj && typeof vObj === 'object')
                    ? Object.entries(vObj).filter(([k, v]) => !EXCLUDE.has(k) && v != null && v !== '')
                    : [];
                  const vText = vEntries.length > 0 ? vEntries.map(([k, v]) => `${k}: ${v}`).join(' · ') : null;

                  return (
                    <div className="flex items-center gap-3 py-3 my-2 border-y border-neutral-100">
                      <img
                        src={getImageUrl(firstItem.productImage || firstItem.image) || getPlaceholderSvg(firstItem.productName || firstItem.name || 'Product')}
                        alt={firstItem.productName || firstItem.name || 'Product'}
                        className="w-12 h-12 object-cover rounded border border-neutral-100 flex-shrink-0"
                        onError={(e) => { e.target.onerror = null; e.target.src = getPlaceholderSvg(firstItem.productName || firstItem.name || 'Product'); }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-neutral-800 truncate">
                          {firstItem.productName || firstItem.name}
                        </p>
                        {vText && (
                          <p className="text-[11px] text-brand-gold font-medium mt-0.5">{vText}</p>
                        )}
                        {order.items.length > 1 && (
                          <p className="text-[11px] text-brand-grey mt-0.5">
                            + {order.items.length - 1} more item{order.items.length - 1 > 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })()}

                <div className="flex justify-between items-center text-xs sm:text-sm pt-1">
                  <span className="text-neutral-500 font-medium">{itemCount} item{itemCount > 1 ? 's' : ''}</span>
                  <span className="font-bold text-brand-gold flex items-center gap-1 text-base">
                    {formatOrderAmount(order.totalAmount, order.currency || 'INR')}
                    <ChevronRight size={16} className="text-brand-grey group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};

export default OrdersPage;