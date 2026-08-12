import { useEffect, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, Edit2, ShieldAlert, CheckCircle2, ChevronRight, X, Trash2, ArrowRightLeft } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import Switch from '../components/Switch';
import api from '../services/api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { checkPermission } from '../utils/rbac';

const EMPTY_WAREHOUSE_FORM = {
  name: '', code: '', contactName: '', contactPhone: '',
  streetAddress: '', city: '', state: '', pincode: '', country: 'India',
  isFulfillment: false, isProcurement: false, isActive: true
};

const validatePhone = (phone) => {
  if (!phone || !phone.trim()) return { isValid: true };
  const clean = phone.trim().replace(/^\+/, '').replace(/[\s\-()]/g, '');
  if (!/^\d+$/.test(clean)) {
    return { isValid: false, message: 'Contact Phone must contain only digits, spaces, hyphens, and optional + prefix.' };
  }
  if (clean.length < 7 || clean.length > 15) {
    return { isValid: false, message: 'Contact Phone must be between 7 and 15 digits.' };
  }
  return { isValid: true };
};

const WarehousesAdminPage = () => {
  const { admin } = useSelector((s) => s.auth);
  const canAddWarehouse = checkPermission(admin, 'add_warehouse');
  const canEditWarehouse = checkPermission(admin, 'edit_warehouse');
  const canDeleteWarehouse = checkPermission(admin, 'delete_warehouse');
  const [searchParams] = useSearchParams();
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [warehouseForm, setWarehouseForm] = useState({ ...EMPTY_WAREHOUSE_FORM });

  // Selected warehouse for inventory view
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [warehouseStock, setWarehouseStock] = useState([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockSearch, setStockSearch] = useState('');
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  // Checkbox Selection & Bulk Transfer State
  const [selectedStockIds, setSelectedStockIds] = useState([]);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [targetWarehouseId, setTargetWarehouseId] = useState('');
  const [transferItemsList, setTransferItemsList] = useState([]);
  const [transferring, setTransferring] = useState(false);

  // Adjust stock modal state
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedStockItem, setSelectedStockItem] = useState(null);
  const [adjustMode, setAdjustMode] = useState('add'); // 'add' | 'reduce' | 'level'
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustAlertLevel, setAdjustAlertLevel] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  // Load Warehouses
  const loadWarehouses = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/warehouses');
      if (res.data.success) {
        setWarehouses(res.data.warehouses || []);
      }
    } catch (err) {
      toast.error('Failed to load warehouses: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  }, []);

  // Load selected warehouse stock
  const loadWarehouseStock = useCallback(async (warehouseId) => {
    try {
      setStockLoading(true);
      const res = await api.get(`/warehouses/${warehouseId}/stock`);
      if (res.data.success) {
        setWarehouseStock(res.data.stocks || []);
      }
    } catch (err) {
      toast.error('Failed to load warehouse stock: ' + (err.response?.data?.message || err.message));
    } finally {
      setStockLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWarehouses();
  }, [loadWarehouses]);

  // Read URL search params for deep linking from notification bell
  useEffect(() => {
    const whId = searchParams.get('warehouseId');
    const lowStock = searchParams.get('lowStock');
    if (lowStock === 'true') {
      setOnlyLowStock(true);
    }
    if (whId && warehouses.length > 0) {
      const targetWh = warehouses.find(w => w.id === parseInt(whId, 10));
      if (targetWh) {
        setSelectedWarehouse(targetWh);
        loadWarehouseStock(targetWh.id);
      }
    }
  }, [searchParams, warehouses, loadWarehouseStock]);

  // Handle warehouse inventory click
  const handleSelectWarehouse = (wh) => {
    setSelectedWarehouse(wh);
    loadWarehouseStock(wh.id);
    setTimeout(() => {
      const el = document.getElementById('stock-details-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 150);
  };

  // Open Add/Edit warehouse modal
  const openWarehouseModal = (wh = null) => {
    if (wh) {
      setEditingWarehouse(wh);
      const parsedAddress = wh.address || {};
      setWarehouseForm({
        name: wh.name || '',
        code: wh.code || '',
        contactName: wh.contactName || '',
        contactPhone: wh.contactPhone || '',
        streetAddress: parsedAddress.streetAddress || parsedAddress.street || '',
        city: wh.city || '',
        state: wh.state || '',
        pincode: wh.pincode || '',
        country: parsedAddress.country || wh.country || 'India',
        isFulfillment: !!wh.isFulfillment,
        isProcurement: !!wh.isProcurement,
        isActive: !!wh.isActive
      });
    } else {
      setEditingWarehouse(null);
      setWarehouseForm({ ...EMPTY_WAREHOUSE_FORM });
    }
    setModalOpen(true);
  };

  // Save warehouse (Create / Update)
  const handleSaveWarehouse = async (e) => {
    e.preventDefault();
    if (warehouseForm.contactPhone) {
      const phoneCheck = validatePhone(warehouseForm.contactPhone);
      if (!phoneCheck.isValid) {
        toast.error(phoneCheck.message);
        return;
      }
    }
    try {
      const payload = {
        name: warehouseForm.name,
        code: warehouseForm.code,
        contactName: warehouseForm.contactName,
        contactPhone: warehouseForm.contactPhone,
        city: warehouseForm.city,
        state: warehouseForm.state,
        pincode: warehouseForm.pincode,
        address: {
          streetAddress: warehouseForm.streetAddress,
          country: warehouseForm.country
        },
        isFulfillment: warehouseForm.isFulfillment,
        isProcurement: warehouseForm.isProcurement,
        isActive: warehouseForm.isActive
      };

      if (editingWarehouse) {
        const res = await api.put(`/warehouses/${editingWarehouse.id}`, payload);
        if (res.data.success) {
          toast.success('Warehouse updated successfully');
        }
      } else {
        const res = await api.post('/warehouses', payload);
        if (res.data.success) {
          toast.success('Warehouse created successfully');
        }
      }
      setModalOpen(false);
      loadWarehouses();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to save warehouse');
    }
  };

  const proceedDelete = async (id) => {
    try {
      const res = await api.delete(`/warehouses/${id}`);
      if (res.data.success) {
        toast.success('Warehouse deleted completely from database');
        if (selectedWarehouse?.id === id) {
          setSelectedWarehouse(null);
        }
        loadWarehouses();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to delete warehouse');
    }
  };

  // Delete warehouse direct from card
  const handleDeleteWarehouseDirect = (wh) => {
    toast((t) => (
      <div className="flex flex-col items-center text-center gap-2 p-1 text-xs">
        <p className="font-semibold text-neutral-900">Delete <span className="text-brand-gold font-bold">{wh.name}</span>?</p>
        <p className="text-neutral-500 max-w-xs">This will remove all stock configurations and inventory logs completely from the database.</p>
        <div className="flex justify-center items-center gap-3 mt-2 w-full">
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              await proceedDelete(wh.id);
            }}
            className="px-3 py-1.5 bg-red-600 text-white hover:bg-red-700 text-[10px] font-semibold uppercase tracking-wider transition-all rounded shadow-sm"
          >
            Yes, Delete
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="px-3 py-1.5 border border-neutral-300 text-neutral-700 hover:bg-neutral-50 text-[10px] font-semibold uppercase tracking-wider transition-all rounded"
          >
            Cancel
          </button>
        </div>
      </div>
    ), { duration: 6000, position: 'top-center' });
  };

  // Open adjust stock modal
  const openAdjustStockModal = (stockItem) => {
    setSelectedStockItem(stockItem);
    setAdjustAlertLevel(stockItem.reorderLevel !== undefined ? stockItem.reorderLevel : '10');
    setAdjustQty('');
    setAdjustMode('add');
    setAdjustModalOpen(true);
  };

  // Save stock adjustment
  const handleAdjustStockSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStockItem) return;
    setAdjusting(true);

    try {
      let finalQuantity = selectedStockItem.quantity;
      if (adjustMode === 'add') {
        finalQuantity += parseInt(adjustQty, 10) || 0;
      } else if (adjustMode === 'reduce') {
        const deduct = parseInt(adjustQty, 10) || 0;
        if (deduct > selectedStockItem.quantity) {
          toast.error('Cannot reduce more than available stock.');
          setAdjusting(false);
          return;
        }
        finalQuantity -= deduct;
      }

      const res = await api.post(`/warehouses/${selectedWarehouse.id}/stock/upsert`, {
        productId: selectedStockItem.productId,
        variantId: selectedStockItem.variantId,
        quantity: finalQuantity,
        reorderLevel: parseInt(adjustAlertLevel, 10) || 10
      });

      if (res.data.success) {
        toast.success('Stock adjusted successfully');
        setAdjustModalOpen(false);
        await loadWarehouseStock(selectedWarehouse.id);
        await loadWarehouses();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to adjust stock');
    } finally {
      setAdjusting(false);
    }
  };

  // Helper to format attributes JSON
  const renderAttributes = (attributes) => {
    if (!attributes) return '';
    const parsed = typeof attributes === 'string' ? JSON.parse(attributes) : attributes;
    return Object.entries(parsed).map(([k, v]) => `${k}: ${v}`).join(' · ');
  };

  // Handle Checkbox Selection
  const handleToggleSelectAll = () => {
    if (selectedStockIds.length === filteredStock.length) {
      setSelectedStockIds([]);
    } else {
      setSelectedStockIds(filteredStock.map(s => s.id));
    }
  };

  const handleToggleSelectItem = (id) => {
    setSelectedStockIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Open Bulk Transfer Modal for selected items or a single item
  const openBulkTransferModal = (singleItem = null) => {
    let itemsToTransfer = [];
    if (singleItem) {
      itemsToTransfer = [singleItem];
    } else {
      itemsToTransfer = warehouseStock.filter(s => selectedStockIds.includes(s.id));
    }

    if (itemsToTransfer.length === 0) {
      toast.error('Please select at least one product using checkboxes');
      return;
    }

    const otherWh = warehouses.find(w => w.id !== selectedWarehouse.id);
    setTargetWarehouseId(otherWh ? String(otherWh.id) : '');
    setTransferItemsList(itemsToTransfer.map(item => ({
      id: item.id,
      productId: item.productId,
      variantId: item.variantId,
      productName: item.product?.name || 'Product',
      variantDetails: item.variantId ? renderAttributes(item.variant?.attributes) : 'Default',
      sku: item.variant?.sku || item.product?.sku || 'N/A',
      availableQty: item.quantity,
      transferQty: item.quantity > 0 ? item.quantity : 1,
    })));
    setTransferModalOpen(true);
  };

  // Submit Bulk Stock Transfer
  const handleBulkTransferSubmit = async (e) => {
    e.preventDefault();
    if (!targetWarehouseId) {
      toast.error('Please select a target destination warehouse');
      return;
    }

    // Validate quantities
    const invalidItem = transferItemsList.find(t => !t.transferQty || parseInt(t.transferQty, 10) <= 0 || parseInt(t.transferQty, 10) > t.availableQty);
    if (invalidItem) {
      toast.error(`Invalid quantity for "${invalidItem.productName}". Available stock: ${invalidItem.availableQty}`);
      return;
    }

    setTransferring(true);
    try {
      const payload = {
        fromWarehouseId: selectedWarehouse.id,
        toWarehouseId: parseInt(targetWarehouseId, 10),
        items: transferItemsList.map(t => ({
          productId: t.productId,
          variantId: t.variantId,
          quantity: parseInt(t.transferQty, 10)
        }))
      };

      const res = await api.post('/warehouses/transfer', payload);
      if (res.data.success) {
        toast.success(`Transferred ${transferItemsList.length} product(s) successfully!`);
        setTransferModalOpen(false);
        setSelectedStockIds([]);
        loadWarehouseStock(selectedWarehouse.id);
        loadWarehouses();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Transfer failed');
    } finally {
      setTransferring(false);
    }
  };

  const [hideZeroStock, setHideZeroStock] = useState(true);

  // Filtered Stock list
  const filteredStock = warehouseStock.filter(item => {
    const productName = item.product?.name || '';
    const variantSku = item.variant?.sku || item.product?.sku || '';
    const matchSearch = productName.toLowerCase().includes(stockSearch.toLowerCase()) || variantSku.toLowerCase().includes(stockSearch.toLowerCase());
    
    if (hideZeroStock && item.quantity <= 0) {
      return false;
    }

    if (onlyLowStock) {
      return matchSearch && item.quantity <= item.reorderLevel;
    }
    return matchSearch;
  });

  return (
    <AdminLayout title="Multi-Warehouse & Fulfillment Inventory">
      {/* Overview Cards Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">Warehouses Configuration</h2>
          <p className="text-xs text-brand-grey">Setup active warehouses and designate the single mandatory fulfillment hub</p>
        </div>
        {canAddWarehouse && (
          <button
            onClick={() => openWarehouseModal()}
            className="px-4 py-2 bg-neutral-950 text-white hover:bg-neutral-800 text-xs font-semibold uppercase tracking-wider transition-colors flex items-center gap-2 shadow-sm rounded-none"
          >
            <Plus size={14} /> Add Warehouse
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-gold" />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {warehouses.map(w => {
              const variantProductIds = new Set(
                (w.stocks || []).filter(s => s.variantId).map(s => s.productId)
              );
              const totalUnits = (w.stocks || []).reduce((acc, curr) => {
                if (!curr.variantId && variantProductIds.has(curr.productId)) {
                  return acc; // Skip parent duplicate stock if variant stocks exist
                }
                return acc + (curr.quantity || 0);
              }, 0);

              const isProcurementWh = w.isProcurement || (w.name || '').toLowerCase().includes('dubai') || (w.code || '').toLowerCase().includes('dxb');

              return (
                <div
                  key={w.id}
                  className={`bg-white border transition-all relative overflow-hidden ${
                    selectedWarehouse?.id === w.id ? 'border-brand-gold ring-1 ring-brand-gold/30' : 'border-neutral-200 hover:border-neutral-350'
                  }`}
                >
                  {w.isFulfillment && <div className="absolute top-0 right-0 w-2 h-full bg-brand-gold" />}
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <h3 className="font-semibold text-base text-neutral-900">{w.name}</h3>
                        <p className="text-xs font-mono font-medium text-brand-gold mt-0.5">{w.code}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 ${w.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-150 text-gray-500'}`}>
                          {w.isActive ? 'Active' : 'Inactive'}
                        </span>
                        {w.isFulfillment ? (
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1">
                            🇮🇳 Primary Fulfillment Hub
                          </span>
                        ) : isProcurementWh ? (
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1">
                            🇦🇪 Procurement Source
                          </span>
                        ) : (
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-neutral-100 text-neutral-600 border border-neutral-200">
                            Regional Depot
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1 text-xs text-brand-grey mb-4">
                      {w.address?.streetAddress && <p>🏠 {w.address.streetAddress}</p>}
                      <p>📍 {w.city}, {w.state} {w.pincode} {w.address?.country ? `(${w.address.country})` : ''}</p>
                      <p>📞 {w.contactName || 'N/A'} ({w.contactPhone || 'N/A'})</p>
                    </div>

                    <div className="pt-4 border-t border-brand-light flex items-center justify-between">
                      <div>
                        <p className="text-xl font-bold text-neutral-900">
                          {totalUnits.toLocaleString('en-IN')}
                        </p>
                        <p className="text-[10px] uppercase tracking-wider font-semibold text-brand-grey">Total Units in Stock</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {canEditWarehouse && (
                          <button
                            onClick={() => openWarehouseModal(w)}
                            className="p-2 border border-neutral-200 text-neutral-600 hover:text-brand-gold hover:border-brand-gold transition-all"
                            title="Edit Warehouse"
                          >
                            <Edit2 size={12} />
                          </button>
                        )}
                        {canDeleteWarehouse && (
                          <button
                            onClick={() => handleDeleteWarehouseDirect(w)}
                            className="p-2 border border-neutral-200 text-neutral-600 hover:text-red-600 hover:border-red-200 transition-all"
                            title="Delete Warehouse"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                        <button
                          onClick={() => handleSelectWarehouse(w)}
                          className="px-3 py-1.5 bg-neutral-950 text-white hover:bg-neutral-800 text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-1"
                        >
                          Manage Stock <ChevronRight size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Selected Warehouse Stock Details */}
      {selectedWarehouse && (
        <div id="stock-details-section" className="bg-white border border-neutral-200 p-6 mb-8 transition-all">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-brand-light">
            <div>
              <h3 className="text-base font-semibold text-neutral-950 flex items-center gap-2">
                📦 Stock Inventory: <span className="text-brand-gold">{selectedWarehouse.name}</span>
              </h3>
              <p className="text-xs text-brand-grey mt-0.5">Manage stock quantities and perform bulk stock transfers across warehouses</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-grey" />
                <input
                  type="text"
                  placeholder="Search SKU or name..."
                  value={stockSearch}
                  onChange={e => setStockSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 border border-brand-light text-xs focus:outline-none focus:border-brand-gold max-w-[200px]"
                />
              </div>

              {/* Hide 0-Stock Toggle */}
              <label className="flex items-center gap-2 text-xs font-semibold text-neutral-800 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hideZeroStock}
                  onChange={e => setHideZeroStock(e.target.checked)}
                  className="rounded border-neutral-300 text-brand-gold focus:ring-brand-gold accent-brand-gold"
                />
                Hide 0-Stock Products
              </label>

              {/* Low Stock Toggle */}
              <label className="flex items-center gap-2 text-xs font-semibold text-neutral-800 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={onlyLowStock}
                  onChange={e => setOnlyLowStock(e.target.checked)}
                  className="rounded border-neutral-300 text-brand-gold focus:ring-brand-gold accent-brand-gold"
                />
                Low Stock Only
              </label>
            </div>
          </div>

          {stockLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-gold" />
            </div>
          ) : filteredStock.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-brand-light bg-neutral-50/50">
              <p className="text-sm text-brand-grey font-medium">No stock records found matching your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs" aria-label="Warehouse Stock list">
                <thead>
                  <tr className="bg-neutral-50 border-b border-brand-light text-brand-grey font-bold uppercase tracking-wider text-[10px]">
                    <th className="px-3 py-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={filteredStock.length > 0 && selectedStockIds.length === filteredStock.length}
                        onChange={handleToggleSelectAll}
                        className="rounded border-neutral-300 text-brand-gold focus:ring-brand-gold accent-brand-gold cursor-pointer"
                        title="Select All Products"
                      />
                    </th>
                    <th className="px-4 py-3">Product Name</th>
                    <th className="px-4 py-3">Variant Details</th>
                    <th className="px-4 py-3">SKU Code</th>
                    <th className="px-4 py-3 text-center">Qty in Hand</th>
                    <th className="px-4 py-3 text-center">Alert Level</th>
                    <th className="px-4 py-3 text-center">Inventory Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStock.map(item => {
                    const isLow = item.quantity <= item.reorderLevel;
                    const prodName = item.product?.name || 'N/A';
                    const isVar = !!item.variantId;
                    const variantDetails = isVar ? renderAttributes(item.variant?.attributes) : 'Default (No Variants)';
                    const skuCode = isVar ? (item.variant?.sku || 'N/A') : (item.product?.sku || 'N/A');
                    const isSelected = selectedStockIds.includes(item.id);

                    return (
                      <tr
                        key={item.id}
                        className={`border-b border-brand-light transition-colors ${
                          isSelected ? 'bg-amber-50/60' : 'hover:bg-neutral-50/40'
                        }`}
                      >
                        <td className="px-3 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectItem(item.id)}
                            className="rounded border-neutral-300 text-brand-gold focus:ring-brand-gold accent-brand-gold cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3 font-semibold text-neutral-900">{prodName}</td>
                        <td className="px-4 py-3 text-brand-grey font-medium">{variantDetails}</td>
                        <td className="px-4 py-3 font-mono font-medium text-neutral-800">{skuCode}</td>
                        <td className="px-4 py-3 text-center font-bold text-sm text-neutral-900">{item.quantity}</td>
                        <td className="px-4 py-3 text-center font-semibold text-brand-grey">{item.reorderLevel}</td>
                        <td className="px-4 py-3 text-center">
                          {isLow ? (
                            <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5">
                              <ShieldAlert size={10} /> Low Stock Alert
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5">
                              <CheckCircle2 size={10} /> In Stock
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button
                            onClick={() => openAdjustStockModal(item)}
                            className="px-2.5 py-1 bg-neutral-950 text-white hover:bg-neutral-800 font-semibold uppercase tracking-wider text-[10px] transition-colors"
                          >
                            Adjust Qty / Alert Level
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
      )}

      {/* Warehouse Add/Edit Modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto"
            onClick={e => e.target === e.currentTarget && setModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white border border-neutral-200 w-full max-w-xl shadow-xl max-h-[90vh] flex flex-col my-auto"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-brand-light bg-neutral-50 shrink-0">
                <h3 className="font-playfair text-base font-semibold">{editingWarehouse ? 'Edit Warehouse Details' : 'Register New Warehouse'}</h3>
                <button onClick={() => setModalOpen(false)} className="text-brand-grey hover:text-brand-gold transition-colors"><X size={18} /></button>
              </div>
              <form onSubmit={handleSaveWarehouse} className="p-6 space-y-4 overflow-y-auto flex-1">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider font-semibold text-brand-grey mb-1">Warehouse Name *</label>
                    <input
                      type="text"
                      required
                      value={warehouseForm.name}
                      onChange={e => setWarehouseForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full border border-brand-light px-3 py-2 text-xs focus:outline-none focus:border-brand-gold rounded-none"
                      placeholder="e.g. Central Fulfillment Hub"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider font-semibold text-brand-grey mb-1">Unique Code / Unicode *</label>
                    <input
                      type="text"
                      required
                      value={warehouseForm.code}
                      onChange={e => setWarehouseForm(f => ({ ...f, code: e.target.value.toUpperCase().trim() }))}
                      className="w-full border border-brand-light px-3 py-2 text-xs focus:outline-none focus:border-brand-gold rounded-none font-mono"
                      placeholder="e.g. WH-FULFILL-01"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider font-semibold text-brand-grey mb-1">Contact Person</label>
                    <input
                      type="text"
                      value={warehouseForm.contactName}
                      onChange={e => setWarehouseForm(f => ({ ...f, contactName: e.target.value }))}
                      className="w-full border border-brand-light px-3 py-2 text-xs focus:outline-none focus:border-brand-gold rounded-none"
                      placeholder="e.g. Manager Name"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider font-semibold text-brand-grey mb-1">Contact Phone</label>
                    <input
                      type="tel"
                      value={warehouseForm.contactPhone}
                      onChange={e => setWarehouseForm(f => ({ ...f, contactPhone: e.target.value }))}
                      className="w-full border border-brand-light px-3 py-2 text-xs focus:outline-none focus:border-brand-gold rounded-none"
                      placeholder="e.g. +91 9988776655"
                    />
                    {warehouseForm.contactPhone && !validatePhone(warehouseForm.contactPhone).isValid && (
                      <p className="text-[10px] text-red-500 mt-1">{validatePhone(warehouseForm.contactPhone).message}</p>
                    )}
                  </div>
                </div>

                {/* Street Address */}
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-brand-grey mb-1">Street Address</label>
                  <input
                    type="text"
                    value={warehouseForm.streetAddress}
                    onChange={e => setWarehouseForm(f => ({ ...f, streetAddress: e.target.value }))}
                    className="w-full border border-brand-light px-3 py-2 text-xs focus:outline-none focus:border-brand-gold rounded-none"
                    placeholder="e.g. Plot No. 42, Industrial Area, Sector 5"
                  />
                </div>

                <div className="grid sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider font-semibold text-brand-grey mb-1">City</label>
                    <input
                      type="text"
                      value={warehouseForm.city}
                      onChange={e => setWarehouseForm(f => ({ ...f, city: e.target.value }))}
                      className="w-full border border-brand-light px-3 py-2 text-xs focus:outline-none focus:border-brand-gold rounded-none"
                      placeholder="e.g. Mumbai"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider font-semibold text-brand-grey mb-1">State</label>
                    <input
                      type="text"
                      value={warehouseForm.state}
                      onChange={e => setWarehouseForm(f => ({ ...f, state: e.target.value }))}
                      className="w-full border border-brand-light px-3 py-2 text-xs focus:outline-none focus:border-brand-gold rounded-none"
                      placeholder="e.g. Maharashtra"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider font-semibold text-brand-grey mb-1">Pincode</label>
                    <input
                      type="text"
                      value={warehouseForm.pincode}
                      onChange={e => setWarehouseForm(f => ({ ...f, pincode: e.target.value }))}
                      className="w-full border border-brand-light px-3 py-2 text-xs focus:outline-none focus:border-brand-gold rounded-none font-mono"
                      placeholder="e.g. 400001"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-brand-grey mb-1">Country</label>
                  <input
                    type="text"
                    value={warehouseForm.country}
                    onChange={e => setWarehouseForm(f => ({ ...f, country: e.target.value }))}
                    className="w-full border border-brand-light px-3 py-2 text-xs focus:outline-none focus:border-brand-gold rounded-none"
                    placeholder="e.g. India"
                  />
                </div>

                <div className="flex flex-col gap-3 pt-2">
                  <label className="flex items-center gap-2 text-xs font-semibold text-neutral-800 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={warehouseForm.isFulfillment}
                      onChange={e => setWarehouseForm(f => ({ ...f, isFulfillment: e.target.checked }))}
                      className="rounded border-neutral-350 text-brand-gold focus:ring-brand-gold accent-brand-gold"
                    />
                    Mark as single Primary Fulfillment Warehouse (all customer orders fulfilled from here)
                  </label>

                  <label className="flex items-center gap-2 text-xs font-semibold text-neutral-800 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={warehouseForm.isProcurement}
                      onChange={e => setWarehouseForm(f => ({ ...f, isProcurement: e.target.checked }))}
                      className="rounded border-neutral-350 text-blue-600 focus:ring-blue-600 accent-blue-600"
                    />
                    Mark as Procurement Source / Supply Hub (e.g. Dubai Depot — stock procurement source)
                  </label>

                  <div className="flex items-center justify-between bg-neutral-50 p-3 border border-brand-light">
                    <span className="text-xs font-semibold text-neutral-700">Warehouse Status (Active)</span>
                    <Switch
                      checked={warehouseForm.isActive}
                      onChange={e => setWarehouseForm(f => ({ ...f, isActive: e.target.checked }))}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-brand-light">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 border border-neutral-300 text-neutral-700 hover:bg-neutral-50 text-xs font-semibold uppercase tracking-wider transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-neutral-950 text-white hover:bg-neutral-800 text-xs font-semibold uppercase tracking-wider transition-all"
                  >
                    Save Warehouse
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Adjust Stock Qty / Low-Stock Alerts Modal */}
      <AnimatePresence>
        {adjustModalOpen && selectedStockItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto"
            onClick={e => e.target === e.currentTarget && setAdjustModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white border border-neutral-200 w-full max-w-md shadow-xl max-h-[90vh] flex flex-col my-auto"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-brand-light bg-neutral-50 shrink-0">
                <h3 className="font-playfair text-base font-semibold">Adjust Stock / Configure Alert</h3>
                <button onClick={() => setAdjustModalOpen(false)} className="text-brand-grey hover:text-brand-gold transition-colors"><X size={18} /></button>
              </div>
              <form onSubmit={handleAdjustStockSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
                {(() => {
                  const currentWhStock = Number(selectedStockItem?.quantity || 0);
                  const parsedQtyInput = Number(adjustQty || 0);
                  let liveUpdatedStock = currentWhStock;
                  if (adjustMode === 'add') {
                    liveUpdatedStock = currentWhStock + (parsedQtyInput > 0 ? parsedQtyInput : 0);
                  } else if (adjustMode === 'reduce') {
                    liveUpdatedStock = Math.max(0, currentWhStock - (parsedQtyInput > 0 ? parsedQtyInput : 0));
                  }

                  return (
                    <>
                      <div className="bg-neutral-50 p-4 border border-brand-light text-xs space-y-1 text-brand-grey mb-2">
                        <p className="font-semibold text-neutral-900">{selectedStockItem.product?.name}</p>
                        {selectedStockItem.variantId && (
                          <p>Variant: <span className="font-semibold">{renderAttributes(selectedStockItem.variant?.attributes)}</span></p>
                        )}
                        <p>SKU: <span className="font-mono">{selectedStockItem.variant?.sku || selectedStockItem.product?.sku}</span></p>
                        <div className="pt-2 border-t border-neutral-200 mt-2 flex items-center justify-between flex-wrap gap-2 text-sm">
                          <span className="text-neutral-900 font-semibold">
                            Current Warehouse Stock: <span className="text-brand-gold">{currentWhStock} units</span>
                          </span>
                          {adjustMode !== 'level' && parsedQtyInput > 0 && (
                            <span className="text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200 text-xs">
                              Updated Stock: {liveUpdatedStock} units
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Adjust Mode Selection */}
                      <div className="flex gap-2 mb-4">
                        {['add', 'reduce', 'level'].map(mode => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setAdjustMode(mode)}
                            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider text-center border transition-all ${
                              adjustMode === mode
                                ? 'border-brand-gold bg-brand-gold/10 text-brand-gold'
                                : 'border-neutral-200 text-brand-grey hover:bg-neutral-50'
                            }`}
                          >
                            {mode === 'add' ? '＋ Receive / Add' : mode === 'reduce' ? '－ Deduct' : '⚙️ Reorder level'}
                          </button>
                        ))}
                      </div>

                      {adjustMode !== 'level' ? (
                        <div>
                          <label className="block text-[11px] uppercase tracking-wider font-semibold text-brand-grey mb-1">
                            {adjustMode === 'add' ? 'Quantity to add *' : 'Quantity to subtract *'}
                          </label>
                          <input
                            type="number"
                            required
                            min="1"
                            value={adjustQty}
                            onChange={e => setAdjustQty(e.target.value)}
                            className="w-full border border-brand-light px-3 py-2 text-xs focus:outline-none focus:border-brand-gold rounded-none"
                            placeholder="e.g. 50"
                          />
                          {parsedQtyInput > 0 && (
                            <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded text-xs flex justify-between items-center">
                              <span className="font-semibold text-emerald-800">
                                {adjustMode === 'add' ? `Adding ${parsedQtyInput} to current ${currentWhStock}` : `Deducting ${parsedQtyInput} from current ${currentWhStock}`}:
                              </span>
                              <span className="font-bold text-emerald-900 text-sm">
                                Updated Stock: {liveUpdatedStock} units
                              </span>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </>
                  );
                })()}

                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-brand-grey mb-1">
                    Configurable Low-Stock Alert Level (Reorder Level)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={adjustAlertLevel}
                    onChange={e => setAdjustAlertLevel(e.target.value)}
                    className="w-full border border-brand-light px-3 py-2 text-xs focus:outline-none focus:border-brand-gold rounded-none"
                    placeholder="e.g. 10"
                  />
                  <p className="text-[10px] text-brand-grey mt-1">Triggers low stock warnings in admin notification bell when inventory falls below this limit.</p>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-brand-light">
                  <button
                    type="button"
                    onClick={() => setAdjustModalOpen(false)}
                    className="px-4 py-2 border border-neutral-300 text-neutral-700 hover:bg-neutral-50 text-xs font-semibold uppercase tracking-wider transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={adjusting || (adjustMode !== 'level' && (!adjustQty || parseInt(adjustQty, 10) <= 0))}
                    className="px-4 py-2 bg-neutral-950 text-white hover:bg-neutral-800 text-xs font-semibold uppercase tracking-wider transition-all disabled:opacity-50"
                  >
                    {adjusting ? 'Updating Stock...' : 'Apply Stock Update'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
};

export default WarehousesAdminPage;
