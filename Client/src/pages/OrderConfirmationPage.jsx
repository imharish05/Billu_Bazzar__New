import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Package, Download, MapPin, Clock, RefreshCw } from 'lucide-react';
import Footer from '../components/Footer';
import { printInvoice } from '../utils/invoiceGenerator';
import { formatPrice, formatOrderAmount } from '../utils/currency';
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
  const orderIdFromUrl = searchParams.get('orderId') || searchParams.get('orderNumber') || searchParams.get('cartId');

  const { current: order } = useSelector(s => s.orders);
  const { code: currencyCode, rate: currencyRate } = useSelector(s => s.currency);

  const [refreshing, setRefreshing] = useState(false);
  const targetId = orderIdFromUrl || order?.id || order?.orderNumber;

  useEffect(() => {
    if (!targetId) return;
    let isMounted = true;

    dispatch(fetchOrderById(targetId)).then(async (action) => {
      if (!isMounted) return;
      const fetchedOrder = action.payload?.order || action.payload;
      if (fetchedOrder && (fetchedOrder.paymentStatus === 'UNPAID' || fetchedOrder.status === 'PENDING_PAYMENT')) {
        const isSuccess = searchParams.get('status') === 'success' || Boolean(searchParams.get('gateway'));
        if (isSuccess) {
          try {
            await api.post('/payments/verify', { orderId: fetchedOrder.id });
            if (isMounted) dispatch(fetchOrderById(targetId));
          } catch (err) {
            console.warn('[OrderConfirmation] Auto-verify payment failed:', err.message);
          }
        }
      }
    });

    return () => { isMounted = false; };
  }, [targetId, dispatch]);

  const handleManualRefresh = async () => {
    if (!targetId || refreshing) return;
    setRefreshing(true);
    await dispatch(fetchOrderById(targetId));
    setTimeout(() => setRefreshing(false), 500);
  };

  const fmt = (v) => formatOrderAmount(v, order?.currency || currencyCode);

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
  const addrEmail = addr.email || order?.customer?.email;

  return (
    <main id="main-content">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-12">
        {/* Success header */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="text-center mb-8 sm:mb-12"
        >
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-sm border border-green-100">
            <CheckCircle size={48} className="text-green-500 animate-pulse sm:w-[52px] sm:h-[52px]" strokeWidth={1.5} />
          </div>
          <h1 className="font-playfair text-3xl sm:text-4xl font-bold text-brand-text mb-2">Order Confirmed!</h1>
          <p className="text-brand-grey text-sm sm:text-base">Thank you for shopping at Billu Bazaar.</p>
          {order && (
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mt-3">
              <span className="text-brand-gold font-bold text-base sm:text-lg">Order {order.orderNumber}</span>
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
          <div className="grid md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className="bg-white shadow-sm p-5 sm:p-6 border border-brand-light rounded-xl flex flex-col justify-between">
              <div>
                <h3 className="font-playfair text-lg font-bold text-brand-text mb-4 flex items-center gap-2.5">
                  <Package size={22} className="text-brand-gold shrink-0" /> Order Details
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-brand-grey shrink-0 whitespace-nowrap">Order Total</span>
                    <span className="font-bold text-brand-gold text-base text-right">{fmt(order.totalAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-brand-grey shrink-0 whitespace-nowrap">Payment Method</span>
                    <span className="font-medium text-brand-text text-right">{order.paymentMethod || 'Credit / Debit Card'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-brand-grey shrink-0 whitespace-nowrap">Payment Status</span>
                    <span className="font-semibold text-emerald-600 text-right">{displayPaymentStatus}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-brand-grey shrink-0 whitespace-nowrap">Items Count</span>
                    <span className="text-brand-text text-right">{order.items?.length || 0} item(s)</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white shadow-sm p-5 sm:p-6 border border-brand-light rounded-xl">
              <h3 className="font-playfair text-base sm:text-lg font-bold text-brand-text mb-4 flex items-center gap-2.5">
                <MapPin size={22} className="text-brand-gold shrink-0" /> 
                Shipping Address
              </h3>
              <div className="text-sm font-sans space-y-1">
                <p className="font-semibold text-brand-text text-sm">{addrName}</p>
                {addrLine1 && <p className="text-neutral-600 text-sm mt-1">{addrLine1}</p>}
                {addrLine2 && <p className="text-neutral-600 text-sm">{addrLine2}</p>}
                {addr.landmark && <p className="text-neutral-500 text-sm">Near {addr.landmark}</p>}
                {addrCityStateZip && <p className="text-neutral-600 text-sm mt-1">{addrCityStateZip}</p>}
                {addr.country && <p className="font-medium text-brand-text text-sm mt-0.5">{addr.country}</p>}
                {(addrPhone || addrEmail) && (
                  <div className="text-neutral-500 text-sm mt-3 pt-2.5 border-t border-neutral-100 space-y-1">
                    {addrPhone && (
                      <p className="text-sm text-neutral-700">
                        <span className="font-medium text-neutral-900">Phone : </span>
                        <span className="text-neutral-600">{addrPhone}</span>
                      </p>
                    )}
                    {addrEmail && (
                      <p className="text-sm text-neutral-700 break-all">
                        <span className="font-medium text-neutral-900">Email : </span>
                        <span className="text-neutral-600">{addrEmail}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Order Tracking */}
        <div className="bg-white shadow-sm p-5 sm:p-6 mb-6 border border-brand-light rounded-xl">
          <div className="flex items-center justify-between gap-3 mb-6">
            <h3 className="font-playfair text-base sm:text-lg font-bold text-brand-text flex items-center gap-2 min-w-0">
              <Clock size={20} className="text-brand-gold shrink-0" />
              <span className="truncate">Live Order Tracking</span>
            </h3>
            <button
              type="button"
              onClick={handleManualRefresh}
              className="text-xs text-neutral-700 hover:text-brand-text flex items-center gap-1.5 bg-neutral-100 hover:bg-neutral-200 px-3.5 py-1.5 rounded-full border border-neutral-200/80 transition-all font-medium cursor-pointer shrink-0 active:scale-95"
              title="Click to refresh order status"
            >
              <RefreshCw size={13} className={`text-brand-gold ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Syncing...' : 'Refresh Status'}</span>
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
          <Link to="/account/orders" className="btn-primary flex items-center justify-center gap-2 flex-1 py-3.5" id="view-orders">
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
