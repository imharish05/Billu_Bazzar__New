import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Package, Download, MapPin, Clock, RefreshCw } from 'lucide-react';
import Footer from '../components/Footer';
import { printInvoice } from '../utils/invoiceGenerator';
import { formatPrice } from '../utils/currency';
import { fetchOrderById } from '../redux/slices/ordersSlice';
import api from '../services/api';

/* Helper to calculate dynamic tracking steps based on order.status & paymentStatus */
const calculateTrackingSteps = (currentStatus, currentPaymentStatus) => {
  const status = (currentStatus || 'CONFIRMED').toUpperCase();
  const isPaid = (currentPaymentStatus || '').toUpperCase() === 'PAID' || status === 'PAID' || status === 'CONFIRMED';

  if (status === 'CANCELLED') {
    return [
      { status: 'Order Placed', done: true },
      { status: 'Order Cancelled', done: true, isCancelled: true },
    ];
  }

  if (status === 'RETURNED' || status === 'REFUNDED') {
    return [
      { status: 'Order Placed', done: true },
      { status: 'Delivered', done: true },
      { status: status === 'RETURNED' ? 'Item Returned' : 'Refunded', done: true, isReturn: true },
    ];
  }

  const statusLevelMap = {
    PENDING_PAYMENT: isPaid ? 1 : 0,
    PAID: 1,
    PENDING: 1,
    CONFIRMED: 1,
    PROCESSING: 2,
    SHIPPED: 3,
    OUT_FOR_DELIVERY: 4,
    DELIVERED: 5,
  };

  const currentLevel = statusLevelMap[status] !== undefined ? statusLevelMap[status] : 1;

  const baseSteps = [
    { status: 'Order Placed', level: 0 },
    { status: 'Payment Confirmed', level: 1 },
    { status: 'Processing', level: 2 },
    { status: 'Dispatched', level: 3 },
    { status: 'Out for Delivery', level: 4 },
    { status: 'Delivered', level: 5 },
  ];

  return baseSteps.map(step => ({
    status: step.status,
    done: currentLevel >= step.level || (step.level === 1 && isPaid) || status === 'DELIVERED',
  }));
};

