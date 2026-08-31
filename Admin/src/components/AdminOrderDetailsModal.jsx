import { motion } from 'framer-motion';
import { X, MapPin, CreditCard, Truck, FileText, Package, Check, Circle, Phone, Mail, Gift, Copy, Printer } from 'lucide-react';
import currencyJs from 'currency.js';
import toast from 'react-hot-toast';
import { getImageUrl } from '../utils/imageUrl';
import { getPlaceholderSvg } from '../utils/placeholder';
import { printInvoice } from '../utils/invoiceGenerator';

const fmt = (v, currency = 'INR') => {
  const sym = currency === 'USD' ? '$' : (currency === 'EUR' ? '€' : (currency === 'GBP' ? '£' : '₹'));
  return currencyJs(v || 0, { symbol: sym, precision: 2 }).format();
};

const STATUS_COLORS = {
  PENDING_PAYMENT: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  CONFIRMED: 'bg-blue-50 text-blue-700 border-blue-200',
  PROCESSING: 'bg-purple-50 text-purple-700 border-purple-200',
  SHIPPED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  OUT_FOR_DELIVERY: 'bg-orange-50 text-orange-700 border-orange-200',
  DELIVERED: 'bg-green-50 text-green-700 border-green-200',
  CANCELLED: 'bg-red-50 text-red-700 border-red-200',
  RETURNED: 'bg-pink-50 text-pink-700 border-pink-200',
  REFUNDED: 'bg-purple-50 text-purple-700 border-purple-200',
  PAYMENT_RECEIVED_STOCK_FAILED: 'bg-rose-50 text-rose-700 border-rose-200',
};

