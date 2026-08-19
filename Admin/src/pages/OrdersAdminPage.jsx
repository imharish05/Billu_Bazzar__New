import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, Eye } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import AdminOrderDetailsModal from '../components/AdminOrderDetailsModal';
import { PaginationTop, PaginationBottom } from '../components/Pagination';
import { fetchAdminOrders, updateOrderStatus } from '../redux/slices/ordersSlice';
import currencyJs from 'currency.js';
import { toast } from 'react-hot-toast';
import { checkPermission } from '../utils/rbac';

import api from '../services/api';

const fmt = (v) => currencyJs(v, { symbol: '₹', precision: 0 }).format();

const STATUS_TABS = ['All', 'PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURNED'];
const STATUS_LABELS = {
  All: 'All',
  PENDING: 'New Orders',
  PENDING_PAYMENT: 'Pending Payment',
  PAID: 'Paid',
  CONFIRMED: 'Confirmed',
  PROCESSING: 'Packing',
  SHIPPED: 'Dispatched',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  RETURNED: 'Returned',
};
const STATUS_COLORS = {
  PENDING: 'bg-amber-50 text-amber-800 font-medium',
  PENDING_PAYMENT: 'bg-yellow-50 text-yellow-800 font-medium border border-yellow-200',
  PAID: 'bg-emerald-50 text-emerald-800 font-medium border border-emerald-200',
  CONFIRMED: 'bg-blue-50 text-blue-800 font-medium border border-blue-200',
  PROCESSING: 'bg-yellow-50 text-yellow-800 font-medium',
  SHIPPED: 'bg-purple-50 text-purple-800 font-medium',
  OUT_FOR_DELIVERY: 'bg-sky-50 text-sky-800 font-medium',
  DELIVERED: 'bg-emerald-50 text-emerald-800 font-medium',
  CANCELLED: 'bg-rose-50 text-rose-800 font-medium',
  RETURNED: 'bg-pink-50 text-pink-800 font-medium',
};
const PAY_COLORS = { PAID: 'bg-green-50 text-green-700', UNPAID: 'bg-yellow-50 text-yellow-700', REFUNDED: 'bg-gray-100 text-gray-500' };