const OrderConfirmationPage = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const orderIdFromUrl = searchParams.get('orderId');

  const { current: order } = useSelector(s => s.orders);
  const { code: currencyCode, rate: currencyRate } = useSelector(s => s.currency);

  const [refreshing, setRefreshing] = useState(false);
  const targetId = orderIdFromUrl || order?.id || order?.orderNumber;

  useEffect(() => {
    if (targetId) {
      dispatch(fetchOrderById(targetId)).then(async (action) => {
        const fetchedOrder = action.payload?.order || action.payload;
        if (fetchedOrder && (fetchedOrder.paymentStatus === 'UNPAID' || fetchedOrder.status === 'PENDING_PAYMENT')) {
          const isSuccess = searchParams.get('status') === 'success' || Boolean(searchParams.get('gateway'));
          if (isSuccess) {
            try {
              await api.post('/payments/verify', { orderId: fetchedOrder.id });
              dispatch(fetchOrderById(targetId));
            } catch (err) {
              console.warn('[OrderConfirmation] Auto-verify payment failed:', err.message);
            }
          }
        }
      });
    }
  }, [targetId, searchParams, dispatch]);

  const handleManualRefresh = async () => {
    if (!targetId || refreshing) return;
    setRefreshing(true);
    await dispatch(fetchOrderById(targetId));
    setTimeout(() => setRefreshing(false), 500);
  };

  const fmt = (v) => formatPrice(v, currencyCode, currencyRate);

  const isSuccessParam = searchParams.get('status') === 'success';
  const displayStatus = (order?.status === 'PENDING_PAYMENT' && isSuccessParam) ? 'CONFIRMED' : (order?.status || 'CONFIRMED');
  const displayPaymentStatus = (order?.paymentStatus === 'UNPAID' && (isSuccessParam || order?.status === 'CONFIRMED' || order?.status === 'PAID')) ? 'PAID' : (order?.paymentStatus || 'PAID');

  const trackingSteps = calculateTrackingSteps(displayStatus, displayPaymentStatus);

  let addr = order?.shippingAddress || {};
  if (typeof addr === 'string') {
    try { addr = JSON.parse(addr); } catch (e) { addr = {}; }
  }
  const addrName = addr.fullName || addr.name || order?.customer?.name || 'Valued Customer';
  const addrLine1 = addr.flatHouse || addr.line1 || addr.addressLine1 || '';
  const addrLine2 = addr.areaStreet || addr.line2 || addr.addressLine2 || '';
  const addrCityStateZip = [
    addr.city,
    addr.state,
    addr.pincode || addr.zipCode || addr.zip_code
  ].filter(Boolean).join(', ');
  const addrPhone = addr.phone || order?.customer?.phone;

  return (
    <main id="main-content">
      <div className="max-w-3xl mx-auto px-6 md:px-8 py-12">
        {/* Success header */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="text-center mb-12"
        >
          <div className="w-24 h-24 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6 shadow-sm border border-green-100">
            <CheckCircle size={52} className="text-green-500 animate-pulse" strokeWidth={1.5} />
          </div>
          <h1 className="font-playfair text-4xl font-bold text-brand-text mb-2">Order Confirmed!</h1>
          <p className="text-brand-grey">Thank you for shopping at Billu Bazaar.</p>
          {order && (
            <div className="flex items-center justify-center gap-3 mt-3">
              <span className="text-brand-gold font-bold text-lg">Order #{order.orderNumber}</span>
              <span className={`text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider ${
                displayStatus === 'DELIVERED' || displayStatus === 'PAID' || displayStatus === 'CONFIRMED'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : displayStatus === 'CANCELLED'
                  ? 'bg-red-100 text-red-700 border border-red-300'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}>
                {displayStatus.replace(/_/g, ' ')}
              </span>
            </div>
          )}
        </motion.div>

        {/* Order details grid */}
        {order && (
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white shadow-sm p-6 border border-brand-light rounded-xl">
              <h3 className="font-playfair text-lg font-bold text-brand-text mb-4 flex items-center gap-2.5">
                <Package size={22} className="text-brand-gold" /> Order Details
              </h3>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between"><span className="text-brand-grey">Order Total</span><span className="font-bold text-brand-gold">{fmt(order.totalAmount)}</span></div>
                <div className="flex justify-between"><span className="text-brand-grey">Payment Method</span><span className="font-medium">{order.paymentMethod || 'Credit / Debit Card'}</span></div>
                <div className="flex justify-between"><span className="text-brand-grey">Payment Status</span><span className="font-semibold text-emerald-600">{displayPaymentStatus}</span></div>
                <div className="flex justify-between"><span className="text-brand-grey">Items Count</span><span>{order.items?.length || 0} item(s)</span></div>
              </div>
            </div>
            <div className="bg-white shadow-sm p-6 border border-brand-light rounded-xl">
              <h3 className="font-playfair text-lg font-bold text-brand-text mb-4 flex items-center gap-2.5">
                <MapPin size={22} className="text-brand-gold" /> Shipping Address
              </h3>
              <p className="text-sm font-semibold text-brand-text">{addrName}</p>
              {addrLine1 && <p className="text-sm text-brand-grey mt-1">{addrLine1}</p>}
              {addrLine2 && <p className="text-sm text-brand-grey">{addrLine2}</p>}
              {addr.landmark && <p className="text-xs text-brand-grey text-neutral-500">Near {addr.landmark}</p>}
              {addrCityStateZip && <p className="text-sm text-brand-grey mt-1">{addrCityStateZip}</p>}
              {addr.country && <p className="text-xs font-medium text-brand-text mt-0.5">{addr.country}</p>}
              {addrPhone && <p className="text-xs text-brand-grey mt-2 font-mono">📱 {addrPhone}</p>}
            </div>
          </div>
        )}

        {/* Order Tracking */}
        <div className="bg-white shadow-sm p-6 mb-6 border border-brand-light rounded-xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-playfair text-lg font-bold text-brand-text flex items-center gap-2">
              <Clock size={20} className="text-brand-gold" /> Live Order Tracking
            </h3>
            <button
              type="button"
              onClick={handleManualRefresh}
              className="text-[11px] text-neutral-600 flex items-center gap-1.5 bg-neutral-100 hover:bg-neutral-200/80 px-3 py-1 rounded-full border border-neutral-200/80 transition-colors font-medium cursor-pointer"
              title="Click to refresh order status"
            >
              <RefreshCw size={12} className={`text-brand-gold ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Syncing...' : 'Refresh Status'}
            </button>
          </div>

          <div className="relative pl-2">
            <div className="absolute left-[17px] top-3 bottom-3 w-0.5 bg-neutral-200" aria-hidden="true" />
            <div className="space-y-6">
              {trackingSteps.map((step, i) => (
                <motion.div
                  key={step.status}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-4 relative z-10"
                >
                  <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                    step.isCancelled
                      ? 'bg-red-500 border-red-500 text-white shadow-sm'
                      : step.done 
                      ? 'bg-brand-gold border-brand-gold text-white shadow-sm ring-4 ring-brand-gold/10' 
                      : 'bg-white border-neutral-300'
                  }`}>
                    {step.done && (
                      <div className="w-2.5 h-2.5 rounded-full bg-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`font-semibold text-sm ${step.done ? 'text-brand-text' : 'text-neutral-400'}`}>
                      {step.status}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Mock tracking map placeholder */}
        <div className="bg-brand-light h-44 flex items-center justify-center mb-6 relative overflow-hidden rounded-xl border border-brand-light">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-50/40 to-amber-100/30 opacity-60" />
          <div className="relative text-center p-4">
            <MapPin size={28} className="text-brand-gold mx-auto mb-2" />
            <p className="text-sm font-semibold text-brand-text">Shipment Tracking Active</p>
            <p className="text-xs text-brand-grey mt-0.5">Estimated Delivery: 2–4 Business Days via Billu Express Logistics</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={() => printInvoice(order)} className="btn-outline flex items-center justify-center gap-2 flex-1 py-3.5" id="download-invoice">
            <Download size={16} /> Download Invoice
          </button>
          <Link to="/account?tab=orders" className="btn-primary flex items-center justify-center gap-2 flex-1 py-3.5" id="view-orders">
            View All Orders
          </Link>
        </div>

        <div className="text-center mt-10">
          <Link to="/products" className="text-brand-gold font-semibold text-sm hover:underline focus-visible:outline-brand-gold" id="continue-shopping-confirm">
            ← Continue Shopping
          </Link>
        </div>
      </div>
      <Footer />
    </main>
  );
};

export default OrderConfirmationPage;
