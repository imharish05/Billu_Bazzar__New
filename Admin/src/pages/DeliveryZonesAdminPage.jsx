import { useEffect, useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Plus, FileSpreadsheet, Download, Search, Edit, Trash2, CheckCircle2,
  XCircle, Filter, RefreshCw, UploadCloud, AlertCircle, Check, X, ShieldAlert
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import AdminLayout from '../components/AdminLayout';
import { PaginationTop, PaginationBottom } from '../components/Pagination';
import Switch from '../components/Switch';
import api from '../services/api';
import { checkPermission } from '../utils/rbac';

const DeliveryZonesAdminPage = () => {
  const { admin } = useSelector((s) => s.auth);
  const canAddDeliveryZone = checkPermission(admin, 'add_delivery_zone');
  const canEditDeliveryZone = checkPermission(admin, 'edit_delivery_zone');
  const canDeleteDeliveryZone = checkPermission(admin, 'delete_delivery_zone');
  const canShowActions = canEditDeliveryZone || canDeleteDeliveryZone;
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPincodes: 0,
    activePincodes: 0,
    freeDeliveryPincodes: 0,
    distinctZones: 0,
    zoneList: []
  });

  const [search, setSearch] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState('ALL');
  const [zoneFilter, setZoneFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [selectedIds, setSelectedIds] = useState([]);

  // Add / Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    pincode: '',
    zoneName: 'Standard Zone',
    state: '',
    city: '',
    deliveryCharge: 50,
    minOrderAmountForFreeDelivery: '',
    isActive: true
  });
  const [saving, setSaving] = useState(false);

  // Bulk Upload Modal State
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const fileInputRef = useRef(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page,
        limit,
        search: search.trim(),
        isActive: isActiveFilter,
        zoneName: zoneFilter
      });

      const res = await api.get(`/delivery-zones?${params.toString()}`);
      if (res.data.success) {
        setZones(res.data.data || []);
        setTotal(res.data.meta?.totalItems || 0);
        setTotalPages(res.data.meta?.totalPages || 1);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      }
    } catch (err) {
      console.error('Failed to load delivery zones:', err);
      toast.error(err.response?.data?.message || 'Failed to load delivery zones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, limit, search, isActiveFilter, zoneFilter]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(zones.map(z => z.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const openAddModal = () => {
    setForm({
      pincode: '',
      zoneName: 'Standard Zone',
      state: '',
      city: '',
      deliveryCharge: 50,
      minOrderAmountForFreeDelivery: '',
      isActive: true
    });
    setEditingId(null);
    setModalOpen(true);
  };

  const handleEdit = (zone) => {
    setForm({
      pincode: zone.pincode,
      zoneName: zone.zoneName || 'Standard Zone',
      state: zone.state || '',
      city: zone.city || '',
      deliveryCharge: zone.deliveryCharge,
      minOrderAmountForFreeDelivery: zone.minOrderAmountForFreeDelivery !== null && zone.minOrderAmountForFreeDelivery !== undefined ? zone.minOrderAmountForFreeDelivery : '',
      isActive: zone.isActive
    });
    setEditingId(zone.id);
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.pincode.trim()) {
      return toast.error('Pincode is required');
    }

    try {
      setSaving(true);
      if (editingId) {
        await api.put(`/delivery-zones/${editingId}`, form);
        toast.success('Delivery Zone updated successfully!');
      } else {
        await api.post('/delivery-zones', form);
        toast.success('Delivery Zone added successfully!');
      }
      setModalOpen(false);
      loadData();
    } catch (err) {
      console.error('Failed to save delivery zone:', err);
      toast.error(err.response?.data?.message || 'Failed to save delivery zone');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (zone) => {
    try {
      await api.put(`/delivery-zones/${zone.id}`, {
        isActive: !zone.isActive
      });
      toast.success(`Pincode ${zone.pincode} ${!zone.isActive ? 'activated' : 'deactivated'}`);
      setZones(prev => prev.map(z => z.id === zone.id ? { ...z, isActive: !z.isActive } : z));
    } catch (err) {
      toast.error('Failed to toggle status');
    }
  };

  const executeDelete = async (id) => {
    try {
      await api.delete(`/delivery-zones/${id}`);
      toast.success('Delivery zone deleted');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const handleDelete = (id, pincode) => {
    toast((t) => (
      <div className="flex flex-col items-center text-center gap-2 p-1">
        <p className="text-sm font-semibold text-neutral-800">Delete Pincode {pincode}?</p>
        <p className="text-xs text-neutral-600 max-w-xs">
          Are you sure you want to delete this delivery zone record?
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
        <p className="text-sm font-semibold text-neutral-800">Delete {selectedIds.length} Pincodes?</p>
        <p className="text-xs text-neutral-600 max-w-xs">
          This action will permanently delete all selected delivery zones.
        </p>
        <div className="flex justify-center items-center gap-3 mt-2 w-full">
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              try {
                await api.delete('/delivery-zones/bulk', { data: { ids: selectedIds } });
                toast.success(`Deleted ${selectedIds.length} delivery zones`);
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

  const handleDownloadSample = async () => {
    try {
      const response = await api.get('/delivery-zones/sample-template', {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = 'Delivery_Zones_Sample_Template.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Sample template downloaded!');
    } catch (err) {
      console.error('Failed to download template:', err);
      toast.error('Failed to download template');
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      return toast.error('Please select an Excel or CSV file to upload');
    }

    try {
      setUploading(true);
      setUploadResult(null);
      const formData = new FormData();
      formData.append('file', uploadFile);

      const res = await api.post('/delivery-zones/bulk-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        setUploadResult(res.data.stats);
        toast.success(res.data.message || 'Bulk upload complete!');
        loadData();
      }
    } catch (err) {
      console.error('Upload failed:', err);
      toast.error(err.response?.data?.message || 'Excel upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <AdminLayout title="Delivery Zones & Pincodes">
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header Title & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 tracking-tight flex items-center gap-2.5">
              <MapPin className="w-7 h-7 text-indigo-600" />
              Delivery Zones & Shipping Charges
            </h1>
            <p className="text-sm text-neutral-500 mt-1">
              Manage Indian pincodes, delivery charges, free delivery thresholds, and bulk upload via Excel.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleDownloadSample}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold rounded-xl border border-neutral-300 transition-all shadow-sm"
              title="Download Excel Sample Template"
            >
              <Download className="w-4 h-4 text-neutral-600" />
              Download Template
            </button>

            {canAddDeliveryZone && (
              <>
                <button
                  onClick={() => {
                    setUploadFile(null);
                    setUploadResult(null);
                    setUploadModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-all shadow-sm"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Bulk Upload Excel
                </button>

                <button
                  onClick={openAddModal}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-all shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Pincode
                </button>
              </>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Total Pincodes</p>
              <p className="text-2xl font-bold text-neutral-900 mt-1">{stats.totalPincodes}</p>
            </div>
            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
              <MapPin className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Active Pincodes</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.activePincodes}</p>
            </div>
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Free Delivery Enabled</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{stats.freeDeliveryPincodes}</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
              <ShieldAlert className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Unique Zones</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">{stats.distinctZones}</p>
            </div>
            <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
              <Filter className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search pincode, city, state, zone..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
            {/* Zone Filter */}
            <select
              value={zoneFilter}
              onChange={(e) => {
                setZoneFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium text-neutral-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="ALL">All Zones</option>
              {(stats.zoneList || []).map(z => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={isActiveFilter}
              onChange={(e) => {
                setIsActiveFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium text-neutral-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="ALL">All Status</option>
              <option value="true">Active Only</option>
              <option value="false">Inactive Only</option>
            </select>

            <button
              onClick={loadData}
              className="p-2 text-neutral-500 hover:text-neutral-900 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-xl transition-all"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {selectedIds.length > 0 && (
              <button
                onClick={handleBulkDelete}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-xs font-semibold transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Selected ({selectedIds.length})
              </button>
            )}
          </div>
        </div>

        {/* Table & Pagination */}
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
                      checked={zones.length > 0 && selectedIds.length === zones.length}
                      onChange={handleSelectAll}
                      className="rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </th>
                  <th className="p-4">Pincode</th>
                  <th className="p-4">Zone Name</th>
                  <th className="p-4">City / State</th>
                  <th className="p-4">Delivery Charge (₹)</th>
                  <th className="p-4">Free Delivery Threshold</th>
                  <th className="p-4 text-center">Status</th>
                  {canShowActions && <th className="p-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={canShowActions ? 8 : 7} className="p-8 text-center text-neutral-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
                        <span>Loading delivery zones...</span>
                      </div>
                    </td>
                  </tr>
                ) : zones.length === 0 ? (
                  <tr>
                    <td colSpan={canShowActions ? 8 : 7} className="p-8 text-center text-neutral-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <MapPin className="w-8 h-8 text-neutral-300" />
                        <span className="font-semibold text-neutral-700">No delivery zones found</span>
                        <span className="text-xs text-neutral-400">Try adjusting search or add new pincodes.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  zones.map((zone) => (
                    <tr key={zone.id} className="hover:bg-neutral-50/60 transition-colors">
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(zone.id)}
                          onChange={() => handleSelectOne(zone.id)}
                          className="rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="p-4 font-mono font-bold text-neutral-900">
                        {zone.pincode}
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200/50">
                          {zone.zoneName || 'Standard Zone'}
                        </span>
                      </td>
                      <td className="p-4 text-neutral-600 text-xs">
                        {zone.city && <span className="font-medium text-neutral-800">{zone.city}</span>}
                        {zone.city && zone.state && <span className="text-neutral-400">, </span>}
                        {zone.state && <span>{zone.state}</span>}
                        {!zone.city && !zone.state && <span className="text-neutral-400 italic">Not set</span>}
                      </td>
                      <td className="p-4 font-semibold text-neutral-900">
                        {parseFloat(zone.deliveryCharge) === 0 ? (
                          <span className="text-emerald-600 font-bold">FREE</span>
                        ) : (
                          `₹${parseFloat(zone.deliveryCharge).toFixed(2)}`
                        )}
                      </td>
                      <td className="p-4 text-xs">
                        {zone.minOrderAmountForFreeDelivery !== null && zone.minOrderAmountForFreeDelivery !== undefined ? (
                          <span className="text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                            Free on ₹{parseFloat(zone.minOrderAmountForFreeDelivery).toFixed(0)}+
                          </span>
                        ) : (
                          <span className="text-neutral-400">Standard Charge</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Switch
                            checked={zone.isActive}
                            disabled={!canEditDeliveryZone}
                            onChange={() => canEditDeliveryZone && handleToggleActive(zone)}
                          />
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${zone.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {zone.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </td>
                      {canShowActions && (
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {canEditDeliveryZone && (
                              <button
                                onClick={() => handleEdit(zone)}
                                className="p-1.5 text-neutral-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            )}
                            {canDeleteDeliveryZone && (
                              <button
                                onClick={() => handleDelete(zone.id, zone.pincode)}
                                className="p-1.5 text-neutral-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
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

        {/* Add / Edit Modal */}
        <AnimatePresence>
          {modalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-neutral-200"
              >
                <div className="flex items-center justify-between p-5 border-b border-neutral-100 bg-neutral-50/50">
                  <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-indigo-600" />
                    {editingId ? 'Edit Pincode Delivery Zone' : 'Add New Pincode Delivery Zone'}
                  </h3>
                  <button
                    onClick={() => setModalOpen(false)}
                    className="p-1 text-neutral-400 hover:text-neutral-600 rounded-lg hover:bg-neutral-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSave} className="p-5 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                      Indian Pincode <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 600001"
                      maxLength={10}
                      value={form.pincode}
                      onChange={(e) => setForm({ ...form, pincode: e.target.value.replace(/[^0-9]/g, '') })}
                      className="w-full px-3.5 py-2 border border-neutral-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                        Zone Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. South Zone"
                        value={form.zoneName}
                        onChange={(e) => setForm({ ...form, zoneName: e.target.value })}
                        className="w-full px-3.5 py-2 border border-neutral-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Chennai"
                        value={form.city}
                        onChange={(e) => setForm({ ...form, city: e.target.value })}
                        className="w-full px-3.5 py-2 border border-neutral-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                      State
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Tamil Nadu"
                      value={form.state}
                      onChange={(e) => setForm({ ...form, state: e.target.value })}
                      className="w-full px-3.5 py-2 border border-neutral-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                        Delivery Charge (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={form.deliveryCharge}
                        onChange={(e) => setForm({ ...form, deliveryCharge: e.target.value })}
                        className="w-full px-3.5 py-2 border border-neutral-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                        Free Delivery Threshold (₹)
                      </label>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        placeholder="e.g. 999 (Optional)"
                        value={form.minOrderAmountForFreeDelivery}
                        onChange={(e) => setForm({ ...form, minOrderAmountForFreeDelivery: e.target.value })}
                        className="w-full px-3.5 py-2 border border-neutral-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                      Active Status
                    </span>
                    <Switch
                      checked={form.isActive}
                      onChange={(val) => setForm({ ...form, isActive: val })}
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
                    <button
                      type="button"
                      onClick={() => setModalOpen(false)}
                      className="px-4 py-2 border border-neutral-300 text-neutral-700 text-xs font-semibold rounded-xl hover:bg-neutral-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : (editingId ? 'Update Zone' : 'Add Zone')}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Bulk Upload Excel Modal */}
        <AnimatePresence>
          {uploadModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-neutral-200"
              >
                <div className="flex items-center justify-between p-5 border-b border-neutral-100 bg-neutral-50/50">
                  <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                    Bulk Upload Pincodes via Excel
                  </h3>
                  <button
                    onClick={() => setUploadModalOpen(false)}
                    className="p-1 text-neutral-400 hover:text-neutral-600 rounded-lg hover:bg-neutral-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleUploadSubmit} className="p-6 space-y-5">
                  <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200/60 flex items-start gap-3">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-emerald-900 space-y-1">
                      <p className="font-semibold">Format Requirements:</p>
                      <p>Excel columns should include: <code className="bg-white px-1.5 py-0.5 rounded font-mono border border-emerald-200 text-emerald-800">Pincode</code>, <code className="bg-white px-1.5 py-0.5 rounded font-mono border border-emerald-200 text-emerald-800">Zone Name</code>, <code className="bg-white px-1.5 py-0.5 rounded font-mono border border-emerald-200 text-emerald-800">State</code>, <code className="bg-white px-1.5 py-0.5 rounded font-mono border border-emerald-200 text-emerald-800">City</code>, <code className="bg-white px-1.5 py-0.5 rounded font-mono border border-emerald-200 text-emerald-800">Delivery Charge</code>.</p>
                      <button
                        type="button"
                        onClick={handleDownloadSample}
                        className="text-emerald-700 underline font-semibold mt-1 inline-flex items-center gap-1 hover:text-emerald-800"
                      >
                        <Download className="w-3 h-3" /> Download Sample Template (.xlsx)
                      </button>
                    </div>
                  </div>

                  {/* File Drop Box */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-neutral-300 hover:border-emerald-500 bg-neutral-50 hover:bg-emerald-50/20 rounded-2xl p-8 text-center cursor-pointer transition-all"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          setUploadFile(e.target.files[0]);
                          setUploadResult(null);
                        }
                      }}
                    />
                    <UploadCloud className="w-10 h-10 text-neutral-400 mx-auto mb-2" />
                    {uploadFile ? (
                      <div>
                        <p className="text-sm font-semibold text-emerald-700">{uploadFile.name}</p>
                        <p className="text-xs text-neutral-400 mt-1">{(uploadFile.size / 1024).toFixed(1)} KB — Click to change file</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-semibold text-neutral-700">Click to upload Excel or CSV file</p>
                        <p className="text-xs text-neutral-400 mt-1">Supports .xlsx, .xls, .csv up to 10MB</p>
                      </div>
                    )}
                  </div>

                  {/* Upload Result Stats */}
                  {uploadResult && (
                    <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 text-xs space-y-1">
                      <p className="font-bold text-neutral-900">Upload Summary:</p>
                      <div className="grid grid-cols-3 gap-2 py-1">
                        <div className="bg-emerald-100 text-emerald-900 p-2 rounded-lg text-center font-semibold">
                          +{uploadResult.addedCount} Added
                        </div>
                        <div className="bg-blue-100 text-blue-900 p-2 rounded-lg text-center font-semibold">
                          ⚡ {uploadResult.updatedCount} Updated
                        </div>
                        <div className="bg-amber-100 text-amber-900 p-2 rounded-lg text-center font-semibold">
                          ⏭️ {uploadResult.skippedCount} Skipped
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
                    <button
                      type="button"
                      onClick={() => setUploadModalOpen(false)}
                      className="px-4 py-2 border border-neutral-300 text-neutral-700 text-xs font-semibold rounded-xl hover:bg-neutral-50"
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      disabled={uploading || !uploadFile}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl disabled:opacity-50 flex items-center gap-2"
                    >
                      {uploading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Uploading & Processing...
                        </>
                      ) : (
                        'Upload & Process Excel'
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  );
};

export default DeliveryZonesAdminPage;
