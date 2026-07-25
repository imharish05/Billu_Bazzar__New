import { useState, useEffect, useCallback } from 'react';
import { NavLink, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  LayoutDashboard, Package, Tag, ShoppingBag, Users, Image, Ticket,
  Warehouse, UserCheck, BarChart3, Settings, LogOut, Menu, X,
  Store, CreditCard, Gift, MessageSquare, Globe, Bell, ShoppingCart, Star, Trash2,
  ChevronDown, ChevronRight, Truck, XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from './Logo';
import { logout } from '../redux/slices/authSlice';
import api from '../services/api';

const ORDER_SUB_ITEMS = [
  {
    to: '/abandoned-carts',
    label: 'Abandoned Carts',
    icon: ShoppingBag,
    badgeKey: 'ABANDONED',
    badgeClass: 'bg-amber-100 text-amber-900 font-semibold px-2 py-0.5 rounded-full',
    match: (pathname) => pathname === '/abandoned-carts'
  },
  {
    to: '/orders?status=PENDING',
    status: 'PENDING',
    label: 'New Orders',
    icon: ShoppingBag,
    badgeKey: 'PENDING',
    badgeClass: 'text-neutral-600 font-medium',
    match: (pathname, statusParam) => pathname === '/orders' && statusParam === 'PENDING'
  },
  {
    to: '/orders?status=CONFIRMED',
    status: 'CONFIRMED',
    label: 'Confirmed',
    icon: Package,
    badgeKey: 'CONFIRMED',
    badgeClass: 'text-neutral-600 font-medium',
    match: (pathname, statusParam) => pathname === '/orders' && statusParam === 'CONFIRMED'
  },
  {
    to: '/orders?status=PROCESSING',
    status: 'PROCESSING',
    label: 'Packing',
    icon: Package,
    badgeKey: 'PROCESSING',
    badgeClass: 'bg-amber-100 text-amber-900 font-semibold px-2 py-0.5 rounded-full',
    match: (pathname, statusParam) => pathname === '/orders' && statusParam === 'PROCESSING'
  },
  {
    to: '/orders?status=SHIPPED',
    status: 'SHIPPED',
    label: 'Dispatched',
    icon: Truck,
    badgeKey: 'SHIPPED',
    badgeClass: 'bg-purple-100 text-purple-900 font-semibold px-2 py-0.5 rounded-full',
    match: (pathname, statusParam) => pathname === '/orders' && statusParam === 'SHIPPED'
  },
  {
    to: '/orders?status=OUT_FOR_DELIVERY',
    status: 'OUT_FOR_DELIVERY',
    label: 'Out for Delivery',
    icon: Truck,
    badgeKey: 'OUT_FOR_DELIVERY',
    badgeClass: 'bg-blue-100 text-blue-900 font-semibold px-2 py-0.5 rounded-full',
    match: (pathname, statusParam) => pathname === '/orders' && statusParam === 'OUT_FOR_DELIVERY'
  },
  {
    to: '/orders?status=DELIVERED',
    status: 'DELIVERED',
    label: 'Delivered',
    icon: Truck,
    badgeKey: 'DELIVERED',
    badgeClass: 'bg-emerald-100 text-emerald-900 font-semibold px-2 py-0.5 rounded-full',
    match: (pathname, statusParam) => pathname === '/orders' && statusParam === 'DELIVERED'
  },
  {
    to: '/orders?status=CANCELLED',
    status: 'CANCELLED',
    label: 'Cancelled',
    icon: XCircle,
    badgeKey: 'CANCELLED',
    badgeClass: 'text-neutral-600 font-medium',
    match: (pathname, statusParam) => pathname === '/orders' && statusParam === 'CANCELLED'
  },
  {
    to: '/orders?status=RTO',
    status: 'RTO',
    label: 'RTO',
    icon: Truck,
    badgeKey: 'RTO',
    badgeClass: 'text-neutral-600 font-medium',
    match: (pathname, statusParam) => pathname === '/orders' && statusParam === 'RTO'
  },
  {
    to: '/orders?status=RETURNED',
    status: 'RETURNED',
    label: 'Returned',
    icon: Truck,
    badgeKey: 'RETURNED',
    badgeClass: 'text-neutral-600 font-medium',
    match: (pathname, statusParam) => pathname === '/orders' && statusParam === 'RETURNED'
  },
];

const NAV_SECTIONS = [
  {
    heading: null,
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    heading: 'Marketing',
    items: [
      { to: '/slider-messages', label: 'Slider Messages', icon: MessageSquare },
      { to: '/banners', label: 'Banners', icon: Image },
      { to: '/coupons', label: 'Coupons', icon: Ticket },
      { to: '/gift-services', label: 'Gift Services', icon: Gift },
      { to: '/affiliates', label: 'Affiliates', icon: UserCheck },
      { to: '/loyalty', label: 'Loyalty', icon: Gift },
    ],
  },
  {
    heading: 'Operations',
    items: [
      { to: '/vendors', label: 'Vendors', icon: Store },
      { to: '/warehouses', label: 'Warehouses', icon: Warehouse },
    ],
  },
  {
    heading: 'Products',
    items: [
      { to: '/categories', label: 'Root Categories', icon: Tag },
      { to: '/sub-categories', label: 'Parent Categories', icon: Tag },
      { to: '/sub-sub-categories', label: 'Child Categories', icon: Tag },
      { to: '/products', label: 'Products', icon: Package },
      { to: '/variants', label: 'Variants', icon: Package },
      { to: '/reviews', label: 'Product Reviews', icon: Star },
      { label: 'Orders', icon: ShoppingBag, isAccordion: true },
    ],
  },
  {
    heading: 'Customers',
    items: [
      { to: '/customers', label: 'Customers', icon: Users },
    ],
  },
  {
    heading: 'Finance',
    items: [
      { to: '/payments', label: 'Payments', icon: CreditCard },
      { to: '/reports', label: 'Reports', icon: BarChart3 },
    ],
  },
  {
    heading: null,
    items: [
      { to: '/site-settings', label: 'Site Settings', icon: Globe },
      { to: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

const AdminLayout = ({ children, title = '' }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { admin } = useSelector(s => s.auth);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [dismissedIds, setDismissedIds] = useState(() => {
    try {
      return new Set(JSON.parse(sessionStorage.getItem('admin_dismissed_notifs') || '[]'));
    } catch { return new Set(); }
  });
  const [orderCounts, setOrderCounts] = useState({});
  const [ordersOpen, setOrdersOpen] = useState(() => {
    return location.pathname === '/orders' || location.pathname === '/abandoned-carts';
  });

  const currentStatusParam = searchParams.get('status');

  const loadNotifications = useCallback(async () => {
    try {
      const res = await api.get('/warehouses/alerts/low-stock');
      if (res.data.success) {
        const stockAlerts = (res.data.alerts || []).map(a => ({
          id: `stock-${a.id}`,
          type: 'stock',
          text: a.message,
          warehouseId: a.warehouseId,
          time: `Stock: ${a.quantity} units`,
          read: false
        }));
        // Filter out notifications the user has already dismissed this session
        setDismissedIds(prev => {
          const filtered = stockAlerts.filter(n => !prev.has(n.id));
          setNotifications(filtered);
          return prev;
        });
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  }, []);

  const loadOrderCounts = useCallback(async () => {
    try {
      const res = await api.get('/orders/status-counts');
      if (res.data.success) {
        setOrderCounts(res.data.counts || {});
      }
    } catch (err) {
      console.error('Failed to load order status counts:', err);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    loadOrderCounts();
  }, [loadNotifications, loadOrderCounts]);

  useEffect(() => {
    if (location.pathname === '/orders' || location.pathname === '/abandoned-carts') {
      setOrdersOpen(true);
    }
  }, [location.pathname]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearAllNotifications = () => {
    setNotifications(prev => {
      const allIds = prev.map(n => n.id);
      setDismissedIds(existingDismissed => {
        const updated = new Set([...existingDismissed, ...allIds]);
        try {
          sessionStorage.setItem('admin_dismissed_notifs', JSON.stringify([...updated]));
        } catch {}
        return updated;
      });
      return [];
    });
  };

  const handleNotificationClick = (n) => {
    setNotificationsOpen(false);
    // Dismiss (remove) clicked notification and remember it
    setDismissedIds(prev => {
      const updated = new Set([...prev, n.id]);
      try {
        sessionStorage.setItem('admin_dismissed_notifs', JSON.stringify([...updated]));
      } catch {}
      return updated;
    });
    setNotifications(prev => prev.filter(item => item.id !== n.id));
    if (n.warehouseId) {
      navigate(`/warehouses?warehouseId=${n.warehouseId}&lowStock=true`);
    }
  };

  const handleLogout = () => { dispatch(logout()); navigate('/login'); };

  const isOrdersSectionActive = location.pathname === '/orders' || location.pathname === '/abandoned-carts';

  const Sidebar = () => (
    <aside className="flex flex-col h-full bg-white border-r border-brand-light w-60">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-brand-light flex-shrink-0">
        <Logo size="md" showText={true} />
        <p className="text-[10px] text-brand-grey mt-1 tracking-widest uppercase">Admin Panel</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2" aria-label="Admin navigation">
        {NAV_SECTIONS.map((section, si) => (
          <div key={si}>
            {section.heading && (
              <p className="px-3 py-2 text-[10px] font-bold text-brand-grey uppercase tracking-[0.15em]">
                {section.heading}
              </p>
            )}
            {section.items.map((item) => {
              if (item.isAccordion) {
                return (
                  <div key={item.label} className="mb-0.5">
                    {/* Orders Parent Toggle */}
                    <button
                      onClick={() => {
                        setOrdersOpen(prev => !prev);
                        if (!isOrdersSectionActive) {
                          navigate('/orders');
                        }
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all border-l-2 ${
                        isOrdersSectionActive
                          ? 'bg-amber-50/70 text-brand-gold border-brand-gold font-semibold'
                          : 'border-transparent text-brand-grey hover:bg-brand-light hover:text-brand-text'
                      }`}
                      id="nav-orders-toggle"
                    >
                      <div className="flex items-center gap-3">
                        <item.icon size={17} strokeWidth={1.5} />
                        <span>{item.label}</span>
                      </div>
                      {ordersOpen ? (
                        <ChevronDown size={15} className="text-neutral-400" />
                      ) : (
                        <ChevronRight size={15} className="text-neutral-400" />
                      )}
                    </button>

                    {/* Orders Sub-Items Collapsible List */}
                    <AnimatePresence initial={false}>
                      {ordersOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden pl-4 pr-1 py-1 space-y-0.5"
                        >
                          {ORDER_SUB_ITEMS.map(subItem => {
                            const isActive = subItem.match(location.pathname, currentStatusParam);
                            const count = orderCounts[subItem.badgeKey];
                            const SubIcon = subItem.icon;

                            return (
                              <NavLink
                                key={subItem.to}
                                to={subItem.to}
                                onClick={() => setSidebarOpen(false)}
                                className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                                  isActive
                                    ? 'bg-[#FFF4F4] text-[#711425] font-semibold'
                                    : 'text-neutral-600 hover:bg-neutral-100/70 hover:text-neutral-900'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <SubIcon size={15} strokeWidth={1.5} className={isActive ? 'text-[#711425]' : 'text-neutral-500'} />
                                  <span className="truncate">{subItem.label}</span>
                                </div>
                                {count !== undefined && count > 0 && (
                                  <span className={`text-[11px] min-w-[20px] text-center ${subItem.badgeClass}`}>
                                    {count}
                                  </span>
                                )}
                              </NavLink>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              }

              const { to, label, icon: Icon } = item;
              return (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium mb-0.5 transition-all border-l-2 ${
                      isActive
                        ? 'bg-amber-50 text-brand-gold border-brand-gold'
                        : 'border-transparent text-brand-grey hover:bg-brand-light hover:text-brand-text'
                    }`
                  }
                  id={`nav-${label.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon size={17} strokeWidth={1.5} />
                  {label}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom user section */}
      <div className="px-4 py-4 border-t border-brand-light">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-brand-gold flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">{admin?.name?.[0] || 'A'}</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium truncate">{admin?.name || 'Admin'}</p>
            <p className="text-[10px] text-brand-grey truncate">{admin?.role || 'superadmin'}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 text-xs text-red-400 hover:text-red-600 transition-colors py-1.5 focus-visible:outline-brand-gold"
          id="admin-logout-btn"
        >
          <LogOut size={14} /> Sign Out
        </button>
      </div>
    </aside>
  );


  return (
    <div className="flex h-screen bg-brand-bg overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-col flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              key="mobile-sidebar"
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.28 }}
              className="fixed left-0 top-0 bottom-0 z-50 lg:hidden"
            >
              <Sidebar />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Glass surface: Admin top navbar */}
        <header className="glass-nav flex-shrink-0 flex items-center justify-between px-4 md:px-6 h-14 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-1.5 hover:text-brand-gold transition-colors focus-visible:outline-brand-gold"
              aria-label="Toggle sidebar"
              id="admin-mobile-menu"
            >
              <Menu size={20} strokeWidth={1.5} />
            </button>
            <h1 className="font-playfair text-lg font-semibold text-brand-text">{title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <a href={import.meta.env.VITE_CLIENT_URL || 'http://localhost:5173'} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-grey hover:text-brand-gold transition-colors focus-visible:outline-brand-gold">
              View Store ↗
            </a>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-1.5 text-brand-grey hover:text-brand-gold transition-colors focus-visible:outline-brand-gold relative flex items-center"
                aria-label="Notifications"
                id="admin-notifications-bell"
              >
                <Bell size={18} strokeWidth={1.5} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white animate-pulse" />
                )}
              </button>

              <AnimatePresence>
                {notificationsOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setNotificationsOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-80 bg-white border border-brand-light shadow-xl z-50 rounded-lg overflow-hidden"
                    >
                      <div className="flex items-center justify-between px-4 py-3 border-b border-brand-light bg-neutral-50">
                        <span className="text-xs font-bold text-neutral-900 uppercase tracking-wider">Notifications</span>
                        <div className="flex items-center gap-2">
                          {unreadCount > 0 && (
                            <button
                              onClick={markAllRead}
                              className="text-[10px] font-semibold text-brand-gold hover:underline uppercase tracking-wider bg-transparent border-none cursor-pointer"
                            >
                              Mark read
                            </button>
                          )}
                          {notifications.length > 0 && (
                            <button
                              onClick={clearAllNotifications}
                              className="text-[10px] font-semibold text-red-500 hover:text-red-700 uppercase tracking-wider bg-transparent border-none cursor-pointer flex items-center gap-1"
                            >
                              <Trash2 size={10} /> Clear
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="max-h-64 overflow-y-auto divide-y divide-brand-light">
                        {notifications.length === 0 ? (
                          <div className="p-4 text-center text-xs text-brand-grey">No active stock alerts</div>
                        ) : (
                          notifications.map(n => (
                            <div
                              key={n.id}
                              onClick={() => handleNotificationClick(n)}
                              className={`p-3 text-xs transition-colors hover:bg-neutral-50/80 cursor-pointer flex gap-2 ${
                                !n.read ? 'bg-amber-50/30' : ''
                              }`}
                            >
                              <div className="flex-1">
                                <p className={`text-neutral-800 text-left ${!n.read ? 'font-medium' : ''}`}>{n.text}</p>
                                <p className="text-[10px] text-brand-grey text-left mt-0.5">{n.time}</p>
                              </div>
                              {!n.read && (
                                <div className="w-1.5 h-1.5 bg-brand-gold rounded-full self-center" />
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <div className="w-8 h-8 rounded-full bg-brand-gold flex items-center justify-center">
              <span className="text-white text-xs font-bold">{admin?.name?.[0] || 'A'}</span>
            </div>
          </div>
        </header>

        {/* Page content — scrollable */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
