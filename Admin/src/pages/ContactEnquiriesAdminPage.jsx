import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, Search, Trash2, CheckCircle2, Clock, AlertCircle, RefreshCw,
  Eye, X, MessageSquare, Send, User, Phone, Tag, Calendar, ExternalLink
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import AdminLayout from '../components/AdminLayout';
import { PaginationTop, PaginationBottom } from '../components/Pagination';
import api from '../services/api';

const ContactEnquiriesAdminPage = () => {
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEnquiries: 0,
    pendingCount: 0,
    inProgressCount: 0,
    resolvedCount: 0,
  });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [selectedIds, setSelectedIds] = useState([]);

  // Detail / Reply Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  const [modalStatus, setModalStatus] = useState('PENDING');
  const [adminNotes, setAdminNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page,
        limit,
        search: search.trim(),
        status: statusFilter,
      });

      const res = await api.get(`/contact-enquiries?${params.toString()}`);
      if (res.data.success) {
        setEnquiries(res.data.enquiries || []);
        setTotal(res.data.total || 0);
        setTotalPages(res.data.totalPages || 1);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      }
    } catch (err) {
      console.error('Failed to load contact enquiries:', err);
      toast.error(err.response?.data?.message || 'Failed to load contact enquiries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, limit, search, statusFilter]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(enquiries.map(item => item.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const openDetailModal = (enquiry) => {
    setSelectedEnquiry(enquiry);
    setModalStatus(enquiry.status || 'PENDING');
    setAdminNotes(enquiry.adminNotes || '');
    setModalOpen(true);
  };

  const handleUpdateStatusNotes = async (e) => {
    e.preventDefault();
    if (!selectedEnquiry) return;

    try {
      setUpdating(true);
      const res = await api.put(`/contact-enquiries/${selectedEnquiry.id}`, {
        status: modalStatus,
        adminNotes: adminNotes,
      });

      if (res.data.success) {
        toast.success('Enquiry updated successfully!');
        setModalOpen(false);
        loadData();
      }
    } catch (err) {
      console.error('Failed to update enquiry:', err);
      toast.error(err.response?.data?.message || 'Failed to update enquiry');
    } finally {
      setUpdating(false);
    }
  };

  const executeDelete = async (id) => {
    try {
      await api.delete(`/contact-enquiries/${id}`);
      toast.success('Enquiry deleted successfully');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete enquiry');
    }
  };

  const handleDelete = (id, customerName) => {
    toast((t) => (
      <div className="flex flex-col items-center text-center gap-2 p-1">
        <p className="text-sm font-semibold text-neutral-800">Delete enquiry from {customerName}?</p>
        <p className="text-xs text-neutral-600 max-w-xs">
          Are you sure you want to permanently delete this contact message?
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
    ), { duration: 5000, position: 'top-center' });
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    toast((t) => (
      <div className="flex flex-col items-center text-center gap-2 p-1">
        <p className="text-sm font-semibold text-neutral-800">Delete {selectedIds.length} Enquiries?</p>
        <p className="text-xs text-neutral-600 max-w-xs">
          This action will permanently delete all selected contact messages.
        </p>
        <div className="flex justify-center items-center gap-3 mt-2 w-full">
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              try {
                await api.delete('/contact-enquiries/bulk', { data: { ids: selectedIds } });
                toast.success(`Deleted ${selectedIds.length} enquiries`);
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
    ), { duration: 5000, position: 'top-center' });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200"><Clock className="w-3.5 h-3.5" /> Pending</span>;
      case 'IN_PROGRESS':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200"><RefreshCw className="w-3.5 h-3.5" /> In Progress</span>;
      case 'RESOLVED':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle2 className="w-3.5 h-3.5" /> Resolved</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-700">{status}</span>;
    }
  };

  return (
    <AdminLayout title="Contact Enquiries">
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        
        {/* Title Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 tracking-tight flex items-center gap-2.5">
              <Mail className="w-7 h-7 text-amber-600" />
              Contact & Concierge Enquiries
            </h1>
            <p className="text-sm text-neutral-500 mt-1">
              View and manage customer messages submitted through your website contact form.
            </p>
          </div>

          <button
            onClick={loadData}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold rounded-xl border border-neutral-300 transition-all shadow-sm self-start md:self-auto"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Messages
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Total Messages</p>
              <p className="text-2xl font-bold text-neutral-900 mt-1">{stats.totalEnquiries}</p>
            </div>
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
              <Mail className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Pending Response</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{stats.pendingCount}</p>
            </div>
            <div className="w-12 h-12 bg-amber-100/60 rounded-xl flex items-center justify-center text-amber-700">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">In Progress</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{stats.inProgressCount}</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
              <RefreshCw className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Resolved</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.resolvedCount}</p>
            </div>
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search name, email, subject, message..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3.5 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium text-neutral-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending Only</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved Only</option>
            </select>

            {selectedIds.length > 0 && (
              <button
                onClick={handleBulkDelete}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-xs font-semibold transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Selected ({selectedIds.length})
              </button>
            )}
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm overflow-hidden">
          <PaginationTop
            page={page}
            limit={limit}
            total={total}
            onPageChange={setPage}
            onLimitChange={(l) => { setLimit(l); setPage(1); }}
          />

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                  <th className="p-4 w-10">
                    <input
                      type="checkbox"
                      checked={enquiries.length > 0 && selectedIds.length === enquiries.length}
                      onChange={handleSelectAll}
                      className="rounded border-neutral-300 text-amber-600 focus:ring-amber-500"
                    />
                  </th>
                  <th className="p-4">Date & Time</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Email / Phone</th>
                  <th className="p-4">Subject</th>
                  <th className="p-4">Message Snippet</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="p-8 text-center text-neutral-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-6 h-6 animate-spin text-amber-600" />
                        <span>Loading contact enquiries...</span>
                      </div>
                    </td>
                  </tr>
                ) : enquiries.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="p-8 text-center text-neutral-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Mail className="w-8 h-8 text-neutral-300" />
                        <span className="font-semibold text-neutral-700">No contact enquiries found</span>
                        <span className="text-xs text-neutral-400">Messages submitted on the contact page will appear here.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  enquiries.map((item) => (
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
                          month: 'short', day: 'numeric', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td className="p-4 font-semibold text-neutral-900">
                        {item.name}
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
                      <td className="p-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-800 border border-neutral-200">
                          {item.subject}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-neutral-600 max-w-xs truncate">
                        {item.message}
                      </td>
                      <td className="p-4 text-center">
                        {getStatusBadge(item.status)}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openDetailModal(item)}
                            className="p-1.5 text-neutral-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="View Details & Reply"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id, item.name)}
                            className="p-1.5 text-neutral-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
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

          <PaginationBottom
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>

        {/* View Details & Reply Modal */}
        <AnimatePresence>
          {modalOpen && selectedEnquiry && (
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
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-neutral-900">
                        Contact Enquiry #{selectedEnquiry.id}
                      </h3>
                      <p className="text-xs text-neutral-500">
                        Submitted on {new Date(selectedEnquiry.createdAt).toLocaleString()}
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
                  
                  {/* Customer Info Box */}
                  <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200/80 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-neutral-400 font-medium block">Customer Name</span>
                      <span className="text-neutral-900 font-bold text-sm">{selectedEnquiry.name}</span>
                    </div>
                    <div>
                      <span className="text-neutral-400 font-medium block">Inquiry Subject</span>
                      <span className="inline-block mt-0.5 px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md font-semibold">
                        {selectedEnquiry.subject}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-400 font-medium block">Email Address</span>
                      <a
                        href={`mailto:${selectedEnquiry.email}`}
                        className="text-amber-700 hover:underline font-semibold text-sm flex items-center gap-1"
                      >
                        {selectedEnquiry.email} <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div>
                      <span className="text-neutral-400 font-medium block">Phone Number</span>
                      <span className="text-neutral-800 font-semibold">{selectedEnquiry.phone || 'Not provided'}</span>
                    </div>
                  </div>

                  {/* Message Content Box */}
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-2">
                      Customer Message:
                    </label>
                    <div className="bg-amber-50/40 p-4 rounded-xl border border-amber-200/60 text-sm text-neutral-800 leading-relaxed whitespace-pre-wrap font-sans">
                      {selectedEnquiry.message}
                    </div>
                  </div>

                  {/* Status & Admin Notes Update Form */}
                  <form onSubmit={handleUpdateStatusNotes} className="space-y-4 pt-2 border-t border-neutral-100">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                      <div>
                        <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                          Inquiry Status
                        </label>
                        <select
                          value={modalStatus}
                          onChange={(e) => setModalStatus(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-xs font-semibold text-neutral-800 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                        >
                          <option value="PENDING">🟡 PENDING (Needs Action)</option>
                          <option value="IN_PROGRESS">🔵 IN PROGRESS (Handling)</option>
                          <option value="RESOLVED">🟢 RESOLVED (Closed)</option>
                        </select>
                      </div>

                      <div className="flex items-end justify-end pt-4 sm:pt-0">
                        <a
                          href={`mailto:${selectedEnquiry.email}?subject=Re: ${encodeURIComponent(selectedEnquiry.subject || 'Billu Bazaar Inquiry')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl transition-all shadow-sm"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Reply via Email
                        </a>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                        Internal Admin Notes (Optional)
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Add notes about actions taken or customer conversation history..."
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-xs text-neutral-800 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
                      <button
                        type="button"
                        onClick={() => setModalOpen(false)}
                        className="px-4 py-2 border border-neutral-300 text-neutral-700 text-xs font-semibold rounded-xl hover:bg-neutral-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={updating}
                        className="px-5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-xl disabled:opacity-50"
                      >
                        {updating ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </AdminLayout>
  );
};

export default ContactEnquiriesAdminPage;
