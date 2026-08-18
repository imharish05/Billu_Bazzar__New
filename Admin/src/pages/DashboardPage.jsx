import { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { ShoppingBag, Users, TrendingUp, Clock, Package, AlertTriangle, Plus, ArrowRight, Eye, Coins, RotateCcw, Gift } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import AdminLayout from '../components/AdminLayout';
import AdminOrderDetailsModal from '../components/AdminOrderDetailsModal';
import { fetchStats } from '../redux/slices/dashboardSlice';
import { fetchAdminOrders, updateOrderStatus } from '../redux/slices/ordersSlice';
import api from '../services/api';
import currencyJs from 'currency.js';

const fmtINR = (v) => currencyJs(v, { symbol: '₹', precision: 0 }).format();
const fmtAED = (v) => `AED ${(typeof v === 'number' ? v : 0).toLocaleString('en-IN')}`;

/* Animated counter hook */
const useCounter = (target, duration = 1200) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!target) {
      setCount(0);
      return;
    }
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setCount(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target]);
  return count;
};

/* Stat Card without percentage badges */
const StatCard = ({ icon: Icon, label, value, prefix = '', suffix = '', color = '#C9A24B', index }) => {
  const animated = useCounter(typeof value === 'number' ? value : 0);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.35 }}
      className="glass-stat-card rounded-xl p-5 border border-brand-light/60 shadow-sm bg-white"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${color}20` }}>
          <Icon size={20} style={{ color }} strokeWidth={1.5} />
        </div>
      </div>
      <p className="text-brand-grey text-xs font-medium mb-1">{label}</p>
      <p className="font-sans text-2xl font-bold text-brand-text">
        {prefix}{typeof value === 'number' ? animated.toLocaleString('en-IN') : value}{suffix}
      </p>
    </motion.div>
  );
};

const STATUS_COLORS = {
  PENDING: 'bg-yellow-50 text-yellow-700', 
  CONFIRMED: 'bg-blue-50 text-blue-700',
  PROCESSING: 'bg-purple-50 text-purple-700', 
  SHIPPED: 'bg-indigo-50 text-indigo-700',
  OUT_FOR_DELIVERY: 'bg-orange-50 text-orange-700',
  DELIVERED: 'bg-green-50 text-green-600',
  CANCELLED: 'bg-red-50 text-red-500',
};

const DashboardPage = () => {
  const dispatch = useDispatch();
  const { stats, loading } = useSelector(s => s.dashboard);
  const { items: orders } = useSelector(s => s.orders);
   const [selectedOrderModal, setSelectedOrderModal] = useState(null);
  const [revenueRange, setRevenueRange] = useState('7_days'); // '7_days' | '30_days' | 'this_month' | 'this_year'
  const [revenueCurrency, setRevenueCurrency] = useState('INR'); // 'INR' | 'AED'
  const [lowStockAlerts, setLowStockAlerts] = useState([]);
  const [recentShopperRequests, setRecentShopperRequests] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(new Date());

  const fetchDashboardData = async () => {
    dispatch(fetchStats());
    dispatch(fetchAdminOrders({ limit: 10 }));
    try {
      const res = await api.get('/warehouses/alerts/low-stock');
      if (res.data.success && res.data.alerts) {
        setLowStockAlerts(res.data.alerts.slice(0, 4));
      }
    } catch (err) {
      console.warn('Low stock fetch warning:', err);
    }
    try {
      const shopperRes = await api.get('/personal-shopper?limit=5');
      if (shopperRes.data.success && shopperRes.data.requests) {
        setRecentShopperRequests(shopperRes.data.requests);
      }
    } catch (err) {
      console.warn('Personal shopper fetch warning:', err);
    }
  };

  // Fetch real data on mount
  useEffect(() => {
    fetchDashboardData();
  }, [dispatch]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchDashboardData();
      setLastRefreshedAt(new Date());
      window.dispatchEvent(new Event('adminOrderStatusChanged'));
      toast.success('Stock and orders refreshed successfully!');
    } catch (err) {
      toast.error('Failed to refresh dashboard data.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleStatusUpdate = (id, status) => {
    dispatch(updateOrderStatus({ id, status }));
  };

  // Stat Cards (AED text prefix!)
  const statCards = [
    { icon: TrendingUp, label: 'Total Revenue (INR)', value: stats.totalRevenue || 0, prefix: '₹', color: '#C9A24B' },
    { icon: Coins, label: 'Total Revenue (AED)', value: stats.totalRevenueAED || 0, prefix: 'AED ', color: '#059669' },
    { icon: ShoppingBag, label: 'Total Orders', value: stats.totalOrders || 0, color: '#3B82F6' },
    { icon: Users, label: 'Total Customers', value: stats.totalCustomers || 0, color: '#8B5CF6' },
    { icon: Clock, label: 'Pending Orders', value: stats.pendingOrders || 0, color: '#F59E0B' },
  ];

  // Dynamic Chart Revenue Calculation based strictly on real backend orders filtered by selected currency
  const chartData = useMemo(() => {
    const today = new Date();
    const curr = (revenueCurrency || 'INR').toUpperCase();
    const filteredOrders = orders.filter(o => (o.currency || 'INR').toUpperCase() === curr);

    const getLocalDateStr = (dateObj) => {
      const dt = new Date(dateObj);
      const year = dt.getFullYear();
      const month = String(dt.getMonth() + 1).padStart(2, '0');
      const day = String(dt.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    if (revenueRange === '7_days') {
      const daysMap = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
        const dateStr = getLocalDateStr(d);
        daysMap[dateStr] = { label: dayLabel, revenue: 0 };
      }

      filteredOrders.forEach(o => {
        if (o.createdAt) {
          const oDate = getLocalDateStr(o.createdAt);
          if (daysMap[oDate]) {
            daysMap[oDate].revenue += parseFloat(o.totalAmount || 0);
          }
        }
      });

      return Object.values(daysMap).map(item => ({ day: item.label, revenue: Math.round(item.revenue) }));
    }

    if (revenueRange === '30_days') {
      const weeksMap = { 'Week 1': 0, 'Week 2': 0, 'Week 3': 0, 'Week 4': 0 };
      filteredOrders.forEach(o => {
        const amt = parseFloat(o.totalAmount || 0);
        const diffDays = Math.floor((today - new Date(o.createdAt)) / (1000 * 60 * 60 * 24));
        if (diffDays <= 7) weeksMap['Week 4'] += amt;
        else if (diffDays <= 14) weeksMap['Week 3'] += amt;
        else if (diffDays <= 21) weeksMap['Week 2'] += amt;
        else if (diffDays <= 30) weeksMap['Week 1'] += amt;
      });
      return Object.entries(weeksMap).map(([day, revenue]) => ({ day, revenue: Math.round(revenue) }));
    }

    if (revenueRange === 'this_month') {
      const monthDays = {};
      const currentMonth = today.getMonth();
      for (let day = 1; day <= 28; day += 5) {
        monthDays[`Day ${day}`] = 0;
      }
      filteredOrders.forEach(o => {
        const d = new Date(o.createdAt);
        if (d.getMonth() === currentMonth) {
          const key = `Day ${Math.min(28, Math.ceil(d.getDate() / 5) * 5)}`;
          if (monthDays[key] !== undefined) monthDays[key] += parseFloat(o.totalAmount || 0);
        }
      });
      return Object.entries(monthDays).map(([day, revenue]) => ({ day, revenue: Math.round(revenue) }));
    }

    // Default 'this_year' (Real monthly totals)
    const monthsMap = { Jan: 0, Feb: 0, Mar: 0, Apr: 0, May: 0, Jun: 0, Jul: 0, Aug: 0, Sep: 0, Oct: 0, Nov: 0, Dec: 0 };
    filteredOrders.forEach(o => {
      if (o.createdAt) {
        const m = new Date(o.createdAt).toLocaleDateString('en-US', { month: 'short' });
        if (monthsMap[m] !== undefined) monthsMap[m] += parseFloat(o.totalAmount || 0);
      }
    });
    return Object.entries(monthsMap).map(([day, revenue]) => ({ day, revenue: Math.round(revenue) }));
  }, [revenueRange, revenueCurrency, orders]);

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-6">
        
        {/* Top Header Action Bar with Refresh Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-xl p-4 shadow-sm border border-brand-light/60">
          <div>
            <h1 className="text-xl font-bold text-neutral-900 font-sans">
              Dashboard Overview
            </h1>
            <p className="text-xs text-brand-grey mt-0.5">
              Real-time stock inventory, orders, and sales performance
              {lastRefreshedAt && (
                <span className="ml-2 text-[11px] text-emerald-600 font-medium">
                  • Last refreshed: {lastRefreshedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              )}
            </p>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-brand-gold hover:bg-brand-gold/90 text-white text-xs font-semibold rounded-lg shadow-sm transition-all duration-200 disabled:opacity-60 focus-visible:outline-brand-gold cursor-pointer"
            id="dashboard-refresh-btn"
            title="Refresh stock, orders, and stats"
          >
            <RotateCcw size={15} className={isRefreshing ? 'animate-spin' : ''} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh Stock & Orders'}</span>
          </button>
        </div>

        {/* Stat Cards Row (INR + AED Revenue, Orders, Customers, Pending) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {statCards.map((sc, i) => (
            <StatCard key={sc.label} index={i} {...sc} />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Revenue Analytics Chart with Dropdown Range & Currency Selectors */}
          <div className="lg:col-span-2 bg-white rounded-xl p-5 shadow-sm border border-brand-light/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h2 className="font-sans text-lg font-semibold text-neutral-900">Revenue Overview</h2>
              
              <div className="flex items-center gap-3">
                {/* Currency Selector */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-brand-grey font-medium">Currency:</span>
                  <select
                    value={revenueCurrency}
                    onChange={(e) => setRevenueCurrency(e.target.value)}
                    className="bg-brand-light/50 text-neutral-800 text-xs rounded-lg px-2.5 py-1.5 border border-brand-light focus:outline-none focus:border-brand-gold font-semibold"
                    id="dashboard-currency-select"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="AED">AED (AED)</option>
                  </select>
                </div>

                {/* Dropdown Range Selector */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-brand-grey font-medium">Select Period:</span>
                  <select
                    value={revenueRange}
                    onChange={(e) => setRevenueRange(e.target.value)}
                    className="bg-brand-light/50 text-neutral-800 text-xs rounded-lg px-3 py-1.5 border border-brand-light focus:outline-none focus:border-brand-gold font-medium"
                    id="dashboard-period-select"
                  >
                    <option value="7_days">Last 7 Days</option>
                    <option value="30_days">Last 30 Days</option>
                    <option value="this_month">This Month</option>
                    <option value="this_year">This Year</option>
                  </select>
                </div>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={revenueCurrency === 'AED' ? '#059669' : '#C9A24B'} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={revenueCurrency === 'AED' ? '#059669' : '#C9A24B'} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0EEE8" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#6B6B6B' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#6B6B6B' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => {
                    const prefix = revenueCurrency === 'AED' ? 'AED ' : '₹';
                    return v >= 1000 ? (v % 1000 === 0 ? `${prefix}${(v/1000).toFixed(0)}k` : `${prefix}${(v/1000).toFixed(1)}k`) : `${prefix}${v}`;
                  }}
                />
                <Tooltip
                  formatter={(v) => [revenueCurrency === 'AED' ? fmtAED(v) : fmtINR(v), 'Revenue']}
                  contentStyle={{ fontSize: 12, border: '1px solid #F0EEE8', borderRadius: 4 }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke={revenueCurrency === 'AED' ? '#059669' : '#C9A24B'}
                  strokeWidth={2.5}
                  fill="url(#goldGrad)"
                  dot={{ fill: revenueCurrency === 'AED' ? '#059669' : '#C9A24B', r: 3 }}
                  animationBegin={200}
                  animationDuration={800}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Low Stock Alerts (Real backend data) */}
          <div className="bg-white rounded-xl p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle size={17} className="text-amber-500" strokeWidth={1.5} />
                <h2 className="font-playfair text-lg font-semibold">Low Stock Alert</h2>
              </div>
              
              <div className="space-y-3">
                {lowStockAlerts.length === 0 ? (
                  <p className="text-xs text-brand-grey p-3 bg-neutral-50 rounded-lg text-center">
                    No critical low stock alerts. All inventory healthy!
                  </p>
                ) : (
                  lowStockAlerts.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-amber-50/60 rounded-lg">
                      <Package size={16} className="text-amber-600 flex-shrink-0" strokeWidth={1.5} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold line-clamp-1 text-neutral-800">{item.message || 'Low Stock Product'}</p>
                        <p className="text-[10px] text-brand-grey">Warehouse: {item.warehouseId || 'Main'}</p>
                      </div>
                      <span className="flex-shrink-0 text-[11px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                        {item.quantity || 0} left
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <Link to="/products" className="mt-4 text-xs text-brand-gold hover:underline flex items-center gap-1 font-semibold" id="low-stock-manage">
              Manage Stock <ArrowRight size={12} />
            </Link>
          </div>
        </div>

        {/* Recent Orders Table (Real Backend Orders) */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
          <div className="flex items-center justify-between px-5 py-4 border-b border-brand-light">
            <h2 className="font-playfair text-lg font-semibold">Recent Orders</h2>
            <Link to="/orders" className="text-xs text-brand-gold hover:underline flex items-center gap-1 font-semibold" id="view-all-orders">
              View All <ArrowRight size={12} />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Recent orders">
              <thead>
                <tr className="bg-brand-light/50 text-left">
                  {['Order #', 'Customer', 'Amount', 'Payment', 'Status', 'Date', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold text-brand-grey uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(4)].map((_, i) => (
                    <tr key={i} className="border-b border-brand-light">
                      {[...Array(7)].map((_, j) => <td key={j} className="px-4 py-3"><div className="skeleton h-4 w-20" /></td>)}
                    </tr>
                  ))
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-xs text-brand-grey">
                      No orders placed yet. Real orders will appear here automatically.
                    </td>
                  </tr>
                ) : (
                  orders.slice(0, 5).map(order => (
                    <tr key={order.id} className="border-b border-brand-light hover:bg-brand-light/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-brand-gold">{order.orderNumber || order.id}</td>
                      <td className="px-4 py-3 text-brand-grey">{order.customer?.name || 'Customer'}</td>
                      <td className="px-4 py-3 font-semibold">{order.currency === 'AED' ? fmtAED(order.totalAmount) : fmtINR(order.totalAmount)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${order.paymentStatus === 'PAID' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                          {order.paymentStatus || 'UNPAID'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[order.status] || 'bg-gray-100'}`}>
                          {order.status ? order.status.replace(/_/g, ' ') : 'PENDING'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-brand-grey text-xs">
                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelectedOrderModal(order)}
                          className="p-1.5 bg-brand-gold/10 hover:bg-brand-gold hover:text-white text-brand-gold rounded-lg transition-all flex items-center gap-1 text-xs font-medium border border-brand-gold/20"
                          title="View Order Details"
                          id={`dashboard-view-order-${order.id}`}
                        >
                          <Eye size={14} /> Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Personal Shopper Requests Widget */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6 border border-brand-light/60">
          <div className="flex items-center justify-between px-5 py-4 border-b border-brand-light">
            <h2 className="font-playfair text-lg font-semibold flex items-center gap-2">
              <Gift size={18} className="text-brand-gold" /> Recent Personal Shopper Requests
            </h2>
            <Link to="/personal-shopper" className="text-xs text-brand-gold hover:underline flex items-center gap-1 font-semibold" id="view-all-shopper-requests">
              View All <ArrowRight size={12} />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Recent personal shopper requests">
              <thead>
                <tr className="bg-brand-light/50 text-left">
                  {['Customer Name', 'Email / Phone', 'Occasion', 'Budget', 'Status', 'Date', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold text-brand-grey uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentShopperRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-xs text-brand-grey">
                      No personal shopper styling requests received yet.
                    </td>
                  </tr>
                ) : (
                  recentShopperRequests.slice(0, 5).map(req => (
                    <tr key={req.id} className="border-b border-brand-light hover:bg-brand-light/30 transition-colors">
                      <td className="px-4 py-3 font-semibold text-brand-text">
                        {req.name}
                        {req.customerId && (
                          <span className="ml-1.5 px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] rounded font-bold uppercase">
                            Member
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-brand-grey">
                        <div>{req.email}</div>
                        {req.phone && <div className="text-[11px] text-neutral-400">{req.phone}</div>}
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-neutral-800">{req.occasion}</td>
                      <td className="px-4 py-3 text-xs font-bold text-amber-800">₹{req.budget}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          req.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                          req.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                          req.status === 'CONTACTED' ? 'bg-purple-100 text-purple-800' :
                          req.status === 'CANCELLED' ? 'bg-neutral-100 text-neutral-700' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-brand-grey text-xs">
                        {req.createdAt ? new Date(req.createdAt).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to="/personal-shopper"
                          className="p-1.5 bg-brand-gold/10 hover:bg-brand-gold hover:text-white text-brand-gold rounded-lg transition-all inline-flex items-center gap-1 text-xs font-medium border border-brand-gold/20"
                          title="View Personal Shopper Requests"
                        >
                          <Eye size={14} /> View
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Add Product', to: '/products', icon: Plus },
            { label: 'View Orders', to: '/orders', icon: ShoppingBag },
            { label: 'Reports', to: '/reports', icon: TrendingUp },
            { label: 'Settings', to: '/settings', icon: Package },
          ].map(({ label, to, icon: Icon }) => (
            <Link
              key={label}
              to={to}
              className="bg-white rounded-xl p-4 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow text-sm font-medium hover:text-brand-gold"
              id={`quick-${label.toLowerCase().replace(/\s/g,'-')}`}
            >
              <Icon size={18} className="text-brand-gold" strokeWidth={1.5} />
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* Admin Order Details Modal */}
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

export default DashboardPage;
