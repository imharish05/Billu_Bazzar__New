import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Package, Download, MessageCircle, MapPin } from 'lucide-react';
import Footer from '../components/Footer';
import { printInvoice } from '../utils/invoiceGenerator';
import { formatPrice } from '../utils/currency';
import { fetchOrderById } from '../redux/slices/ordersSlice';

/* Mock tracking steps */
const trackingSteps = [
  { status: 'Order Placed', done: true, date: 'Today' },
  { status: 'Payment Confirmed', done: true, date: 'Today' },
  { status: 'Processing', done: false, date: 'Expected tomorrow' },
  { status: 'Shipped', done: false, date: 'In 2-3 days' },
  { status: 'Delivered', done: false, date: 'In 5-7 days' },
];

const OrderConfirmationPage = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const orderIdFromUrl = searchParams.get('orderId');

  const { current: order } = useSelector(s => s.orders);
  const { code: currencyCode, rate: currencyRate } = useSelector(s => s.currency);

  useEffect(() => {
    if (!order && orderIdFromUrl) {
      dispatch(fetchOrderById(orderIdFromUrl));
    }
  }, [order, orderIdFromUrl, dispatch]);

  const fmt = (v) => formatPrice(v, currencyCode, currencyRate);

  return (
    <main id="main-content">
      <div className="max-w-3xl mx-auto px-6 md:px-8 py-12">
        {/* Success header */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="text-center mb-12"
        >
          <div className="w-24 h-24 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6 shadow-sm">
            <CheckCircle size={52} className="text-green-500 animate-pulse" strokeWidth={1.5} />
          </div>
          <h1 className="font-playfair text-4xl font-bold text-brand-text mb-2">Order Confirmed!</h1>
          <p className="text-brand-grey">Thank you for shopping at Billu Bazaar.</p>
          {order && (
            <p className="text-brand-gold font-semibold mt-2">Order #{order.orderNumber}</p>
          )}
        </motion.div>

        {/* Order details grid */}
        {order && (
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white shadow-sm p-6 border border-brand-light">
              <h3 className="font-playfair text-lg font-bold text-brand-text mb-4 flex items-center gap-2.5">
                <Package size={22} className="text-brand-gold" /> Order Details
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-brand-grey">Order Total</span><span className="font-semibold text-brand-gold">{fmt(order.totalAmount)}</span></div>
                <div className="flex justify-between"><span className="text-brand-grey">Payment</span><span>{order.paymentMethod}</span></div>
                <div className="flex justify-between"><span className="text-brand-grey">Items</span><span>{order.items?.length || 0}</span></div>
              </div>
            </div>
            <div className="bg-white shadow-sm p-6 border border-brand-light">
              <h3 className="font-playfair text-lg font-bold text-brand-text mb-4 flex items-center gap-2.5">
                <MapPin size={22} className="text-brand-gold" /> Shipping To
              </h3>
              <p className="text-sm text-brand-grey">{order.shippingAddress?.flatHouse || order.shippingAddress?.line1}</p>
              <p className="text-sm text-brand-grey">
                {order.shippingAddress?.areaStreet || order.shippingAddress?.line2 || ''}
                {order.shippingAddress?.landmark ? ` (near ${order.shippingAddress.landmark})` : ''}
              </p>
              <p className="text-sm text-brand-grey mt-1">{order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.pincode}</p>
            </div>
          </div>
        )}

        {/* Order Tracking */}
        <div className="bg-white shadow-sm p-6 mb-6 border border-brand-light">
          <h3 className="font-playfair text-lg font-bold text-brand-text mb-6">Order Tracking</h3>
          <div className="relative">
            <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-brand-light" aria-hidden="true" />
            <div className="space-y-6">
              {trackingSteps.map((step, i) => (
                <motion.div
                  key={step.status}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.15 }}
                  className="flex items-start gap-4 relative"
                >
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${step.done ? 'bg-brand-gold border-brand-gold' : 'bg-white border-brand-light'}`}>
                    {step.done && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <div>
                    <p className={`font-medium text-sm ${step.done ? 'text-brand-text' : 'text-brand-grey'}`}>{step.status}</p>
                    <p className="text-xs text-brand-grey">{step.date}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Mock tracking map placeholder */}
        <div className="bg-brand-light h-48 flex items-center justify-center mb-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-green-50 opacity-50" />
          <div className="relative text-center">
            <MapPin size={32} className="text-brand-gold mx-auto mb-2" />
            <p className="text-sm text-brand-grey">Live tracking available once shipped</p>
            <p className="text-xs text-brand-grey">(Powered by Shiprocket + Mapbox)</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={() => printInvoice(order)} className="btn-outline flex items-center justify-center gap-2 flex-1" id="download-invoice">
            <Download size={16} /> Download Invoice
          </button>
          <Link to="/account?tab=orders" className="btn-primary flex items-center justify-center gap-2 flex-1" id="view-orders">
            Track My Orders
          </Link>
        </div>

        <div className="text-center mt-10">
          <Link to="/products" className="text-brand-gold text-sm hover:underline focus-visible:outline-brand-gold" id="continue-shopping-confirm">
            Continue Shopping →
          </Link>
        </div>
      </div>
      <Footer />
    </main>
  );
};

export default OrderConfirmationPage;
