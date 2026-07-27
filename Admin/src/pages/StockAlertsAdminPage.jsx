import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, Search, RefreshCw, Mail, CheckCircle2, Clock, Package, Send, AlertTriangle, ArrowRight } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import api from '../services/api';
import toast from 'react-hot-toast';

const StockAlertsAdminPage = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'pending', 'notified'
  const [searchQuery, setSearchQuery] = useState('');
  const [notifyingId, setNotifyingId] = useState(null);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/stock-alerts');
      if (res.data?.success) {
        setAlerts(res.data.alerts || []);
      }
    } catch (err) {
      toast.error('Failed to load restock alert requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleNotifyCustomer = async (alertId) => {
    setNotifyingId(alertId);
    try {
      const res = await api.put(`/stock-alerts/${alertId}/notify`);
      if (res.data?.success) {
        toast.success(res.data.message || 'Customer notified successfully!');
        fetchAlerts();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send notification.');
    } finally {
      setNotifyingId(null);
    }
  };

  const filteredAlerts = alerts.filter(a => {
    const matchesStatus = statusFilter === 'all' 
      ? true 
      : (statusFilter === 'pending' ? !a.isNotified : a.isNotified);
    
    const prodName = a.product?.name || '';
    const email = a.email || '';
    const matchesSearch = prodName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          email.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  const totalCount = alerts.length;
  const pendingCount = alerts.filter(a => !a.isNotified).length;
  const notifiedCount = alerts.filter(a => a.isNotified).length;

  return (
    <AdminLayout>
      <div className="space-y-6 pb-12">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-4">
          <div>
            <h1 className="font-playfair text-2xl font-bold text-neutral-900 flex items-center gap-2.5">
              <Bell className="text-amber-600" size={24} /> Restock Requests & Stock Alerts
            </h1>
            <p className="text-xs text-neutral-500 mt-1">
              View customer restock alert subscriptions, monitor high-demand out-of-stock items, and trigger notification emails.
            </p>
          </div>
          <button
            onClick={fetchAlerts}
            className="self-start sm:self-auto bg-neutral-100 hover:bg-neutral-200 text-neutral-700 px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Data
          </button>
        </div>

        {/* Overview Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Bell size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Total Requests</p>
              <h3 className="text-2xl font-bold text-neutral-900 mt-0.5">{totalCount}</h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <Clock size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Pending Alerts</p>
              <h3 className="text-2xl font-bold text-neutral-900 mt-0.5">{pendingCount}</h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Notified Customers</p>
              <h3 className="text-2xl font-bold text-neutral-900 mt-0.5">{notifiedCount}</h3>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'all' ? 'bg-neutral-950 text-amber-400 shadow-sm' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              All ({totalCount})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'pending' ? 'bg-neutral-950 text-amber-400 shadow-sm' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setStatusFilter('notified')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'notified' ? 'bg-neutral-950 text-amber-400 shadow-sm' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              Notified ({notifiedCount})
            </button>
          </div>

          <div className="relative w-full md:w-72">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search product or email..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-lg pl-9 pr-4 py-2 text-xs text-neutral-900 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-xs text-neutral-500">Loading restock alert records...</div>
          ) : filteredAlerts.length === 0 ? (
            <div className="p-12 text-center">
              <Bell size={36} className="mx-auto text-neutral-300 mb-3" />
              <h4 className="text-sm font-semibold text-neutral-800">No restock alert requests found</h4>
              <p className="text-xs text-neutral-500 mt-1">Customer restock notifications will appear here when submitted.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-neutral-700">
                <thead className="bg-neutral-50 border-b border-neutral-200 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Product Details</th>
                    <th className="py-3.5 px-4">Customer Email</th>
                    <th className="py-3.5 px-4">Current Stock</th>
                    <th className="py-3.5 px-4">Date Subscribed</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 font-medium">
                  {filteredAlerts.map(item => {
                    const prod = item.product || {};
                    const variant = item.variant || null;
                    const selectedAttrs = item.selectedVariant || variant?.attributes;
                    
                    let variantString = '';
                    if (selectedAttrs) {
                      let parsed = selectedAttrs;
                      if (typeof parsed === 'string') {
                        try { parsed = JSON.parse(parsed); } catch (e) {}
                      }
                      if (typeof parsed === 'object' && parsed !== null) {
                        variantString = Object.entries(parsed).map(([k, v]) => `${k}: ${v}`).join(' | ');
                      }
                    }

                    if (!variantString && variant && variant.attributes) {
                      let parsed = variant.attributes;
                      if (typeof parsed === 'string') {
                        try { parsed = JSON.parse(parsed); } catch (e) {}
                      }
                      if (typeof parsed === 'object' && parsed !== null) {
                        variantString = Object.entries(parsed).map(([k, v]) => `${k}: ${v}`).join(' | ');
                      }
                    }

                    // Stock calculation for the specific variant requested
                    const stockQty = variant && variant.stock !== undefined
                      ? parseInt(variant.stock, 10)
                      : (prod.stock !== undefined ? parseInt(prod.stock, 10) : 0);

                    const isAvailable = stockQty > 0;
                    const displayImage = variant?.image || prod.defaultProductImage || (prod.images && prod.images[0]) || '';

                    return (
                      <tr key={item.id} className="hover:bg-neutral-50/60 transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            {displayImage ? (
                              <img
                                src={displayImage}
                                alt={prod.name}
                                className="w-11 h-11 object-cover rounded-lg border border-neutral-200 shrink-0"
                              />
                            ) : (
                              <div className="w-11 h-11 bg-neutral-100 rounded-lg flex items-center justify-center text-neutral-400 shrink-0">
                                <Package size={18} />
                              </div>
                            )}
                            <div className="space-y-0.5">
                              <p className="font-bold text-neutral-900 hover:text-amber-600 transition-colors">
                                {prod.name || `Product #${item.productId}`}
                              </p>
                              {variantString ? (
                                <p className="text-[11px] font-bold text-amber-700 bg-amber-50/90 px-2 py-0.5 rounded-md border border-amber-200/80 inline-block">
                                  Variant: {variantString}
                                </p>
                              ) : variant ? (
                                <p className="text-[11px] font-semibold text-neutral-600">
                                  Variant SKU: {variant.sku || `#${variant.id}`}
                                </p>
                              ) : (
                                <p className="text-[11px] text-neutral-400">All Variants (Base Product)</p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1.5 font-semibold text-neutral-900">
                            <Mail size={14} className="text-neutral-400 shrink-0" />
                            {item.email}
                          </div>
                          {item.customer && (
                            <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-semibold mt-1 inline-block">
                              Registered User #{item.customer.id}
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-4">
                          <div className="space-y-1">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                isAvailable ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {isAvailable ? `In Stock (${stockQty} units)` : 'Out of Stock (0)'}
                            </span>
                            {variant && (
                              <p className="text-[10px] text-neutral-400 font-medium">
                                Variant Stock: {variant.stock ?? 0}
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="py-4 px-4 text-neutral-500">
                          {new Date(item.createdAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>

                        <td className="py-4 px-4">
                          {item.isNotified ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full text-[10px] font-bold">
                              <CheckCircle2 size={12} /> Notified ({new Date(item.notifiedAt).toLocaleDateString()})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full text-[10px] font-bold">
                              <Clock size={12} /> Pending Alert
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-4 text-right">
                          <button
                            onClick={() => handleNotifyCustomer(item.id)}
                            disabled={notifyingId === item.id || item.isNotified}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                              item.isNotified
                                ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                                : 'bg-neutral-950 hover:bg-neutral-800 text-amber-400 shadow-xs'
                            }`}
                          >
                            <Send size={12} />
                            {item.isNotified ? 'Already Sent' : (notifyingId === item.id ? 'Sending...' : 'Send Restock Email')}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default StockAlertsAdminPage;
