import { useEffect, useState } from 'react';
import { Search, Eye, X, ShoppingCart, Loader2, ArrowRight, Mail, Users, UserCheck, UserX, RefreshCw, Filter } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import api from '../services/api';
import toast from 'react-hot-toast';
import { getImageUrl } from '../utils/imageUrl';

const AbandonedCartsAdminPage = () => {
  const [carts, setCarts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL'); // 'ALL' | 'CUSTOMER' | 'GUEST'
  const [selectedCart, setSelectedCart] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [sendingEmailId, setSendingEmailId] = useState(null);
  const [emailForm, setEmailForm] = useState({
    cartId: '',
    email: '',
    customerName: '',
    reportType: 'all',
    customNote: '',
    couponCode: 'RECOVER10'
  });

  const handleEmailClick = (cart) => {
    setEmailForm({
      cartId: cart.id,
      email: cart.customer?.email || '',
      customerName: cart.customer?.name || 'Guest Customer',
      reportType: 'all',
      customNote: '',
      couponCode: 'RECOVER10'
    });
    setShowEmailModal(true);
  };

  const handleSendEmailSubmit = async (e) => {
    e.preventDefault();
    if (!emailForm.email) {
      toast.error('Recipient email address is required');
      return;
    }
    setSendingEmailId(emailForm.cartId);
    try {
      const res = await api.post('/cart/admin/send-email', emailForm);
      if (res.data?.success) {
        toast.success(res.data.message || 'Marketing automation email sent!');
        setShowEmailModal(false);
        fetchAbandonedCarts();
      } else {
        toast.error(res.data?.message || 'Failed to send email');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error sending marketing email');
    } finally {
      setSendingEmailId(null);
    }
  };

  const fetchAbandonedCarts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/cart/admin/abandoned');
      if (res.data?.success) {
        setCarts(res.data.carts);
      } else {
        toast.error('Failed to fetch abandoned carts');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error fetching abandoned carts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAbandonedCarts();
  }, []);

  // Counts by cart type
  const allCount = carts.length;
  const customerCount = carts.filter(c => c.customer).length;
  const guestCount = carts.filter(c => !c.customer).length;

  // Format currency helper
  const fmt = (value, currency = 'INR') => {
    const numeric = parseFloat(value) || 0;
    if (currency?.toUpperCase() === 'AED') {
      return `AED ${numeric.toFixed(2)}`;
    }
    return `₹${numeric.toLocaleString('en-IN')}`;
  };

  // Filter carts
  const filteredCarts = carts.filter(cart => {
    // Cart type filter
    if (typeFilter === 'CUSTOMER' && !cart.customer) return false;
    if (typeFilter === 'GUEST' && cart.customer) return false;

    // Search query filter
    if (!search.trim()) return true;
    const searchLower = search.toLowerCase();
    if (cart.customer) {
      return (
        cart.customer.name?.toLowerCase().includes(searchLower) ||
        cart.customer.email?.toLowerCase().includes(searchLower) ||
        cart.customer.phone?.toLowerCase().includes(searchLower)
      );
    }
    return cart.sessionId?.toLowerCase().includes(searchLower);
  });

  // Calculate stats
  const totalCarts = filteredCarts.length;
  
  let totalItems = 0;
  let totalInrValue = 0;
  let totalAedValue = 0;

  filteredCarts.forEach(cart => {
    cart.items?.forEach(item => {
      totalItems += item.quantity || 0;
      const price = parseFloat(item.variant?.price || item.priceAtAdd || 0);
      const currency = item.product?.currency || 'INR';
      if (currency.toUpperCase() === 'AED') {
        totalAedValue += price * (item.quantity || 0);
      } else {
        totalInrValue += price * (item.quantity || 0);
      }
    });
  });

  const getCartTotal = (cart) => {
    let total = 0;
    let currency = 'INR';
    cart.items?.forEach(item => {
      const price = parseFloat(item.variant?.price || item.priceAtAdd || 0);
      total += price * (item.quantity || 0);
      currency = item.product?.currency || 'INR';
    });
    return { total, currency };
  };

  return (
    <AdminLayout title="Abandoned Carts">
      {/* Metrics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-6">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-brand-light">
          <p className="text-xs text-brand-grey uppercase font-semibold tracking-wider">Total Abandoned Carts</p>
          <p className="text-2xl font-bold text-brand-text mt-1">{totalCarts}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-brand-light">
          <p className="text-xs text-brand-grey uppercase font-semibold tracking-wider">Total Items Abandoned</p>
          <p className="text-2xl font-bold text-brand-text mt-1">{totalItems}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-brand-light">
          <p className="text-xs text-brand-grey uppercase font-semibold tracking-wider">Lost Revenue (INR)</p>
          <p className="text-2xl font-bold text-red-500 mt-1">{fmt(totalInrValue, 'INR')}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-brand-light">
          <p className="text-xs text-brand-grey uppercase font-semibold tracking-wider">Lost Revenue (AED)</p>
          <p className="text-2xl font-bold text-red-500 mt-1">{fmt(totalAedValue, 'AED')}</p>
        </div>
      </div>

      {/* Cart Type Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
        {[
          { id: 'ALL', label: 'All Carts', count: allCount, icon: Users },
          { id: 'CUSTOMER', label: 'Registered Customers', count: customerCount, icon: UserCheck },
          { id: 'GUEST', label: 'Guest Sessions', count: guestCount, icon: UserX },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = typeFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setTypeFilter(tab.id)}
              className={`flex-shrink-0 px-4 py-2 text-xs font-medium rounded-lg transition-all flex items-center gap-2 border ${
                isActive
                  ? 'bg-brand-gold text-white border-brand-gold shadow-sm font-semibold'
                  : 'bg-white text-brand-grey border-brand-light hover:bg-brand-light/30'
              }`}
              id={`filter-tab-${tab.id.toLowerCase()}`}
            >
              <Icon size={14} className={isActive ? 'text-white' : 'text-brand-grey'} />
              <span>{tab.label}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-neutral-100 text-neutral-600'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6 items-center justify-between">
        <div className="relative flex-1 max-w-md w-full">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-grey" />
          <input
            type="search"
            placeholder="Search by customer, email, or session ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-brand-light text-sm focus:outline-none focus:border-brand-gold bg-white rounded-lg"
            id="carts-search"
            aria-label="Search carts"
          />
        </div>
        <button
          onClick={fetchAbandonedCarts}
          className="btn-outline py-2.5 px-4 text-xs font-semibold flex items-center gap-2 self-stretch sm:self-auto rounded-lg"
          id="refresh-carts-btn"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh Data
        </button>
      </div>

      {/* Cart List Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label="Abandoned carts table">
            <thead>
              <tr className="bg-brand-light/40 text-left border-b border-brand-light">
                <th className="px-5 py-3 text-xs font-semibold text-brand-grey uppercase tracking-wider">User / Session</th>
                <th className="px-5 py-3 text-xs font-semibold text-brand-grey uppercase tracking-wider">Cart Type</th>
                <th className="px-5 py-3 text-xs font-semibold text-brand-grey uppercase tracking-wider">Items Count</th>
                <th className="px-5 py-3 text-xs font-semibold text-brand-grey uppercase tracking-wider">Total Value</th>
                <th className="px-5 py-3 text-xs font-semibold text-brand-grey uppercase tracking-wider">Last Activity</th>
                <th className="px-5 py-3 text-xs font-semibold text-brand-grey uppercase tracking-wider text-center">Marketing Report</th>
                <th className="px-5 py-3 text-xs font-semibold text-brand-grey uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="border-b border-brand-light">
                    {[...Array(7)].map((_, j) => (
                      <td key={j} className="px-5 py-4"><div className="skeleton h-4 w-24" /></td>
                    ))}
                  </tr>
                ))
              ) : filteredCarts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-brand-grey">
                    No abandoned carts found.
                  </td>
                </tr>
              ) : (
                filteredCarts.map(cart => {
                  const { total, currency } = getCartTotal(cart);
                  const itemCount = cart.items?.reduce((sum, i) => sum + (i.quantity || 0), 0) || 0;
                  return (
                    <tr key={cart.id} className="border-b border-brand-light hover:bg-brand-light/10 transition-colors">
                      <td className="px-5 py-4">
                        {cart.customer ? (
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-brand-gold flex items-center justify-center flex-shrink-0">
                              <span className="text-white text-xs font-bold">{cart.customer.name?.[0] || '?' }</span>
                            </div>
                            <div>
                              <p className="font-semibold text-brand-text">{cart.customer.name}</p>
                              <p className="text-xs text-brand-grey">{cart.customer.email}</p>
                              {cart.customer.phone && <p className="text-[10px] text-brand-grey">{cart.customer.phone}</p>}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <p className="font-mono text-xs text-neutral-800 break-all">{cart.sessionId || 'anonymous'}</p>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cart.customer ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                          {cart.customer ? 'Registered Customer' : 'Guest Session'}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-medium text-brand-text">
                        {itemCount} {itemCount === 1 ? 'item' : 'items'}
                      </td>
                      <td className="px-5 py-4 font-semibold text-brand-gold">
                        {fmt(total, currency)}
                      </td>
                      <td className="px-5 py-4 text-xs text-brand-grey">
                        {new Date(cart.updatedAt).toLocaleString('en-IN')}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex flex-col items-center justify-center gap-1">
                          <button
                            onClick={() => handleEmailClick(cart)}
                            disabled={sendingEmailId === cart.id}
                            className={`p-2 rounded-full border transition-all ${
                              cart.lastEmailSentAt
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100 hover:border-emerald-300'
                                : 'bg-brand-light/40 border-brand-light text-brand-text hover:bg-brand-gold/10 hover:border-brand-gold/30 hover:text-brand-gold'
                            }`}
                            title={cart.lastEmailSentAt ? `Last sent: ${new Date(cart.lastEmailSentAt).toLocaleString('en-IN')}` : 'Send Marketing Report & Cart Recovery Email'}
                            id={`send-email-${cart.id}`}
                          >
                            {sendingEmailId === cart.id ? (
                              <Loader2 size={15} className="animate-spin text-brand-gold" />
                            ) : (
                              <Mail size={15} />
                            )}
                          </button>
                          {cart.lastEmailSentAt && (
                            <span className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wider scale-90">
                              Sent
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedCart(cart);
                            setShowDetailModal(true);
                          }}
                          className="btn-outline py-1 px-3 text-xs font-semibold flex items-center gap-1.5 ml-auto"
                          id={`view-cart-${cart.id}`}
                        >
                          <Eye size={12} /> View Items
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedCart && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[85vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-brand-light bg-neutral-50 flex items-center justify-between">
              <div>
                <h3 className="font-playfair text-lg font-bold text-brand-text">Abandoned Cart Details</h3>
                <p className="text-xs text-brand-grey mt-0.5">
                  Last active: {new Date(selectedCart.updatedAt).toLocaleString('en-IN')}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedCart(null);
                }}
                className="p-1.5 hover:bg-neutral-100 rounded-full transition-colors text-brand-grey"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1">
              {/* Customer info */}
              <div className="bg-brand-light/30 border border-brand-gold/15 p-4 rounded-lg mb-6 text-sm">
                <h4 className="font-bold text-brand-text mb-2">Cart owner:</h4>
                {selectedCart.customer ? (
                  <div className="grid grid-cols-2 gap-y-1.5">
                    <div><span className="text-brand-grey">Name:</span> <strong className="text-brand-text">{selectedCart.customer.name}</strong></div>
                    <div><span className="text-brand-grey">Email:</span> <strong className="text-brand-text">{selectedCart.customer.email}</strong></div>
                    <div><span className="text-brand-grey">Phone:</span> <strong className="text-brand-text">{selectedCart.customer.phone || '—'}</strong></div>
                  </div>
                ) : (
                  <div>
                    <span className="text-brand-grey">Guest Session ID:</span>{' '}
                    <code className="text-xs font-semibold text-neutral-800 select-all">{selectedCart.sessionId}</code>
                  </div>
                )}
              </div>

              {/* Items List */}
              <h4 className="font-playfair font-bold text-brand-text mb-3">Items in Cart</h4>
              <div className="space-y-4">
                {selectedCart.items?.map(item => {
                  const image = item.variant?.image || item.product?.defaultProductImage || (Array.isArray(item.product?.images) ? item.product?.images?.[0] : item.product?.images) || item.product?.image;
                  const hasVariant = item.variant;
                  const price = parseFloat(item.variant?.price || item.priceAtAdd || 0);
                  const currency = item.product?.currency || 'INR';
                  return (
                    <div key={item.id} className="flex gap-4 p-3 border border-brand-light rounded-lg hover:border-brand-gold/20 transition-all bg-white">
                      {/* Product image */}
                      <div className="w-16 h-16 bg-neutral-100 border border-brand-light rounded overflow-hidden flex-shrink-0">
                        {image ? (
                          <img
                            src={getImageUrl(image)}
                            alt={item.product?.name || 'Product'}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = '/placeholder.jpg';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-neutral-400">
                            <ShoppingCart size={24} />
                          </div>
                        )}
                      </div>

                      {/* Product details */}
                      <div className="flex-1 min-w-0">
                        <h5 className="font-semibold text-sm text-brand-text truncate">{item.product?.name}</h5>
                        {hasVariant && (
                          <p className="text-xs text-brand-grey mt-0.5 font-mono">
                            SKU: {item.variant.sku}
                          </p>
                        )}
                        {(() => {
                          let variantObj = null;
                          if (item.selectedVariant) {
                            if (typeof item.selectedVariant === 'string') {
                              try {
                                variantObj = JSON.parse(item.selectedVariant);
                              } catch (e) {
                                variantObj = null;
                              }
                            } else if (typeof item.selectedVariant === 'object') {
                              variantObj = item.selectedVariant;
                            }
                          }
                          if (!variantObj || Object.keys(variantObj).length === 0) return null;
                          return (
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {Object.entries(variantObj).map(([k, v]) => (
                                <span key={k} className="text-[10px] bg-neutral-100 border border-neutral-200 text-neutral-600 px-1.5 py-0.5 rounded font-medium">
                                  {k}: {String(v)}
                                </span>
                              ))}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Pricing */}
                      <div className="text-right flex-shrink-0 flex flex-col justify-between">
                        <p className="font-medium text-xs text-brand-grey">
                          {fmt(price, currency)} × {item.quantity}
                        </p>
                        <p className="font-bold text-sm text-brand-gold">
                          {fmt(price * item.quantity, currency)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-brand-light bg-neutral-50 flex justify-end">
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedCart(null);
                }}
                className="btn-primary py-2 px-5 text-sm font-semibold"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-brand-light bg-neutral-50 flex items-center justify-between">
              <div>
                <h3 className="font-playfair text-lg font-bold text-brand-text flex items-center gap-2">
                  <Mail size={20} className="text-brand-gold" /> Send Marketing Automation Report
                </h3>
                <p className="text-xs text-brand-grey mt-0.5">
                  Customize and dispatch recovery email & performance report
                </p>
              </div>
              <button
                onClick={() => setShowEmailModal(false)}
                className="p-1.5 hover:bg-neutral-100 rounded-full transition-colors text-brand-grey"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSendEmailSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-brand-text mb-1 uppercase tracking-wider">
                  Recipient Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="Enter customer email address"
                  value={emailForm.email}
                  onChange={e => setEmailForm({ ...emailForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-brand-light text-sm focus:outline-none focus:border-brand-gold bg-white rounded"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-text mb-1 uppercase tracking-wider">
                  Customer Name
                </label>
                <input
                  type="text"
                  placeholder="Customer Name"
                  value={emailForm.customerName}
                  onChange={e => setEmailForm({ ...emailForm, customerName: e.target.value })}
                  className="w-full px-3 py-2 border border-brand-light text-sm focus:outline-none focus:border-brand-gold bg-white rounded"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-text mb-1 uppercase tracking-wider">
                  Report Content Focus
                </label>
                <select
                  value={emailForm.reportType}
                  onChange={e => setEmailForm({ ...emailForm, reportType: e.target.value })}
                  className="w-full px-3 py-2 border border-brand-light text-sm focus:outline-none focus:border-brand-gold bg-white rounded"
                >
                  <option value="all">Full Automation Report (Abandoned Cart & Push Notification Stats)</option>
                  <option value="abandoned_cart">Abandoned Cart Recovery only</option>
                  <option value="push_notification">Push Notification Performance only</option>
                </select>
                <div className="mt-1.5 p-2.5 rounded bg-neutral-50 border border-neutral-200 text-xs text-neutral-600">
                  {emailForm.reportType === 'abandoned_cart' && (
                    <p>
                      <strong className="text-amber-700 font-semibold">Cart Recovery:</strong> Dispatches high-urgency cart reservation notice, complete product list with name/pricing, recovery coupon, and direct 1-click checkout button.
                    </p>
                  )}
                  {emailForm.reportType === 'push_notification' && (
                    <p>
                      <strong className="text-blue-700 font-semibold">Notification Update:</strong> Dispatches new updates with view catlog button highlighting the new products.
                    </p>
                  )}
                  {emailForm.reportType === 'all' && (
                    <p>
                      <strong className="text-emerald-700 font-semibold"> Recovery & Updates:</strong> Comprehensive automation report summarizing abandoned cart items and new product updates.
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-text mb-1 uppercase tracking-wider">
                  Incentive Coupon Code
                </label>
                <input
                  type="text"
                  placeholder="Voucher code (e.g. RECOVER10)"
                  value={emailForm.couponCode}
                  onChange={e => setEmailForm({ ...emailForm, couponCode: e.target.value })}
                  className="w-full px-3 py-2 border border-brand-light text-sm focus:outline-none focus:border-brand-gold bg-white rounded"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-text mb-1 uppercase tracking-wider">
                  Custom Personal Message
                </label>
                <textarea
                  placeholder="Optional note to include in the email report..."
                  value={emailForm.customNote}
                  onChange={e => setEmailForm({ ...emailForm, customNote: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-brand-light text-sm focus:outline-none focus:border-brand-gold bg-white rounded resize-none"
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-brand-light flex justify-end gap-2 bg-white">
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="btn-outline py-2 px-4 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingEmailId === emailForm.cartId}
                  className="btn-primary py-2 px-5 text-xs font-semibold flex items-center gap-1.5"
                >
                  {sendingEmailId === emailForm.cartId ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Sending...
                    </>
                  ) : (
                    <>
                      <Mail size={14} /> Send Email Report
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AbandonedCartsAdminPage;
