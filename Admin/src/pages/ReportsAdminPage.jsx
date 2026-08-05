import { useState, useEffect, useMemo } from 'react';
import { 
  Search, Calendar, Filter, TrendingUp, ShoppingBag, 
  Users, BarChart3, RefreshCw, FileSpreadsheet, 
  ArrowUpRight, CheckCircle2, ChevronLeft, ChevronRight, Info, CreditCard, Clock, PackageCheck, AlertCircle
} from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import api from '../services/api';
import * as XLSX from 'xlsx';
import { toast } from 'react-hot-toast';

// Helper for formatting INR currency
const fmtINR = (v) => {
  if (typeof v !== 'number' || isNaN(v)) return '₹0';
  return `₹${Math.round(v).toLocaleString('en-IN')}`;
};

// Helper for formatting AED currency
const fmtAED = (v) => {
  if (typeof v !== 'number' || isNaN(v)) return 'AED 0';
  return `AED ${Math.round(v).toLocaleString('en-IN')}`;
};

const ReportsAdminPage = () => {
  // State for Controls (Only Sales, Orders, Customers)
  const [reportType, setReportType] = useState('sales'); // 'sales' | 'orders' | 'customers'
  const [dateRange, setDateRange] = useState('All Time');
  const [category, setCategory] = useState('All Categories');
  const [searchQuery, setSearchQuery] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Custom Date Range state
  const [customStartDate, setCustomStartDate] = useState('2026-07-01');
  const [customEndDate, setCustomEndDate] = useState('2026-07-28');

  // Dynamic Live State loaded strictly from backend API
  const [loading, setLoading] = useState(false);
  const [apiOrders, setApiOrders] = useState([]);
  const [apiCustomers, setApiCustomers] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [selectedOrderStatus, setSelectedOrderStatus] = useState('ALL');

  // Load Real Data strictly from Backend APIs
  const loadDynamicData = async () => {
    setLoading(true);
    try {
      const [statsRes, ordersRes, customersRes, categoriesRes] = await Promise.allSettled([
        api.get('/orders/stats'),
        api.get('/orders?limit=10000'),
        api.get('/customers?limit=10000'),
        api.get('/categories')
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value.data.success) {
        setDashboardStats(statsRes.value.data.stats);
      }

      if (ordersRes.status === 'fulfilled' && ordersRes.value.data.success) {
        setApiOrders(ordersRes.value.data.orders || []);
      }

      if (customersRes.status === 'fulfilled' && customersRes.value.data.success) {
        setApiCustomers(customersRes.value.data.customers || []);
      }

      if (categoriesRes.status === 'fulfilled' && categoriesRes.value.data.success) {
        setCategoriesList(categoriesRes.value.data.categories || []);
      }
    } catch (err) {
      console.warn('API data fetch warning:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDynamicData();
  }, []);

  // Compute 100% REAL Report Records directly from backend API
  const rawReportData = useMemo(() => {
    if (reportType === 'sales') {
      return apiOrders.map(o => ({
        id: o.orderNumber || o.id,
        date: o.createdAt ? new Date(o.createdAt).toISOString().split('T')[0] : '—',
        customerName: o.customer?.name || 'Guest / Customer',
        email: o.customer?.email || 'N/A',
        itemsCount: o.items?.length || 1,
        gross: parseFloat(o.totalAmount || 0) + parseFloat(o.discountAmount || 0),
        discount: parseFloat(o.discountAmount || 0),
        net: parseFloat(o.totalAmount || 0),
        currency: o.currency || 'INR',
        paymentMethod: o.paymentMethod || 'Razorpay',
        paymentStatus: o.paymentStatus || 'PAID'
      }));
    } 
    
    if (reportType === 'orders') {
      return apiOrders.map(o => ({
        id: o.id,
        orderNumber: o.orderNumber || o.id,
        customerName: o.customer?.name || 'Guest / Customer',
        date: o.createdAt ? new Date(o.createdAt).toISOString().split('T')[0] : '—',
        totalAmount: parseFloat(o.totalAmount || 0),
        currency: o.currency || 'INR',
        itemsCount: o.items?.length || 1,
        paymentMethod: o.paymentMethod || 'Razorpay',
        status: o.status || 'PENDING',
        shiprocket: o.shiprocketOrderId || 'Pending'
      }));
    } 
    
    if (reportType === 'customers') {
      return apiCustomers.map(c => {
        const custOrders = apiOrders.filter(o => o.customerId === c.id || (o.customer?.email && c.email && o.customer.email.toLowerCase() === c.email.toLowerCase()));
        const paidOrders = custOrders.filter(o => o.paymentStatus === 'PAID');
        const spentFromOrders = paidOrders.reduce((sum, o) => sum + (parseFloat(o.totalAmount) || 0), 0);
        const spentFromC = c.orders ? c.orders.filter(o => o.paymentStatus === 'PAID').reduce((s, o) => s + (parseFloat(o.totalAmount) || 0), 0) : 0;
        const totalSpentVal = spentFromOrders > 0 ? spentFromOrders : (spentFromC > 0 ? spentFromC : (parseFloat(c.totalSpent) || 0));
        const count = custOrders.length > 0 ? custOrders.length : (c.ordersCount !== undefined ? c.ordersCount : (c.orders?.length || 0));

        return {
          id: c.id,
          name: c.name || 'Customer',
          email: c.email || '—',
          phone: c.phone || '—',
          ordersCount: count,
          totalSpent: totalSpentVal,
          loyaltyPoints: c.loyaltyPoints || 0,
          joinedDate: c.createdAt ? new Date(c.createdAt).toISOString().split('T')[0] : '—',
          status: 'Active'
        };
      });
    }

    return [];
  }, [reportType, apiOrders, apiCustomers]);

  // Apply Search Query, Category, Order Status & Date Range Filters
  const filteredData = useMemo(() => {
    let list = rawReportData;

    // Filter by Date Range
    if (dateRange !== 'All Time') {
      const today = new Date();
      list = list.filter(item => {
        if (!item.date || item.date === '—') return true;
        const itemDate = new Date(item.date);
        if (isNaN(itemDate.getTime())) return true;

        if (dateRange === 'Today') {
          return itemDate.toDateString() === today.toDateString();
        }
        if (dateRange === 'This Week') {
          const startOfWeek = new Date(today);
          startOfWeek.setDate(today.getDate() - today.getDay());
          startOfWeek.setHours(0,0,0,0);
          return itemDate >= startOfWeek;
        }
        if (dateRange === 'This Month') {
          return itemDate.getMonth() === today.getMonth() && itemDate.getFullYear() === today.getFullYear();
        }
        if (dateRange === 'Custom' && customStartDate && customEndDate) {
          const start = new Date(customStartDate);
          const end = new Date(customEndDate);
          end.setHours(23,59,59,999);
          return itemDate >= start && itemDate <= end;
        }
        return true;
      });
    }

    // Filter Sales by Category
    if (reportType === 'sales' && category !== 'All Categories') {
      list = list.filter(item => {
        const origOrder = apiOrders.find(raw => (raw.orderNumber || raw.id) === item.id);
        if (!origOrder || !origOrder.items) return false;
        return origOrder.items.some(it => {
          const catName = it.product?.category?.name || it.category?.name || it.category;
          return catName && String(catName).toLowerCase() === category.toLowerCase();
        });
      });
    }

    // Filter Orders by Order Status
    if (reportType === 'orders' && selectedOrderStatus !== 'ALL') {
      list = list.filter(item => {
        if (selectedOrderStatus === 'PENDING') {
          return item.status === 'PENDING' || item.status === 'PAID';
        }
        return item.status === selectedOrderStatus;
      });
    }

    // Apply Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(item => {
        if (item.id && String(item.id).toLowerCase().includes(q)) return true;
        if (item.orderNumber && String(item.orderNumber).toLowerCase().includes(q)) return true;
        if (item.customerName && item.customerName.toLowerCase().includes(q)) return true;
        if (item.name && item.name.toLowerCase().includes(q)) return true;
        if (item.email && item.email.toLowerCase().includes(q)) return true;
        if (item.phone && item.phone.toLowerCase().includes(q)) return true;
        if (item.status && item.status.toLowerCase().includes(q)) return true;
        return false;
      });
    }

    return list;
  }, [rawReportData, reportType, dateRange, customStartDate, customEndDate, category, selectedOrderStatus, searchQuery, apiOrders]);

  // Pagination logic
  useEffect(() => {
    setCurrentPage(1);
  }, [reportType, dateRange, category, selectedOrderStatus, searchQuery, rowsPerPage]);

  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage) || 1;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + rowsPerPage);

  // Compute REAL Dynamic KPI Metric Cards strictly from backend state & active filters
  const summaryMetrics = useMemo(() => {
    if (reportType === 'sales') {
      const isFiltered = category !== 'All Categories';
      const sourceData = isFiltered ? filteredData : rawReportData;
      const totalRevINR = sourceData.filter(r => r.currency !== 'AED').reduce((sum, r) => sum + (r.net || r.totalAmount || 0), 0);
      const totalRevAED = sourceData.filter(r => r.currency === 'AED').reduce((sum, r) => sum + (r.net || r.totalAmount || 0), 0);
      const totalOrd = sourceData.length;
      const avgOrderVal = totalOrd > 0 ? Math.round(totalRevINR / totalOrd) : 0;

      return [
        { label: 'Total Sales (INR)', value: fmtINR(totalRevINR), icon: TrendingUp },
        { label: 'Total Sales (AED)', value: fmtAED(totalRevAED), icon: TrendingUp },
        { label: 'Total Orders', value: totalOrd.toLocaleString('en-IN'), icon: ShoppingBag },
        { label: 'Average Order Value (AOV)', value: fmtINR(avgOrderVal), icon: CreditCard },
      ];
    } 
    
    if (reportType === 'orders') {
      const isFiltered = selectedOrderStatus !== 'ALL';
      const sourceData = isFiltered ? filteredData : rawReportData;
      const totalOrd = sourceData.length;
      const pendingOrd = sourceData.filter(r => r.status === 'PENDING' || r.status === 'PAID' || r.status === 'CONFIRMED' || r.status === 'PROCESSING').length;
      const deliveredOrd = sourceData.filter(r => r.status === 'DELIVERED').length;
      const cancelledOrd = sourceData.filter(r => r.status === 'CANCELLED' || r.status === 'RETURNED').length;

      return [
        { label: 'Total Orders Count', value: totalOrd.toLocaleString('en-IN'), icon: ShoppingBag },
        { label: 'Pending / Processing', value: pendingOrd.toLocaleString('en-IN'), icon: Clock },
        { label: 'Successfully Delivered', value: deliveredOrd.toLocaleString('en-IN'), icon: PackageCheck },
        { label: 'Cancelled / Returned', value: cancelledOrd.toLocaleString('en-IN'), icon: AlertCircle },
      ];
    }

    if (reportType === 'customers') {
      const totalCust = dashboardStats?.totalCustomers !== undefined ? dashboardStats.totalCustomers : rawReportData.length;
      const totalSpent = rawReportData.reduce((sum, r) => sum + (r.totalSpent || 0), 0);
      const avgSpent = totalCust > 0 ? Math.round(totalSpent / totalCust) : 0;
      const totalLoyalty = rawReportData.reduce((sum, r) => sum + (r.loyaltyPoints || 0), 0);

      return [
        { label: 'Total Customers', value: totalCust.toLocaleString('en-IN'), icon: Users },
        { label: 'Customer Lifetime Spend', value: fmtINR(totalSpent), icon: TrendingUp },
        { label: 'Avg Spend per Customer', value: fmtINR(avgSpent), icon: CreditCard },
        { label: 'Total Loyalty Points', value: totalLoyalty.toLocaleString('en-IN'), icon: CheckCircle2 },
      ];
    }

    return [];
  }, [reportType, category, selectedOrderStatus, filteredData, rawReportData, dashboardStats]);

  // Export Filtered Dataset to Excel (.xlsx)
  const handleExportToExcel = () => {
    try {
      if (!filteredData || filteredData.length === 0) {
        toast.error('No real data available to export');
        return;
      }

      let exportRows = [];

      if (reportType === 'sales') {
        exportRows = filteredData.map((r, i) => ({
          'S.No': i + 1,
          'Order ID': r.id,
          'Date': r.date,
          'Customer Name': r.customerName,
          'Items Count': r.itemsCount,
          'Gross Revenue': r.currency === 'AED' ? fmtAED(r.gross) : fmtINR(r.gross),
          'Discounts': fmtINR(r.discount),
          'Net Sales': r.currency === 'AED' ? fmtAED(r.net) : fmtINR(r.net),
          'Currency': r.currency,
          'Payment Method': r.paymentMethod,
          'Payment Status': r.paymentStatus
        }));
      } else if (reportType === 'orders') {
        exportRows = filteredData.map((r, i) => ({
          'S.No': i + 1,
          'Order Number': r.orderNumber,
          'Customer Name': r.customerName,
          'Order Date': r.date,
          'Total Amount': r.currency === 'AED' ? fmtAED(r.totalAmount) : fmtINR(r.totalAmount),
          'Currency': r.currency,
          'Items Count': r.itemsCount,
          'Payment Method': r.paymentMethod,
          'Order Status': r.status,
          'Shiprocket Tracking': r.shiprocket
        }));
      } else if (reportType === 'customers') {
        exportRows = filteredData.map((r, i) => ({
          'S.No': i + 1,
          'Customer Name': r.name,
          'Email': r.email,
          'Phone': r.phone,
          'Total Orders Placed': r.ordersCount,
          'Total Spent (INR)': r.totalSpent,
          'Loyalty Points': r.loyaltyPoints,
          'Joined Date': r.joinedDate,
          'Account Status': r.status
        }));
      }

      const sheetNames = {
        sales: 'Sales_Report',
        orders: 'Orders_Report',
        customers: 'Customers_Report'
      };

      const sheetName = sheetNames[reportType] || 'Report';
      const worksheet = XLSX.utils.json_to_sheet(exportRows);
      
      const colWidths = Object.keys(exportRows[0] || {}).map(key => ({
        wch: Math.max(key.length + 4, 16)
      }));
      worksheet['!cols'] = colWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      
      const todayStr = new Date().toISOString().split('T')[0];
      const fileName = `BilluBazzar_${sheetName}_${todayStr}.xlsx`;
      
      XLSX.writeFile(workbook, fileName);
      toast.success(`Successfully exported ${exportRows.length} rows to ${fileName}`);
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Failed to export report to Excel');
    }
  };

  return (
    <AdminLayout title="Reports">
      <div className="space-y-6">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-playfair text-2xl font-bold text-brand-text">Reports & Analytics</h1>
            <p className="text-xs text-brand-grey mt-1">
              Pick a report, narrow it down, and view live database metrics.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadDynamicData}
              className="p-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-600 hover:text-brand-gold transition-colors"
              title="Refresh Data"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>

            {/* Export to Excel Action Button */}
            <button
              onClick={handleExportToExcel}
              className="px-4 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-2 border border-emerald-600 focus-visible:outline-emerald-600 cursor-pointer"
              id="export-excel-btn"
              title="Export report data into Excel format (.xlsx)"
            >
              <FileSpreadsheet size={16} />
              <span>Export to Excel</span>
            </button>
          </div>
        </div>

        {/* Dynamic Controls Card */}
        <div className="bg-[#F8F9FA] dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-5 shadow-sm space-y-4">
          
          {/* Top Row: Report Type (Sales, Orders, Customers), Date Range, Category */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* REPORT TYPE Select */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                Report
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-xs font-medium text-neutral-800 dark:text-neutral-100 focus:ring-2 focus:ring-brand-gold focus:border-brand-gold outline-none transition-all shadow-sm"
                id="report-type-select"
              >
                <option value="sales">Sales</option>
                <option value="orders">Orders</option>
                <option value="customers">Customers</option>
              </select>
            </div>

            {/* DATE RANGE Select */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                Date Range
              </label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-xs font-medium text-neutral-800 dark:text-neutral-100 focus:ring-2 focus:ring-brand-gold focus:border-brand-gold outline-none transition-all shadow-sm"
                id="date-range-select"
              >
                <option value="All Time">All Time</option>
                <option value="Today">Today (Daily)</option>
                <option value="This Week">This Week (Weekly)</option>
                <option value="This Month">This Month (Monthly)</option>
                <option value="Custom">Custom Date Range</option>
              </select>
            </div>

            {/* 3RD FILTER DROPDOWN: CATEGORY for Sales, ORDER STATUS for Orders, Hidden for Customers */}
            {reportType === 'sales' && (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-xs font-medium text-neutral-800 dark:text-neutral-100 focus:ring-2 focus:ring-brand-gold focus:border-brand-gold outline-none transition-all shadow-sm"
                  id="category-select"
                >
                  <option value="All Categories">All Categories</option>
                  {categoriesList.map(c => (
                    <option key={c.id || c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            {reportType === 'orders' && (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                  Order Status
                </label>
                <select
                  value={selectedOrderStatus}
                  onChange={(e) => setSelectedOrderStatus(e.target.value)}
                  className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-xs font-medium text-neutral-800 dark:text-neutral-100 focus:ring-2 focus:ring-brand-gold focus:border-brand-gold outline-none transition-all shadow-sm"
                  id="order-status-select"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING">New Orders</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="PROCESSING">Packing</option>
                  <option value="SHIPPED">Dispatched</option>
                  <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
                  <option value="DELIVERED">Delivered</option>
                  <option value="CANCELLED">Cancelled</option>
                  <option value="RETURNED">Returned</option>
                  <option value="REFUNDED">Refunded</option>
                </select>
              </div>
            )}
          </div>

          {/* Custom Date Pickers */}
          {dateRange === 'Custom' && (
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-neutral-200/60 dark:border-neutral-800">
              <div className="flex items-center gap-2 text-xs text-neutral-600">
                <Calendar size={14} className="text-brand-gold" />
                <span className="font-semibold text-neutral-700">Start Date:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-white border border-neutral-300 rounded px-2.5 py-1 text-xs outline-none focus:border-brand-gold"
                />
              </div>
              <div className="flex items-center gap-2 text-xs text-neutral-600">
                <span className="font-semibold text-neutral-700">End Date:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-white border border-neutral-300 rounded px-2.5 py-1 text-xs outline-none focus:border-brand-gold"
                />
              </div>
            </div>
          )}

          {/* Search Box & Rows Per Page */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            
            {/* Search items... Input */}
            <div className="relative w-full sm:w-80">
              <Search size={15} className="absolute left-3 top-2.5 text-neutral-400" />
              <input
                type="text"
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 focus:ring-2 focus:ring-brand-gold focus:border-brand-gold outline-none transition-all"
                id="report-search-input"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-xs text-neutral-400 hover:text-neutral-600"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Rows per page Selector */}
            <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-neutral-500">
              <span>Rows per page</span>
              <select
                value={rowsPerPage}
                onChange={(e) => setRowsPerPage(Number(e.target.value))}
                className="bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-2.5 py-1 text-xs font-semibold text-neutral-800 dark:text-neutral-100 focus:ring-2 focus:ring-brand-gold focus:border-brand-gold outline-none"
                id="rows-per-page-select"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>

        {/* Dynamic Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryMetrics.map((metric, i) => {
            const Icon = metric.icon || TrendingUp;
            return (
              <div key={i} className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-brand-light dark:border-neutral-700 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-brand-grey">
                    {metric.label}
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-neutral-700 flex items-center justify-center text-brand-gold">
                    <Icon size={16} />
                  </div>
                </div>
                <div className="flex items-baseline justify-between mt-3">
                  <span className="font-playfair text-xl font-bold text-neutral-900 dark:text-white">
                    {metric.value}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Dynamic Main Data Table Container */}
        <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-brand-light dark:border-neutral-700 shadow-sm overflow-hidden">
          
          {/* Table Header */}
          <div className="px-5 py-4 border-b border-brand-light dark:border-neutral-700 flex items-center justify-between">
            <h3 className="font-playfair text-base font-bold text-neutral-900 dark:text-white capitalize">
              {reportType} Report Data
            </h3>
            <span className="text-xs text-brand-grey">
              Showing {filteredData.length} records
            </span>
          </div>

          {/* Scrollable Table View */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" aria-label="Reports Data Table">
              
              {/* Table Column Headers */}
              <thead>
                <tr className="bg-[#F4F6F9] dark:bg-neutral-900 border-b border-brand-light dark:border-neutral-700">
                  {reportType === 'sales' && (
                    <>
                      <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-brand-grey">Order ID / Date</th>
                      <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-brand-grey">Customer</th>
                      <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-brand-grey">Items</th>
                      <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-brand-grey">Gross Amount</th>
                      <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-brand-grey">Discount</th>
                      <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-brand-grey">Net Sales</th>
                      <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-brand-grey text-right">Payment Status</th>
                    </>
                  )}

                  {reportType === 'orders' && (
                    <>
                      <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-brand-grey">Order Number</th>
                      <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-brand-grey">Customer Name</th>
                      <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-brand-grey">Date</th>
                      <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-brand-grey">Total Amount</th>
                      <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-brand-grey">Payment Method</th>
                      <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-brand-grey">Shiprocket ID</th>
                      <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-brand-grey text-right">Order Status</th>
                    </>
                  )}

                  {reportType === 'customers' && (
                    <>
                      <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-brand-grey">Customer Name</th>
                      <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-brand-grey">Email</th>
                      <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-brand-grey">Phone</th>
                      <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-brand-grey">Total Orders</th>
                      <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-brand-grey">Total Spent (LTV)</th>
                      <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-brand-grey">Loyalty Points</th>
                      <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-brand-grey text-right">Status</th>
                    </>
                  )}
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-brand-light/60 dark:divide-neutral-700 text-xs">
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-brand-grey">
                      No records found in database.
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((row, idx) => (
                    <tr 
                      key={row.id || idx} 
                      className="hover:bg-amber-50/30 dark:hover:bg-neutral-750 transition-colors"
                    >
                      {reportType === 'sales' && (
                        <>
                          <td className="px-5 py-3.5 font-medium text-neutral-900 dark:text-white">
                            <div>{row.id}</div>
                            <div className="text-[10px] text-neutral-400">{row.date}</div>
                          </td>
                          <td className="px-5 py-3.5 text-neutral-800 dark:text-neutral-200 font-medium">{row.customerName}</td>
                          <td className="px-5 py-3.5 text-neutral-600 dark:text-neutral-400">{row.itemsCount} items</td>
                          <td className="px-5 py-3.5 text-neutral-600 dark:text-neutral-400">
                            {row.currency === 'AED' ? fmtAED(row.gross) : fmtINR(row.gross)}
                          </td>
                          <td className="px-5 py-3.5 text-rose-600 font-medium">-{fmtINR(row.discount)}</td>
                          <td className="px-5 py-3.5 font-bold text-emerald-700 dark:text-emerald-400">
                            {row.currency === 'AED' ? fmtAED(row.net) : fmtINR(row.net)}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${row.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                              {row.paymentStatus}
                            </span>
                          </td>
                        </>
                      )}

                      {reportType === 'orders' && (
                        <>
                          <td className="px-5 py-3.5 font-semibold text-brand-gold">{row.orderNumber}</td>
                          <td className="px-5 py-3.5 font-medium text-neutral-900 dark:text-white">{row.customerName}</td>
                          <td className="px-5 py-3.5 text-neutral-500">{row.date}</td>
                          <td className="px-5 py-3.5 font-bold text-neutral-900 dark:text-white">
                            {row.currency === 'AED' ? fmtAED(row.totalAmount) : fmtINR(row.totalAmount)}
                          </td>
                          <td className="px-5 py-3.5 text-neutral-600">{row.paymentMethod}</td>
                          <td className="px-5 py-3.5 font-mono text-[11px] text-neutral-500">{row.shiprocket}</td>
                          <td className="px-5 py-3.5 text-right">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              row.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-800' :
                              row.status === 'SHIPPED' || row.status === 'OUT_FOR_DELIVERY' ? 'bg-blue-100 text-blue-800' :
                              row.status === 'CANCELLED' ? 'bg-rose-100 text-rose-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {row.status}
                            </span>
                          </td>
                        </>
                      )}

                      {reportType === 'customers' && (
                        <>
                          <td className="px-5 py-3.5 font-semibold text-neutral-900 dark:text-white">{row.name}</td>
                          <td className="px-5 py-3.5 text-neutral-600 dark:text-neutral-400">{row.email}</td>
                          <td className="px-5 py-3.5 text-neutral-600 dark:text-neutral-400">{row.phone}</td>
                          <td className="px-5 py-3.5 font-semibold text-neutral-800 dark:text-neutral-200">{row.ordersCount} orders</td>
                          <td className="px-5 py-3.5 font-bold text-emerald-700 dark:text-emerald-400">{fmtINR(row.totalSpent)}</td>
                          <td className="px-5 py-3.5 font-bold text-brand-gold">{row.loyaltyPoints} pts</td>
                          <td className="px-5 py-3.5 text-right">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              {row.status}
                            </span>
                          </td>
                        </>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Bar: Showing Count & Pagination */}
          <div className="px-5 py-3.5 border-t border-brand-light dark:border-neutral-700 bg-[#F9FAFB] dark:bg-neutral-900 flex items-center justify-between text-xs text-brand-grey">
            <div>
              Showing {totalItems === 0 ? 0 : startIndex + 1}–{Math.min(startIndex + rowsPerPage, totalItems)} of {totalItems} items
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-50 transition-colors text-neutral-700 dark:text-neutral-200"
                id="pagination-prev-btn"
              >
                Prev
              </button>

              {Array.from({ length: totalPages }, (_, index) => index + 1).map(pageNumber => (
                <button
                  key={pageNumber}
                  onClick={() => setCurrentPage(pageNumber)}
                  className={`w-7 h-7 rounded-md font-medium text-xs transition-colors ${
                    currentPage === pageNumber
                      ? 'bg-neutral-900 text-white font-bold'
                      : 'border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50'
                  }`}
                >
                  {pageNumber}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="px-3 py-1 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-50 transition-colors text-neutral-700 dark:text-neutral-200"
                id="pagination-next-btn"
              >
                Next
              </button>
            </div>
          </div>
        </div>

      </div>
    </AdminLayout>
  );
};

export default ReportsAdminPage;