const OrdersAdminPage = () => {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const { items: orders, loading, total, totalPages } = useSelector(s => s.orders);
  const { admin } = useSelector(s => s.auth);
  const canUpdateOrder = checkPermission(admin, 'update_orders');

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [selectedOrderModal, setSelectedOrderModal] = useState(null);
  const [orderCounts, setOrderCounts] = useState({});

  const statusFromUrl = searchParams.get('status');
  const activeStatus = statusFromUrl || 'All';

  const loadCounts = async () => {
    try {
      const res = await api.get('/orders/status-counts');
      if (res.data.success) {
        setOrderCounts(res.data.counts || {});
      }
    } catch (err) {
      console.error('Failed to load status counts:', err);
    }
  };

  useEffect(() => {
    dispatch(fetchAdminOrders({
      status: activeStatus === 'All' ? undefined : activeStatus,
      search: search || undefined,
      page,
      limit
    }));
    loadCounts();
  }, [activeStatus, search, page, limit, dispatch]);

  useEffect(() => {
    const handleStatusChanged = () => {
      loadCounts();
      dispatch(fetchAdminOrders({
        status: activeStatus === 'All' ? undefined : activeStatus,
        search: search || undefined,
        page,
        limit
      }));
    };
    window.addEventListener('adminOrderStatusChanged', handleStatusChanged);
    return () => {
      window.removeEventListener('adminOrderStatusChanged', handleStatusChanged);
    };
  }, [activeStatus, search, page, limit, dispatch]);

  const handleTabClick = (s) => {
    setPage(1);
    if (s === 'All') {
      setSearchParams({});
    } else {
      setSearchParams({ status: s });
    }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      await dispatch(updateOrderStatus({ id, status })).unwrap();
      toast.success(`Order status updated to ${status}`);
    } catch (err) {
      toast.error(err || 'Failed to update order status');
    }
  };

  const filtered = activeStatus === 'All' 
    ? orders 
    : (activeStatus === 'PENDING' 
        ? orders.filter(o => o.status === 'PENDING' || o.status === 'PENDING_PAYMENT' || o.status === 'PAID' || o.status === 'PAYMENT_RECEIVED_STOCK_FAILED') 
        : orders.filter(o => o.status === activeStatus));

  const orderHeaders = ['Order', 'Customer', 'Items', 'Amount', 'Payment'];
  if (canUpdateOrder) orderHeaders.push('Status');
  orderHeaders.push('Date', 'Actions');

  return (
    <AdminLayout title="Orders">
      {/* Status tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-hide" role="tablist">
        {STATUS_TABS.map(s => {
          const countKey = s === 'All' ? 'ALL' : s;
          const count = orderCounts[countKey];
          return (
            <button
              key={s}
              onClick={() => handleTabClick(s)}
              role="tab" aria-selected={activeStatus === s}
              id={`orders-tab-${s}`}
              className={`flex-shrink-0 px-3.5 py-2 text-xs font-medium rounded-lg transition-all flex items-center gap-2 ${
                activeStatus === s ? 'bg-brand-gold text-white shadow-xs font-semibold' : 'bg-white text-brand-grey hover:bg-brand-light'
              }`}
            >
              <span>{STATUS_LABELS[s] || s}</span>
              {count !== undefined && (
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  activeStatus === s 
                    ? 'bg-white/20 text-white' 
                    : (count > 0 ? 'bg-amber-100 text-amber-900' : 'bg-neutral-100 text-neutral-500')
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <PaginationTop
          search={search}
          onSearchChange={(s) => { setSearch(s); setPage(1); }}
          searchPlaceholder="Search order..."
          currentPage={page}
          totalItems={total || 0}
          limit={limit}
          onLimitChange={(l) => { setLimit(l); setPage(1); }}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label="Orders table">
            <thead>
              <tr className="bg-brand-light/40 text-left">
                {orderHeaders.map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-brand-grey uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i} className="border-b border-brand-light">
                    {[...Array(orderHeaders.length)].map((_, j) => <td key={j} className="px-4 py-3"><div className="skeleton h-4 w-16" /></td>)}
                  </tr>
                ))
              ) : filtered.map(order => (
                <tr key={order.id} className="border-b border-brand-light hover:bg-brand-light/20 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs font-semibold text-brand-gold">{order.orderNumber}</span>
                    {order.isFraudFlagged && <AlertTriangle size={12} className="inline ml-1 text-red-500" title="Fraud flagged" />}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{order.customer?.name || 'Customer'}</p>
                    <p className="text-xs text-brand-grey">{order.customer?.email}</p>
                  </td>
                  <td className="px-4 py-3 text-center font-medium">
                    {order.items && order.items.length > 0
                      ? order.items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0)
                      : 1}
                  </td>
                  <td className="px-4 py-3 font-semibold">{fmt(order.totalAmount)}</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${PAY_COLORS[order.paymentStatus] || 'bg-gray-100'}`}>{order.paymentStatus}</span></td>
                  {canUpdateOrder && (
                    <td className="px-4 py-3">
                      <select
                        value={order.status}
                        onChange={e => handleStatusUpdate(order.id, e.target.value)}
                        className={`text-xs px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none ${STATUS_COLORS[order.status] || 'bg-gray-100'}`}
                        id={`status-${order.id}`}
                        aria-label="Order status"
                      >
                        {['PENDING','CONFIRMED','PROCESSING','SHIPPED','OUT_FOR_DELIVERY','DELIVERED','CANCELLED','RETURNED'].map(s => (
                          <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>
                        ))}
                      </select>
                    </td>
                  )}
                  <td className="px-4 py-3 text-brand-grey text-xs">{new Date(order.createdAt).toLocaleDateString('en-IN')}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedOrderModal(order)}
                      className="p-1.5 bg-brand-gold/10 hover:bg-brand-gold hover:text-white text-brand-gold rounded-lg transition-all flex items-center gap-1 text-xs font-medium border border-brand-gold/20"
                      title="View Order Details"
                      id={`view-order-${order.id}`}
                    >
                      <Eye size={15} /> Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && filtered.length === 0 && (
            <div className="py-12 text-center text-brand-grey">No orders found for this status.</div>
          )}
        </div>
        <PaginationBottom
          currentPage={page}
          totalPages={totalPages || 1}
          totalItems={total || 0}
          onPageChange={(p) => setPage(p)}
        />
      </div>

      {/* Reusable Admin Order Details Modal */}
      {selectedOrderModal && (
        <AdminOrderDetailsModal
          order={selectedOrderModal}
          onClose={() => setSelectedOrderModal(null)}
          onStatusUpdate={handleStatusUpdate}
        />
      )}
    </AdminLayout>
  );
};

export default OrdersAdminPage;