const parseJsonObj = (val) => {
  if (!val) return null;
  let parsed = val;
  for (let i = 0; i < 5; i++) {
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
  if (typeof parsed === 'object' && parsed !== null) return parsed;
  if (typeof parsed === 'string' && parsed !== '{}' && parsed !== '[]') return { variant: parsed };
  return null;
};

const renderAddress = (rawAddr) => {
  const addr = parseJsonObj(rawAddr);
  if (!addr) return <p className="text-neutral-400 text-xs italic">No address details recorded</p>;
  if (addr.plainText) {
    return <p className="text-neutral-700 text-xs leading-relaxed">{addr.plainText}</p>;
  }

  const name = addr.fullName || addr.name || `${addr.firstName || ''} ${addr.lastName || ''}`.trim();
  const phone = addr.phone || addr.mobile || '';
  const email = addr.email || '';
  const line1 = addr.flatHouse || addr.addressLine1 || addr.line1 || '';
  const line2 = addr.areaStreet || addr.addressLine2 || addr.line2 || '';
  const landmark = addr.landmark || '';
  const city = addr.city || '';
  const state = addr.state || '';
  const pincode = addr.pincode || addr.postalCode || '';
  const country = addr.country || '';

  return (
    <div className="text-xs space-y-1">
      {name && <p className="font-semibold text-neutral-900">{name}</p>}
      <p className="text-neutral-600 leading-relaxed">
        {line1}{line2 ? `, ${line2}` : ''}{landmark ? ` (near ${landmark})` : ''}{city ? `, ${city}` : ''}{state ? `, ${state}` : ''} {pincode}
        {country ? `, ${country}` : ''}
      </p>
      {(phone || email) && (
        <div className="text-neutral-600 text-[11px] pt-1.5 border-t border-neutral-100 mt-2 space-y-0.5">
          {phone && (
            <p className="flex items-center gap-1">
              <Phone size={11} className="text-brand-gold shrink-0" />
              <span className="font-medium text-neutral-800">Phone : </span>
              <span>{phone}</span>
            </p>
          )}
          {email && (
            <p className="flex items-center gap-1 break-all">
              <Mail size={11} className="text-brand-gold shrink-0" />
              <span className="font-medium text-neutral-800">Email : </span>
              <span>{email}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
};

const AdminOrderDetailsModal = ({ order, onClose, onStatusUpdate }) => {
  if (!order) return null;

  const currency = order.currency || 'INR';

  const shippingObj = parseJsonObj(order.shippingAddress) || {};
  const billingObj = parseJsonObj(order.billingAddress) || {};

  const customerName = order.customer?.name || billingObj.fullName || billingObj.name || shippingObj.fullName || shippingObj.name || 'Guest / Customer';
  const customerEmail = order.customer?.email || billingObj.email || shippingObj.email || '';
  const customerPhone = order.customer?.phone || billingObj.phone || shippingObj.phone || '';

  const handlePrintInvoice = () => {
    toast.success(`Opening Tax Invoice for Order ${order.orderNumber}...`);
    printInvoice(order);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative border border-neutral-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="sticky top-0 bg-white z-20 px-6 py-4 border-b border-neutral-200 flex justify-between items-center flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="font-playfair text-xl font-bold text-neutral-900">Order {order.orderNumber}</h2>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${STATUS_COLORS[order.status] || 'bg-neutral-100 text-neutral-700'}`}>
                {order.status ? order.status.replace(/_/g, ' ') : 'PENDING'}
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* <button
              onClick={handlePrintInvoice}
              className="px-3.5 py-1.5 bg-brand-gold text-white hover:bg-amber-600 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm shadow-amber-500/20"
              title="Print GST Tax Invoice"
              id="btn-print-tax-invoice"
            >
              <Printer size={14} />
              <span>Print Tax Invoice</span>
            </button> */}
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-neutral-700 transition-colors rounded-full hover:bg-neutral-100"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">

          {/* Customer Metadata Card */}
          <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200/90 flex flex-wrap justify-between items-start gap-5 text-xs">
            <div className="min-w-[220px] flex-1">
              <span className="text-neutral-500 block uppercase tracking-wider text-[10px] font-bold">Customer Details</span>
              <p className="font-bold text-neutral-900 text-sm mt-0.5">{customerName}</p>
              {(customerEmail || customerPhone) && (
                <p className="text-neutral-600 text-xs mt-0.5 font-medium leading-relaxed">
                  {customerEmail}{customerEmail && customerPhone ? ' · ' : ''}{customerPhone}
                </p>
              )}
            </div>

            <div>
              <span className="text-neutral-500 block uppercase tracking-wider text-[10px] font-bold">Payment Status</span>
              <span className={`inline-block mt-1 text-[11px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wide ${
                order.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                order.paymentStatus === 'REFUNDED' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                'bg-amber-100 text-amber-800 border border-amber-200'
              }`}>
                {order.paymentStatus || 'UNPAID'}
              </span>
            </div>

            <div>
              <span className="text-neutral-500 block uppercase tracking-wider text-[10px] font-bold">Payment Method</span>
              <p className="font-semibold text-neutral-800 text-xs mt-1">{order.paymentMethod || 'Online Payment'}</p>
            </div>

            <div>
              <span className="text-neutral-500 block uppercase tracking-wider text-[10px] font-bold mb-1">Transaction Ref ID</span>
              {(order.razorpay_payment_id || order.paymentGatewayRef) ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono font-bold text-neutral-900 bg-white border border-neutral-300 px-2.5 py-1 rounded-md shadow-2xs select-all tracking-wide">
                    {order.razorpay_payment_id || order.paymentGatewayRef}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(order.razorpay_payment_id || order.paymentGatewayRef);
                      toast.success('Transaction Ref ID copied to clipboard!');
                    }}
                    className="p-1 text-neutral-400 hover:text-brand-gold transition-colors rounded hover:bg-neutral-200/60"
                    title="Copy Transaction Ref ID"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              ) : (
                <span className="text-xs text-neutral-400 italic mt-1 block">N/A</span>
              )}
            </div>
          </div>

          {/* Ordered Products & Variants */}
          <div>
            <h3 className="font-semibold text-sm mb-3 text-neutral-900 flex items-center gap-2">
              <Package size={16} className="text-brand-gold" />
              Purchased Items ({order.items?.length || 0})
            </h3>
            <div className="border border-neutral-200 rounded-lg overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200 text-[10px] uppercase tracking-wider font-semibold text-neutral-500">
                    <th className="py-2.5 px-4">Item & Variant Details</th>
                    <th className="py-2.5 px-4 text-center">Qty</th>
                    <th className="py-2.5 px-4 text-right">Unit Price</th>
                    <th className="py-2.5 px-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-xs">
                  {(order.items || []).map((item, idx) => {
                    const variantObj = parseJsonObj(item.selectedVariant);
                    // Exclude internal keys that are not human-readable variant attributes
                    const EXCLUDE_KEYS = new Set(['id', 'sku', 'variantId', 'productId', 'stock', 'price', 'mrp']);
                    const variantEntries = variantObj
                      ? Object.entries(variantObj).filter(([k, v]) =>
                          !EXCLUDE_KEYS.has(k) && v !== undefined && v !== null && v !== ''
                        )
                      : [];

                    return (
                      <tr key={item.id || idx} className="hover:bg-neutral-50/50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={getImageUrl(item.productImage || item.image) || getPlaceholderSvg(item.productName || item.name || 'Product')}
                              alt={item.productName || item.name}
                              className="w-12 h-14 object-cover rounded border border-neutral-200 flex-shrink-0"
                              onError={(e) => { e.target.onerror = null; e.target.src = getPlaceholderSvg(item.productName || item.name || 'Product'); }}
                            />
                            <div>
                              <p className="font-semibold text-neutral-900 text-xs">{item.productName || item.name || 'Product'}</p>
                              {item.sku && <p className="text-[10px] text-neutral-400 font-mono">SKU: {item.sku}</p>}
                              
                              {/* Variant Attributes Badges */}
                              {variantEntries.length > 0 ? (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {variantEntries.map(([k, v]) => (
                                    <span key={k} className="text-[10px] bg-neutral-100 text-neutral-700 px-1.5 py-0.5 rounded font-medium border border-neutral-200">
                                      <span className="capitalize">{k}</span>: {v}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-[10px] text-neutral-400 italic block mt-0.5">Standard Variant</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center font-medium text-neutral-700">× {item.quantity}</td>
                        <td className="py-3 px-4 text-right text-neutral-600">{fmt(item.unitPrice || item.price, currency)}</td>
                        <td className="py-3 px-4 text-right font-bold text-brand-gold">{fmt(item.totalPrice || (item.quantity * (item.unitPrice || item.price)), currency)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Shipping & Billing Addresses (2-Column Grid) */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Shipping Address */}
            <div className="bg-white p-4 rounded-lg border border-neutral-200 shadow-sm flex items-start gap-3">
              <MapPin size={18} className="text-brand-gold mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">Shipping Address</h4>
                {renderAddress(order.shippingAddress)}
              </div>
            </div>

            {/* Billing Address */}
            <div className="bg-white p-4 rounded-lg border border-neutral-200 shadow-sm flex items-start gap-3">
              <CreditCard size={18} className="text-brand-gold mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">Billing Address</h4>
                {renderAddress(order.billingAddress || order.shippingAddress)}
              </div>
            </div>
          </div>

          {/* Gift Services & Personalized Message (Only if selected or message exists) */}
          {(order.giftMessage || order.notes || order.isGiftWrap || Number(order.giftWrapFee || order.giftWrapPrice || 0) > 0) && (
            <div className="bg-amber-50/50 p-4 rounded-lg border border-amber-200/80 flex items-start gap-3 text-xs">
              <Gift size={20} className="text-brand-gold mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-bold text-neutral-900 text-xs mb-1.5 uppercase tracking-wide flex items-center gap-2">
                  Gift Services & Personalized Message <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full capitalize">Complimentary</span>
                </h4>
                
                {/* Gift Message / Note */}
                {(order.giftMessage || order.notes) && (
                  <div className="bg-white p-3 rounded border border-amber-100 text-neutral-800 mb-2 italic font-serif text-sm">
                    "{order.giftMessage || order.notes}"
                  </div>
                )}

                {/* Gift Wrap Status */}
                <p className="text-neutral-600 font-medium flex items-center gap-1.5">
                  <span className="flex items-center gap-1"><Gift size={14} className="text-brand-gold" /> Gift Packaging:</span> 
                  <span className="font-semibold text-neutral-900">
                    {Number(order.giftWrapFee || order.giftWrapPrice || 0) > 0 || order.isGiftWrap ? 'Luxury Gift Wrap (Included)' : 'Complimentary Gift Service'}
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* Financial Breakdown Summary */}
          <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200 space-y-2 text-xs text-neutral-600">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{fmt(order.subtotal || order.totalAmount, currency)}</span>
            </div>
            {Number(order.discountAmount) > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Coupon Discount</span>
                <span>-{fmt(order.discountAmount, currency)}</span>
              </div>
            )}
            {(() => {
              const sub = Number(order.subtotal || 0);
              const disc = Number(order.discountAmount || 0);
              const ship = Number(order.shippingAmount || 0);
              const tot = Number(order.totalAmount || 0);
              const diff = Math.round(tot - (sub - disc + ship));
              const gw = Number(order.giftWrapFee || order.giftWrapPrice || 0) || (diff > 0 ? diff : 0);
              if (gw <= 0) return null;
              return (
                <div className="flex justify-between font-medium text-neutral-800">
                  <span>Gift Wrapping</span>
                  <span>{fmt(gw, currency)}</span>
                </div>
              );
            })()}
            <div className="flex justify-between">
              <span>Shipping Fee</span>
              <span>{Number(order.shippingAmount) === 0 ? 'FREE' : fmt(order.shippingAmount, currency)}</span>
            </div>
            {Number(order.taxAmount) > 0 && (
              <div className="flex justify-between">
                <span>GST Tax ({order.taxRate ? Number(order.taxRate) : 'Included'}% Included)</span>
                <span>{fmt(order.taxAmount, currency)}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-3 border-t border-neutral-200 text-neutral-900 font-bold text-sm">
              <span>Total Order Value</span>
              <span className="text-brand-gold text-base">{fmt(order.totalAmount, currency)}</span>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="sticky bottom-0 bg-neutral-50 px-6 py-3.5 border-t border-neutral-200 flex justify-between items-center rounded-b-xl z-20">
          <div className="text-xs text-neutral-500 font-mono">
            Invoice: <strong className="text-neutral-800">INV-{order.orderNumber}</strong>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={handlePrintInvoice}
              className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-sm"
              id="btn-footer-print-invoice"
            >
              <Printer size={14} className="text-brand-gold" />
              <span>Print GST Invoice</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-300 rounded-lg text-xs font-semibold transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminOrderDetailsModal;
