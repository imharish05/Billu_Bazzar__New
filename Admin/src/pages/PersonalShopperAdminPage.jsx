import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gift, Search, Trash2, RefreshCw,
  Eye, X, ExternalLink, Filter, Save, CheckCircle2, Clock, MessageSquare, AlertCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import AdminLayout from '../components/AdminLayout';
import { PaginationTop, PaginationBottom } from '../components/Pagination';
import api from '../services/api';

const PersonalShopperAdminPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    totalRequests: 0,
    pendingCount: 0,
    inProgressCount: 0,
    contactedCount: 0,
    completedCount: 0,
    cancelledCount: 0,
  });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [selectedIds, setSelectedIds] = useState([]);

  // Detail Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [modalStatus, setModalStatus] = useState('PENDING');
  const [adminNotes, setAdminNotes] = useState('');
  const [savingModal, setSavingModal] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page,
        limit,
        search: search.trim(),
        status: statusFilter,
      });

      const res = await api.get(`/personal-shopper?${params.toString()}`);
      if (res.data.success) {
        setRequests(res.data.requests || []);
        setTotal(res.data.total || 0);
        setTotalPages(res.data.totalPages || 1);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      }
    } catch (err) {
      console.error('Failed to load personal shopper requests:', err);
      toast.error(err.response?.data?.message || 'Failed to load personal shopper requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, limit, search, statusFilter]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(requests.map((item) => item.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const openDetailModal = (request) => {
    setSelectedRequest(request);
    setModalStatus(request.status || 'PENDING');
    setAdminNotes(request.adminNotes || '');
    setModalOpen(true);
  };

  const handleUpdateStatus = async (id, newStatus, currentAdminNotes = null) => {
    try {
      const res = await api.patch(`/personal-shopper/${id}`, {
        status: newStatus,
        adminNotes: currentAdminNotes !== null ? currentAdminNotes : adminNotes,
      });
      if (res.data.success) {
        toast.success(`Request status updated to ${newStatus}`);
        if (selectedRequest && selectedRequest.id === id) {
          setSelectedRequest(res.data.request);
        }
        loadData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update request status');
    }
  };

  const handleSaveModal = async () => {
    if (!selectedRequest) return;
    try {
      setSavingModal(true);
      const res = await api.patch(`/personal-shopper/${selectedRequest.id}`, {
        status: modalStatus,
        adminNotes: adminNotes.trim(),
      });
      if (res.data.success) {
        toast.success('Styling request updated successfully');
        setSelectedRequest(res.data.request);
        loadData();
        setModalOpen(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update request');
    } finally {
      setSavingModal(false);
    }
  };

  const executeDelete = async (id) => {
    try {
      await api.delete(`/personal-shopper/${id}`);
      toast.success('Styling request deleted successfully');
      if (selectedRequest && selectedRequest.id === id) {
        setModalOpen(false);
        setSelectedRequest(null);
      }
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete request');
    }
  };

  const handleDelete = (id, customerName) => {
    toast(
      (t) => (
        <div className="flex flex-col items-center text-center gap-2 p-1">
          <p className="text-sm font-semibold text-neutral-800">
            Delete request from {customerName}?
          </p>
          <p className="text-xs text-neutral-600 max-w-xs">
            Are you sure you want to permanently delete this styling request?
          </p>
          <div className="flex justify-center items-center gap-3 mt-2 w-full">
            <button
              onClick={() => {
                toast.dismiss(t.id);
                executeDelete(id);
              }}
              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold uppercase transition-colors rounded shadow-sm"
            >
              Yes, Delete
            </button>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="px-3.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold uppercase transition-colors rounded border border-neutral-200"
            >
              Cancel
            </button>
          </div>
        </div>
      ),
      { duration: 5000, position: 'top-center' }
    );
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    toast(
      (t) => (
        <div className="flex flex-col items-center text-center gap-2 p-1">
          <p className="text-sm font-semibold text-neutral-800">
            Delete {selectedIds.length} Personal Shopper Requests?
          </p>
          <p className="text-xs text-neutral-600 max-w-xs">
            This action will permanently delete all selected styling requests.
          </p>
          <div className="flex justify-center items-center gap-3 mt-2 w-full">
            <button
              onClick={async () => {
                toast.dismiss(t.id);
                try {
                  await api.delete('/personal-shopper/bulk', { data: { ids: selectedIds } });
                  toast.success(`Deleted ${selectedIds.length} styling requests`);
                  setSelectedIds([]);
                  loadData();
                } catch (err) {
                  toast.error('Bulk deletion failed');
                }
              }}
              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold uppercase transition-colors rounded shadow-sm"
            >
              Yes, Delete All
            </button>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="px-3.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold uppercase transition-colors rounded border border-neutral-200"
            >
              Cancel
            </button>
          </div>
        </div>
      ),
      { duration: 5000, position: 'top-center' }
    );
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3" /> Pending
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <RefreshCw className="w-3 h-3 animate-spin" /> In Progress
          </span>
        );
      case 'CONTACTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
            <MessageSquare className="w-3 h-3" /> Contacted
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> Completed
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-700 border border-neutral-200">
            <AlertCircle className="w-3 h-3" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-800">
            {status}
          </span>
        );
    }
  };

  return (
    <AdminLayout title="Personal Shopper Requests">
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        
        {/* Title Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 tracking-tight flex items-center gap-2.5">
              <Gift className="w-7 h-7 text-amber-600" />
              Personal Shopper Requests
            </h1>
            <p className="text-sm text-neutral-500 mt-1">
              Manage personal styling consultation requests submitted by your customers.
            </p>
          </div>

          <button
            onClick={loadData}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold rounded-xl border border-neutral-300 transition-all shadow-sm self-start md:self-auto"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh List
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div
            onClick={() => setStatusFilter('ALL')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-amber-50 border-amber-300 shadow-sm'
                : 'bg-white border-neutral-200/80 hover:border-neutral-300'
            }`}
          >
            <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Total Requests</p>
            <p className="text-2xl font-bold text-neutral-900 mt-1">{stats.totalRequests}</p>
          </div>

          <div
            onClick={() => setStatusFilter('PENDING')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              statusFilter === 'PENDING'
                ? 'bg-amber-50 border-amber-300 shadow-sm'
                : 'bg-white border-neutral-200/80 hover:border-neutral-300'
            }`}
          >
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Pending</p>
            <p className="text-2xl font-bold text-amber-900 mt-1">{stats.pendingCount}</p>
          </div>

          <div
            onClick={() => setStatusFilter('IN_PROGRESS')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              statusFilter === 'IN_PROGRESS'
                ? 'bg-blue-50 border-blue-300 shadow-sm'
                : 'bg-white border-neutral-200/80 hover:border-neutral-300'
            }`}
          >
            <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700">In Progress</p>
            <p className="text-2xl font-bold text-blue-900 mt-1">{stats.inProgressCount}</p>
          </div>

          <div
            onClick={() => setStatusFilter('CONTACTED')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              statusFilter === 'CONTACTED'
                ? 'bg-purple-50 border-purple-300 shadow-sm'
                : 'bg-white border-neutral-200/80 hover:border-neutral-300'
            }`}
          >
            <p className="text-[11px] font-bold uppercase tracking-wider text-purple-700">Contacted</p>
            <p className="text-2xl font-bold text-purple-900 mt-1">{stats.contactedCount}</p>
          </div>

          <div
            onClick={() => setStatusFilter('COMPLETED')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              statusFilter === 'COMPLETED'
                ? 'bg-emerald-50 border-emerald-300 shadow-sm'
                : 'bg-white border-neutral-200/80 hover:border-neutral-300'
            }`}
          >
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Completed</p>
            <p className="text-2xl font-bold text-emerald-900 mt-1">{stats.completedCount}</p>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-center">
            {/* Search Box */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Search name, email, occasion, style..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            {/* Status Dropdown */}
            <div className="relative w-full sm:w-48">
              <Filter className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm text-neutral-700 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="CONTACTED">Contacted</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
              <button
                onClick={handleBulkDelete}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-xs font-semibold transition-all shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Selected ({selectedIds.length})
              </button>
            </div>
          )}
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm overflow-hidden">
          <PaginationTop
            page={page}
            limit={limit}
            total={total}
            onPageChange={setPage}
            onLimitChange={(l) => {
              setLimit(l);
              setPage(1);
            }}
          />

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                  <th className="p-4 w-10">
                    <input
                      type="checkbox"
                      checked={requests.length > 0 && selectedIds.length === requests.length}
                      onChange={handleSelectAll}
                      className="rounded border-neutral-300 text-amber-600 focus:ring-amber-500"
                    />
                  </th>
                  <th className="p-4">Date & Time</th>
                  <th className="p-4">Customer Name</th>
                  <th className="p-4">Contact Info</th>
                  <th className="p-4">Occasion & Budget</th>
                  <th className="p-4">Style Preference</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="p-8 text-center text-neutral-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-6 h-6 animate-spin text-amber-600" />
                        <span>Loading personal shopper requests...</span>
                      </div>
                    </td>
                  </tr>
                ) : requests.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="p-8 text-center text-neutral-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Gift className="w-8 h-8 text-neutral-300" />
                        <span className="font-semibold text-neutral-700">No styling requests found</span>
                        <span className="text-xs text-neutral-400">
                          Requests submitted on the customer account page will appear here.
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  requests.map((item) => (
                    <tr key={item.id} className="hover:bg-neutral-50/60 transition-colors">
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={() => handleSelectOne(item.id)}
                          className="rounded border-neutral-300 text-amber-600 focus:ring-amber-500"
                        />
                      </td>
                      <td className="p-4 text-xs text-neutral-500 whitespace-nowrap">
                        {new Date(item.createdAt).toLocaleString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-neutral-900 flex items-center gap-1.5">
                          {item.name}
                          {item.customerId && (
                            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] rounded font-bold uppercase">
                              Member
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-xs space-y-0.5">
                        <a
                          href={`mailto:${item.email}`}
                          className="text-amber-700 hover:underline font-medium block"
                        >
                          {item.email}
                        </a>
                        {item.phone && <span className="text-neutral-500 block">{item.phone}</span>}
                      </td>
                      <td className="p-4 text-xs space-y-1">
                        <div className="font-semibold text-neutral-900">{item.occasion}</div>
                        <div className="text-amber-800 font-medium bg-amber-50 border border-amber-200/70 inline-block px-2 py-0.5 rounded">
                          Budget: ₹{item.budget}
                        </div>
                      </td>
                      <td className="p-4 text-xs text-neutral-600 max-w-xs">
                        {item.style || <span className="italic text-neutral-400">Not specified</span>}
                      </td>
                      <td className="p-4">
                        <select
                          value={item.status}
                          onChange={(e) => handleUpdateStatus(item.id, e.target.value)}
                          className="text-xs font-semibold bg-transparent border-0 focus:ring-0 cursor-pointer rounded-lg hover:bg-neutral-100 py-1"
                        >
                          <option value="PENDING">⏳ Pending</option>
                          <option value="IN_PROGRESS">🔄 In Progress</option>
                          <option value="CONTACTED">💬 Contacted</option>
                          <option value="COMPLETED">✅ Completed</option>
                          <option value="CANCELLED">❌ Cancelled</option>
                        </select>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openDetailModal(item)}
                            className="p-1.5 text-neutral-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="View Request Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id, item.name)}
                            className="p-1.5 text-neutral-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Request"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <PaginationBottom page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>

        {/* View & Manage Details Modal */}
        <AnimatePresence>
          {modalOpen && selectedRequest && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-neutral-200"
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between p-5 border-b border-neutral-100 bg-neutral-50/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-100 text-amber-700 rounded-xl flex items-center justify-center font-bold">
                      <Gift className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-neutral-900">
                        Styling Request #{selectedRequest.id}
                      </h3>
                      <p className="text-xs text-neutral-500">
                        Submitted on {new Date(selectedRequest.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setModalOpen(false)}
                    className="p-1 text-neutral-400 hover:text-neutral-600 rounded-lg hover:bg-neutral-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Content */}
                <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                  {/* Customer Information */}
                  <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200/80 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-neutral-400 font-medium block">Customer Name</span>
                      <span className="text-neutral-900 font-bold text-sm flex items-center gap-1.5">
                        {selectedRequest.name}
                        {selectedRequest.customerId && (
                          <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] rounded font-bold uppercase">
                            Registered Customer
                          </span>
                        )}
                      </span>
                    </div>

                    <div>
                      <span className="text-neutral-400 font-medium block">Current Status</span>
                      <div className="mt-1">{getStatusBadge(selectedRequest.status)}</div>
                    </div>

                    <div>
                      <span className="text-neutral-400 font-medium block">Email Address</span>
                      <a
                        href={`mailto:${selectedRequest.email}`}
                        className="text-amber-700 hover:underline font-semibold text-sm flex items-center gap-1"
                      >
                        {selectedRequest.email} <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    <div>
                      <span className="text-neutral-400 font-medium block">Phone Number</span>
                      {selectedRequest.phone ? (
                        <a
                          href={`tel:${selectedRequest.phone}`}
                          className="text-neutral-800 hover:text-amber-700 font-semibold text-sm"
                        >
                          {selectedRequest.phone}
                        </a>
                      ) : (
                        <span className="text-neutral-400 italic">Not provided</span>
                      )}
                    </div>
                  </div>

                  {/* Styling Preferences */}
                  <div className="bg-amber-50/40 p-4 rounded-xl border border-amber-200/60 space-y-3">
                    <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                      Styling & Event Details
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-neutral-500 font-medium block">Occasion</span>
                        <span className="font-bold text-neutral-900 text-sm">{selectedRequest.occasion}</span>
                      </div>
                      <div>
                        <span className="text-neutral-500 font-medium block">Budget</span>
                        <span className="font-bold text-amber-800 text-sm">₹{selectedRequest.budget}</span>
                      </div>
                      <div>
                        <span className="text-neutral-500 font-medium block">Style Preference</span>
                        <span className="font-semibold text-neutral-800">
                          {selectedRequest.style || 'None specified'}
                        </span>
                      </div>
                    </div>

                    {selectedRequest.notes && (
                      <div className="pt-2 border-t border-amber-200/60">
                        <span className="text-neutral-500 font-medium block text-xs mb-1">
                          Customer Notes / Special Requirements:
                        </span>
                        <p className="text-neutral-800 text-xs leading-relaxed whitespace-pre-wrap">
                          {selectedRequest.notes}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Update Status & Admin Notes Form */}
                  <div className="space-y-4 pt-2 border-t border-neutral-100">
                    <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
                      Admin Processing
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-neutral-700 mb-1">
                          Update Status
                        </label>
                        <select
                          value={modalStatus}
                          onChange={(e) => setModalStatus(e.target.value)}
                          className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-sm bg-neutral-50 text-neutral-800 font-medium focus:outline-none focus:border-amber-500"
                        >
                          <option value="PENDING">Pending</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="CONTACTED">Contacted</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="CANCELLED">Cancelled</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">
                        Internal Admin Notes
                      </label>
                      <textarea
                        rows={3}
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        placeholder="Add private notes for stylists or administrative updates..."
                        className="w-full border border-neutral-200 rounded-xl p-3 text-xs bg-neutral-50 focus:outline-none focus:border-amber-500 resize-y"
                      />
                    </div>
                  </div>

                  {/* Modal Action Buttons */}
                  <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
                    <button
                      type="button"
                      onClick={() => handleDelete(selectedRequest.id, selectedRequest.name)}
                      className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold rounded-xl border border-red-200 transition-colors flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete Request
                    </button>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setModalOpen(false)}
                        className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold rounded-xl transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={savingModal}
                        onClick={handleSaveModal}
                        className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                      >
                        <Save className="w-3.5 h-3.5" />
                        {savingModal ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  );
};

export default PersonalShopperAdminPage;
